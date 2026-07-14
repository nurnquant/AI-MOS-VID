import { describe, expect, it } from "vitest";
import { AssetStatus } from "@aivs/database";
import { ALLOWED_TRANSITIONS } from "../src/state-machine.ts";

describe("ALLOWED_TRANSITIONS", () => {
  it("matches the ADR-AIVS-002 lifecycle", () => {
    expect(ALLOWED_TRANSITIONS[AssetStatus.uploaded]).toContain(AssetStatus.quarantined);
    expect(ALLOWED_TRANSITIONS[AssetStatus.quarantined]).toEqual([AssetStatus.validating]);
    expect(ALLOWED_TRANSITIONS[AssetStatus.validating]).toEqual([
      AssetStatus.ready,
      AssetStatus.rejected,
    ]);
    expect(ALLOWED_TRANSITIONS[AssetStatus.ready]).toEqual([AssetStatus.archived]);
    expect(ALLOWED_TRANSITIONS[AssetStatus.archived]).toEqual([]);
  });

  it("allows reprocessing a rejected asset", () => {
    expect(ALLOWED_TRANSITIONS[AssetStatus.rejected]).toEqual([AssetStatus.validating]);
  });

  it("never allows skipping quarantine to ready", () => {
    expect(ALLOWED_TRANSITIONS[AssetStatus.uploaded]).not.toContain(AssetStatus.ready);
    expect(ALLOWED_TRANSITIONS[AssetStatus.quarantined]).not.toContain(AssetStatus.ready);
  });
});
