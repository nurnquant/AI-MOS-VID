import { describe, expect, it } from "vitest";
import { ApprovalKind } from "@aivs/database";
import { requiredApprovalKinds } from "../src/workflow.ts";

describe("requiredApprovalKinds (baseline §10 matrix)", () => {
  it("non-minor video needs final approval only", () => {
    expect(requiredApprovalKinds(false)).toEqual([ApprovalKind.final_approval]);
  });

  it("child media needs content review + guardian scope + final approval", () => {
    expect(requiredApprovalKinds(true)).toEqual([
      ApprovalKind.content_review,
      ApprovalKind.guardian_scope,
      ApprovalKind.final_approval,
    ]);
  });
});
