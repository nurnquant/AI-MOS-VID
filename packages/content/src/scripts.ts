/**
 * Script lifecycle services (ADR-AIVS-005): create/generate/edit scripts
 * and scenes, enforce the draft → in_review → approved machine, audit
 * every status change. Edits are draft-only.
 */
import { writeAudit } from "@aivs/auth";
import {
  AssetStatus,
  MembershipRole,
  ScriptStatus,
  type PrismaClient,
  type Scene,
  type ScriptLanguage,
} from "@aivs/database";
import { canAccessChildMedia } from "@aivs/auth";
import type { ScriptProvider } from "@aivs/providers";

export class ContentError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ContentError";
    this.status = status;
  }
}

const EDITABLE: ScriptStatus[] = [ScriptStatus.draft];

export interface ScriptContext {
  tenantId: string;
  userId: string;
}

async function getOwnedScript(prisma: PrismaClient, ctx: ScriptContext, scriptId: string) {
  const script = await prisma.script.findFirst({
    where: { id: scriptId, tenantId: ctx.tenantId },
    include: { scenes: { orderBy: { position: "asc" } } },
  });
  if (!script) throw new ContentError("script not found", 404);
  return script;
}

function assertEditable(status: ScriptStatus): void {
  if (!EDITABLE.includes(status)) {
    throw new ContentError(`script is ${status}; edits are allowed in draft only`, 409);
  }
}

export interface CreateScriptParams {
  projectId: string;
  title: string;
  brief: string;
  language: ScriptLanguage;
  targetPresets?: string[];
  /** When provided, scenes are generated from the brief at creation. */
  provider?: ScriptProvider;
}

export async function createScript(
  prisma: PrismaClient,
  ctx: ScriptContext,
  params: CreateScriptParams,
) {
  const project = await prisma.project.findFirst({
    where: { id: params.projectId, tenantId: ctx.tenantId },
    select: { id: true },
  });
  if (!project) throw new ContentError("project not found", 404);

  const generated = params.provider
    ? await params.provider.generate({ brief: params.brief, language: params.language })
    : null;

  const script = await prisma.script.create({
    data: {
      tenantId: ctx.tenantId,
      projectId: params.projectId,
      title: params.title.trim(),
      brief: params.brief.trim(),
      language: params.language,
      targetPresets: params.targetPresets ?? [],
      createdBy: ctx.userId,
      scenes: generated
        ? {
            create: generated.scenes.map((scene, index) => ({
              position: index,
              narration: scene.narration,
              visualDescription: scene.visualDescription,
              durationTargetSeconds: scene.durationTargetSeconds,
            })),
          }
        : undefined,
    },
    include: { scenes: { orderBy: { position: "asc" } } },
  });
  await writeAudit(prisma, {
    type: "script.created",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    detail: { scriptId: script.id, generated: !!generated, language: script.language },
  });
  if (generated) {
    await writeAudit(prisma, {
      type: "script.generated",
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      detail: { scriptId: script.id, sceneCount: generated.scenes.length },
    });
  }
  return script;
}

/** Regenerates all scenes from the brief (draft only, replaces existing). */
export async function regenerateScenes(
  prisma: PrismaClient,
  ctx: ScriptContext,
  scriptId: string,
  provider: ScriptProvider,
) {
  const script = await getOwnedScript(prisma, ctx, scriptId);
  assertEditable(script.status);
  const generated = await provider.generate({ brief: script.brief, language: script.language });
  await prisma.$transaction([
    prisma.scene.deleteMany({ where: { scriptId } }),
    prisma.scene.createMany({
      data: generated.scenes.map((scene, index) => ({
        scriptId,
        position: index,
        narration: scene.narration,
        visualDescription: scene.visualDescription,
        durationTargetSeconds: scene.durationTargetSeconds,
      })),
    }),
  ]);
  await writeAudit(prisma, {
    type: "script.generated",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    detail: { scriptId, sceneCount: generated.scenes.length },
  });
  return getOwnedScript(prisma, ctx, scriptId);
}

export async function updateScriptMeta(
  prisma: PrismaClient,
  ctx: ScriptContext,
  scriptId: string,
  patch: Partial<{
    title: string;
    brief: string;
    language: ScriptLanguage;
    targetPresets: string[];
  }>,
) {
  const script = await getOwnedScript(prisma, ctx, scriptId);
  assertEditable(script.status);
  return prisma.script.update({
    where: { id: scriptId },
    data: {
      title: patch.title?.trim(),
      brief: patch.brief?.trim(),
      language: patch.language,
      targetPresets: patch.targetPresets,
    },
    include: { scenes: { orderBy: { position: "asc" } } },
  });
}

// ---------- scenes ----------

async function normalizePositions(prisma: PrismaClient, scriptId: string): Promise<void> {
  const scenes = await prisma.scene.findMany({
    where: { scriptId },
    orderBy: { position: "asc" },
    select: { id: true, position: true },
  });
  await prisma.$transaction(
    scenes
      .map((scene, index) => ({ scene, index }))
      .filter(({ scene, index }) => scene.position !== index)
      .map(({ scene, index }) =>
        prisma.scene.update({ where: { id: scene.id }, data: { position: index } }),
      ),
  );
}

export async function addScene(
  prisma: PrismaClient,
  ctx: ScriptContext,
  scriptId: string,
  data: { narration: string; visualDescription: string; durationTargetSeconds?: number },
) {
  const script = await getOwnedScript(prisma, ctx, scriptId);
  assertEditable(script.status);
  return prisma.scene.create({
    data: {
      scriptId,
      position: script.scenes.length,
      narration: data.narration,
      visualDescription: data.visualDescription,
      durationTargetSeconds: data.durationTargetSeconds,
    },
  });
}

export async function updateScene(
  prisma: PrismaClient,
  ctx: ScriptContext,
  scriptId: string,
  sceneId: string,
  patch: Partial<{
    narration: string;
    visualDescription: string;
    durationTargetSeconds: number | null;
    position: number;
  }>,
) {
  const script = await getOwnedScript(prisma, ctx, scriptId);
  assertEditable(script.status);
  const scene = script.scenes.find((s) => s.id === sceneId);
  if (!scene) throw new ContentError("scene not found", 404);

  if (patch.position !== undefined && patch.position !== scene.position) {
    const target = Math.max(0, Math.min(patch.position, script.scenes.length - 1));
    const reordered = script.scenes.filter((s) => s.id !== sceneId);
    reordered.splice(target, 0, scene);
    await prisma.$transaction(
      reordered.map((s, index) =>
        prisma.scene.update({ where: { id: s.id }, data: { position: index } }),
      ),
    );
  }
  return prisma.scene.update({
    where: { id: sceneId },
    data: {
      narration: patch.narration,
      visualDescription: patch.visualDescription,
      durationTargetSeconds: patch.durationTargetSeconds,
    },
  });
}

export async function deleteScene(
  prisma: PrismaClient,
  ctx: ScriptContext,
  scriptId: string,
  sceneId: string,
): Promise<void> {
  const script = await getOwnedScript(prisma, ctx, scriptId);
  assertEditable(script.status);
  if (!script.scenes.some((s) => s.id === sceneId)) {
    throw new ContentError("scene not found", 404);
  }
  await prisma.scene.delete({ where: { id: sceneId } });
  await normalizePositions(prisma, scriptId);
}

/** Reference must be a same-tenant, ready asset (ADR §4). Null detaches. */
export async function setSceneReference(
  prisma: PrismaClient,
  ctx: ScriptContext,
  scriptId: string,
  sceneId: string,
  assetId: string | null,
) {
  const script = await getOwnedScript(prisma, ctx, scriptId);
  assertEditable(script.status);
  if (!script.scenes.some((s) => s.id === sceneId)) {
    throw new ContentError("scene not found", 404);
  }
  if (assetId !== null) {
    const asset = await prisma.asset.findFirst({
      where: { id: assetId, tenantId: ctx.tenantId },
      select: { status: true },
    });
    if (!asset) throw new ContentError("asset not found", 404);
    if (asset.status !== AssetStatus.ready) {
      throw new ContentError(`referenced asset must be ready, got ${asset.status}`, 409);
    }
  }
  return prisma.scene.update({ where: { id: sceneId }, data: { referenceAssetId: assetId } });
}

// ---------- status machine ----------

const TRANSITIONS: Record<
  string,
  {
    from: ScriptStatus;
    to: ScriptStatus;
    audit: "script.submitted" | "script.approved" | "script.rejected";
  }
> = {
  submit: { from: ScriptStatus.draft, to: ScriptStatus.in_review, audit: "script.submitted" },
  approve: { from: ScriptStatus.in_review, to: ScriptStatus.approved, audit: "script.approved" },
  reject: { from: ScriptStatus.in_review, to: ScriptStatus.draft, audit: "script.rejected" },
};

export async function transitionScript(
  prisma: PrismaClient,
  ctx: ScriptContext,
  scriptId: string,
  action: "submit" | "approve" | "reject",
  reason?: string,
) {
  const transition = TRANSITIONS[action]!;
  const script = await getOwnedScript(prisma, ctx, scriptId);
  if (script.status !== transition.from) {
    throw new ContentError(
      `cannot ${action}: script is ${script.status}, requires ${transition.from}`,
      409,
    );
  }
  if (action === "submit" && script.scenes.length === 0) {
    throw new ContentError("cannot submit a script with no scenes", 409);
  }
  const updated = await prisma.script.update({
    where: { id: scriptId },
    data: { status: transition.to },
    include: { scenes: { orderBy: { position: "asc" } } },
  });
  await writeAudit(prisma, {
    type: transition.audit,
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    detail: { scriptId, ...(reason ? { reason } : {}) },
  });
  return updated;
}

// ---------- read + serialization ----------

export async function listScripts(prisma: PrismaClient, tenantId: string, projectId?: string) {
  return prisma.script.findMany({
    where: { tenantId, ...(projectId ? { projectId } : {}) },
    include: { _count: { select: { scenes: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getScript(prisma: PrismaClient, tenantId: string, scriptId: string) {
  const script = await prisma.script.findFirst({
    where: { id: scriptId, tenantId },
    include: {
      scenes: {
        orderBy: { position: "asc" },
        include: {
          referenceAsset: { select: { id: true, displayName: true, featuresMinor: true } },
        },
      },
    },
  });
  if (!script) throw new ContentError("script not found", 404);
  return script;
}

type SceneWithRef = Scene & {
  referenceAsset: { id: string; displayName: string; featuresMinor: boolean } | null;
};

/** Masks featuresMinor references below child_media_reviewer (ADR §4). */
export function serializeScene(scene: SceneWithRef, role: MembershipRole) {
  const masked = scene.referenceAsset?.featuresMinor === true && !canAccessChildMedia(role);
  return {
    id: scene.id,
    position: scene.position,
    narration: scene.narration,
    visualDescription: scene.visualDescription,
    durationTargetSeconds: scene.durationTargetSeconds,
    referenceAssetId: masked ? null : (scene.referenceAssetId ?? null),
    referenceAssetName: masked ? null : (scene.referenceAsset?.displayName ?? null),
    referenceMasked: masked,
  };
}
