/**
 * Phase A unit tests — fake SDK client + fake prisma, zero network.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import type { PrismaClient } from "@aivs/database";
import {
  AnthropicScriptProvider,
  ProviderBudgetError,
  resolveScriptProvider,
} from "../src/index.ts";

afterEach(() => {
  vi.unstubAllEnvs();
});

function fakePrisma(spentUsd = 0) {
  return {
    providerUsage: {
      aggregate: vi.fn(async () => ({ _sum: { estimatedCostUsd: spentUsd } })),
      create: vi.fn(async () => ({})),
    },
    auditEvent: {
      create: vi.fn(async () => ({})),
    },
  } as unknown as PrismaClient & {
    providerUsage: { aggregate: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
    auditEvent: { create: ReturnType<typeof vi.fn> };
  };
}

function fakeClient(response: unknown) {
  const parse = vi.fn(async (_params: unknown) => response);
  return { client: { messages: { parse } } as unknown as Anthropic, parse };
}

const okResponse = {
  stop_reason: "end_turn",
  usage: { input_tokens: 900, output_tokens: 2100 },
  parsed_output: {
    scenes: [
      { narration: "Hello", visualDescription: "Title card", durationTargetSeconds: 8 },
      { narration: "Bye", visualDescription: "Closing card", durationTargetSeconds: 3 },
    ],
  },
};

describe("AnthropicScriptProvider", () => {
  it("constructor fails loud without ANTHROPIC_API_KEY", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(() => new AnthropicScriptProvider()).toThrow(/ANTHROPIC_API_KEY is not set/);
  });

  it("requires tenantId for budget scoping", async () => {
    const { client } = fakeClient(okResponse);
    const provider = new AnthropicScriptProvider({ client, prisma: fakePrisma() });
    await expect(provider.generate({ brief: "water cycle", language: "en" })).rejects.toThrow(
      /tenantId/,
    );
  });

  it("budget preflight blocks the call before the SDK is touched", async () => {
    vi.stubEnv("PROVIDER_DAILY_BUDGET_USD", "");
    vi.stubEnv("PROVIDER_MONTHLY_BUDGET_USD", "");
    const { client, parse } = fakeClient(okResponse);
    const provider = new AnthropicScriptProvider({ client, prisma: fakePrisma() });
    await expect(
      provider.generate({ brief: "water cycle", language: "en", tenantId: "t1" }),
    ).rejects.toBeInstanceOf(ProviderBudgetError);
    expect(parse).not.toHaveBeenCalled();
  });

  it("happy path: parses scenes, clamps durations, records actual usage", async () => {
    vi.stubEnv("PROVIDER_DAILY_BUDGET_USD", "5");
    vi.stubEnv("PROVIDER_MONTHLY_BUDGET_USD", "50");
    const prisma = fakePrisma();
    const { client, parse } = fakeClient(okResponse);
    const provider = new AnthropicScriptProvider({ client, prisma });

    const result = await provider.generate({
      brief: "the five pillars",
      language: "ar",
      sceneCount: 2,
      tenantId: "t1",
    });

    expect(result.scenes).toHaveLength(2);
    expect(result.scenes[1]!.durationTargetSeconds).toBe(5); // 3 clamped up

    expect(parse).toHaveBeenCalledOnce();
    const call = parse.mock.calls[0]![0] as unknown as { model: string; system: string };
    expect(call.model).toBe("claude-opus-5");
    expect(call.system).toContain("exactly 2");
    expect(call.system).toContain("Arabic");

    // Ledger: actual token usage recorded with cost estimate
    expect(prisma.providerUsage.create).toHaveBeenCalledOnce();
    const row = prisma.providerUsage.create.mock.calls[0]![0].data;
    expect(row).toMatchObject({ provider: "anthropic", operation: "script.generate", units: 3000 });
    expect(row.estimatedCostUsd).toBeCloseTo((900 / 1e6) * 5 + (2100 / 1e6) * 25);
  });

  it("safety refusal surfaces as a clear error (after usage is recorded)", async () => {
    vi.stubEnv("PROVIDER_DAILY_BUDGET_USD", "5");
    vi.stubEnv("PROVIDER_MONTHLY_BUDGET_USD", "50");
    const prisma = fakePrisma();
    const { client } = fakeClient({
      stop_reason: "refusal",
      usage: { input_tokens: 500, output_tokens: 0 },
      parsed_output: null,
    });
    const provider = new AnthropicScriptProvider({ client, prisma });
    await expect(
      provider.generate({ brief: "topic", language: "en", tenantId: "t1" }),
    ).rejects.toThrow(/refusal/);
    expect(prisma.providerUsage.create).toHaveBeenCalledOnce();
  });

  it("empty parse result surfaces as a clear error", async () => {
    vi.stubEnv("PROVIDER_DAILY_BUDGET_USD", "5");
    vi.stubEnv("PROVIDER_MONTHLY_BUDGET_USD", "50");
    const { client } = fakeClient({
      stop_reason: "max_tokens",
      usage: { input_tokens: 500, output_tokens: 16000 },
      parsed_output: null,
    });
    const provider = new AnthropicScriptProvider({ client, prisma: fakePrisma() });
    await expect(
      provider.generate({ brief: "topic", language: "en", tenantId: "t1" }),
    ).rejects.toThrow(/no parseable scenes/);
  });
});

describe("factory: anthropic registration", () => {
  it("SCRIPT_PROVIDER=anthropic without key throws at resolution", () => {
    vi.stubEnv("SCRIPT_PROVIDER", "anthropic");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(() => resolveScriptProvider()).toThrow(/ANTHROPIC_API_KEY/);
  });

  it("SCRIPT_PROVIDER=anthropic with key resolves the real adapter", () => {
    vi.stubEnv("SCRIPT_PROVIDER", "anthropic");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-not-real");
    expect(resolveScriptProvider().name).toBe("anthropic");
  });
});
