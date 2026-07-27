/**
 * Video model bake-off (AIVS-POLISH-013): renders ONE identical scene
 * prompt through multiple fal models and writes labeled MP4s to the
 * Desktop. EACH MODEL COSTS REAL DOLLARS (Kling-class ≈ $0.35-1.00 per
 * 5s clip; Veo-class considerably more — check fal.ai/models first).
 *
 *   node --env-file=.env scripts/video-bakeoff.mjs --yes [model ...]
 *
 * Default models when none are given:
 *   fal-ai/kling-video/v2.5-turbo/pro/text-to-video
 *   fal-ai/ltx-video
 * Requires FAL_API_KEY, local infra up (ledger), budget caps that fit.
 */
import { writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

const PROMPT =
  "A gentle sunrise over a mosque garden, soft watercolor animation style, " +
  "birds flying, warm golden light, children's storybook aesthetic";

const args = process.argv.slice(2);
const yes = args.includes("--yes");
const models = args.filter((a) => a !== "--yes");
const targets = models.length
  ? models
  : ["fal-ai/kling-video/v2.5-turbo/pro/text-to-video", "fal-ai/ltx-video"];

if (!yes) {
  console.log("Video model bake-off — one 5s clip per model:");
  for (const m of targets) console.log(`  ${m}`);
  console.log("\nCosts REAL dollars per model (see fal.ai/models pricing).");
  console.log("Re-run with --yes to spend. Pass model ids to override the list.");
  process.exit(0);
}

const { createPrismaClient } = await import("@aivs/database");
const { FalVideoProvider } = await import("@aivs/providers");

const prisma = createPrismaClient();
const tenant = await prisma.tenant.create({
  data: { slug: `vbake-${randomUUID().slice(0, 8)}`, name: "Video Bakeoff" },
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const model of targets) {
  process.env.FAL_VIDEO_MODEL = model;
  const provider = new FalVideoProvider({ prisma });
  const label = model.split("/").slice(1).join("-").replaceAll("/", "-");
  console.log(`\n[${model}] submitting…`);
  try {
    let job = await provider.submit({
      prompt: PROMPT,
      durationSeconds: 5,
      aspectRatio: "16:9",
      tenantId: tenant.id,
    });
    const deadline = Date.now() + 600_000;
    while ((job.status === "queued" || job.status === "running") && Date.now() < deadline) {
      await sleep(10_000);
      job = await provider.getJob(job.jobId);
    }
    if (job.status !== "succeeded" || !job.outputUrl) {
      console.log(`  FAILED: ${job.error ?? job.status}`);
      continue;
    }
    const bytes = new Uint8Array(await (await fetch(job.outputUrl)).arrayBuffer());
    const out = `${process.env.HOME}/Desktop/aivs-vbake-${label}.mp4`;
    await writeFile(out, bytes);
    console.log(`  saved ${out}`);
  } catch (error) {
    console.log(`  ERROR: ${error.message.slice(0, 200)}`);
  }
}

const rows = await prisma.providerUsage.findMany({ where: { tenantId: tenant.id } });
let total = 0;
for (const r of rows) {
  total += Number(r.estimatedCostUsd);
  console.log(`ledger: ${r.jobId?.slice(0, 12)} $${Number(r.estimatedCostUsd).toFixed(2)}`);
}
console.log(`total estimated: $${total.toFixed(2)} — check fal.ai dashboard for actuals`);
await prisma.$disconnect();
