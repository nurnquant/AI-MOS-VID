import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inspectMedia } from "../src/inspect";
import { runFfmpeg } from "../src/ffmpeg";

let dir: string;
let sample: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "aivs-media-test-"));
  sample = join(dir, "sample.mp4");
  await runFfmpeg([
    "-f",
    "lavfi",
    "-i",
    "color=c=red:s=320x240:d=1:r=25",
    "-f",
    "lavfi",
    "-i",
    "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-t",
    "1",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    sample,
  ]);
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("inspectMedia (FFmpeg metadata test)", () => {
  it("returns video and audio stream metadata for a generated sample", async () => {
    const meta = await inspectMedia(sample);
    expect(meta.durationSeconds).toBeGreaterThan(0.5);
    expect(meta.sizeBytes).toBeGreaterThan(0);
    const video = meta.streams.find((s) => s.codecType === "video");
    const audio = meta.streams.find((s) => s.codecType === "audio");
    expect(video?.codecName).toBe("h264");
    expect(video?.width).toBe(320);
    expect(video?.height).toBe(240);
    expect(audio?.codecName).toBe("aac");
  });

  it("fails clearly for a missing file", async () => {
    await expect(inspectMedia(join(dir, "missing.mp4"))).rejects.toThrow(/ffprobe failed/);
  });
});
