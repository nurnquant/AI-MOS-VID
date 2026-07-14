import { describe, expect, it } from "vitest";
import { buildAssetKey, isQuarantineKey, keyBelongsToTenant } from "../src/keys.ts";

const parts = {
  tenantId: "00000000-0000-4000-8000-000000000001",
  projectId: "00000000-0000-4000-8000-000000000002",
  assetId: "11111111-1111-4111-8111-111111111111",
  objectId: "22222222-2222-4222-8222-222222222222",
  ext: "mp4",
};

describe("buildAssetKey", () => {
  it("builds tenant-namespaced quarantine keys", () => {
    expect(buildAssetKey("quarantine", parts)).toBe(
      `quarantine/tenant/${parts.tenantId}/project/${parts.projectId}/asset/${parts.assetId}/${parts.objectId}.mp4`,
    );
  });

  it("rejects path traversal and injection in every part", () => {
    expect(() => buildAssetKey("assets", { ...parts, ext: "../evil" })).toThrow(/Invalid/);
    expect(() => buildAssetKey("assets", { ...parts, tenantId: "a/b" })).toThrow(/Invalid/);
    expect(() => buildAssetKey("assets", { ...parts, objectId: "x y" })).toThrow(/Invalid/);
    expect(() => buildAssetKey("assets", { ...parts, projectId: "" })).toThrow(/Invalid/);
  });
});

describe("key predicates", () => {
  it("detects quarantine keys", () => {
    expect(isQuarantineKey(buildAssetKey("quarantine", parts))).toBe(true);
    expect(isQuarantineKey(buildAssetKey("assets", parts))).toBe(false);
  });

  it("enforces tenant namespace", () => {
    const key = buildAssetKey("assets", parts);
    expect(keyBelongsToTenant(key, parts.tenantId)).toBe(true);
    expect(keyBelongsToTenant(key, "other-tenant")).toBe(false);
  });
});
