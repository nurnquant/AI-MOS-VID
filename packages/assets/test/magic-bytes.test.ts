import { describe, expect, it } from "vitest";
import { MediaKind } from "@aivs/database";
import { SNIFF_LENGTH, sniffMediaType } from "../src/magic-bytes.ts";

function bytes(...values: (number | string)[]): Uint8Array {
  const out: number[] = [];
  for (const v of values) {
    if (typeof v === "string") out.push(...[...v].map((c) => c.charCodeAt(0)));
    else out.push(v);
  }
  while (out.length < SNIFF_LENGTH) out.push(0);
  return new Uint8Array(out);
}

describe("sniffMediaType", () => {
  it("detects mp4 via ftyp box", () => {
    const detected = sniffMediaType(bytes(0, 0, 0, 0x20, "ftypisom"));
    expect(detected).toMatchObject({ kind: MediaKind.video, ext: "mp4", contentType: "video/mp4" });
  });

  it("detects mov via qt brand", () => {
    expect(sniffMediaType(bytes(0, 0, 0, 0x14, "ftypqt  "))).toMatchObject({ ext: "mov" });
  });

  it("detects webm via EBML header", () => {
    expect(sniffMediaType(bytes(0x1a, 0x45, 0xdf, 0xa3))).toMatchObject({
      kind: MediaKind.video,
      ext: "webm",
    });
  });

  it("distinguishes the three RIFF formats", () => {
    expect(sniffMediaType(bytes("RIFF", 0, 0, 0, 0, "WEBP"))).toMatchObject({
      kind: MediaKind.image,
      ext: "webp",
    });
    expect(sniffMediaType(bytes("RIFF", 0, 0, 0, 0, "WAVE"))).toMatchObject({
      kind: MediaKind.audio,
      ext: "wav",
    });
    expect(sniffMediaType(bytes("RIFF", 0, 0, 0, 0, "AVI "))).toBeNull();
  });

  it("detects jpeg, png, mp3, flac, aac", () => {
    expect(sniffMediaType(bytes(0xff, 0xd8, 0xff, 0xe0))).toMatchObject({ ext: "jpg" });
    expect(sniffMediaType(bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a))).toMatchObject({
      ext: "png",
    });
    expect(sniffMediaType(bytes("ID3"))).toMatchObject({ ext: "mp3" });
    expect(sniffMediaType(bytes(0xff, 0xfb))).toMatchObject({ ext: "mp3" });
    expect(sniffMediaType(bytes("fLaC"))).toMatchObject({ ext: "flac" });
    expect(sniffMediaType(bytes(0xff, 0xf1))).toMatchObject({ ext: "aac" });
  });

  it("rejects SVG and anything unrecognized", () => {
    expect(sniffMediaType(bytes("<svg xmlns=..."))).toBeNull();
    expect(sniffMediaType(bytes("MZ", 0x90, 0))).toBeNull();
    expect(sniffMediaType(new Uint8Array(2))).toBeNull();
  });
});
