/**
 * Local synthesis provider bindings (ADR-AIVS-006 §2): implement the
 * existing generation contracts by writing real files with ffmpeg and
 * returning file:// URLs. A future real provider returns https:// from
 * the same contract — the orchestrator's URL resolution is the only seam.
 */
import { randomUUID } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  muxClip,
  synthesizeStillImage,
  synthesizeToneAudio,
  synthesizeVideoTrack,
} from "@aivs/media-core";
import type {
  ImageGenerationProvider,
  ImageGenerationRequest,
  VideoGenerationJob,
  VideoGenerationProvider,
  VideoGenerationRequest,
  VoiceProvider,
  VoiceSynthesisRequest,
} from "./contracts.ts";

export class LocalSynthVideoProvider implements VideoGenerationProvider {
  readonly name = "local-synth-video";
  private readonly jobs = new Map<string, VideoGenerationJob>();

  /** Synchronous synthesis — the "job" is already complete on return. */
  async submit(request: VideoGenerationRequest): Promise<VideoGenerationJob> {
    const jobId = randomUUID();
    try {
      const workDir = await mkdtemp(join(tmpdir(), "aivs-synth-"));
      const videoPath = join(workDir, "video.mp4");
      const audioPath = join(workDir, "narration.wav");
      const clipPath = join(workDir, "clip.mp4");
      const duration = Math.max(1, request.durationSeconds);
      // Prompt hash varies the tone so distinct scenes sound distinct.
      const frequency = 300 + ((request.prompt.length * 37) % 500);
      await synthesizeVideoTrack(videoPath, { durationSeconds: duration });
      await synthesizeToneAudio(audioPath, { durationSeconds: duration, frequency });
      await muxClip(videoPath, audioPath, clipPath);
      const job: VideoGenerationJob = {
        jobId,
        status: "succeeded",
        outputUrl: pathToFileURL(clipPath).href,
      };
      this.jobs.set(jobId, job);
      return job;
    } catch (error) {
      const job: VideoGenerationJob = {
        jobId,
        status: "failed",
        error: (error as Error).message,
      };
      this.jobs.set(jobId, job);
      return job;
    }
  }

  async getJob(jobId: string): Promise<VideoGenerationJob> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`unknown local synth job ${jobId}`);
    return job;
  }
}

/** Local placeholder still (png) — free, offline (AIVS-SLIDESHOW-015). */
export class MockImageProvider implements ImageGenerationProvider {
  readonly name = "mock-image";

  async generate(request: ImageGenerationRequest): Promise<{ imageUrl: string }> {
    const workDir = await mkdtemp(join(tmpdir(), "aivs-image-"));
    const imagePath = join(workDir, "still.png");
    const [width, height] =
      request.aspectRatio === "9:16"
        ? [720, 1280]
        : request.aspectRatio === "1:1"
          ? [960, 960]
          : [1280, 720];
    await synthesizeStillImage(imagePath, {
      width,
      height,
      seed: request.prompt.length,
    });
    return { imageUrl: pathToFileURL(imagePath).href };
  }
}

export class LocalSynthVoiceProvider implements VoiceProvider {
  readonly name = "local-synth-voice";

  async synthesize(request: VoiceSynthesisRequest): Promise<{ audioUrl: string }> {
    const workDir = await mkdtemp(join(tmpdir(), "aivs-voice-"));
    const audioPath = join(workDir, "voice.wav");
    // Honor the duration hint when given (deterministic tests); else a
    // rough speech-pace stand-in: ~15 chars/second, clamped 2-30s.
    const duration =
      request.durationTargetSeconds ?? Math.min(30, Math.max(2, request.text.length / 15));
    const frequency = 220 + ((request.voiceId.length * 53) % 300);
    await synthesizeToneAudio(audioPath, { durationSeconds: duration, frequency });
    return { audioUrl: pathToFileURL(audioPath).href };
  }
}
