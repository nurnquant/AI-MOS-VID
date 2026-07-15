/**
 * Audit-event writer (ADR-AIVS-003 §4). Best-effort by default — an audit
 * failure must not break the primary action — except where the caller
 * explicitly awaits a mandatory write (child-media URL issuance).
 */
import type { PrismaClient } from "@aivs/database";

export type AuditEventType =
  | "auth.login.success"
  | "auth.login.failure"
  | "auth.register"
  | "tenant.created"
  | "member.invited"
  | "member.joined"
  | "member.role_changed"
  | "member.removed"
  | "asset.child_media.url_issued"
  | "consent.created"
  | "consent.attached"
  | "consent.revoked"
  | "consent.expired_swept"
  | "asset.child_media.deleted"
  | "script.created"
  | "script.generated"
  | "script.submitted"
  | "script.approved"
  | "script.rejected";

export interface AuditEventInput {
  type: AuditEventType;
  tenantId?: string;
  userId?: string;
  detail?: unknown;
}

/** Mandatory write — throws on failure. */
export async function writeAuditStrict(
  prisma: PrismaClient,
  event: AuditEventInput,
): Promise<void> {
  await prisma.auditEvent.create({
    data: {
      type: event.type,
      tenantId: event.tenantId,
      userId: event.userId,
      detail: event.detail === undefined ? {} : JSON.parse(JSON.stringify(event.detail)),
    },
  });
}

/** Best-effort write — never throws. */
export async function writeAudit(prisma: PrismaClient, event: AuditEventInput): Promise<void> {
  try {
    await writeAuditStrict(prisma, event);
  } catch (error) {
    console.error(`audit write failed for ${event.type}:`, (error as Error).message);
  }
}
