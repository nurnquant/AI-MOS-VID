/** RBAC hierarchy (ADR-AIVS-003 §3) — higher level includes all rights below. */
import { MembershipRole } from "@aivs/database";

export const ROLE_LEVELS: Readonly<Record<MembershipRole, number>> = {
  [MembershipRole.viewer]: 0,
  [MembershipRole.editor]: 1,
  [MembershipRole.child_media_reviewer]: 2,
  [MembershipRole.admin]: 3,
  [MembershipRole.owner]: 4,
};

export function roleAtLeast(role: MembershipRole, min: MembershipRole): boolean {
  return ROLE_LEVELS[role] >= ROLE_LEVELS[min];
}

/** Baseline §10: child-media access restricted to explicitly granted roles. */
export function canAccessChildMedia(role: MembershipRole): boolean {
  return roleAtLeast(role, MembershipRole.child_media_reviewer);
}

export function canManageMembers(role: MembershipRole): boolean {
  return roleAtLeast(role, MembershipRole.admin);
}

/** A member may only grant/change roles strictly below their own level. */
export function canAssignRole(actor: MembershipRole, target: MembershipRole): boolean {
  return canManageMembers(actor) && ROLE_LEVELS[target] < ROLE_LEVELS[actor];
}
