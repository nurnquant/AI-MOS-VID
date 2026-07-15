/**
 * Local media synthesis (ADR-AIVS-006 §2): honest, playable mock media
 * from ffmpeg's lavfi sources. Fixed intermediate format (1280×720@25,
 * h264/aac) keeps scene clips stream-uniform so assembly can concat
 * without re-encoding.
 */
import { writeFile } from "node:fs/promises";
import { runFfmpeg } from "./ffmpeg.ts";

export const SYNTH_WIDTH = 1280;
export const SYNTH_HEIGHT = 720;
export const SYNTH_FPS = 25;

export interface SynthVideoOptions {
  durationSeconds: number;
  /** Varies the test pattern & tone so scenes are visually distinct. */
  sceneIndex?: number;
}

/** Video-only track (no audio) — the narration is muxed in separately. */
export async function synthesizeVideoTrack(
  outputPath: string,
  options: SynthVideoOptions,
): Promise<void> {
  const duration = Math.max(1, options.durationSeconds);
  await runFfmpeg([
    "-y",
    "-f",
    "lavfi",
    "-i",
    `testsrc2=size=${SYNTH_WIDTH}x${SYNTH_HEIGHT}:rate=${SYNTH_FPS}:duration=${duration}`,
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-pix_fmt",
    "yuv420p",
    outputPath,
  ]);
}

/** Tone stand-in for narration audio (wav). */
export async function synthesizeToneAudio(
  outputPath: string,
  options: { durationSeconds: number; frequency?: number },
): Promise<void> {
  const duration = Math.max(1, options.durationSeconds);
  const frequency = options.frequency ?? 440;
  await runFfmpeg([
    "-y",
    "-f",
    "lavfi",
    "-i",
    `sine=frequency=${frequency}:duration=${duration}`,
    "-c:a",
    "pcm_s16le",
    outputPath,
  ]);
}

/** Muxes a video track and an audio track into one mp4 clip. */
export async function muxClip(
  videoPath: string,
  audioPath: string,
  outputPath: string,
): Promise<void> {
  await runFfmpeg([
    "-y",
    "-i",
    videoPath,
    "-i",
    audioPath,
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-shortest",
    outputPath,
  ]);
}

/**
 * Losslessly concatenates stream-uniform clips (concat demuxer, `-c copy`).
 * Caller guarantees uniformity — all inputs come from this module.
 */
export async function concatClips(
  inputPaths: string[],
  listFilePath: string,
  outputPath: string,
): Promise<void> {
  if (inputPaths.length === 0) throw new Error("concatClips requires at least one input");
  const list = inputPaths.map((p) => `file '${p.replaceAll("'", "'\\''")}'`).join("\n");
  await writeFile(listFilePath, `${list}\n`, "utf8");
  await runFfmpeg([
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listFilePath,
    "-c",
    "copy",
    outputPath,
  ]);
}
