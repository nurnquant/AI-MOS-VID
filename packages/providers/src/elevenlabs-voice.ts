/**
 * Real TTS voice provider (PROV-009 Phase B, user-approved). ElevenLabs
 * text-to-speech over its REST API; the multilingual model covers both
 * Arabic and English. Budget-gated (fail closed) with the spend ledger
 * recording characters billed. Audio is written to a local temp file
 * and returned as a file:// URL — the orchestrator's existing URL
 * handling stays unchanged.
 */
import { randomUUID } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { getPrisma, type PrismaClient } from "@aivs/database";
import { assertProviderBudget, budgetFromEnv, recordProviderUsage } from "./budget.ts";
import type { VoiceProvider, VoiceSynthesisRequest } from "./contracts.ts";

const API_BASE = "https://api.elevenlabs.io/v1";
/** Multilingual v2 covers Arabic; overridable via ELEVENLABS_MODEL_ID. */
const DEFAULT_MODEL_ID = "eleven_multilingual_v2";
/** Conservative default; override with ELEVENLABS_USD_PER_1K_CHARS. */
const DEFAULT_USD_PER_1K_CHARS = 0.3;

type FetchLike = typeof fetch;

export class ElevenLabsVoiceProvider implements VoiceProvider {
  readonly name = "elevenlabs";

  private readonly apiKey: string;
  private readonly fetchImpl: FetchLike;
  private readonly prismaOverride?: PrismaClient;

  constructor(options?: { fetchImpl?: FetchLike; prisma?: PrismaClient; apiKey?: string }) {
    const apiKey = options?.apiKey ?? process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error(
        "VOICE_PROVIDER=elevenlabs but ELEVENLABS_API_KEY is not set — " +
          "add the key to the environment or set VOICE_PROVIDER=mock",
      );
    }
    this.apiKey = apiKey;
    this.fetchImpl = options?.fetchImpl ?? fetch;
    this.prismaOverride = options?.prisma;
  }

  async synthesize(request: VoiceSynthesisRequest): Promise<{ audioUrl: string }> {
    const text = request.text.trim();
    if (!text) throw new Error("text must not be empty");
    if (!request.tenantId) {
      throw new Error("elevenlabs voice provider requires request.tenantId for budget scoping");
    }
    const prisma = this.prismaOverride ?? getPrisma();

    const usdPer1kChars = budgetFromEnv("ELEVENLABS_USD_PER_1K_CHARS") || DEFAULT_USD_PER_1K_CHARS;
    const estimatedCostUsd = (text.length / 1000) * usdPer1kChars;
    await assertProviderBudget(prisma, request.tenantId, estimatedCostUsd);

    const modelId = process.env.ELEVENLABS_MODEL_ID || DEFAULT_MODEL_ID;
    const response = await this.fetchImpl(
      `${API_BASE}/text-to-speech/${encodeURIComponent(request.voiceId)}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": this.apiKey, "content-type": "application/json" },
        body: JSON.stringify({ text, model_id: modelId }),
      },
    );
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 300);
      throw new Error(`elevenlabs synthesis failed (${response.status}): ${detail}`);
    }
    const audio = new Uint8Array(await response.arrayBuffer());
    if (audio.byteLength === 0) throw new Error("elevenlabs returned empty audio");

    await recordProviderUsage(prisma, {
      tenantId: request.tenantId,
      provider: this.name,
      operation: "voice.synthesize",
      units: text.length,
      unitType: "characters",
      estimatedCostUsd,
    });

    const workDir = await mkdtemp(join(tmpdir(), "aivs-elevenlabs-"));
    const audioPath = join(workDir, `${randomUUID()}.mp3`);
    await writeFile(audioPath, audio);
    return { audioUrl: pathToFileURL(audioPath).href };
  }
}
