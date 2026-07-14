import { describe, expect, it } from "vitest";
import {
  DEFAULT_JOB_OPTIONS,
  JOB_NAMES,
  QUEUES,
  deterministicJobId,
  redisConnectionFromEnv,
} from "../src/index.ts";

describe("queue configuration", () => {
  it("names match ADR-AIVS-002 topology", () => {
    expect(QUEUES.assetValidation).toBe("asset-validation");
    expect(QUEUES.mediaProcessing).toBe("media-processing");
  });

  it("retry policy is 3 attempts with exponential backoff from 5s", () => {
    expect(DEFAULT_JOB_OPTIONS.attempts).toBe(3);
    expect(DEFAULT_JOB_OPTIONS.backoff).toEqual({ type: "exponential", delay: 5_000 });
    expect(DEFAULT_JOB_OPTIONS.removeOnFail).toBe(false);
  });

  it("job ids are deterministic per (name, asset, epoch)", () => {
    const a = deterministicJobId(JOB_NAMES.validateAsset, "asset-1", 1);
    expect(a).toBe("validate-asset:asset-1:1");
    expect(deterministicJobId(JOB_NAMES.validateAsset, "asset-1", 1)).toBe(a);
    expect(deterministicJobId(JOB_NAMES.validateAsset, "asset-1", 2)).not.toBe(a);
  });

  it("parses REDIS_URL", () => {
    const conn = redisConnectionFromEnv({ REDIS_URL: "redis://example.test:7000" });
    expect(conn).toMatchObject({ host: "example.test", port: 7000 });
  });
});
