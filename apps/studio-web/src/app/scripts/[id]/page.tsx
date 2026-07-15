"use client";

/**
 * Script editor: brief + metadata, mock generation, scene table with
 * inline edits/reorder/reference selection (draft only), submit/approve/
 * reject actions. Narration is RTL when the script language is Arabic.
 */
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface SceneRow {
  id: string;
  position: number;
  narration: string;
  visualDescription: string;
  durationTargetSeconds: number | null;
  referenceAssetId: string | null;
  referenceAssetName: string | null;
  referenceMasked: boolean;
}

interface ScriptDetail {
  id: string;
  title: string;
  brief: string;
  language: string;
  status: string;
  scenes: SceneRow[];
}

interface AssetOption {
  id: string;
  displayName: string;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "#888",
  in_review: "#1e90ff",
  approved: "#2e8b57",
};

export default function ScriptEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [script, setScript] = useState<ScriptDetail | null>(null);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/scripts/${id}`);
    if (response.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? `load failed: ${response.status}`);
      return;
    }
    setScript(((await response.json()) as { script: ScriptDetail }).script);
    setError(null);
  }, [id]);

  useEffect(() => {
    void refresh();
    void fetch("/api/assets").then(async (r) => {
      if (!r.ok) return;
      const data = (await r.json()) as { assets: AssetOption[] };
      setAssets(data.assets.filter((a) => a.status === "ready"));
    });
  }, [refresh]);

  async function call(path: string, init: RequestInit) {
    setError(null);
    const response = await fetch(path, init);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? `request failed: ${response.status}`);
      return false;
    }
    await refresh();
    return true;
  }

  const action = (name: string, reason?: string) =>
    call(`/api/scripts/${id}/actions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: name, ...(reason ? { reason } : {}) }),
    });

  const patchScene = (sceneId: string, patch: Record<string, unknown>) =>
    call(`/api/scripts/${id}/scenes/${sceneId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });

  if (!script) {
    return error ? <p style={{ color: "#b22222" }}>{error}</p> : <p>Loading…</p>;
  }

  const editable = script.status === "draft";
  const rtl = script.language === "ar";

  return (
    <div>
      <h1 dir="auto">
        {script.title}{" "}
        <span
          style={{
            background: STATUS_COLORS[script.status] ?? "#888",
            color: "white",
            borderRadius: "4px",
            padding: "0.1rem 0.5rem",
            fontSize: "1rem",
            verticalAlign: "middle",
          }}
        >
          {script.status}
        </span>
      </h1>
      <p dir="auto" style={{ maxWidth: "48rem" }}>
        <strong>Brief:</strong> {script.brief}
      </p>
      <p style={{ display: "flex", gap: "0.5rem" }}>
        {editable && <button onClick={() => void action("generate")}>Regenerate from brief</button>}
        {editable && (
          <button
            onClick={() =>
              void call(`/api/scripts/${id}/scenes`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ narration: "…", visualDescription: "…" }),
              })
            }
          >
            Add scene
          </button>
        )}
        {editable && <button onClick={() => void action("submit")}>Submit for review</button>}
        {script.status === "in_review" && (
          <>
            <button onClick={() => void action("approve")}>Approve</button>
            <button
              onClick={() => {
                const reason = window.prompt("Reject back to draft — reason:");
                if (reason) void action("reject", reason);
              }}
            >
              Reject
            </button>
          </>
        )}
      </p>
      {error && <p style={{ color: "#b22222" }}>{error}</p>}
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            {["#", "Narration", "Visual", "Sec", "Reference", ""].map((h) => (
              <th
                key={h}
                style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: "0.4rem" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {script.scenes.map((scene, index) => (
            <tr key={scene.id}>
              <td style={{ padding: "0.4rem", whiteSpace: "nowrap" }}>
                {scene.position + 1}{" "}
                {editable && index > 0 && (
                  <button onClick={() => void patchScene(scene.id, { position: index - 1 })}>
                    ↑
                  </button>
                )}
                {editable && index < script.scenes.length - 1 && (
                  <button onClick={() => void patchScene(scene.id, { position: index + 1 })}>
                    ↓
                  </button>
                )}
              </td>
              <td style={{ padding: "0.4rem", minWidth: "18rem" }}>
                <textarea
                  key={`${scene.id}-n-${scene.narration}`}
                  defaultValue={scene.narration}
                  dir={rtl ? "rtl" : "ltr"}
                  disabled={!editable}
                  rows={2}
                  style={{ width: "100%" }}
                  onBlur={(e) => {
                    if (e.target.value !== scene.narration && e.target.value.trim()) {
                      void patchScene(scene.id, { narration: e.target.value });
                    }
                  }}
                />
              </td>
              <td style={{ padding: "0.4rem", minWidth: "14rem" }}>
                <textarea
                  key={`${scene.id}-v-${scene.visualDescription}`}
                  defaultValue={scene.visualDescription}
                  dir="auto"
                  disabled={!editable}
                  rows={2}
                  style={{ width: "100%" }}
                  onBlur={(e) => {
                    if (e.target.value !== scene.visualDescription && e.target.value.trim()) {
                      void patchScene(scene.id, { visualDescription: e.target.value });
                    }
                  }}
                />
              </td>
              <td style={{ padding: "0.4rem" }}>{scene.durationTargetSeconds ?? "—"}</td>
              <td style={{ padding: "0.4rem" }}>
                {scene.referenceMasked ? (
                  <em title="reference restricted to child media reviewers">restricted 🛡️</em>
                ) : editable ? (
                  <select
                    value={scene.referenceAssetId ?? ""}
                    onChange={(e) =>
                      void patchScene(scene.id, { referenceAssetId: e.target.value || null })
                    }
                  >
                    <option value="">— none —</option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.displayName}
                      </option>
                    ))}
                  </select>
                ) : (
                  (scene.referenceAssetName ?? "—")
                )}
              </td>
              <td style={{ padding: "0.4rem" }}>
                {editable && (
                  <button
                    onClick={() =>
                      void call(`/api/scripts/${id}/scenes/${scene.id}`, { method: "DELETE" })
                    }
                  >
                    delete
                  </button>
                )}
              </td>
            </tr>
          ))}
          {script.scenes.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: "0.6rem", color: "#888" }}>
                No scenes — generate from the brief or add one.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
