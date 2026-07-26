import { afterEach, describe, expect, it, vi } from "vitest";
import {
  budgetFromEnv,
  resolvePublishingProvider,
  resolveScriptProvider,
  resolveVideoProvider,
  resolveVoiceProvider,
} from "../src/index.ts";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("provider factory (ADR-AIVS-009 §1)", () => {
  const slots = [
    { envVar: "SCRIPT_PROVIDER", resolve: resolveScriptProvider, mockName: "mock-script" },
    { envVar: "VIDEO_PROVIDER", resolve: resolveVideoProvider, mockName: "local-synth-video" },
    { envVar: "VOICE_PROVIDER", resolve: resolveVoiceProvider, mockName: "local-synth-voice" },
    { envVar: "PUBLISH_PROVIDER", resolve: resolvePublishingProvider, mockName: "mock-publishing" },
  ] as const;

  for (const slot of slots) {
    it(`${slot.envVar}: unset resolves to ${slot.mockName}`, () => {
      vi.stubEnv(slot.envVar, "");
      expect(slot.resolve().name).toBe(slot.mockName);
    });

    it(`${slot.envVar}: explicit mock resolves to ${slot.mockName}`, () => {
      vi.stubEnv(slot.envVar, "mock");
      expect(slot.resolve().name).toBe(slot.mockName);
    });

    it(`${slot.envVar}: unknown value falls back to ${slot.mockName} (warned)`, () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.stubEnv(slot.envVar, "no-such-provider");
      expect(slot.resolve().name).toBe(slot.mockName);
      expect(warn).toHaveBeenCalledOnce();
      warn.mockRestore();
    });

    it(`${slot.envVar}: whitespace-only value falls back silently`, () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.stubEnv(slot.envVar, "   ");
      expect(slot.resolve().name).toBe(slot.mockName);
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  }
});

describe("budgetFromEnv (fail-closed parsing)", () => {
  it("unset means zero budget", () => {
    vi.stubEnv("PROVIDER_DAILY_BUDGET_USD", "");
    expect(budgetFromEnv("PROVIDER_DAILY_BUDGET_USD")).toBe(0);
  });

  it("non-numeric means zero budget", () => {
    vi.stubEnv("PROVIDER_DAILY_BUDGET_USD", "ten dollars");
    expect(budgetFromEnv("PROVIDER_DAILY_BUDGET_USD")).toBe(0);
  });

  it("negative means zero budget", () => {
    vi.stubEnv("PROVIDER_DAILY_BUDGET_USD", "-5");
    expect(budgetFromEnv("PROVIDER_DAILY_BUDGET_USD")).toBe(0);
  });

  it("valid positive number is used", () => {
    vi.stubEnv("PROVIDER_MONTHLY_BUDGET_USD", "12.50");
    expect(budgetFromEnv("PROVIDER_MONTHLY_BUDGET_USD")).toBe(12.5);
  });
});
