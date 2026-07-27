/** POLISH-013 unit tests — stubbed fetch + fake prisma, zero network. */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@aivs/database";
import {
  AzureSpeechVoiceProvider,
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
    providerUsage: { create: ReturnType<typeof vi.fn> };
  };
}

function okFetch(bytes = new Uint8Array([1, 2, 3])) {
  return vi.fn(async (_url: unknown, _init?: unknown) => ({
    ok: true,
    status: 200,
    arrayBuffer: async () => bytes.buffer,
    text: async () => "",
  })) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

const CREDS = { key: "k", region: "uaenorth" };

describe("AzureSpeechVoiceProvider", () => {
  it("constructor fails loud without key/region", () => {
    vi.stubEnv("AZURE_SPEECH_KEY", "");
    vi.stubEnv("AZURE_SPEECH_REGION", "");
    expect(() => new AzureSpeechVoiceProvider()).toThrow(/not both set/);
  });

  it("budget preflight blocks before any network call", async () => {
    vi.stubEnv("PROVIDER_DAILY_BUDGET_USD", "");
    vi.stubEnv("PROVIDER_MONTHLY_BUDGET_USD", "");
    const fetchImpl = okFetch();
    const provider = new AzureSpeechVoiceProvider({ ...CREDS, fetchImpl, prisma: fakePrisma() });
    await expect(
      provider.synthesize({ text: "hello", voiceId: "narrator", language: "en", tenantId: "t1" }),
    ).rejects.toBeInstanceOf(ProviderBudgetError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("builds Arabic SSML with the default Arabic neural voice, ledgered in characters", async () => {
    vi.stubEnv("PROVIDER_DAILY_BUDGET_USD", "5");
    vi.stubEnv("PROVIDER_MONTHLY_BUDGET_USD", "50");
    const prisma = fakePrisma();
    const fetchImpl = okFetch();
    const provider = new AzureSpeechVoiceProvider({ ...CREDS, fetchImpl, prisma });

    const text = "بسم الله الرحمن الرحيم";
    const result = await provider.synthesize({
      text,
      voiceId: "narrator", // pipeline VOICE_ID (ElevenLabs id) — must be ignored
      language: "ar",
      tenantId: "t1",
    });

    expect(result.audioUrl).toMatch(/^file:\/\/.+\.mp3$/);
    const url = fetchImpl.mock.calls[0]![0] as string;
    expect(url).toBe("https://uaenorth.tts.speech.microsoft.com/cognitiveservices/v1");
    const body = (fetchImpl.mock.calls[0]![1] as { body: string }).body;
    expect(body).toContain("xml:lang='ar-SA'");
    expect(body).toContain("ar-SA-ZariyahNeural");
    expect(body).toContain(text);

    const row = prisma.providerUsage.create.mock.calls[0]![0].data;
    expect(row).toMatchObject({
      provider: "azure",
      operation: "voice.synthesize",
      units: text.length,
      unitType: "characters",
    });
  });

  it("uses an explicit Azure voice name from the request when given", async () => {
    vi.stubEnv("PROVIDER_DAILY_BUDGET_USD", "5");
    vi.stubEnv("PROVIDER_MONTHLY_BUDGET_USD", "50");
    const fetchImpl = okFetch();
    const provider = new AzureSpeechVoiceProvider({ ...CREDS, fetchImpl, prisma: fakePrisma() });
    await provider.synthesize({
      text: "hi",
      voiceId: "ar-EG-SalmaNeural",
      language: "ar",
      tenantId: "t1",
    });
    const body = (fetchImpl.mock.calls[0]![1] as { body: string }).body;
    expect(body).toContain("ar-EG-SalmaNeural");
  });

  it("non-200 surfaces clearly, nothing recorded", async () => {
    vi.stubEnv("PROVIDER_DAILY_BUDGET_USD", "5");
    vi.stubEnv("PROVIDER_MONTHLY_BUDGET_USD", "50");
    const prisma = fakePrisma();
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 401,
      arrayBuffer: async () => new ArrayBuffer(0),
      text: async () => "invalid key",
    })) as unknown as typeof fetch;
    const provider = new AzureSpeechVoiceProvider({ ...CREDS, fetchImpl, prisma });
    await expect(
      provider.synthesize({ text: "hi", voiceId: "n", language: "en", tenantId: "t1" }),
    ).rejects.toThrow(/azure tts failed \(401\)/);
    expect(prisma.providerUsage.create).not.toHaveBeenCalled();
  });
});

describe("factory: azure registration", () => {
  it("VOICE_PROVIDER=azure without creds throws at resolution", () => {
    vi.stubEnv("VOICE_PROVIDER", "azure");
    vi.stubEnv("AZURE_SPEECH_KEY", "");
    vi.stubEnv("AZURE_SPEECH_REGION", "");
    expect(() => resolveVoiceProvider()).toThrow(/AZURE_SPEECH_KEY/);
  });

  it("VOICE_PROVIDER=azure with creds resolves the adapter", () => {
    vi.stubEnv("VOICE_PROVIDER", "azure");
    vi.stubEnv("AZURE_SPEECH_KEY", "azure-test-not-real");
    vi.stubEnv("AZURE_SPEECH_REGION", "uaenorth");
    expect(resolveVoiceProvider().name).toBe("azure");
  });
});
