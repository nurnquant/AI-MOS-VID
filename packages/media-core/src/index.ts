export { runProcess, runFfmpeg, type FfmpegRunResult } from "./ffmpeg.ts";
export { inspectMedia } from "./inspect.ts";
export {
  normalizeVideo,
  generateThumbnail,
  type NormalizeOptions,
  type ThumbnailOptions,
} from "./transform.ts";
export {
  PLATFORM_PRESETS,
  getPreset,
  type PlatformPreset,
  type PlatformPresetName,
} from "./presets.ts";
export {
  SYNTH_FPS,
  SYNTH_HEIGHT,
  SYNTH_WIDTH,
  concatClips,
  muxClip,
  synthesizeToneAudio,
  synthesizeVideoTrack,
  type SynthVideoOptions,
} from "./synthesize.ts";
