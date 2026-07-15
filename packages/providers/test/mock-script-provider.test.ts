import { describe, expect, it } from "vitest";
import { MockScriptProvider } from "../src/script.ts";

const provider = new MockScriptProvider();

describe("MockScriptProvider", () => {
  it("is deterministic: same brief + language → identical scenes", async () => {
    const a = await provider.generate({ brief: "the five pillars", language: "en" });
    const b = await provider.generate({ brief: "the five pillars", language: "en" });
    expect(a).toEqual(b);
  });

  it("varies output across briefs and languages", async () => {
    const en = await provider.generate({ brief: "kindness to neighbors", language: "en" });
    const other = await provider.generate({ brief: "honesty", language: "en" });
    const ar = await provider.generate({ brief: "kindness to neighbors", language: "ar" });
    expect(en.scenes).not.toEqual(other.scenes);
    expect(en.scenes.map((s) => s.narration)).not.toEqual(ar.scenes.map((s) => s.narration));
  });

  it("emits 3-5 scenes by default and honors sceneCount", async () => {
    const auto = await provider.generate({ brief: "gratitude", language: "en" });
    expect(auto.scenes.length).toBeGreaterThanOrEqual(3);
    expect(auto.scenes.length).toBeLessThanOrEqual(5);
    const fixed = await provider.generate({ brief: "gratitude", language: "en", sceneCount: 4 });
    expect(fixed.scenes).toHaveLength(4);
  });

  it("produces Arabic narration for ar and rejects empty briefs", async () => {
    const ar = await provider.generate({ brief: "بر الوالدين", language: "ar" });
    expect(ar.scenes[0]!.narration).toMatch(/[؀-ۿ]/);
    await expect(provider.generate({ brief: "  ", language: "en" })).rejects.toThrow(/brief/);
  });

  it("every scene has narration, visual, and a positive duration", async () => {
    const { scenes } = await provider.generate({ brief: "patience", language: "en" });
    for (const scene of scenes) {
      expect(scene.narration.length).toBeGreaterThan(0);
      expect(scene.visualDescription.length).toBeGreaterThan(0);
      expect(scene.durationTargetSeconds).toBeGreaterThan(0);
    }
  });
});
