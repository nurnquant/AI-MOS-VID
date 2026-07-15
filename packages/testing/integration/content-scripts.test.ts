/**
 * CONTENT-005 integration: generation determinism, draft-only edits, the
 * status machine, scene reorder, reference rules, and audit — against
 * live local Postgres.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ContentError,
  addScene,
  createScript,
  deleteScene,
  getScript,
  regenerateScenes,
  serializeScene,
  setSceneReference,
  transitionScript,
  updateScene,
  updateScriptMeta,
} from "@aivs/content";
import {
  AssetStatus,
  MediaKind,
  MembershipRole,
  ScriptLanguage,
  ScriptStatus,
  createPrismaClient,
  type PrismaClient,
} from "@aivs/database";
import { MockScriptProvider } from "@aivs/providers";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://aivs:aivs_local@localhost:5433/aivs";

const provider = new MockScriptProvider();
let prisma: PrismaClient;
let tenantId: string;
let projectId: string;
let ctx: { tenantId: string; userId: string };
const userId = randomUUID();

beforeAll(async () => {
  prisma = createPrismaClient(DATABASE_URL);
  await prisma.user.create({
    data: { id: userId, name: "Script Actor", email: `script-${userId.slice(0, 8)}@it.riwaq.dev` },
  });
  const tenant = await prisma.tenant.create({
    data: { slug: `cs-${randomUUID().slice(0, 8)}`, name: "Content Tenant" },
  });
  tenantId = tenant.id;
  ctx = { tenantId, userId };
  const project = await prisma.project.create({
    data: { tenantId, slug: "content", name: "Content Project" },
  });
  projectId = project.id;
});

afterAll(async () => {
  await prisma.auditEvent.deleteMany({ where: { tenantId } });
  await prisma.script.deleteMany({ where: { tenantId } });
  await prisma.asset.deleteMany({ where: { tenantId } });
  await prisma.project.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

function newScript(generate = true) {
  return createScript(prisma, ctx, {
    projectId,
    title: `Script ${randomUUID().slice(0, 6)}`,
    brief: "the importance of honesty",
    language: ScriptLanguage.en,
    provider: generate ? provider : undefined,
  });
}

describe("generation", () => {
  it("creates deterministic scenes from the brief", async () => {
    const script = await newScript();
    expect(script.scenes.length).toBeGreaterThanOrEqual(3);
    const direct = await provider.generate({
      brief: "the importance of honesty",
      language: "en",
    });
    expect(script.scenes.map((s) => s.narration)).toEqual(direct.scenes.map((s) => s.narration));

    const regenerated = await regenerateScenes(prisma, ctx, script.id, provider);
    expect(regenerated.scenes.map((s) => s.narration)).toEqual(
      direct.scenes.map((s) => s.narration),
    );
  });
});

describe("status machine", () => {
  it("walks draft → in_review → approved with audit, blocking edits en route", async () => {
    const script = await newScript();
    await transitionScript(prisma, ctx, script.id, "submit");

    await expect(updateScriptMeta(prisma, ctx, script.id, { title: "x" })).rejects.toMatchObject({
      status: 409,
    });
    await expect(regenerateScenes(prisma, ctx, script.id, provider)).rejects.toMatchObject({
      status: 409,
    });
    // approve from in_review
    const approved = await transitionScript(prisma, ctx, script.id, "approve");
    expect(approved.status).toBe(ScriptStatus.approved);
    // terminal
    await expect(transitionScript(prisma, ctx, script.id, "submit")).rejects.toMatchObject({
      status: 409,
    });

    const types = (await prisma.auditEvent.findMany({ where: { tenantId } })).map((e) => e.type);
    for (const expected of [
      "script.created",
      "script.generated",
      "script.submitted",
      "script.approved",
    ]) {
      expect(types).toContain(expected);
    }
  });

  it("rejects back to draft (audited) and blocks empty submissions", async () => {
    const script = await newScript();
    await transitionScript(prisma, ctx, script.id, "submit");
    const rejected = await transitionScript(prisma, ctx, script.id, "reject", "needs more depth");
    expect(rejected.status).toBe(ScriptStatus.draft);

    const blank = await newScript(false);
    await expect(transitionScript(prisma, ctx, blank.id, "submit")).rejects.toThrow(/no scenes/);
    await expect(transitionScript(prisma, ctx, blank.id, "approve")).rejects.toMatchObject({
      status: 409,
    });
  });
});

describe("scenes", () => {
  it("reorders gap-free and renormalizes after deletion", async () => {
    const script = await newScript(false);
    for (let i = 0; i < 4; i++) {
      await addScene(prisma, ctx, script.id, {
        narration: `n${i}`,
        visualDescription: `v${i}`,
      });
    }
    let scenes = (await getScript(prisma, tenantId, script.id)).scenes;
    const last = scenes[3]!;
    await updateScene(prisma, ctx, script.id, last.id, { position: 0 });
    scenes = (await getScript(prisma, tenantId, script.id)).scenes;
    expect(scenes.map((s) => s.narration)).toEqual(["n3", "n0", "n1", "n2"]);
    expect(scenes.map((s) => s.position)).toEqual([0, 1, 2, 3]);

    await deleteScene(prisma, ctx, script.id, scenes[1]!.id);
    scenes = (await getScript(prisma, tenantId, script.id)).scenes;
    expect(scenes.map((s) => s.position)).toEqual([0, 1, 2]);
    expect(scenes.map((s) => s.narration)).toEqual(["n3", "n1", "n2"]);
  });

  it("enforces reference rules and masks child media", async () => {
    const script = await newScript(false);
    const scene = await addScene(prisma, ctx, script.id, {
      narration: "n",
      visualDescription: "v",
    });

    const makeAsset = (status: AssetStatus, featuresMinor = false) =>
      prisma.asset.create({
        data: {
          tenantId,
          projectId,
          kind: MediaKind.video,
          status,
          displayName: `ref-${status}${featuresMinor ? "-minor" : ""}.mp4`,
          claimedContentType: "video/mp4",
          sizeBytes: 1,
          checksumSha256: "0".repeat(64),
          featuresMinor,
        },
      });

    const quarantined = await makeAsset(AssetStatus.quarantined);
    await expect(
      setSceneReference(prisma, ctx, script.id, scene.id, quarantined.id),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      setSceneReference(prisma, ctx, script.id, scene.id, randomUUID()),
    ).rejects.toMatchObject({ status: 404 });

    const minorReady = await makeAsset(AssetStatus.ready, true);
    await setSceneReference(prisma, ctx, script.id, scene.id, minorReady.id);
    const detail = await getScript(prisma, tenantId, script.id);
    const withRef = detail.scenes.find((s) => s.id === scene.id)!;
    expect(serializeScene(withRef, MembershipRole.editor)).toMatchObject({
      referenceMasked: true,
      referenceAssetId: null,
    });
    expect(serializeScene(withRef, MembershipRole.owner)).toMatchObject({
      referenceMasked: false,
      referenceAssetId: minorReady.id,
    });

    await setSceneReference(prisma, ctx, script.id, scene.id, null);
    const cleared = await getScript(prisma, tenantId, script.id);
    expect(cleared.scenes.find((s) => s.id === scene.id)!.referenceAssetId).toBeNull();
  });

  it("is cross-tenant safe", async () => {
    const otherTenant = await prisma.tenant.create({
      data: { slug: `cs2-${randomUUID().slice(0, 8)}`, name: "Other" },
    });
    const script = await newScript(false);
    await expect(getScript(prisma, otherTenant.id, script.id)).rejects.toBeInstanceOf(ContentError);
    await prisma.tenant.delete({ where: { id: otherTenant.id } });
  });
});
