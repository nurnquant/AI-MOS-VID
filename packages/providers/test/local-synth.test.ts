import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { inspectMedia } from "@aivs/media-core";
import { LocalSynthVideoProvider, LocalSynthVoiceProvider } from "../src/local-synth.ts";

const cleanup: string[] = [];

afterAll(async () => {
  for (const path of cleanup) await rm(path, { force: true });
});

describe("LocalSynthVideoProvider", () => {
  it("produces a real playable clip at the requested duration", async () => {
    const provider = new LocalSynthVideoProvider();
    const job = await provider.submit({
      prompt: "scene 1: welcome",
      durationSeconds: 2,
      aspectRatio: "16:9",
    });
    expect(job.status).toBe("succeeded");
    expect(job.outputUrl).toMatch(/^file:\/\//);
    const path = fileURLToPath(job.outputUrl!);
    cleanup.push(path);

    const meta = await inspectMedia(path);
    const video = meta.streams.find((s) => s.codecType === "video");
    const audio = meta.streams.find((s) => s.codecType === "audio");
    expect(video).toMatchObject({ codecName: "h264", width: 1280, height: 720 });
    expect(audio?.codecName).toBe("aac");
    expect(meta.durationSeconds).toBeGreaterThan(1.5);
    expect(meta.durationSeconds).toBeLessThan(2.6);

    expect(await provider.getJob(job.jobId)).toEqual(job);
  }, 60_000);
});

describe("LocalSynthVoiceProvider", () => {
  it("produces tone audio scaled to text length", async () => {
    const provider = new LocalSynthVoiceProvider();
    const { audioUrl } = await provider.synthesize({
      text: "a".repeat(60),
      voiceId: "narrator-1",
      language: "en",
    });
    const path = fileURLToPath(audioUrl);
    cleanup.push(path);
    const meta = await inspectMedia(path);
    expect(meta.durationSeconds).toBeGreaterThan(3.5);
    expect(meta.durationSeconds).toBeLessThan(4.5);
  }, 60_000);
});
