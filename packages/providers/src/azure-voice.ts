/**
 * Azure Speech TTS voice adapter (AIVS-POLISH-013 — Arabic bake-off
 * against ElevenLabs). Same contract, same seam: budget-gated per
 * character, audio written locally, file:// URL back. Default voice is
 * Arabic neural (`AZURE_VOICE_NAME`, e.g. ar-SA-ZariyahNeural); the
 * request's voiceId is used only when it looks like an Azure voice
 * name (contains "Neural"), since the pipeline's VOICE_ID env may hold
 * an ElevenLabs id.
 */
import { randomUUID } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { getPrisma, type PrismaClient } from "@aivs/database";
import { assertProviderBudget, budgetFromEnv, recordProviderUsage } from "./budget.ts";
import type { VoiceProvider, VoiceSynthesisRequest } from "./contracts.ts";

const DEFAULT_VOICE = "ar-SA-ZariyahNeural";
/** Azure neural TTS list price ≈ $16 per 1M chars. */
const DEFAULT_USD_PER_1K_CHARS = 0.016;
const OUTPUT_FORMAT = "audio-24khz-96kbitrate-mono-mp3";

type FetchLike = typeof fetch;

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export class AzureSpeechVoiceProvider implements VoiceProvider {
  readonly name = "azure";

  private readonly key: string;
  private readonly region: string;
  private readonly fetchImpl: FetchLike;
  private readonly prismaOverride?: PrismaClient;

  constructor(options?: {
    fetchImpl?: FetchLike;
    prisma?: PrismaClient;
    key?: string;
    region?: string;
  }) {
    const key = options?.key ?? process.env.AZURE_SPEECH_KEY;
    const region = options?.region ?? process.env.AZURE_SPEECH_REGION;
    if (!key || !region) {
      throw new Error(
        "VOICE_PROVIDER=azure but AZURE_SPEECH_KEY / AZURE_SPEECH_REGION are not both set — " +
          "add them to the environment or set VOICE_PROVIDER=mock",
      );
    }
    this.key = key;
    this.region = region;
    this.fetchImpl = options?.fetchImpl ?? fetch;
    this.prismaOverride = options?.prisma;
  }

  async synthesize(request: VoiceSynthesisRequest): Promise<{ audioUrl: string }> {
    const text = request.text.trim();
    if (!text) throw new Error("text must not be empty");
    if (!request.tenantId) {
      throw new Error("azure voice provider requires request.tenantId for budget scoping");
    }
    const prisma = this.prismaOverride ?? getPrisma();

    const usdPer1kChars = budgetFromEnv("AZURE_USD_PER_1K_CHARS") || DEFAULT_USD_PER_1K_CHARS;
    const estimatedCostUsd = (text.length / 1000) * usdPer1kChars;
    await assertProviderBudget(prisma, request.tenantId, estimatedCostUsd);

    const voice = request.voiceId.includes("Neural")
      ? request.voiceId
      : process.env.AZURE_VOICE_NAME || DEFAULT_VOICE;
    const lang = request.language === "ar" ? "ar-SA" : "en-US";
    const ssml =
      `<speak version='1.0' xml:lang='${lang}'>` +
      `<voice name='${voice}'>${escapeXml(text)}</voice></speak>`;

    const response = await this.fetchImpl(
      `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": this.key,
          "content-type": "application/ssml+xml",
          "x-microsoft-outputformat": OUTPUT_FORMAT,
        },
        body: ssml,
      },
    );
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 300);
      throw new Error(`azure tts failed (${response.status}): ${detail}`);
    }
    const audio = new Uint8Array(await response.arrayBuffer());
    if (audio.byteLength === 0) throw new Error("azure tts returned empty audio");

    await recordProviderUsage(prisma, {
      tenantId: request.tenantId,
      provider: this.name,
      operation: "voice.synthesize",
      units: text.length,
      unitType: "characters",
      estimatedCostUsd,
    });

    const workDir = await mkdtemp(join(tmpdir(), "aivs-azure-"));
    const audioPath = join(workDir, `${randomUUID()}.mp3`);
    await writeFile(audioPath, audio);
    return { audioUrl: pathToFileURL(audioPath).href };
  }
}
