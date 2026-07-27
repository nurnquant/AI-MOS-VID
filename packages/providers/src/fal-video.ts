/**
 * Real video generation provider (PROV-009 Phase C, user-approved).
 * fal.ai queue API: submit returns a request id immediately; the
 * orchestrator polls `getJob` until the clip is rendered, then
 * downloads the https output. The most expensive slot — budget is
 * asserted AND recorded at submit time (that is when the money is
 * committed), with the strictest-caps guidance in the runbook.
 *
 * The target model is env-configurable (`FAL_VIDEO_MODEL`); different
 * fal models accept slightly different bodies, so the default body
 * shape (prompt / duration / aspect_ratio) targets the Kling family.
 */
import { getPrisma, type PrismaClient } from "@aivs/database";
import { assertProviderBudget, budgetFromEnv, recordProviderUsage } from "./budget.ts";
import type {
  VideoGenerationJob,
  VideoGenerationProvider,
  VideoGenerationRequest,
} from "./contracts.ts";

const QUEUE_BASE = "https://queue.fal.run";
const DEFAULT_MODEL = "fal-ai/kling-video/v2.5-turbo/pro/text-to-video";
/** Conservative default $/second of rendered video; override via env. */
const DEFAULT_USD_PER_SECOND = 0.1;
/** Kling accepts 5s or 10s clips. */
const ALLOWED_DURATIONS = [5, 10];

type FetchLike = typeof fetch;

interface QueueSubmitResponse {
  request_id?: string;
}

interface QueueStatusResponse {
  status?: string;
}

function usdPerSecond(): number {
  return budgetFromEnv("FAL_USD_PER_SECOND") || DEFAULT_USD_PER_SECOND;
}

/** Smallest allowed duration that fits the narration; caps at the max. */
export function pickFalDuration(requestedSeconds: number): number {
  for (const allowed of ALLOWED_DURATIONS) {
    if (requestedSeconds <= allowed) return allowed;
  }
  return ALLOWED_DURATIONS[ALLOWED_DURATIONS.length - 1]!;
}

export class FalVideoProvider implements VideoGenerationProvider {
  readonly name = "fal";

  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchImpl: FetchLike;
  private readonly prismaOverride?: PrismaClient;

  constructor(options?: { fetchImpl?: FetchLike; prisma?: PrismaClient; apiKey?: string }) {
    const apiKey = options?.apiKey ?? process.env.FAL_API_KEY;
    if (!apiKey) {
      throw new Error(
        "VIDEO_PROVIDER=fal but FAL_API_KEY is not set — " +
          "add the key to the environment or set VIDEO_PROVIDER=mock",
      );
    }
    this.apiKey = apiKey;
    this.model = process.env.FAL_VIDEO_MODEL || DEFAULT_MODEL;
    this.fetchImpl = options?.fetchImpl ?? fetch;
    this.prismaOverride = options?.prisma;
  }

  private headers(): Record<string, string> {
    return { Authorization: `Key ${this.apiKey}`, "content-type": "application/json" };
  }

  async submit(request: VideoGenerationRequest): Promise<VideoGenerationJob> {
    if (!request.tenantId) {
      throw new Error("fal video provider requires request.tenantId for budget scoping");
    }
    const prisma = this.prismaOverride ?? getPrisma();
    const seconds = pickFalDuration(Math.max(1, request.durationSeconds));
    const estimatedCostUsd = seconds * usdPerSecond();
    await assertProviderBudget(prisma, request.tenantId, estimatedCostUsd);

    const response = await this.fetchImpl(`${QUEUE_BASE}/${this.model}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        prompt: request.prompt,
        duration: String(seconds),
        aspect_ratio: request.aspectRatio,
      }),
    });
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 300);
      throw new Error(`fal submit failed (${response.status}): ${detail}`);
    }
    const body = (await response.json()) as QueueSubmitResponse;
    if (!body.request_id) throw new Error("fal submit returned no request_id");

    // Money is committed at submit — record here, not on completion.
    await recordProviderUsage(prisma, {
      tenantId: request.tenantId,
      provider: this.name,
      operation: "video.submit",
      units: seconds,
      unitType: "seconds",
      estimatedCostUsd,
      jobId: body.request_id,
    });
    return { jobId: body.request_id, status: "queued" };
  }

  async getJob(jobId: string): Promise<VideoGenerationJob> {
    const statusResponse = await this.fetchImpl(
      `${QUEUE_BASE}/${this.model}/requests/${encodeURIComponent(jobId)}/status`,
      { headers: this.headers() },
    );
    if (!statusResponse.ok) {
      const detail = (await statusResponse.text().catch(() => "")).slice(0, 300);
      throw new Error(`fal status failed (${statusResponse.status}): ${detail}`);
    }
    const status = ((await statusResponse.json()) as QueueStatusResponse).status ?? "";

    if (status === "IN_QUEUE") return { jobId, status: "queued" };
    if (status === "IN_PROGRESS") return { jobId, status: "running" };
    if (status !== "COMPLETED") {
      return { jobId, status: "failed", error: `fal reported status ${status || "unknown"}` };
    }

    const resultResponse = await this.fetchImpl(
      `${QUEUE_BASE}/${this.model}/requests/${encodeURIComponent(jobId)}`,
      { headers: this.headers() },
    );
    if (!resultResponse.ok) {
      const detail = (await resultResponse.text().catch(() => "")).slice(0, 300);
      throw new Error(`fal result failed (${resultResponse.status}): ${detail}`);
    }
    const result = (await resultResponse.json()) as { video?: { url?: string } };
    const url = result.video?.url;
    if (!url || !url.startsWith("https://")) {
      return { jobId, status: "failed", error: "fal result carried no https video url" };
    }
    return { jobId, status: "succeeded", outputUrl: url };
  }
}
