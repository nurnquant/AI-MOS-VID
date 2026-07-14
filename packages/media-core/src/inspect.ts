import { stat } from "node:fs/promises";
import type { MediaMetadata, MediaStreamInfo } from "@aivs/types";
import { runProcess } from "./ffmpeg.ts";

interface FfprobeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  duration?: string;
  sample_rate?: string;
  channels?: number;
}

interface FfprobeOutput {
  format?: { format_name?: string; duration?: string };
  streams?: FfprobeStream[];
}

/** Inspect a media file with ffprobe and return normalized metadata. */
export async function inspectMedia(path: string): Promise<MediaMetadata> {
  const result = await runProcess("ffprobe", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-show_format",
    "-show_streams",
    "-of",
    "json",
    path,
  ]);
  if (result.exitCode !== 0) {
    throw new Error(`ffprobe failed for ${path}: ${result.stderr.slice(0, 2000)}`);
  }

  const parsed = JSON.parse(result.stdout) as FfprobeOutput;
  const fileStat = await stat(path);

  const streams: MediaStreamInfo[] = (parsed.streams ?? []).map((s) => ({
    codecType: s.codec_type ?? "unknown",
    codecName: s.codec_name ?? "unknown",
    width: s.width,
    height: s.height,
    durationSeconds: s.duration ? Number(s.duration) : undefined,
    sampleRate: s.sample_rate ? Number(s.sample_rate) : undefined,
    channels: s.channels,
  }));

  return {
    path,
    formatName: parsed.format?.format_name ?? "unknown",
    durationSeconds: Number(parsed.format?.duration ?? 0),
    sizeBytes: fileStat.size,
    streams,
  };
}
