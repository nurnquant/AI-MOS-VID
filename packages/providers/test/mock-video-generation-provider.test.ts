import { describe, expect, it } from "vitest";
import { MockVideoGenerationProvider } from "../src/mock/mock-video-generation-provider";

describe("MockVideoGenerationProvider", () => {
  it("submits and retrieves a job without network access", async () => {
    const provider = new MockVideoGenerationProvider();
    const job = await provider.submit({
      prompt: "test classroom scene",
      durationSeconds: 5,
      aspectRatio: "9:16",
    });
    expect(job.status).toBe("succeeded");
    expect(job.outputUrl).toMatch(/^mock:\/\//);

    const fetched = await provider.getJob(job.jobId);
    expect(fetched).toEqual(job);
  });

  it("rejects empty prompts", async () => {
    const provider = new MockVideoGenerationProvider();
    await expect(
      provider.submit({ prompt: "  ", durationSeconds: 5, aspectRatio: "16:9" }),
    ).rejects.toThrow(/prompt/);
  });

  it("rejects unknown job ids", async () => {
    const provider = new MockVideoGenerationProvider();
    await expect(provider.getJob("nope")).rejects.toThrow(/unknown job/);
  });
});
