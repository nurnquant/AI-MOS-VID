/** Size/duration limits per media kind (security baseline §2). */
import { MediaKind } from "@aivs/database";

export interface KindLimits {
  maxSizeBytes: number;
  maxDurationSeconds?: number;
}

export const MEDIA_LIMITS: Readonly<Record<MediaKind, KindLimits>> = {
  [MediaKind.video]: { maxSizeBytes: 2 * 1024 ** 3, maxDurationSeconds: 15 * 60 },
  [MediaKind.audio]: { maxSizeBytes: 200 * 1024 ** 2 },
  [MediaKind.image]: { maxSizeBytes: 25 * 1024 ** 2 },
};

/** Streaming cap before the detected kind is known: the largest allowed upload. */
export const MAX_UPLOAD_BYTES = MEDIA_LIMITS[MediaKind.video].maxSizeBytes;

export function checkLimits(
  kind: MediaKind,
  sizeBytes: number,
  durationSeconds?: number,
): string | null {
  const limits = MEDIA_LIMITS[kind];
  if (sizeBytes > limits.maxSizeBytes) {
    return `size ${sizeBytes} exceeds ${kind} limit ${limits.maxSizeBytes}`;
  }
  if (
    limits.maxDurationSeconds !== undefined &&
    durationSeconds !== undefined &&
    durationSeconds > limits.maxDurationSeconds
  ) {
    return `duration ${durationSeconds}s exceeds ${kind} limit ${limits.maxDurationSeconds}s`;
  }
  return null;
}

/** Strip control characters and path separators; display metadata only. */
export function sanitizeDisplayName(raw: string): string {
  const cleaned = [...raw]
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code >= 0x20 && code !== 0x7f && ch !== "/" && ch !== "\\";
    })
    .join("")
    .trim();
  return (cleaned || "untitled").slice(0, 255);
}
