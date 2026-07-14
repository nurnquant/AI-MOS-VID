/**
 * Magic-byte sniffing for the media allowlist (security baseline §1/§4).
 * Never trusts the client Content-Type — the detected type drives the
 * stored extension and all downstream handling. No SVG by design.
 */
import { MediaKind } from "@aivs/database";

export interface DetectedType {
  kind: MediaKind;
  ext: string;
  contentType: string;
}

/** Bytes needed to classify any supported container. */
export const SNIFF_LENGTH = 16;

function hasBytes(buffer: Uint8Array, offset: number, bytes: number[]): boolean {
  return bytes.every((b, i) => buffer[offset + i] === b);
}

function hasAscii(buffer: Uint8Array, offset: number, text: string): boolean {
  return hasBytes(
    buffer,
    offset,
    [...text].map((c) => c.charCodeAt(0)),
  );
}

export function sniffMediaType(buffer: Uint8Array): DetectedType | null {
  if (buffer.length < SNIFF_LENGTH) return null;

  // --- video ---
  // mp4 / mov: size(4) + "ftyp" + major brand
  if (hasAscii(buffer, 4, "ftyp")) {
    const brand = new TextDecoder().decode(buffer.subarray(8, 12));
    if (brand.startsWith("qt")) {
      return { kind: MediaKind.video, ext: "mov", contentType: "video/quicktime" };
    }
    return { kind: MediaKind.video, ext: "mp4", contentType: "video/mp4" };
  }
  // webm (EBML header, shared with mkv — accepted as webm per allowlist)
  if (hasBytes(buffer, 0, [0x1a, 0x45, 0xdf, 0xa3])) {
    return { kind: MediaKind.video, ext: "webm", contentType: "video/webm" };
  }

  // --- image (checked before audio: RIFF is shared by wav and webp) ---
  if (hasBytes(buffer, 0, [0xff, 0xd8, 0xff])) {
    return { kind: MediaKind.image, ext: "jpg", contentType: "image/jpeg" };
  }
  if (hasBytes(buffer, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { kind: MediaKind.image, ext: "png", contentType: "image/png" };
  }
  if (hasAscii(buffer, 0, "RIFF") && hasAscii(buffer, 8, "WEBP")) {
    return { kind: MediaKind.image, ext: "webp", contentType: "image/webp" };
  }

  // --- audio ---
  if (hasAscii(buffer, 0, "RIFF") && hasAscii(buffer, 8, "WAVE")) {
    return { kind: MediaKind.audio, ext: "wav", contentType: "audio/wav" };
  }
  if (hasAscii(buffer, 0, "fLaC")) {
    return { kind: MediaKind.audio, ext: "flac", contentType: "audio/flac" };
  }
  if (hasAscii(buffer, 0, "ID3")) {
    return { kind: MediaKind.audio, ext: "mp3", contentType: "audio/mpeg" };
  }
  // Frame-sync headers: mp3 (FF Ex/FF Fx with layer III) or ADTS AAC (FF F1/FF F9)
  if (buffer[0] === 0xff && buffer[1] !== undefined) {
    const second = buffer[1];
    if (second === 0xf1 || second === 0xf9) {
      return { kind: MediaKind.audio, ext: "aac", contentType: "audio/aac" };
    }
    if ((second & 0xe0) === 0xe0) {
      return { kind: MediaKind.audio, ext: "mp3", contentType: "audio/mpeg" };
    }
  }

  return null;
}
