/**
 * Real still-image provider (AIVS-SLIDESHOW-015, user-approved). Same
 * fal.ai queue plumbing as the video adapter, but image models render
 * in seconds, so `generate` polls internally and returns the finished
 * https url. Budget is asserted AND recorded at submit — that is when
 * the money is committed.
 */
import { setTimeout as sleep } from "node:timers/promises";
import { getPrisma, type PrismaClient } from "@aivs/database";
import { assertProviderBudget, budgetFromEnv, recordProviderUsage } from "./budget.ts";
import type { ImageGenerationProvider, ImageGenerationRequest } from "./contracts.ts";

const QUEUE_BASE = "https://queue.fal.run";
const DEFAULT_MODEL = "fal-ai/flux/schnell";
/** Conservative default $/image (flux schnell class); override via env. */
const DEFAULT_USD_PER_IMAGE = 0.005;

type FetchLike = typeof fetch;

/** fal image_size presets keyed by our aspect ratios. */
const IMAGE_SIZES: Record<ImageGenerationRequest["aspectRatio"], string> = {
  "16:9": "landscape_16_9",
  "9:16": "portrait_16_9",
  "1:1": "square_hd",
};

function usdPerImage(): number {
  return budgetFromEnv("FAL_USD_PER_IMAGE") || DEFAULT_USD_PER_IMAGE;
}

export class FalImageProvider implements ImageGenerationProvider {
  readonly name = "fal-image";

  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchImpl: FetchLike;
  private readonly prismaOverride?: PrismaClient;
  private readonly pollIntervalMs: number;
  private readonly timeoutMs: number;

  constructor(options?: {
    fetchImpl?: FetchLike;
    prisma?: PrismaClient;
    apiKey?: string;
    pollIntervalMs?: number;
    timeoutMs?: number;
  }) {
    const apiKey = options?.apiKey ?? process.env.FAL_API_KEY;
    if (!apiKey) {
      throw new Error(
        "IMAGE_PROVIDER=fal but FAL_API_KEY is not set — " +
          "add the key to the environment or set IMAGE_PROVIDER=mock",
      );
    }
    this.apiKey = apiKey;
    this.model = process.env.FAL_IMAGE_MODEL || DEFAULT_MODEL;
    this.fetchImpl = options?.fetchImpl ?? fetch;
    this.prismaOverride = options?.prisma;
    this.pollIntervalMs = options?.pollIntervalMs ?? 2_000;
    this.timeoutMs = options?.timeoutMs ?? 120_000;
  }

  private headers(): Record<string, string> {
    return { Authorization: `Key ${this.apiKey}`, "content-type": "application/json" };
  }

  /** Queue request endpoints address the APP (first two path segments). */
  private appId(): string {
    return this.model.split("/").slice(0, 2).join("/");
  }

  async generate(request: ImageGenerationRequest): Promise<{ imageUrl: string }> {
    if (!request.tenantId) {
      throw new Error("fal image provider requires request.tenantId for budget scoping");
    }
    const prisma = this.prismaOverride ?? getPrisma();
    const estimatedCostUsd = usdPerImage();
    await assertProviderBudget(prisma, request.tenantId, estimatedCostUsd);

    const submit = await this.fetchImpl(`${QUEUE_BASE}/${this.model}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        prompt: request.prompt,
        image_size: IMAGE_SIZES[request.aspectRatio],
        num_images: 1,
      }),
    });
    if (!submit.ok) {
      const detail = (await submit.text().catch(() => "")).slice(0, 300);
      throw new Error(`fal image submit failed (${submit.status}): ${detail}`);
    }
    const body = (await submit.json()) as { request_id?: string };
    if (!body.request_id) throw new Error("fal image submit returned no request_id");

    // Money is committed at submit — record here, not on completion.
    await recordProviderUsage(prisma, {
      tenantId: request.tenantId,
      provider: this.name,
      operation: "image.generate",
      units: 1,
      unitType: "images",
      estimatedCostUsd,
      jobId: body.request_id,
    });

    return { imageUrl: await this.awaitResult(body.request_id) };
  }

  private async awaitResult(requestId: string): Promise<string> {
    const requestBase = `${QUEUE_BASE}/${this.appId()}/requests/${encodeURIComponent(requestId)}`;
    const deadline = Date.now() + this.timeoutMs;
    for (;;) {
      const statusResponse = await this.fetchImpl(`${requestBase}/status`, {
        headers: this.headers(),
      });
      if (!statusResponse.ok) {
        const detail = (await statusResponse.text().catch(() => "")).slice(0, 300);
        throw new Error(`fal image status failed (${statusResponse.status}): ${detail}`);
      }
      const status = ((await statusResponse.json()) as { status?: string }).status ?? "";
      if (status === "COMPLETED") break;
      if (status !== "IN_QUEUE" && status !== "IN_PROGRESS") {
        throw new Error(`fal image reported status ${status || "unknown"}`);
      }
      if (Date.now() >= deadline) {
        throw new Error(`fal image render timed out after ${this.timeoutMs}ms`);
      }
      await sleep(this.pollIntervalMs);
    }

    const result = await this.fetchImpl(requestBase, { headers: this.headers() });
    if (!result.ok) {
      const detail = (await result.text().catch(() => "")).slice(0, 300);
      throw new Error(`fal image result failed (${result.status}): ${detail}`);
    }
    const payload = (await result.json()) as { images?: Array<{ url?: string }> };
    const url = payload.images?.[0]?.url;
    if (!url || !url.startsWith("https://")) {
      throw new Error("fal image result carried no https image url");
    }
    return url;
  }
}
