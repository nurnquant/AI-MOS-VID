/**
 * Placeholder operations for future media pipeline work.
 * These define the contracts; real implementations arrive in later modules.
 */

export interface NormalizeOptions {
  targetWidth: number;
  targetHeight: number;
  targetFps: number;
}

export interface ThumbnailOptions {
  atSeconds: number;
  width: number;
}

export async function normalizeVideo(
  _inputPath: string,
  _outputPath: string,
  _options: NormalizeOptions,
): Promise<never> {
  throw new Error(
    "normalizeVideo is not implemented in the environment-setup phase (AIVS-ENV-001)",
  );
}

export async function generateThumbnail(
  _inputPath: string,
  _outputPath: string,
  _options: ThumbnailOptions,
): Promise<never> {
  throw new Error(
    "generateThumbnail is not implemented in the environment-setup phase (AIVS-ENV-001)",
  );
}
