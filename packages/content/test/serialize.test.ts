import { describe, expect, it } from "vitest";
import { MembershipRole } from "@aivs/database";
import { serializeScene } from "../src/scripts.ts";

const baseScene = {
  id: "scene-1",
  scriptId: "script-1",
  position: 0,
  narration: "n",
  visualDescription: "v",
  durationTargetSeconds: 10,
  referenceAssetId: "asset-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("serializeScene child-media masking", () => {
  it("masks featuresMinor references below child_media_reviewer", () => {
    const scene = {
      ...baseScene,
      referenceAsset: { id: "asset-1", displayName: "minor.mp4", featuresMinor: true },
    };
    const asEditor = serializeScene(scene, MembershipRole.editor);
    expect(asEditor).toMatchObject({
      referenceAssetId: null,
      referenceAssetName: null,
      referenceMasked: true,
    });
    const asReviewer = serializeScene(scene, MembershipRole.child_media_reviewer);
    expect(asReviewer).toMatchObject({
      referenceAssetId: "asset-1",
      referenceAssetName: "minor.mp4",
      referenceMasked: false,
    });
  });

  it("never masks non-minor references", () => {
    const scene = {
      ...baseScene,
      referenceAsset: { id: "asset-1", displayName: "lesson.mp4", featuresMinor: false },
    };
    expect(serializeScene(scene, MembershipRole.viewer)).toMatchObject({
      referenceAssetId: "asset-1",
      referenceMasked: false,
    });
  });

  it("handles scenes without references", () => {
    const scene = { ...baseScene, referenceAssetId: null, referenceAsset: null };
    expect(serializeScene(scene, MembershipRole.viewer)).toMatchObject({
      referenceAssetId: null,
      referenceMasked: false,
    });
  });
});
