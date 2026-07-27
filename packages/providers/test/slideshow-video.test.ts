/**
 * SLIDESHOW-015 unit tests — mock image source + real local ffmpeg
 * Ken Burns render; zero network.
 */
import { describe, expect, it, vi } from "vitest";
import { fileURLToPath } from "node:url";
import { inspectMedia } from "@aivs/media-core";
import {
  MockImageProvider,
  SlideshowVideoProvider,
  pickKenBurnsDirection,
  resolveVideoProvider,
} from "../src/index.ts";

describe("pickKenBurnsDirection", () => {
  it("is deterministic per prompt and covers both directions", () => {
    expect(pickKenBurnsDirection("aa")).toBe(pickKenBurnsDirection("aa"));
    const directions = new Set([pickKenBurnsDirection("a"), pickKenBurnsDirection("b")]);
    expect(directions.size).toBe(2);
  });
});

describe("SlideshowVideoProvider", () => {
  it("renders a still into a video clip of the requested duration", async () => {
    const provider = new SlideshowVideoProvider(new MockImageProvider());
    const job = await provider.submit({
      prompt: "sunrise over mosque garden",
      durationSeconds: 2,
      aspectRatio: "16:9",
    });
    expect(job.status).toBe("succeeded");
    expect(job.outputUrl).toMatch(/^file:\/\//);
    expect(await provider.getJob(job.jobId)).toEqual(job);

    const meta = await inspectMedia(fileURLToPath(job.outputUrl!));
    expect(meta.durationSeconds).toBeGreaterThan(1.5);
    expect(meta.durationSeconds).toBeLessThan(2.6);
    const video = meta.streams.find((s) => s.codecType === "video");
    expect(video).toMatchObject({ width: 1280, height: 720 });
  }, 60_000);

  it("image provider failure becomes a failed job, not a crash", async () => {
    const broken = {
      name: "broken",
      generate: vi.fn(async () => {
        throw new Error("image model unavailable");
      }),
    };
    const provider = new SlideshowVideoProvider(broken);
    const job = await provider.submit({ prompt: "p", durationSeconds: 2, aspectRatio: "16:9" });
    expect(job.status).toBe("failed");
    expect(job.error).toMatch(/image model unavailable/);
  });

  it("downloads https image output before rendering", async () => {
    const image = {
      name: "https-image",
      generate: vi.fn(async () => ({ imageUrl: "https://img.example/still.png" })),
    };
    // Serve real png bytes from the mock image synthesizer.
    const mock = new MockImageProvider();
    const local = await mock.generate({ prompt: "bytes", aspectRatio: "16:9" });
    const { readFile } = await import("node:fs/promises");
    const bytes = await readFile(fileURLToPath(local.imageUrl));
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      arrayBuffer: async () =>
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    })) as unknown as typeof fetch;

    const provider = new SlideshowVideoProvider(image, { fetchImpl });
    const job = await provider.submit({ prompt: "p", durationSeconds: 1, aspectRatio: "16:9" });
    expect(job.status).toBe("succeeded");
    expect(fetchImpl).toHaveBeenCalledWith("https://img.example/still.png");
  }, 60_000);
});

describe("factory: slideshow registration", () => {
  it("VIDEO_PROVIDER=slideshow resolves with the mock image source by default", () => {
    vi.stubEnv("VIDEO_PROVIDER", "slideshow");
    vi.stubEnv("IMAGE_PROVIDER", "");
    expect(resolveVideoProvider().name).toBe("slideshow");
    vi.unstubAllEnvs();
  });
});
