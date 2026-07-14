/** The 7 platform normalization presets (ADR-AIVS-002 §6). */

export interface PlatformPreset {
  name: string;
  width: number;
  height: number;
  fps: number;
  aspect: "16:9" | "9:16" | "1:1";
}

export const PLATFORM_PRESETS = {
  "youtube-1080p": { name: "youtube-1080p", width: 1920, height: 1080, fps: 30, aspect: "16:9" },
  "youtube-shorts": { name: "youtube-shorts", width: 1080, height: 1920, fps: 30, aspect: "9:16" },
  "instagram-reels": {
    name: "instagram-reels",
    width: 1080,
    height: 1920,
    fps: 30,
    aspect: "9:16",
  },
  "instagram-feed": { name: "instagram-feed", width: 1080, height: 1080, fps: 30, aspect: "1:1" },
  "facebook-feed": { name: "facebook-feed", width: 1080, height: 1080, fps: 30, aspect: "1:1" },
  tiktok: { name: "tiktok", width: 1080, height: 1920, fps: 30, aspect: "9:16" },
  "whatsapp-status": {
    name: "whatsapp-status",
    width: 1080,
    height: 1920,
    fps: 30,
    aspect: "9:16",
  },
} as const satisfies Record<string, PlatformPreset>;

export type PlatformPresetName = keyof typeof PLATFORM_PRESETS;

export function getPreset(name: string): PlatformPreset {
  const preset = (PLATFORM_PRESETS as Record<string, PlatformPreset>)[name];
  if (!preset) {
    throw new Error(
      `Unknown platform preset "${name}". Valid: ${Object.keys(PLATFORM_PRESETS).join(", ")}`,
    );
  }
  return preset;
}
