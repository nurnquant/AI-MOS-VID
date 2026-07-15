/**
 * Tenant onboarding, invitations, and membership management
 * (ADR-AIVS-003 §2). All writes audited.
 */
import { randomBytes } from "node:crypto";
import { MembershipRole, type PrismaClient } from "@aivs/database";
import { writeAudit } from "./audit.ts";
import type { EmailSender } from "./email.ts";
import { canAssignRole, canManageMembers } from "./roles.ts";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class TenancyError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "TenancyError";
    this.status = status;
  }
}

export async function createTenant(
  prisma: PrismaClient,
  params: { userId: string; name: string; slug: string },
) {
  const slug = params.slug.toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(slug)) {
    throw new TenancyError("slug must be lowercase alphanumeric/hyphen, 2-63 chars", 400);
  }
  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) throw new TenancyError(`tenant slug "${slug}" is taken`, 409);

  const tenant = await prisma.$transaction(async (tx) => {
    const created = await tx.tenant.create({ data: { name: params.name, slug } });
    await tx.membership.create({
      data: { userId: params.userId, tenantId: created.id, role: MembershipRole.owner },
    });
    return created;
  });
  await writeAudit(prisma, {
    type: "tenant.created",
    tenantId: tenant.id,
    userId: params.userId,
    detail: { slug },
  });
  return tenant;
}

export async function inviteMember(
  prisma: PrismaClient,
  email: EmailSender,
  params: {
    tenantId: string;
    inviterUserId: string;
    inviterRole: MembershipRole;
    inviteeEmail: string;
    role: MembershipRole;
    baseUrl: string;
  },
) {
  if (!canAssignRole(params.inviterRole, params.role)) {
    throw new TenancyError(`role ${params.inviterRole} cannot grant role ${params.role}`, 403);
  }
  const inviteeEmail = params.inviteeEmail.trim().toLowerCase();
  const existingMember = await prisma.membership.findFirst({
    where: { tenantId: params.tenantId, user: { email: inviteeEmail } },
  });
  if (existingMember) throw new TenancyError("user is already a member", 409);

  const token = randomBytes(32).toString("hex");
  const invitation = await prisma.invitation.create({
    data: {
      tenantId: params.tenantId,
      email: inviteeEmail,
      role: params.role,
      token,
      invitedBy: params.inviterUserId,
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    },
  });
  await writeAudit(prisma, {
    type: "member.invited",
    tenantId: params.tenantId,
    userId: params.inviterUserId,
    detail: { email: inviteeEmail, role: params.role },
  });
  await email.send({
    to: inviteeEmail,
    subject: "You are invited to an AIVS workspace",
    text: `Accept your invitation (expires in 7 days): ${params.baseUrl}/invite/${token}`,
  });
  return invitation;
}

export async function acceptInvitation(
  prisma: PrismaClient,
  params: { token: string; userId: string; userEmail: string },
) {
  const invitation = await prisma.invitation.findUnique({ where: { token: params.token } });
  if (!invitation) throw new TenancyError("invitation not found", 404);
  if (invitation.acceptedAt) throw new TenancyError("invitation already used", 409);
  if (invitation.expiresAt < new Date()) throw new TenancyError("invitation expired", 410);
  if (invitation.email !== params.userEmail.trim().toLowerCase()) {
    throw new TenancyError("invitation was issued to a different email", 403);
  }

  const membership = await prisma.$transaction(async (tx) => {
    const created = await tx.membership.upsert({
      where: { userId_tenantId: { userId: params.userId, tenantId: invitation.tenantId } },
      update: {},
      create: {
        userId: params.userId,
        tenantId: invitation.tenantId,
        role: invitation.role,
      },
    });
    await tx.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });
    return created;
  });
  await writeAudit(prisma, {
    type: "member.joined",
    tenantId: invitation.tenantId,
    userId: params.userId,
    detail: { role: invitation.role },
  });
  return membership;
}

export async function changeMemberRole(
  prisma: PrismaClient,
  params: {
    tenantId: string;
    actorUserId: string;
    actorRole: MembershipRole;
    targetUserId: string;
    newRole: MembershipRole;
  },
) {
  const target = await prisma.membership.findUnique({
    where: { userId_tenantId: { userId: params.targetUserId, tenantId: params.tenantId } },
  });
  if (!target) throw new TenancyError("membership not found", 404);
  if (target.role === MembershipRole.owner) {
    throw new TenancyError("owner role cannot be changed here", 403);
  }
  if (
    !canAssignRole(params.actorRole, params.newRole) ||
    !canAssignRole(params.actorRole, target.role)
  ) {
    throw new TenancyError("insufficient role to make this change", 403);
  }
  const updated = await prisma.membership.update({
    where: { id: target.id },
    data: { role: params.newRole },
  });
  await writeAudit(prisma, {
    type: "member.role_changed",
    tenantId: params.tenantId,
    userId: params.actorUserId,
    detail: { targetUserId: params.targetUserId, from: target.role, to: params.newRole },
  });
  return updated;
}

export async function removeMember(
  prisma: PrismaClient,
  params: {
    tenantId: string;
    actorUserId: string;
    actorRole: MembershipRole;
    targetUserId: string;
  },
) {
  if (!canManageMembers(params.actorRole)) {
    throw new TenancyError("insufficient role to remove members", 403);
  }
  const target = await prisma.membership.findUnique({
    where: { userId_tenantId: { userId: params.targetUserId, tenantId: params.tenantId } },
  });
  if (!target) throw new TenancyError("membership not found", 404);
  if (target.role === MembershipRole.owner) {
    throw new TenancyError("the owner cannot be removed", 403);
  }
  if (!canAssignRole(params.actorRole, target.role)) {
    throw new TenancyError("insufficient role to remove this member", 403);
  }
  await prisma.membership.delete({ where: { id: target.id } });
  await writeAudit(prisma, {
    type: "member.removed",
    tenantId: params.tenantId,
    userId: params.actorUserId,
    detail: { targetUserId: params.targetUserId, role: target.role },
  });
}

export async function listMembers(prisma: PrismaClient, tenantId: string) {
  return prisma.membership.findMany({
    where: { tenantId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
}
