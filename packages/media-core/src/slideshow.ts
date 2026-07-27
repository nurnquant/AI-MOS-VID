/**
 * Slideshow rendering (AIVS-SLIDESHOW-015): one still illustration per
 * scene, animated with a slow Ken Burns pan/zoom by local ffmpeg. Output
 * matches the synth intermediate format (1280×720@25 h264) so scene
 * clips stay stream-uniform for lossless concat at assembly.
 */
import { runFfmpeg } from "./ffmpeg.ts";
import { SYNTH_FPS, SYNTH_HEIGHT, SYNTH_WIDTH } from "./synthesize.ts";

/** Peak zoom factor — gentle, storybook-calm. */
const MAX_ZOOM = 1.15;

export interface StillImageOptions {
  width?: number;
  height?: number;
  /** Varies the test pattern so distinct scenes look distinct. */
  seed?: number;
}

/** Deterministic local placeholder still (png) — the mock image "model". */
export async function synthesizeStillImage(
  outputPath: string,
  options: StillImageOptions = {},
): Promise<void> {
  const width = options.width ?? SYNTH_WIDTH;
  const height = options.height ?? SYNTH_HEIGHT;
  const offset = (options.seed ?? 0) % 10;
  await runFfmpeg([
    "-y",
    "-f",
    "lavfi",
    "-i",
    `testsrc2=size=${width}x${height}:rate=1:duration=${offset + 1}`,
    "-ss",
    String(offset),
    "-frames:v",
    "1",
    outputPath,
  ]);
}

export interface KenBurnsOptions {
  durationSeconds: number;
  /** Zoom slowly in (default) or out. */
  direction?: "in" | "out";
  width?: number;
  height?: number;
  fps?: number;
}

/**
 * Renders a still image into a video-only mp4 with a slow zoom. The
 * still is upscaled 4× before `zoompan` to avoid sub-pixel jitter.
 * Audio is intentionally absent — the orchestrator muxes narration via
 * `replaceAudioTrack`, which maps only the clip's video stream.
 */
export async function renderKenBurns(
  imagePath: string,
  outputPath: string,
  options: KenBurnsOptions,
): Promise<void> {
  const width = options.width ?? SYNTH_WIDTH;
  const height = options.height ?? SYNTH_HEIGHT;
  const fps = options.fps ?? SYNTH_FPS;
  const duration = Math.max(1, options.durationSeconds);
  const frames = Math.ceil(duration * fps);
  const step = (MAX_ZOOM - 1) / frames;
  const zoom =
    options.direction === "out"
      ? `if(eq(on,0),${MAX_ZOOM},max(zoom-${step.toFixed(6)},1.0))`
      : `min(zoom+${step.toFixed(6)},${MAX_ZOOM})`;
  const filter =
    `scale=${width * 4}:-2,` +
    `zoompan=z='${zoom}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'` +
    `:d=${frames}:s=${width}x${height}:fps=${fps},format=yuv420p`;
  await runFfmpeg([
    "-y",
    "-loop",
    "1",
    "-i",
    imagePath,
    "-vf",
    filter,
    "-t",
    String(duration),
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    outputPath,
  ]);
}
