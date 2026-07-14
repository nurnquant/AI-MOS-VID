/**
 * Real implementations of the ENV-001 placeholder contracts: video
 * normalization to platform presets and thumbnail extraction. h264/aac mp4
 * output, letterboxed to preserve source aspect ratio.
 */
import { runFfmpeg } from "./ffmpeg.ts";

export interface NormalizeOptions {
  targetWidth: number;
  targetHeight: number;
  targetFps: number;
}

export interface ThumbnailOptions {
  atSeconds: number;
  width: number;
}

const NORMALIZE_TIMEOUT_MS = 10 * 60 * 1000;

export async function normalizeVideo(
  inputPath: string,
  outputPath: string,
  options: NormalizeOptions,
): Promise<void> {
  const { targetWidth: w, targetHeight: h, targetFps } = options;
  const filter =
    `scale=${w}:${h}:force_original_aspect_ratio=decrease:force_divisible_by=2,` +
    `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,setsar=1`;
  await runFfmpeg(
    [
      "-y",
      "-i",
      inputPath,
      "-vf",
      filter,
      "-r",
      String(targetFps),
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-movflags",
      "+faststart",
      outputPath,
    ],
    NORMALIZE_TIMEOUT_MS,
  );
}

/** Grabs a single frame (or decodes a still image) as a png thumbnail (host ffmpeg builds often lack libwebp). */
export async function generateThumbnail(
  inputPath: string,
  outputPath: string,
  options: ThumbnailOptions,
): Promise<void> {
  await runFfmpeg([
    "-y",
    "-ss",
    String(options.atSeconds),
    "-i",
    inputPath,
    "-frames:v",
    "1",
    "-vf",
    `scale=${options.width}:-2`,
    outputPath,
  ]);
}
