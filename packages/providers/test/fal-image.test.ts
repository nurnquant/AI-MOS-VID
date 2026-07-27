/**
 * SLIDESHOW-015 unit tests — stubbed fetch + fake prisma, zero network.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@aivs/database";
import { FalImageProvider, ProviderBudgetError, resolveImageProvider } from "../src/index.ts";

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

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status < 400,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function sequencedFetch(responses: unknown[]) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  let call = 0;
  const impl = vi.fn(async (url: unknown, init?: unknown) => {
    calls.push({ url: String(url), init: init as RequestInit });
    const response = responses[Math.min(call, responses.length - 1)];
    call += 1;
    return response;
  });
  return Object.assign(impl as unknown as typeof fetch & ReturnType<typeof vi.fn>, { calls });
}

describe("FalImageProvider", () => {
  it("constructor fails loud without FAL_API_KEY", () => {
    vi.stubEnv("FAL_API_KEY", "");
    expect(() => new FalImageProvider()).toThrow(/FAL_API_KEY is not set/);
  });

  it("generate requires tenantId", async () => {
    const provider = new FalImageProvider({
      apiKey: "k",
      fetchImpl: sequencedFetch([jsonResponse({ request_id: "r1" })]),
      prisma: fakePrisma(),
    });
    await expect(provider.generate({ prompt: "p", aspectRatio: "16:9" })).rejects.toThrow(
      /tenantId/,
    );
  });

  it("budget preflight blocks before any network call (fail closed)", async () => {
    vi.stubEnv("PROVIDER_DAILY_BUDGET_USD", "");
    vi.stubEnv("PROVIDER_MONTHLY_BUDGET_USD", "");
    const fetchImpl = sequencedFetch([jsonResponse({ request_id: "r1" })]);
    const provider = new FalImageProvider({ apiKey: "k", fetchImpl, prisma: fakePrisma() });
    await expect(
      provider.generate({ prompt: "p", aspectRatio: "16:9", tenantId: "t1" }),
    ).rejects.toBeInstanceOf(ProviderBudgetError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("generate submits the aspect-mapped size, records one images row, returns the url", async () => {
    vi.stubEnv("PROVIDER_DAILY_BUDGET_USD", "5");
    vi.stubEnv("PROVIDER_MONTHLY_BUDGET_USD", "50");
    const prisma = fakePrisma();
    const fetchImpl = sequencedFetch([
      jsonResponse({ request_id: "img-7" }),
      jsonResponse({ status: "IN_PROGRESS" }),
      jsonResponse({ status: "COMPLETED" }),
      jsonResponse({ images: [{ url: "https://fal.media/files/still.png" }] }),
    ]);
    const provider = new FalImageProvider({
      apiKey: "k",
      fetchImpl,
      prisma,
      pollIntervalMs: 1,
    });

    const result = await provider.generate({
      prompt: "mosque garden watercolor",
      aspectRatio: "9:16",
      tenantId: "t1",
    });
    expect(result.imageUrl).toBe("https://fal.media/files/still.png");

    const submit = fetchImpl.calls[0]!;
    expect(submit.url).toBe("https://queue.fal.run/fal-ai/flux/schnell");
    expect(JSON.parse(String(submit.init?.body))).toMatchObject({
      prompt: "mosque garden watercolor",
      image_size: "portrait_16_9",
      num_images: 1,
    });
    // Status/result address the APP id, not the full model path (405 otherwise).
    expect(fetchImpl.calls[1]!.url).toBe("https://queue.fal.run/fal-ai/flux/requests/img-7/status");
    expect(fetchImpl.calls[3]!.url).toBe("https://queue.fal.run/fal-ai/flux/requests/img-7");

    const row = prisma.providerUsage.create.mock.calls[0]![0].data;
    expect(row).toMatchObject({
      provider: "fal-image",
      operation: "image.generate",
      units: 1,
      unitType: "images",
      jobId: "img-7",
    });
    expect(row.estimatedCostUsd).toBeCloseTo(0.005);
  });

  it("completion without an https url throws", async () => {
    vi.stubEnv("PROVIDER_DAILY_BUDGET_USD", "5");
    vi.stubEnv("PROVIDER_MONTHLY_BUDGET_USD", "50");
    const fetchImpl = sequencedFetch([
      jsonResponse({ request_id: "img-8" }),
      jsonResponse({ status: "COMPLETED" }),
      jsonResponse({ images: [{}] }),
    ]);
    const provider = new FalImageProvider({ apiKey: "k", fetchImpl, prisma: fakePrisma() });
    await expect(
      provider.generate({ prompt: "p", aspectRatio: "16:9", tenantId: "t1" }),
    ).rejects.toThrow(/no https image url/);
  });

  it("submit error surfaces status + detail, nothing recorded", async () => {
    vi.stubEnv("PROVIDER_DAILY_BUDGET_USD", "5");
    vi.stubEnv("PROVIDER_MONTHLY_BUDGET_USD", "50");
    const prisma = fakePrisma();
    const fetchImpl = sequencedFetch([jsonResponse({ detail: "invalid key" }, 401)]);
    const provider = new FalImageProvider({ apiKey: "k", fetchImpl, prisma });
    await expect(
      provider.generate({ prompt: "p", aspectRatio: "16:9", tenantId: "t1" }),
    ).rejects.toThrow(/fal image submit failed \(401\)/);
    expect(prisma.providerUsage.create).not.toHaveBeenCalled();
  });
});

describe("factory: image + slideshow registration", () => {
  it("IMAGE_PROVIDER defaults to the mock", () => {
    vi.stubEnv("IMAGE_PROVIDER", "");
    expect(resolveImageProvider().name).toBe("mock-image");
  });

  it("IMAGE_PROVIDER=fal without key throws at resolution", () => {
    vi.stubEnv("IMAGE_PROVIDER", "fal");
    vi.stubEnv("FAL_API_KEY", "");
    expect(() => resolveImageProvider()).toThrow(/FAL_API_KEY/);
  });

  it("IMAGE_PROVIDER=fal with key resolves the real adapter", () => {
    vi.stubEnv("IMAGE_PROVIDER", "fal");
    vi.stubEnv("FAL_API_KEY", "fal-test-not-real");
    expect(resolveImageProvider().name).toBe("fal-image");
  });
});
