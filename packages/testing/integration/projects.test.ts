/**
 * PROJECTS-012 integration: CRUD, unique-slug collision, delete guard
 * (content-bearing projects are undeletable), audits.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createProject, deleteProject, listProjects, renameProject } from "@aivs/auth";
import { ScriptLanguage, createPrismaClient, type PrismaClient } from "@aivs/database";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://aivs:aivs_local@localhost:5433/aivs";

let prisma: PrismaClient;
let tenantId: string;
const userId = randomUUID();

beforeAll(async () => {
  prisma = createPrismaClient(DATABASE_URL);
  await prisma.user.create({
    data: { id: userId, name: "Proj Actor", email: `proj-${userId.slice(0, 8)}@it.riwaq.dev` },
  });
  const tenant = await prisma.tenant.create({
    data: { slug: `proj-${randomUUID().slice(0, 8)}`, name: "Projects Tenant" },
  });
  tenantId = tenant.id;
});

afterAll(async () => {
  await prisma.auditEvent.deleteMany({ where: { tenantId } });
  await prisma.script.deleteMany({ where: { tenantId } });
  await prisma.project.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("project CRUD (AIVS-PROJECTS-012)", () => {
  it("creates, renames, lists with counts, deletes when empty — all audited", async () => {
    const ctx = { tenantId, userId };
    const project = await createProject(prisma, ctx, "Ramadan Series");
    expect(project.slug).toBe("ramadan-series");

    await expect(createProject(prisma, ctx, "Ramadan  Series")).rejects.toThrow(/already exists/);

    const renamed = await renameProject(prisma, ctx, project.id, "Ramadan 2026");
    expect(renamed.slug).toBe("ramadan-2026");

    const listed = await listProjects(prisma, tenantId);
    const row = listed.find((p) => p.id === project.id)!;
    expect(row).toMatchObject({ name: "Ramadan 2026", assetCount: 0, scriptCount: 0 });

    await deleteProject(prisma, ctx, project.id);
    expect(await prisma.project.findUnique({ where: { id: project.id } })).toBeNull();

    const types = (await prisma.auditEvent.findMany({ where: { tenantId } })).map((e) => e.type);
    expect(types).toEqual(
      expect.arrayContaining(["project.created", "project.renamed", "project.deleted"]),
    );
  });

  it("refuses to delete a project holding content", async () => {
    const ctx = { tenantId, userId };
    const project = await createProject(prisma, ctx, "Holds Content");
    await prisma.script.create({
      data: {
        tenantId,
        projectId: project.id,
        title: "occupier",
        brief: "keeps the project undeletable",
        language: ScriptLanguage.en,
        createdBy: userId,
      },
    });

    await expect(deleteProject(prisma, ctx, project.id)).rejects.toThrow(/holds content/);
    expect(await prisma.project.findUnique({ where: { id: project.id } })).not.toBeNull();
  });

  it("scopes by tenant — foreign projects are invisible", async () => {
    const other = await prisma.tenant.create({
      data: { slug: `proj-o-${randomUUID().slice(0, 8)}`, name: "Other" },
    });
    try {
      const foreign = await prisma.project.create({
        data: { tenantId: other.id, slug: "foreign", name: "Foreign" },
      });
      await expect(
        renameProject(prisma, { tenantId, userId }, foreign.id, "steal"),
      ).rejects.toThrow(/not found/);
      await expect(deleteProject(prisma, { tenantId, userId }, foreign.id)).rejects.toThrow(
        /not found/,
      );
    } finally {
      await prisma.project.deleteMany({ where: { tenantId: other.id } });
      await prisma.tenant.delete({ where: { id: other.id } });
    }
  });
});
