/**
 * Phase C unit tests — stubbed fetch + fake prisma, zero network.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@aivs/database";
import {
  FalVideoProvider,
  ProviderBudgetError,
  pickFalDuration,
  resolveVideoProvider,
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

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status < 400,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function sequencedFetch(responses: unknown[]) {
  let call = 0;
  const impl = vi.fn(async (_url: unknown, _init?: unknown) => {
    const response = responses[Math.min(call, responses.length - 1)];
    call += 1;
    return response;
  });
  return impl as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

describe("pickFalDuration", () => {
  it("maps narration lengths onto allowed clip lengths", () => {
    expect(pickFalDuration(3)).toBe(5);
    expect(pickFalDuration(5)).toBe(5);
    expect(pickFalDuration(7)).toBe(10);
    expect(pickFalDuration(18)).toBe(10);
  });
});

describe("FalVideoProvider", () => {
  it("constructor fails loud without FAL_API_KEY", () => {
    vi.stubEnv("FAL_API_KEY", "");
    expect(() => new FalVideoProvider()).toThrow(/FAL_API_KEY is not set/);
  });

  it("submit requires tenantId", async () => {
    const provider = new FalVideoProvider({
      apiKey: "k",
      fetchImpl: sequencedFetch([jsonResponse({ request_id: "r1" })]),
      prisma: fakePrisma(),
    });
    await expect(
      provider.submit({ prompt: "p", durationSeconds: 8, aspectRatio: "16:9" }),
    ).rejects.toThrow(/tenantId/);
  });

  it("budget preflight blocks submit before any network call", async () => {
    vi.stubEnv("PROVIDER_DAILY_BUDGET_USD", "");
    vi.stubEnv("PROVIDER_MONTHLY_BUDGET_USD", "");
    const fetchImpl = sequencedFetch([jsonResponse({ request_id: "r1" })]);
    const provider = new FalVideoProvider({ apiKey: "k", fetchImpl, prisma: fakePrisma() });
    await expect(
      provider.submit({ prompt: "p", durationSeconds: 8, aspectRatio: "16:9", tenantId: "t1" }),
    ).rejects.toBeInstanceOf(ProviderBudgetError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("submit records seconds committed in the ledger at submit time", async () => {
    vi.stubEnv("PROVIDER_DAILY_BUDGET_USD", "5");
    vi.stubEnv("PROVIDER_MONTHLY_BUDGET_USD", "50");
    const prisma = fakePrisma();
    const fetchImpl = sequencedFetch([jsonResponse({ request_id: "req-42" })]);
    const provider = new FalVideoProvider({ apiKey: "k", fetchImpl, prisma });

    const job = await provider.submit({
      prompt: "sunny meadow",
      durationSeconds: 7,
      aspectRatio: "16:9",
      tenantId: "t1",
    });
    expect(job).toMatchObject({ jobId: "req-42", status: "queued" });

    const row = prisma.providerUsage.create.mock.calls[0]![0].data;
    expect(row).toMatchObject({
      provider: "fal",
      operation: "video.submit",
      units: 10, // 7s narration → 10s clip
      unitType: "seconds",
      jobId: "req-42",
    });
    expect(row.estimatedCostUsd).toBeCloseTo(10 * 0.1);
  });

  it("getJob maps queue statuses and fetches the result url on completion", async () => {
    vi.stubEnv("PROVIDER_DAILY_BUDGET_USD", "5");
    vi.stubEnv("PROVIDER_MONTHLY_BUDGET_USD", "50");
    const fetchImpl = sequencedFetch([
      jsonResponse({ status: "IN_QUEUE" }),
      jsonResponse({ status: "IN_PROGRESS" }),
      jsonResponse({ status: "COMPLETED" }),
      jsonResponse({ video: { url: "https://fal.media/files/clip.mp4" } }),
    ]);
    const provider = new FalVideoProvider({ apiKey: "k", fetchImpl, prisma: fakePrisma() });

    expect((await provider.getJob("r1")).status).toBe("queued");
    expect((await provider.getJob("r1")).status).toBe("running");
    const done = await provider.getJob("r1");
    expect(done.status).toBe("succeeded");
    expect(done.outputUrl).toBe("https://fal.media/files/clip.mp4");
  });

  it("completion without an https url fails the job", async () => {
    const fetchImpl = sequencedFetch([
      jsonResponse({ status: "COMPLETED" }),
      jsonResponse({ video: {} }),
    ]);
    const provider = new FalVideoProvider({ apiKey: "k", fetchImpl, prisma: fakePrisma() });
    const job = await provider.getJob("r1");
    expect(job.status).toBe("failed");
    expect(job.error).toMatch(/no https video url/);
  });

  it("submit error surfaces status + detail, nothing recorded", async () => {
    vi.stubEnv("PROVIDER_DAILY_BUDGET_USD", "5");
    vi.stubEnv("PROVIDER_MONTHLY_BUDGET_USD", "50");
    const prisma = fakePrisma();
    const fetchImpl = sequencedFetch([jsonResponse({ detail: "invalid key" }, 401)]);
    const provider = new FalVideoProvider({ apiKey: "k", fetchImpl, prisma });
    await expect(
      provider.submit({ prompt: "p", durationSeconds: 5, aspectRatio: "16:9", tenantId: "t1" }),
    ).rejects.toThrow(/fal submit failed \(401\)/);
    expect(prisma.providerUsage.create).not.toHaveBeenCalled();
  });
});

describe("factory: fal registration", () => {
  it("VIDEO_PROVIDER=fal without key throws at resolution", () => {
    vi.stubEnv("VIDEO_PROVIDER", "fal");
    vi.stubEnv("FAL_API_KEY", "");
    expect(() => resolveVideoProvider()).toThrow(/FAL_API_KEY/);
  });

  it("VIDEO_PROVIDER=fal with key resolves the real adapter", () => {
    vi.stubEnv("VIDEO_PROVIDER", "fal");
    vi.stubEnv("FAL_API_KEY", "fal-test-not-real");
    expect(resolveVideoProvider().name).toBe("fal");
  });
});
