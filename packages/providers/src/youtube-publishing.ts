/**
 * Real YouTube publishing (PROV-009 Phase D spec, user-approved;
 * Meta/Instagram/Pinterest/TikTok remain placeholders for later
 * phases). Compliance is hard-coded, not optional:
 *
 * - every upload self-declares MADE FOR KIDS (COPPA designation;
 *   YouTube disables comments/personalized ads on such videos);
 * - privacy defaults to `unlisted` (env `YOUTUBE_PRIVACY_STATUS`) so
 *   uploads are reviewable on-channel before anything goes public;
 * - the only caller is the worker publish job, which exists only after
 *   the baseline §10 approval matrix is satisfied;
 * - `retract` performs a real videos.delete for consent revocation.
 *
 * Auth: OAuth2 refresh-token flow against the owner's own channel.
 * The API is quota-based, not billed — ledger rows record the call
 * with estimatedCostUsd 0 for the audit trail.
 */
import { getPrisma, type PrismaClient } from "@aivs/database";
import { recordProviderUsage } from "./budget.ts";
import type { ProviderJobStatus, PublishRequest, PublishingProvider } from "./contracts.ts";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const UPLOAD_URL =
  "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";
const VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";
/** YouTube category 27 = Education. */
const CATEGORY_EDUCATION = "27";

type FetchLike = typeof fetch;

export class YouTubePublishingProvider implements PublishingProvider {
  readonly name = "youtube";

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly refreshToken: string;
  private readonly fetchImpl: FetchLike;
  private readonly prismaOverride?: PrismaClient;

  constructor(options?: {
    fetchImpl?: FetchLike;
    prisma?: PrismaClient;
    credentials?: { clientId: string; clientSecret: string; refreshToken: string };
  }) {
    const clientId = options?.credentials?.clientId ?? process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = options?.credentials?.clientSecret ?? process.env.YOUTUBE_CLIENT_SECRET;
    const refreshToken = options?.credentials?.refreshToken ?? process.env.YOUTUBE_REFRESH_TOKEN;
    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error(
        "PUBLISH_PROVIDER=youtube but YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / " +
          "YOUTUBE_REFRESH_TOKEN are not all set — add them or set PUBLISH_PROVIDER=mock",
      );
    }
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.refreshToken = refreshToken;
    this.fetchImpl = options?.fetchImpl ?? fetch;
    this.prismaOverride = options?.prisma;
  }

  private async accessToken(): Promise<string> {
    const response = await this.fetchImpl(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: "refresh_token",
      }).toString(),
    });
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 200);
      throw new Error(`youtube token refresh failed (${response.status}): ${detail}`);
    }
    const body = (await response.json()) as { access_token?: string };
    if (!body.access_token) throw new Error("youtube token refresh returned no access_token");
    return body.access_token;
  }

  async publish(
    request: PublishRequest,
  ): Promise<{ publicationId: string; status: ProviderJobStatus }> {
    if (request.platform !== "youtube") {
      throw new Error(
        `platform "${request.platform}" is not enabled — only youtube has a real adapter ` +
          "(Meta/Instagram/Pinterest/TikTok are later phases); keep those on the mock",
      );
    }
    if (!request.getMedia) throw new Error("youtube publish requires a media accessor");
    if (!request.tenantId) throw new Error("youtube publish requires tenantId for the ledger");
    const prisma = this.prismaOverride ?? getPrisma();

    const media = await request.getMedia();
    if (media.byteLength === 0) throw new Error("media accessor returned empty bytes");
    const token = await this.accessToken();

    const caption = request.caption.trim();
    const title = (caption.split("\n")[0] || "Riwaq Al Ilm video").slice(0, 95);
    const privacyStatus = process.env.YOUTUBE_PRIVACY_STATUS || "unlisted";

    const init = await this.fetchImpl(UPLOAD_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-upload-content-type": "video/mp4",
        "x-upload-content-length": String(media.byteLength),
      },
      body: JSON.stringify({
        snippet: { title, description: caption, categoryId: CATEGORY_EDUCATION },
        // Child-directed content: non-negotiable self-designation.
        status: { privacyStatus, selfDeclaredMadeForKids: true },
      }),
    });
    if (!init.ok) {
      const detail = (await init.text().catch(() => "")).slice(0, 300);
      throw new Error(`youtube upload init failed (${init.status}): ${detail}`);
    }
    const uploadLocation = init.headers.get("location");
    if (!uploadLocation) throw new Error("youtube upload init returned no resumable location");

    const upload = await this.fetchImpl(uploadLocation, {
      method: "PUT",
      headers: { "content-type": "video/mp4", "content-length": String(media.byteLength) },
      // Blob keeps the body type valid under both DOM and Node lib
      // configs; the cast pins the TS5.7 ArrayBufferLike generic.
      body: new Blob([media as Uint8Array<ArrayBuffer>]),
    });
    if (!upload.ok) {
      const detail = (await upload.text().catch(() => "")).slice(0, 300);
      throw new Error(`youtube upload failed (${upload.status}): ${detail}`);
    }
    const result = (await upload.json()) as { id?: string };
    if (!result.id) throw new Error("youtube upload returned no video id");

    await recordProviderUsage(prisma, {
      tenantId: request.tenantId,
      provider: this.name,
      operation: "publish.upload",
      units: 1,
      unitType: "calls",
      estimatedCostUsd: 0,
      jobId: result.id,
    });
    return { publicationId: result.id, status: "succeeded" };
  }

  /** Real takedown for consent revocation — videos.delete. */
  async retract(externalId: string): Promise<void> {
    const token = await this.accessToken();
    const response = await this.fetchImpl(`${VIDEOS_URL}?id=${encodeURIComponent(externalId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    // 204 = deleted; 404 = already gone — both acceptable outcomes.
    if (!response.ok && response.status !== 404) {
      const detail = (await response.text().catch(() => "")).slice(0, 200);
      throw new Error(`youtube takedown failed (${response.status}): ${detail}`);
    }
  }
}
