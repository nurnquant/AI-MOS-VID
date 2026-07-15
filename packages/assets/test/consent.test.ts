import { describe, expect, it } from "vitest";
import { getConsentStatus } from "../src/consent.ts";

const now = new Date("2026-07-15T12:00:00Z");
const future = new Date("2026-08-01T00:00:00Z");
const past = new Date("2026-07-01T00:00:00Z");

describe("getConsentStatus", () => {
  it("derives active for unrevoked, unexpired records", () => {
    expect(getConsentStatus({ revokedAt: null, expiresAt: future }, now)).toBe("active");
  });

  it("derives expired at or past the expiry instant", () => {
    expect(getConsentStatus({ revokedAt: null, expiresAt: past }, now)).toBe("expired");
    expect(getConsentStatus({ revokedAt: null, expiresAt: now }, now)).toBe("expired");
  });

  it("revocation wins over everything, even before expiry", () => {
    expect(getConsentStatus({ revokedAt: past, expiresAt: future }, now)).toBe("revoked");
    expect(getConsentStatus({ revokedAt: past, expiresAt: past }, now)).toBe("revoked");
  });
});
