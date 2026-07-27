/**
 * Real LLM script provider (PROV-009 Phase A, user-approved). Claude
 * Opus 5 via the official Anthropic SDK with structured outputs — the
 * response is schema-validated into the exact scene shape the pipeline
 * already consumes. Every call is budget-gated (fail closed) and
 * recorded in the ProviderUsage ledger. Generated scripts still enter
 * the normal human review flow (draft → in_review → approved) before
 * any generation runs.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { getPrisma, type PrismaClient } from "@aivs/database";
import { assertProviderBudget, recordProviderUsage } from "./budget.ts";
import type { GeneratedScene, ScriptGenerationRequest, ScriptProvider } from "./script.ts";

const MODEL = "claude-opus-5";
const MAX_TOKENS = 16000;
/** Claude Opus 5 list pricing (USD per million tokens). */
const INPUT_USD_PER_MTOK = 5;
const OUTPUT_USD_PER_MTOK = 25;

const SceneSchema = z.object({
  narration: z.string().describe("What the narrator says in this scene, in the requested language"),
  visualDescription: z
    .string()
    .describe("Concrete visual direction for the scene, in the requested language"),
  durationTargetSeconds: z
    .number()
    .int()
    .describe("Target scene length in seconds, between 5 and 20"),
});
const ScriptSchema = z.object({ scenes: z.array(SceneSchema) });

function systemPrompt(language: "ar" | "en", sceneCount?: number): string {
  const count = sceneCount ? `exactly ${sceneCount}` : "3 to 5";
  return [
    "You write video scripts for Riwaq Al Ilm, an Islamic-education studio producing short animated videos for young children.",
    `Write ${count} scenes for the brief you are given.`,
    language === "ar"
      ? "Write narration and visual descriptions entirely in Modern Standard Arabic, suitable for children."
      : "Write narration and visual descriptions in simple, warm English suitable for children.",
    "Rules: age-appropriate for children; gentle, encouraging tone; accurate Islamic content; no scary imagery, no violence, no content unsuitable for minors.",
    "Each scene needs narration (spoken text), a concrete visual description an animator can execute, and a duration target of 5-20 seconds.",
  ].join("\n");
}

function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * INPUT_USD_PER_MTOK +
    (outputTokens / 1_000_000) * OUTPUT_USD_PER_MTOK
  );
}

export class AnthropicScriptProvider implements ScriptProvider {
  readonly name = "anthropic";

  private readonly client: Anthropic;
  private readonly prismaOverride?: PrismaClient;

  constructor(options?: { client?: Anthropic; prisma?: PrismaClient }) {
    if (!options?.client && !process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        "SCRIPT_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set — " +
          "add the key to the environment or set SCRIPT_PROVIDER=mock",
      );
    }
    this.client = options?.client ?? new Anthropic();
    this.prismaOverride = options?.prisma;
  }

  async generate(request: ScriptGenerationRequest): Promise<{ scenes: GeneratedScene[] }> {
    const brief = request.brief.trim();
    if (!brief) throw new Error("brief must not be empty");
    if (!request.tenantId) {
      throw new Error("anthropic script provider requires request.tenantId for budget scoping");
    }
    const prisma = this.prismaOverride ?? getPrisma();

    // Preflight against the worst case (full output budget); the ledger
    // records what the call actually cost.
    const worstCaseInputTokens = Math.ceil(brief.length / 3) + 600;
    const worstCaseCost = estimateCostUsd(worstCaseInputTokens, MAX_TOKENS);
    await assertProviderBudget(prisma, request.tenantId, worstCaseCost);

    const response = await this.client.messages.parse({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt(request.language, request.sceneCount),
      messages: [{ role: "user", content: `Brief: ${brief}` }],
      output_config: { format: zodOutputFormat(ScriptSchema) },
    });

    const usage = response.usage;
    await recordProviderUsage(prisma, {
      tenantId: request.tenantId,
      provider: this.name,
      operation: "script.generate",
      units: usage.input_tokens + usage.output_tokens,
      unitType: "tokens",
      estimatedCostUsd: estimateCostUsd(usage.input_tokens, usage.output_tokens),
    });

    if (response.stop_reason === "refusal") {
      throw new Error("anthropic declined the request (safety classifier refusal)");
    }
    const parsed = response.parsed_output;
    if (!parsed || parsed.scenes.length === 0) {
      throw new Error(`anthropic returned no parseable scenes (stop: ${response.stop_reason})`);
    }
    return {
      scenes: parsed.scenes.map((scene) => ({
        narration: scene.narration,
        visualDescription: scene.visualDescription,
        durationTargetSeconds: Math.min(Math.max(Math.round(scene.durationTargetSeconds), 5), 20),
      })),
    };
  }
}
