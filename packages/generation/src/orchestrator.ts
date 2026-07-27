/**
 * Generation orchestration (ADR-AIVS-006 §3): approved script → per-scene
 * synthesized clips → assembled, preset-normalized final video. Every
 * generated file enters through the normal ingestion pipeline (system
 * actor, synchronous validation). All steps idempotent — re-delivery
 * re-checks persisted state before acting.
 */
import { createReadStream } from "node:fs";
import { createWriteStream } from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { ingestUpload, validateAsset, type AssetServices } from "@aivs/assets";
import { writeAudit } from "@aivs/auth";
import { AssetStatus, GenerationStatus, SceneGenerationStatus, ScriptStatus } from "@aivs/database";
import {
  concatClips,
  getPreset,
  inspectMedia,
  normalizeVideo,
  padClipToDuration,
  replaceAudioTrack,
} from "@aivs/media-core";
import {
  resolveVideoProvider,
  resolveVoiceProvider,
  type VideoGenerationProvider,
  type VoiceProvider,
} from "@aivs/providers";
import { JOB_NAMES, type AssembleVideoPayload, type GenerateScenePayload } from "@aivs/queue";

export class GenerationError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GenerationError";
    this.status = status;
  }
}

/** Env-selected (VIDEO_PROVIDER / VOICE_PROVIDER, ADR-AIVS-009); mocks default. */
const defaultProvider = resolveVideoProvider();
const defaultVoiceProvider = resolveVoiceProvider();

const DEFAULT_SCENE_SECONDS = 8;
/** Clip length always comes from the narration; clamp to sane bounds. */
const MAX_SCENE_SECONDS = 60;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Submit + poll until terminal (mocks return succeeded immediately). */
async function awaitVideoJob(
  provider: VideoGenerationProvider,
  request: Parameters<VideoGenerationProvider["submit"]>[0],
) {
  // Read lazily so tests/ops can tune without a rebuild.
  const pollIntervalMs = Number(process.env.VIDEO_POLL_INTERVAL_MS) || 10_000;
  const pollTimeoutMs = Number(process.env.VIDEO_POLL_TIMEOUT_MS) || 600_000;
  let job = await provider.submit(request);
  const deadline = Date.now() + pollTimeoutMs;
  while (job.status === "queued" || job.status === "running") {
    if (Date.now() > deadline) {
      throw new Error(`provider ${provider.name} timed out after ${pollTimeoutMs}ms`);
    }
    await sleep(pollIntervalMs);
    job = await provider.getJob(job.jobId);
  }
  return job;
}

/**
 * Resolves a provider output URL to a local file. file:// maps
 * directly; https:// (real providers) downloads into `workDir`.
 */
async function resolveOutputToLocal(outputUrl: string, workDir: string): Promise<string> {
  if (outputUrl.startsWith("file://")) return fileURLToPath(outputUrl);
  if (!outputUrl.startsWith("https://")) {
    throw new Error(`unsupported output URL scheme: ${outputUrl}`);
  }
  const response = await fetch(outputUrl);
  if (!response.ok || !response.body) {
    throw new Error(`clip download failed (${response.status}) from provider output`);
  }
  const localPath = join(workDir, "provider-clip.mp4");
  await pipeline(response.body as unknown as NodeJS.ReadableStream, createWriteStream(localPath));
  return localPath;
}

export async function startGeneration(
  services: AssetServices,
  ctx: { tenantId: string; userId: string },
  params: { scriptId: string; targetPreset: string },
) {
  const { prisma, generationQueue } = services;
  const script = await prisma.script.findFirst({
    where: { id: params.scriptId, tenantId: ctx.tenantId },
    include: { scenes: { orderBy: { position: "asc" } } },
  });
  if (!script) throw new GenerationError("script not found", 404);
  if (script.status !== ScriptStatus.approved) {
    throw new GenerationError(`generation requires an approved script, got ${script.status}`, 409);
  }
  if (script.scenes.length === 0) throw new GenerationError("script has no scenes", 409);
  try {
    getPreset(params.targetPreset);
  } catch {
    throw new GenerationError(`unknown target preset "${params.targetPreset}"`, 400);
  }

  const generation = await prisma.generation.create({
    data: {
      tenantId: ctx.tenantId,
      scriptId: script.id,
      targetPreset: params.targetPreset,
      status: GenerationStatus.running,
      startedBy: ctx.userId,
      sceneGenerations: {
        create: script.scenes.map((scene) => ({
          sceneId: scene.id,
          position: scene.position,
        })),
      },
    },
    include: { sceneGenerations: { orderBy: { position: "asc" } } },
  });
  await writeAudit(prisma, {
    type: "generation.started",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    detail: {
      generationId: generation.id,
      scriptId: script.id,
      preset: params.targetPreset,
      scenes: generation.sceneGenerations.length,
    },
  });
  for (const sceneGen of generation.sceneGenerations) {
    await generationQueue.add(
      JOB_NAMES.generateScene,
      { sceneGenerationId: sceneGen.id, tenantId: ctx.tenantId },
      { jobId: `${JOB_NAMES.generateScene}__${sceneGen.id}` },
    );
  }
  return generation;
}

/**
 * Narration TTS → video sized to the narration → narration muxed over
 * the clip → ingest (quarantine) → validate (ready) → link. Idempotent.
 */
export async function processGenerateScene(
  services: AssetServices,
  payload: GenerateScenePayload,
  provider: VideoGenerationProvider = defaultProvider,
  voice: VoiceProvider = defaultVoiceProvider,
): Promise<{ assetId: string | null; skipped?: boolean }> {
  const { prisma } = services;
  const sceneGen = await prisma.sceneGeneration.findFirstOrThrow({
    where: { id: payload.sceneGenerationId, generation: { tenantId: payload.tenantId } },
    include: { scene: true, generation: { include: { script: true } } },
  });
  if (sceneGen.status === SceneGenerationStatus.succeeded && sceneGen.assetId) {
    return { assetId: sceneGen.assetId, skipped: true };
  }
  await prisma.sceneGeneration.update({
    where: { id: sceneGen.id },
    data: { status: SceneGenerationStatus.running, error: null },
  });

  // Narration first (PROV-009B): its real length defines the clip length.
  const narration = await voice.synthesize({
    text: sceneGen.scene.narration,
    voiceId: process.env.VOICE_ID ?? "narrator",
    language: sceneGen.generation.script.language,
    durationTargetSeconds: sceneGen.scene.durationTargetSeconds ?? DEFAULT_SCENE_SECONDS,
    tenantId: payload.tenantId,
  });
  if (!narration.audioUrl.startsWith("file://")) {
    throw new Error(`unsupported audio URL scheme: ${narration.audioUrl}`);
  }
  const audioPath = fileURLToPath(narration.audioUrl);

  const workDir = await mkdtemp(join(tmpdir(), "aivs-scene-"));
  let providerDir: string | undefined;
  try {
    const audioMeta = await inspectMedia(audioPath);
    const clipSeconds = Math.min(
      MAX_SCENE_SECONDS,
      Math.max(1, Math.ceil(audioMeta.durationSeconds)),
    );

    const job = await awaitVideoJob(provider, {
      prompt: `${sceneGen.scene.visualDescription}\nNarration: ${sceneGen.scene.narration}`,
      durationSeconds: clipSeconds,
      aspectRatio: "16:9",
      tenantId: payload.tenantId,
    });
    if (job.status !== "succeeded" || !job.outputUrl) {
      throw new Error(`provider ${provider.name} failed: ${job.error ?? "no output"}`);
    }
    let clipPath = await resolveOutputToLocal(job.outputUrl, workDir);
    if (job.outputUrl.startsWith("file://")) providerDir = dirname(clipPath);

    // Real models render fixed lengths (5s/10s); never cut narration —
    // clone the last frame out to the narration length instead.
    const clipMeta = await inspectMedia(clipPath);
    if (clipMeta.durationSeconds + 0.3 < audioMeta.durationSeconds) {
      const paddedPath = join(workDir, "padded.mp4");
      await padClipToDuration(clipPath, Math.ceil(audioMeta.durationSeconds), paddedPath);
      clipPath = paddedPath;
    }
    const voicedPath = join(workDir, "voiced.mp4");
    await replaceAudioTrack(clipPath, audioPath, voicedPath);

    const { asset } = await ingestUpload(services, {
      tenantId: payload.tenantId,
      projectId: sceneGen.generation.script.projectId,
      originalFilename: `gen-scene-${sceneGen.position + 1}.mp4`,
      claimedContentType: "video/mp4",
      featuresMinor: false,
      body: createReadStream(voicedPath),
      enqueueValidation: false,
    });
    const outcome = await validateAsset(services, asset.id);
    if (outcome.status !== AssetStatus.ready) {
      throw new Error(`synthesized clip failed validation: ${outcome.reason}`);
    }
    await prisma.sceneGeneration.update({
      where: { id: sceneGen.id },
      data: { status: SceneGenerationStatus.succeeded, assetId: asset.id },
    });
    return { assetId: asset.id };
  } finally {
    await rm(dirname(audioPath), { recursive: true, force: true });
    await rm(workDir, { recursive: true, force: true });
    if (providerDir) await rm(providerDir, { recursive: true, force: true });
  }
}

/**
 * Partial resume (AIVS-RESUME-014): re-enqueues ONLY the scenes that
 * did not succeed; finished clips are reused as-is (the idempotency
 * skip in processGenerateScene guarantees no re-render). If every
 * scene already succeeded — assembly was the failure — re-enqueues
 * assembly directly. Fresh job ids per attempt so BullMQ's
 * deterministic-id dedup never swallows a resume.
 */
export async function resumeGeneration(
  services: AssetServices,
  ctx: { tenantId: string; userId: string },
  generationId: string,
): Promise<{ resumedScenes: number; assemblyEnqueued: boolean }> {
  const { prisma, generationQueue } = services;
  const generation = await prisma.generation.findFirst({
    where: { id: generationId, tenantId: ctx.tenantId },
    include: { sceneGenerations: { orderBy: { position: "asc" } } },
  });
  if (!generation) throw new GenerationError("generation not found", 404);
  if (
    generation.status !== GenerationStatus.partial &&
    generation.status !== GenerationStatus.failed
  ) {
    throw new GenerationError(
      `only partial or failed generations can be resumed, got ${generation.status}`,
      409,
    );
  }

  const pending = generation.sceneGenerations.filter(
    (scene) => scene.status !== SceneGenerationStatus.succeeded,
  );
  await prisma.generation.update({
    where: { id: generation.id },
    data: { status: GenerationStatus.running, error: null },
  });

  let assemblyEnqueued = false;
  if (pending.length === 0) {
    // Scenes are all done — the failure was assembly. Re-enqueue it.
    const attempt = Math.max(...generation.sceneGenerations.map((s) => s.attempts)) + 1;
    await generationQueue.add(
      JOB_NAMES.assembleVideo,
      { generationId: generation.id, tenantId: ctx.tenantId },
      { jobId: `${JOB_NAMES.assembleVideo}__${generation.id}__r${attempt}` },
    );
    // Bump one attempt counter so the next assembly resume gets a fresh id.
    await prisma.sceneGeneration.update({
      where: { id: generation.sceneGenerations[0]!.id },
      data: { attempts: { increment: 1 } },
    });
    assemblyEnqueued = true;
  } else {
    for (const scene of pending) {
      const updated = await prisma.sceneGeneration.update({
        where: { id: scene.id },
        data: {
          status: SceneGenerationStatus.queued,
          error: null,
          attempts: { increment: 1 },
        },
      });
      await generationQueue.add(
        JOB_NAMES.generateScene,
        { sceneGenerationId: scene.id, tenantId: ctx.tenantId },
        { jobId: `${JOB_NAMES.generateScene}__${scene.id}__r${updated.attempts}` },
      );
    }
  }

  await writeAudit(prisma, {
    type: "generation.resumed",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    detail: {
      generationId: generation.id,
      resumedScenes: pending.length,
      assemblyEnqueued,
    },
  });
  return { resumedScenes: pending.length, assemblyEnqueued };
}

/** Worker calls this on a generate-scene job's final failed attempt. */
export async function markSceneFailed(
  services: AssetServices,
  sceneGenerationId: string,
  error: string,
): Promise<void> {
  await services.prisma.sceneGeneration.updateMany({
    where: { id: sceneGenerationId, status: { not: SceneGenerationStatus.succeeded } },
    data: { status: SceneGenerationStatus.failed, error: error.slice(0, 2000) },
  });
}

/**
 * All scenes succeeded → enqueue assembly. Nothing pending and any failed
 * → finalize partial/failed (audited). No-op while work remains.
 */
export async function checkGeneration(
  services: AssetServices,
  generationId: string,
): Promise<void> {
  const { prisma, generationQueue } = services;
  const generation = await prisma.generation.findUniqueOrThrow({
    where: { id: generationId },
    include: { sceneGenerations: true },
  });
  if (generation.status !== GenerationStatus.running) return;

  const statuses = generation.sceneGenerations.map((s) => s.status);
  if (
    statuses.some((s) => s === SceneGenerationStatus.queued || s === SceneGenerationStatus.running)
  ) {
    return;
  }
  if (statuses.every((s) => s === SceneGenerationStatus.succeeded)) {
    await generationQueue.add(
      JOB_NAMES.assembleVideo,
      { generationId, tenantId: generation.tenantId },
      { jobId: `${JOB_NAMES.assembleVideo}__${generationId}` },
    );
    return;
  }
  const anySucceeded = statuses.includes(SceneGenerationStatus.succeeded);
  const firstError =
    generation.sceneGenerations.find((s) => s.error)?.error ?? "scene generation failed";
  await prisma.generation.update({
    where: { id: generationId },
    data: {
      status: anySucceeded ? GenerationStatus.partial : GenerationStatus.failed,
      error: firstError,
    },
  });
  await writeAudit(prisma, {
    type: anySucceeded ? "generation.completed" : "generation.failed",
    tenantId: generation.tenantId,
    detail: {
      generationId,
      status: anySucceeded ? "partial" : "failed",
      error: firstError,
    },
  });
}

/** Concat scene clips in order, normalize to preset, ingest final asset. */
export async function processAssembleVideo(
  services: AssetServices,
  payload: AssembleVideoPayload,
): Promise<{ finalAssetId: string; skipped?: boolean }> {
  const { prisma, storage } = services;
  const generation = await prisma.generation.findFirstOrThrow({
    where: { id: payload.generationId, tenantId: payload.tenantId },
    include: {
      sceneGenerations: { orderBy: { position: "asc" }, include: { asset: true } },
      script: true,
    },
  });
  if (generation.finalAssetId) {
    return { finalAssetId: generation.finalAssetId, skipped: true };
  }
  const clips = generation.sceneGenerations;
  if (!clips.every((c) => c.status === SceneGenerationStatus.succeeded && c.asset?.storageKey)) {
    throw new Error(`generation ${generation.id} has scenes without ready assets`);
  }

  const preset = getPreset(generation.targetPreset);
  const workDir = await mkdtemp(join(tmpdir(), "aivs-assemble-"));
  try {
    const localClips: string[] = [];
    for (const clip of clips) {
      const localPath = join(workDir, `scene-${clip.position}.mp4`);
      await pipeline(
        await storage.getObjectStream(clip.asset!.storageKey!),
        createWriteStream(localPath),
      );
      localClips.push(localPath);
    }
    const concatPath = join(workDir, "concat.mp4");
    await concatClips(localClips, join(workDir, "list.txt"), concatPath);
    const finalPath = join(workDir, "final.mp4");
    await normalizeVideo(concatPath, finalPath, {
      targetWidth: preset.width,
      targetHeight: preset.height,
      targetFps: preset.fps,
    });
    await stat(finalPath);

    const { asset } = await ingestUpload(services, {
      tenantId: payload.tenantId,
      projectId: generation.script.projectId,
      originalFilename: `generated-${generation.targetPreset}.mp4`,
      claimedContentType: "video/mp4",
      featuresMinor: false,
      body: createReadStream(finalPath),
      enqueueValidation: false,
    });
    const outcome = await validateAsset(services, asset.id);
    if (outcome.status !== AssetStatus.ready) {
      throw new Error(`assembled video failed validation: ${outcome.reason}`);
    }

    await prisma.generation.update({
      where: { id: generation.id },
      data: { status: GenerationStatus.succeeded, finalAssetId: asset.id },
    });
    await writeAudit(prisma, {
      type: "generation.completed",
      tenantId: payload.tenantId,
      detail: { generationId: generation.id, status: "succeeded", finalAssetId: asset.id },
    });
    return { finalAssetId: asset.id };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

/** Worker calls this on an assemble job's final failed attempt. */
export async function markGenerationFailed(
  services: AssetServices,
  generationId: string,
  error: string,
): Promise<void> {
  const { prisma } = services;
  const generation = await prisma.generation.findUnique({ where: { id: generationId } });
  if (!generation || generation.status !== GenerationStatus.running) return;
  await prisma.generation.update({
    where: { id: generationId },
    data: { status: GenerationStatus.failed, error: error.slice(0, 2000) },
  });
  await writeAudit(prisma, {
    type: "generation.failed",
    tenantId: generation.tenantId,
    detail: { generationId, error: error.slice(0, 500) },
  });
}

export async function listGenerations(services: AssetServices, tenantId: string, scriptId: string) {
  return services.prisma.generation.findMany({
    where: { tenantId, scriptId },
    include: { sceneGenerations: { orderBy: { position: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
}
