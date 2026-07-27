/**
 * Arabic voice bake-off (AIVS-POLISH-013): synthesizes the SAME Arabic
 * narration through ElevenLabs and Azure Speech and writes labeled MP3s
 * to the Desktop for listening. Spends real money (~$0.05 total).
 *
 *   node --env-file=.env scripts/voice-bakeoff.mjs --yes
 *
 * Requires: ELEVENLABS_API_KEY + VOICE_ID, AZURE_SPEECH_KEY +
 * AZURE_SPEECH_REGION (optional AZURE_VOICE_NAME), local infra up
 * (ledger rows are written to the local database), budget caps set.
 */
import { copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const NARRATION =
  "أهلاً بكم أصدقائي الصغار! درس اليوم عن أهمية الصدق في حياتنا. " +
  "قال رسول الله صلى الله عليه وسلم: عليكم بالصدق، فإن الصدق يهدي إلى البر.";

if (!process.argv.includes("--yes")) {
  console.log("Arabic voice bake-off — ElevenLabs vs Azure Speech.");
  console.log(`Narration (${NARRATION.length} chars) costs roughly:`);
  console.log("  ElevenLabs ≈ $0.04   Azure ≈ $0.003   (ledger estimates)");
  console.log("\nRe-run with --yes to spend and generate the two files.");
  process.exit(0);
}

const { createPrismaClient } = await import("@aivs/database");
const { AzureSpeechVoiceProvider, ElevenLabsVoiceProvider } = await import("@aivs/providers");

const prisma = createPrismaClient();
const tenant = await prisma.tenant.create({
  data: { slug: `bakeoff-${randomUUID().slice(0, 8)}`, name: "Voice Bakeoff" },
});

const targets = [
  ["elevenlabs", new ElevenLabsVoiceProvider({ prisma })],
  ["azure", new AzureSpeechVoiceProvider({ prisma })],
];

for (const [label, provider] of targets) {
  const started = Date.now();
  const { audioUrl } = await provider.synthesize({
    text: NARRATION,
    voiceId: process.env.VOICE_ID ?? "narrator",
    language: "ar",
    tenantId: tenant.id,
  });
  const out = `${process.env.HOME}/Desktop/aivs-bakeoff-${label}.mp3`;
  await copyFile(fileURLToPath(audioUrl), out);
  console.log(`${label}: ${out} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
}

const rows = await prisma.providerUsage.findMany({ where: { tenantId: tenant.id } });
for (const r of rows) {
  console.log(`ledger: ${r.provider} ${r.units} chars $${Number(r.estimatedCostUsd).toFixed(4)}`);
}
console.log("\nListen to both files on the Desktop and pick the voice direction.");
await prisma.$disconnect();
