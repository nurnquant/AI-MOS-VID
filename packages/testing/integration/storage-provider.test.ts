/** Round-trips MinioStorageProvider against the live local MinIO. */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MinioStorageProvider, buildAssetKey, storageConfigFromEnv } from "@aivs/storage";

const provider = new MinioStorageProvider({
  ...storageConfigFromEnv({
    S3_ENDPOINT: process.env.S3_ENDPOINT ?? "http://localhost:9000",
    S3_BUCKET: process.env.S3_BUCKET ?? "aivs-assets",
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID ?? "aivs_local",
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY ?? "aivs_local_secret",
  }),
});

const parts = {
  tenantId: "00000000-0000-4000-8000-000000000001",
  projectId: "00000000-0000-4000-8000-000000000002",
  assetId: randomUUID(),
  objectId: randomUUID(),
  ext: "bin",
};
const quarantineKey = buildAssetKey("quarantine", parts);
const assetsKey = buildAssetKey("assets", parts);
const body = new TextEncoder().encode("aivs storage integration fixture");

beforeAll(async () => {
  await provider.ensureBucket();
});

afterAll(async () => {
  await provider.deleteObject(quarantineKey).catch(() => {});
  await provider.deleteObject(assetsKey).catch(() => {});
  provider.destroy();
});

describe("MinioStorageProvider", () => {
  it("puts, heads, and gets an object", async () => {
    await provider.putObject(quarantineKey, body, "application/octet-stream");
    expect(await provider.objectExists(quarantineKey)).toBe(true);
    expect(await provider.objectSize(quarantineKey)).toBe(body.byteLength);
    expect(new TextDecoder().decode(await provider.getObject(quarantineKey))).toContain(
      "integration fixture",
    );
  });

  it("copies quarantine → assets (promotion path) and deletes the source", async () => {
    await provider.copyObject(quarantineKey, assetsKey);
    expect(await provider.objectExists(assetsKey)).toBe(true);
    await provider.deleteObject(quarantineKey);
    expect(await provider.objectExists(quarantineKey)).toBe(false);
  });

  it("serves reads through a time-limited signed URL", async () => {
    const url = await provider.getSignedUrl(assetsKey, 60);
    expect(url).toContain("X-Amz-Expires=60");
    const response = await fetch(url);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("integration fixture");
  });

  it("caps signed URL TTL at 24h", async () => {
    const url = await provider.getSignedUrl(assetsKey, 999_999_999);
    expect(url).toContain(`X-Amz-Expires=${24 * 60 * 60}`);
  });
});
