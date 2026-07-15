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
import { muxClip, synthesizeToneAudio, synthesizeVideoTrack } from "@aivs/media-core";
import type {
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

export class LocalSynthVoiceProvider implements VoiceProvider {
  readonly name = "local-synth-voice";

  async synthesize(request: VoiceSynthesisRequest): Promise<{ audioUrl: string }> {
    const workDir = await mkdtemp(join(tmpdir(), "aivs-voice-"));
    const audioPath = join(workDir, "voice.wav");
    // Rough speech pace stand-in: ~15 chars/second, clamped 2-30s.
    const duration = Math.min(30, Math.max(2, request.text.length / 15));
    const frequency = 220 + ((request.voiceId.length * 53) % 300);
    await synthesizeToneAudio(audioPath, { durationSeconds: duration, frequency });
    return { audioUrl: pathToFileURL(audioPath).href };
  }
}
