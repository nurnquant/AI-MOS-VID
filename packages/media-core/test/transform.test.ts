/**
 * Exercises normalizeVideo/generateThumbnail with a real ffmpeg-generated
 * fixture (offline, self-cleaning — same approach as the media smoke test).
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inspectMedia } from "../src/inspect.ts";
import { PLATFORM_PRESETS, getPreset } from "../src/presets.ts";
import { generateThumbnail, normalizeVideo } from "../src/transform.ts";
import { runProcess } from "../src/ffmpeg.ts";

let workDir: string;
let fixture: string;

beforeAll(async () => {
  workDir = await mkdtemp(join(tmpdir(), "aivs-transform-test-"));
  fixture = join(workDir, "fixture.mp4");
  const result = await runProcess("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    "testsrc=size=640x360:rate=25:duration=2",
    "-f",
    "lavfi",
    "-i",
    "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-t",
    "2",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    fixture,
  ]);
  expect(result.exitCode).toBe(0);
}, 60_000);

afterAll(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe("presets", () => {
  it("defines exactly the 7 platform formats", () => {
    expect(Object.keys(PLATFORM_PRESETS)).toHaveLength(7);
    expect(getPreset("youtube-shorts")).toMatchObject({ width: 1080, height: 1920, fps: 30 });
    expect(() => getPreset("betamax")).toThrow(/Unknown platform preset/);
  });
});

describe("normalizeVideo", () => {
  it("letterboxes a 16:9 source into a 9:16 preset at the target fps", async () => {
    const preset = getPreset("tiktok");
    const out = join(workDir, "tiktok.mp4");
    await normalizeVideo(fixture, out, {
      targetWidth: preset.width,
      targetHeight: preset.height,
      targetFps: preset.fps,
    });
    const meta = await inspectMedia(out);
    const video = meta.streams.find((s) => s.codecType === "video");
    expect(video).toMatchObject({ codecName: "h264", width: 1080, height: 1920 });
    expect(meta.streams.some((s) => s.codecType === "audio" && s.codecName === "aac")).toBe(true);
  }, 120_000);
});

describe("generateThumbnail", () => {
  it("extracts a png frame at the requested width", async () => {
    const out = join(workDir, "thumb.png");
    await generateThumbnail(fixture, out, { atSeconds: 1, width: 320 });
    const probe = await runProcess("ffprobe", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-show_entries",
      "stream=codec_name,width",
      "-of",
      "csv=p=0",
      out,
    ]);
    expect(probe.stdout).toContain("png");
    expect(probe.stdout).toContain("320");
  }, 60_000);
});
