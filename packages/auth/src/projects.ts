/**
 * Project CRUD (AIVS-PROJECTS-012). Projects organize assets/scripts
 * inside a workspace. Delete is guarded: a project holding any assets
 * or scripts can never be deleted — no cascade, ever.
 */
import type { PrismaClient } from "@aivs/database";
import { writeAudit } from "./audit.ts";
import { TenancyError } from "./tenancy.ts";

export interface ProjectContext {
  tenantId: string;
  userId: string;
}

/** Same normalization as workspace slugs: lowercase, dashed, trimmed. */
export function deriveProjectSlug(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  if (!slug) throw new TenancyError("project name must contain letters or digits", 400);
  return slug;
}

export async function createProject(prisma: PrismaClient, ctx: ProjectContext, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new TenancyError("project name is required", 400);
  const slug = deriveProjectSlug(trimmed);
  const existing = await prisma.project.findFirst({
    where: { tenantId: ctx.tenantId, slug },
    select: { id: true },
  });
  if (existing) throw new TenancyError(`a project named "${trimmed}" already exists`, 409);
  const project = await prisma.project.create({
    data: { tenantId: ctx.tenantId, slug, name: trimmed },
  });
  await writeAudit(prisma, {
    type: "project.created",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    detail: { projectId: project.id, slug },
  });
  return project;
}

export async function renameProject(
  prisma: PrismaClient,
  ctx: ProjectContext,
  projectId: string,
  name: string,
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: ctx.tenantId },
  });
  if (!project) throw new TenancyError("project not found", 404);
  const trimmed = name.trim();
  if (!trimmed) throw new TenancyError("project name is required", 400);
  const slug = deriveProjectSlug(trimmed);
  const clash = await prisma.project.findFirst({
    where: { tenantId: ctx.tenantId, slug, id: { not: projectId } },
    select: { id: true },
  });
  if (clash) throw new TenancyError(`a project named "${trimmed}" already exists`, 409);
  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { name: trimmed, slug },
  });
  await writeAudit(prisma, {
    type: "project.renamed",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    detail: { projectId, from: project.name, to: trimmed },
  });
  return updated;
}

/** Delete only when EMPTY — content-bearing projects are undeletable. */
export async function deleteProject(prisma: PrismaClient, ctx: ProjectContext, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: ctx.tenantId },
    include: { _count: { select: { assets: true, scripts: true } } },
  });
  if (!project) throw new TenancyError("project not found", 404);
  const { assets, scripts } = project._count;
  if (assets > 0 || scripts > 0) {
    throw new TenancyError(
      `project holds content (${assets} asset(s), ${scripts} script(s)) — move or delete content first`,
      409,
    );
  }
  await prisma.project.delete({ where: { id: projectId } });
  await writeAudit(prisma, {
    type: "project.deleted",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    detail: { projectId, slug: project.slug },
  });
}

export async function listProjects(prisma: PrismaClient, tenantId: string) {
  const projects = await prisma.project.findMany({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { assets: true, scripts: true } } },
  });
  return projects.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    assetCount: p._count.assets,
    scriptCount: p._count.scripts,
    createdAt: p.createdAt.toISOString(),
  }));
}
