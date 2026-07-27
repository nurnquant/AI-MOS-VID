/**
 * Phase D unit tests — stubbed fetch + fake prisma, zero network.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@aivs/database";
import { YouTubePublishingProvider, resolvePublishingProvider } from "../src/index.ts";

afterEach(() => {
  vi.unstubAllEnvs();
});

const CREDS = { clientId: "cid", clientSecret: "cs", refreshToken: "rt" };

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

function response(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return {
    ok: status < 400,
    status,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function sequencedFetch(responses: unknown[]) {
  let call = 0;
  const impl = vi.fn(async (_url: unknown, _init?: unknown) => {
    const r = responses[Math.min(call, responses.length - 1)];
    call += 1;
    return r;
  });
  return impl as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

const media = async () => new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]);

describe("YouTubePublishingProvider", () => {
  it("constructor fails loud when any credential is missing", () => {
    vi.stubEnv("YOUTUBE_CLIENT_ID", "x");
    vi.stubEnv("YOUTUBE_CLIENT_SECRET", "");
    vi.stubEnv("YOUTUBE_REFRESH_TOKEN", "");
    expect(() => new YouTubePublishingProvider()).toThrow(/not all set/);
  });

  it("rejects non-youtube platforms with a clear message", async () => {
    const provider = new YouTubePublishingProvider({
      credentials: CREDS,
      fetchImpl: sequencedFetch([]),
      prisma: fakePrisma(),
    });
    await expect(
      provider.publish({
        platform: "instagram",
        assetKey: "k",
        caption: "c",
        getMedia: media,
        tenantId: "t1",
      }),
    ).rejects.toThrow(/not enabled — only youtube/);
  });

  it("uploads with madeForKids + unlisted and records a ledger row", async () => {
    const prisma = fakePrisma();
    const fetchImpl = sequencedFetch([
      response({ access_token: "at" }),
      response({}, 200, { location: "https://upload.example/session-1" }),
      response({ id: "vid-123" }),
    ]);
    const provider = new YouTubePublishingProvider({ credentials: CREDS, fetchImpl, prisma });

    const result = await provider.publish({
      platform: "youtube",
      assetKey: "assets/x.mp4",
      caption: "Why we say Alhamdulillah\nA gentle lesson for children.",
      getMedia: media,
      tenantId: "t1",
    });
    expect(result).toEqual({ publicationId: "vid-123", status: "succeeded" });

    // Init call carries the compliance-critical body.
    const initBody = JSON.parse((fetchImpl.mock.calls[1]![1] as { body: string }).body);
    expect(initBody.status).toMatchObject({
      privacyStatus: "unlisted",
      selfDeclaredMadeForKids: true,
    });
    expect(initBody.snippet.title).toBe("Why we say Alhamdulillah");

    const row = prisma.providerUsage.create.mock.calls[0]![0].data;
    expect(row).toMatchObject({
      provider: "youtube",
      operation: "publish.upload",
      units: 1,
      unitType: "calls",
      estimatedCostUsd: 0,
      jobId: "vid-123",
    });
  });

  it("upload init failure surfaces status + detail, nothing recorded", async () => {
    const prisma = fakePrisma();
    const fetchImpl = sequencedFetch([
      response({ access_token: "at" }),
      response({ error: "quotaExceeded" }, 403),
    ]);
    const provider = new YouTubePublishingProvider({ credentials: CREDS, fetchImpl, prisma });
    await expect(
      provider.publish({
        platform: "youtube",
        assetKey: "k",
        caption: "c",
        getMedia: media,
        tenantId: "t1",
      }),
    ).rejects.toThrow(/upload init failed \(403\)/);
    expect(prisma.providerUsage.create).not.toHaveBeenCalled();
  });

  it("requires media accessor and tenantId", async () => {
    const provider = new YouTubePublishingProvider({
      credentials: CREDS,
      fetchImpl: sequencedFetch([]),
      prisma: fakePrisma(),
    });
    await expect(
      provider.publish({ platform: "youtube", assetKey: "k", caption: "c", tenantId: "t1" }),
    ).rejects.toThrow(/media accessor/);
    await expect(
      provider.publish({ platform: "youtube", assetKey: "k", caption: "c", getMedia: media }),
    ).rejects.toThrow(/tenantId/);
  });

  it("retract deletes and tolerates already-gone (404)", async () => {
    const okFetch = sequencedFetch([response({ access_token: "at" }), response({}, 204)]);
    const provider = new YouTubePublishingProvider({
      credentials: CREDS,
      fetchImpl: okFetch,
      prisma: fakePrisma(),
    });
    await expect(provider.retract("vid-123")).resolves.toBeUndefined();

    const goneFetch = sequencedFetch([response({ access_token: "at" }), response({}, 404)]);
    const provider2 = new YouTubePublishingProvider({
      credentials: CREDS,
      fetchImpl: goneFetch,
      prisma: fakePrisma(),
    });
    await expect(provider2.retract("vid-404")).resolves.toBeUndefined();

    const failFetch = sequencedFetch([response({ access_token: "at" }), response({}, 403)]);
    const provider3 = new YouTubePublishingProvider({
      credentials: CREDS,
      fetchImpl: failFetch,
      prisma: fakePrisma(),
    });
    await expect(provider3.retract("vid-403")).rejects.toThrow(/takedown failed \(403\)/);
  });
});

describe("factory: youtube registration", () => {
  it("PUBLISH_PROVIDER=youtube without credentials throws at resolution", () => {
    vi.stubEnv("PUBLISH_PROVIDER", "youtube");
    vi.stubEnv("YOUTUBE_CLIENT_ID", "");
    vi.stubEnv("YOUTUBE_CLIENT_SECRET", "");
    vi.stubEnv("YOUTUBE_REFRESH_TOKEN", "");
    expect(() => resolvePublishingProvider()).toThrow(/YOUTUBE_CLIENT_ID/);
  });

  it("PUBLISH_PROVIDER=youtube with credentials resolves the real adapter", () => {
    vi.stubEnv("PUBLISH_PROVIDER", "youtube");
    vi.stubEnv("YOUTUBE_CLIENT_ID", "cid");
    vi.stubEnv("YOUTUBE_CLIENT_SECRET", "cs");
    vi.stubEnv("YOUTUBE_REFRESH_TOKEN", "rt");
    expect(resolvePublishingProvider().name).toBe("youtube");
  });
});
