import type { MembershipRole, Scene, Script } from "@aivs/database";
import { serializeScene } from "@aivs/content";

type SceneWithRef = Scene & {
  referenceAsset: { id: string; displayName: string; featuresMinor: boolean } | null;
};

export function serializeScriptSummary(script: Script & { _count: { scenes: number } }) {
  return {
    id: script.id,
    projectId: script.projectId,
    title: script.title,
    language: script.language,
    status: script.status,
    targetPresets: script.targetPresets,
    sceneCount: script._count.scenes,
    createdAt: script.createdAt.toISOString(),
    updatedAt: script.updatedAt.toISOString(),
  };
}

export function serializeScriptDetail(
  script: Script & { scenes: SceneWithRef[] },
  role: MembershipRole,
) {
  return {
    id: script.id,
    projectId: script.projectId,
    title: script.title,
    brief: script.brief,
    language: script.language,
    status: script.status,
    targetPresets: script.targetPresets,
    createdAt: script.createdAt.toISOString(),
    updatedAt: script.updatedAt.toISOString(),
    scenes: script.scenes.map((scene) => serializeScene(scene, role)),
  };
}
