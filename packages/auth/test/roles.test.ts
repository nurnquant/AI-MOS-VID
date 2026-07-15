import { describe, expect, it } from "vitest";
import { MembershipRole } from "@aivs/database";
import { canAccessChildMedia, canAssignRole, canManageMembers, roleAtLeast } from "../src/roles.ts";

describe("role hierarchy", () => {
  it("orders viewer < editor < child_media_reviewer < admin < owner", () => {
    expect(roleAtLeast(MembershipRole.owner, MembershipRole.admin)).toBe(true);
    expect(roleAtLeast(MembershipRole.admin, MembershipRole.child_media_reviewer)).toBe(true);
    expect(roleAtLeast(MembershipRole.child_media_reviewer, MembershipRole.editor)).toBe(true);
    expect(roleAtLeast(MembershipRole.editor, MembershipRole.viewer)).toBe(true);
    expect(roleAtLeast(MembershipRole.viewer, MembershipRole.editor)).toBe(false);
    expect(roleAtLeast(MembershipRole.editor, MembershipRole.child_media_reviewer)).toBe(false);
  });

  it("gates child media at child_media_reviewer and above (baseline §10)", () => {
    expect(canAccessChildMedia(MembershipRole.viewer)).toBe(false);
    expect(canAccessChildMedia(MembershipRole.editor)).toBe(false);
    expect(canAccessChildMedia(MembershipRole.child_media_reviewer)).toBe(true);
    expect(canAccessChildMedia(MembershipRole.admin)).toBe(true);
    expect(canAccessChildMedia(MembershipRole.owner)).toBe(true);
  });

  it("restricts member management to admin+ and grants strictly below own level", () => {
    expect(canManageMembers(MembershipRole.editor)).toBe(false);
    expect(canManageMembers(MembershipRole.admin)).toBe(true);
    expect(canAssignRole(MembershipRole.admin, MembershipRole.admin)).toBe(false);
    expect(canAssignRole(MembershipRole.admin, MembershipRole.editor)).toBe(true);
    expect(canAssignRole(MembershipRole.owner, MembershipRole.admin)).toBe(true);
    expect(canAssignRole(MembershipRole.owner, MembershipRole.owner)).toBe(false);
    expect(canAssignRole(MembershipRole.editor, MembershipRole.viewer)).toBe(false);
  });
});
