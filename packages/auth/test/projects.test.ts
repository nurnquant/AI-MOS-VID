import { describe, expect, it } from "vitest";
import { deriveProjectSlug } from "../src/projects.ts";

describe("deriveProjectSlug", () => {
  it("lowercases, dashes, and trims", () => {
    expect(deriveProjectSlug("Ramadan Series 2026")).toBe("ramadan-series-2026");
    expect(deriveProjectSlug("  Kids -- Content!  ")).toBe("kids-content");
  });

  it("rejects names with no usable characters", () => {
    expect(() => deriveProjectSlug("!!!")).toThrow(/letters or digits/);
  });
});
