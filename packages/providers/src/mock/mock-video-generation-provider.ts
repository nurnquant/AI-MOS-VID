import { randomUUID } from "node:crypto";
import type {
  VideoGenerationJob,
  VideoGenerationProvider,
  VideoGenerationRequest,
} from "../contracts";

/**
 * Local-only mock. Completes jobs instantly and returns a fake output URL.
 * Never touches the network.
 */
export class MockVideoGenerationProvider implements VideoGenerationProvider {
  readonly name = "mock-video-generation";
  private readonly jobs = new Map<string, VideoGenerationJob>();

  async submit(request: VideoGenerationRequest): Promise<VideoGenerationJob> {
    if (!request.prompt.trim()) {
      throw new Error("prompt must not be empty");
    }
    const job: VideoGenerationJob = {
      jobId: randomUUID(),
      status: "succeeded",
      outputUrl: `mock://videos/${encodeURIComponent(request.prompt.slice(0, 32))}.mp4`,
    };
    this.jobs.set(job.jobId, job);
    return job;
  }

  async getJob(jobId: string): Promise<VideoGenerationJob> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`unknown job: ${jobId}`);
    return job;
  }
}
