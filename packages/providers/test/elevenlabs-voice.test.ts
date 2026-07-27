/**
 * Phase B unit tests — stubbed fetch + fake prisma, zero network.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@aivs/database";
import {
  ElevenLabsVoiceProvider,
  ProviderBudgetError,
  resolveVoiceProvider,
} from "../src/index.ts";

afterEach(() => {
  vi.unstubAllEnvs();
});

function fakePrisma() {
  return {
    providerUsage: {
      aggregate: vi.fn(async () => ({ _sum: { estimatedCostUsd: 0 } })),
      create: vi.fn(async () => ({})),
    },
    auditEvent: { create: vi.fn(async () => ({})) },
  } as unknown as PrismaClient & {
    providerUsage: { aggregate: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  };
}

function okFetch(bytes = new Uint8Array([1, 2, 3, 4])) {
  return vi.fn(async (_url: unknown, _init?: unknown) => ({
    ok: true,
    status: 200,
    arrayBuffer: async () => bytes.buffer,
    text: async () => "",
  })) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

describe("ElevenLabsVoiceProvider", () => {
  it("constructor fails loud without ELEVENLABS_API_KEY", () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    expect(() => new ElevenLabsVoiceProvider()).toThrow(/ELEVENLABS_API_KEY is not set/);
  });

  it("requires tenantId for budget scoping", async () => {
    const provider = new ElevenLabsVoiceProvider({
      apiKey: "k",
      fetchImpl: okFetch(),
      prisma: fakePrisma(),
    });
    await expect(
      provider.synthesize({ text: "hello", voiceId: "v1", language: "en" }),
    ).rejects.toThrow(/tenantId/);
  });

  it("budget preflight blocks before any network call", async () => {
    vi.stubEnv("PROVIDER_DAILY_BUDGET_USD", "");
    vi.stubEnv("PROVIDER_MONTHLY_BUDGET_USD", "");
    const fetchImpl = okFetch();
    const provider = new ElevenLabsVoiceProvider({
      apiKey: "k",
      fetchImpl,
      prisma: fakePrisma(),
    });
    await expect(
      provider.synthesize({ text: "hello", voiceId: "v1", language: "en", tenantId: "t1" }),
    ).rejects.toBeInstanceOf(ProviderBudgetError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("happy path: writes audio to file:// URL and records characters", async () => {
    vi.stubEnv("PROVIDER_DAILY_BUDGET_USD", "5");
    vi.stubEnv("PROVIDER_MONTHLY_BUDGET_USD", "50");
    const prisma = fakePrisma();
    const fetchImpl = okFetch();
    const provider = new ElevenLabsVoiceProvider({ apiKey: "k", fetchImpl, prisma });

    const text = "In the name of Allah, the Most Merciful.";
    const result = await provider.synthesize({
      text,
      voiceId: "voice-1",
      language: "en",
      tenantId: "t1",
    });

    expect(result.audioUrl).toMatch(/^file:\/\/.+\.mp3$/);
    const url = (fetchImpl.mock.calls[0]![0] as string) ?? "";
    expect(url).toContain("/text-to-speech/voice-1");

    expect(prisma.providerUsage.create).toHaveBeenCalledOnce();
    const row = prisma.providerUsage.create.mock.calls[0]![0].data;
    expect(row).toMatchObject({
      provider: "elevenlabs",
      operation: "voice.synthesize",
      units: text.length,
      unitType: "characters",
    });
    expect(row.estimatedCostUsd).toBeCloseTo((text.length / 1000) * 0.3);
  });

  it("non-200 response surfaces as a clear error, nothing recorded", async () => {
    vi.stubEnv("PROVIDER_DAILY_BUDGET_USD", "5");
    vi.stubEnv("PROVIDER_MONTHLY_BUDGET_USD", "50");
    const prisma = fakePrisma();
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 401,
      arrayBuffer: async () => new ArrayBuffer(0),
      text: async () => "invalid api key",
    })) as unknown as typeof fetch;
    const provider = new ElevenLabsVoiceProvider({ apiKey: "k", fetchImpl, prisma });
    await expect(
      provider.synthesize({ text: "hi", voiceId: "v1", language: "en", tenantId: "t1" }),
    ).rejects.toThrow(/elevenlabs synthesis failed \(401\)/);
    expect(prisma.providerUsage.create).not.toHaveBeenCalled();
  });

  it("empty audio surfaces as a clear error", async () => {
    vi.stubEnv("PROVIDER_DAILY_BUDGET_USD", "5");
    vi.stubEnv("PROVIDER_MONTHLY_BUDGET_USD", "50");
    const provider = new ElevenLabsVoiceProvider({
      apiKey: "k",
      fetchImpl: okFetch(new Uint8Array(0)),
      prisma: fakePrisma(),
    });
    await expect(
      provider.synthesize({ text: "hi", voiceId: "v1", language: "en", tenantId: "t1" }),
    ).rejects.toThrow(/empty audio/);
  });
});

describe("factory: elevenlabs registration", () => {
  it("VOICE_PROVIDER=elevenlabs without key throws at resolution", () => {
    vi.stubEnv("VOICE_PROVIDER", "elevenlabs");
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    expect(() => resolveVoiceProvider()).toThrow(/ELEVENLABS_API_KEY/);
  });

  it("VOICE_PROVIDER=elevenlabs with key resolves the real adapter", () => {
    vi.stubEnv("VOICE_PROVIDER", "elevenlabs");
    vi.stubEnv("ELEVENLABS_API_KEY", "el-test-not-real");
    expect(resolveVoiceProvider().name).toBe("elevenlabs");
  });
});
