/**
 * Slideshow video provider (AIVS-SLIDESHOW-015): implements the
 * standard video contract by generating ONE still illustration per
 * scene and animating it with a local ffmpeg Ken Burns pan/zoom —
 * picture-book aesthetic at ~1-5% of motion-model cost. The image
 * source is itself provider-swappable (IMAGE_PROVIDER: mock | fal);
 * the render is free and local. Zero orchestrator changes: narration
 * sizing, padding, quarantine, assembly, and resume all see a normal
 * already-succeeded video job.
 */
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { renderKenBurns } from "@aivs/media-core";
import { ProviderBudgetError } from "./budget.ts";
import type {
  ImageGenerationProvider,
  VideoGenerationJob,
  VideoGenerationProvider,
  VideoGenerationRequest,
} from "./contracts.ts";

type FetchLike = typeof fetch;

/** Deterministic in/out alternation — varies by prompt, stable per scene. */
export function pickKenBurnsDirection(prompt: string): "in" | "out" {
  let sum = 0;
  for (let i = 0; i < prompt.length; i += 1) sum += prompt.charCodeAt(i);
  return sum % 2 === 0 ? "in" : "out";
}

export class SlideshowVideoProvider implements VideoGenerationProvider {
  readonly name = "slideshow";

  private readonly jobs = new Map<string, VideoGenerationJob>();
  private readonly image: ImageGenerationProvider;
  private readonly fetchImpl: FetchLike;

  constructor(image: ImageGenerationProvider, options?: { fetchImpl?: FetchLike }) {
    this.image = image;
    this.fetchImpl = options?.fetchImpl ?? fetch;
  }

  /** Synchronous synthesis — the "job" is already complete on return. */
  async submit(request: VideoGenerationRequest): Promise<VideoGenerationJob> {
    const jobId = randomUUID();
    try {
      const { imageUrl } = await this.image.generate({
        prompt: request.prompt,
        aspectRatio: request.aspectRatio,
        tenantId: request.tenantId,
      });
      const workDir = await mkdtemp(join(tmpdir(), "aivs-slideshow-"));
      const imagePath = await this.localizeImage(imageUrl, workDir);
      const clipPath = join(workDir, "clip.mp4");
      const [width, height] =
        request.aspectRatio === "9:16"
          ? [720, 1280]
          : request.aspectRatio === "1:1"
            ? [960, 960]
            : [1280, 720];
      await renderKenBurns(imagePath, clipPath, {
        durationSeconds: Math.max(1, request.durationSeconds),
        direction: pickKenBurnsDirection(request.prompt),
        width,
        height,
      });
      const job: VideoGenerationJob = {
        jobId,
        status: "succeeded",
        outputUrl: pathToFileURL(clipPath).href,
      };
      this.jobs.set(jobId, job);
      return job;
    } catch (error) {
      // Budget blocks must keep their type — the worker maps them to
      // UnrecoverableError and the API to 409, same as other providers.
      if (error instanceof ProviderBudgetError) throw error;
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
    if (!job) throw new Error(`unknown slideshow job ${jobId}`);
    return job;
  }

  private async localizeImage(imageUrl: string, workDir: string): Promise<string> {
    if (imageUrl.startsWith("file://")) return fileURLToPath(imageUrl);
    if (!imageUrl.startsWith("https://")) {
      throw new Error(`unsupported image URL scheme: ${imageUrl}`);
    }
    const response = await this.fetchImpl(imageUrl);
    if (!response.ok) {
      throw new Error(`image download failed (${response.status})`);
    }
    const imagePath = join(workDir, "still.png");
    await writeFile(imagePath, new Uint8Array(await response.arrayBuffer()));
    return imagePath;
  }
}
