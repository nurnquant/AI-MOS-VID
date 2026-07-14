/** Shared foundation types for the AIVS platform. */

export type MediaKind = "video" | "audio" | "image";

export interface MediaStreamInfo {
  codecType: string;
  codecName: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  sampleRate?: number;
  channels?: number;
}

export interface MediaMetadata {
  path: string;
  formatName: string;
  durationSeconds: number;
  sizeBytes: number;
  streams: MediaStreamInfo[];
}

export interface TestJobPayload {
  kind: "environment-smoke";
  requestedAt: string;
  message: string;
}

export interface TestJobResult {
  ok: boolean;
  processedAt: string;
  echo: string;
}
