"use client";

/**
 * Script editor: brief + metadata, mock generation, scene table with
 * inline edits/reorder/reference selection (draft only), submit/approve/
 * reject actions. Narration is RTL when the script language is Arabic.
 */
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { badgeClass } from "@/lib/ui";

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

interface GenerationRow {
  id: string;
  targetPreset: string;
  status: string;
  error: string | null;
  finalAssetId: string | null;
  scenes: { position: number; status: string }[];
}

const PRESETS = [
  "youtube-1080p",
  "youtube-shorts",
  "instagram-reels",
  "instagram-feed",
  "facebook-feed",
  "tiktok",
  "whatsapp-status",
];

export default function ScriptEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [script, setScript] = useState<ScriptDetail | null>(null);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [generations, setGenerations] = useState<GenerationRow[]>([]);
  const [preset, setPreset] = useState(PRESETS[0]!);
  const [error, setError] = useState<string | null>(null);

  const refreshGenerations = useCallback(async () => {
    const response = await fetch(`/api/scripts/${id}/generations`);
    if (!response.ok) return;
    setGenerations(((await response.json()) as { generations: GenerationRow[] }).generations);
  }, [id]);

  useEffect(() => {
    void refreshGenerations();
    const timer = setInterval(() => void refreshGenerations(), 2500);
    return () => clearInterval(timer);
  }, [refreshGenerations]);

  async function openFinalVideo(assetId: string) {
    const response = await fetch(`/api/assets/${assetId}/signed-url`);
    if (!response.ok) {
      setError(`signed URL failed: ${response.status}`);
      return;
    }
    const { url } = (await response.json()) as { url: string };
    window.open(url, "_blank");
  }

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
    return error ? <p className="notice notice-error">{error}</p> : <p>Loading…</p>;
  }

  const editable = script.status === "draft";
  const rtl = script.language === "ar";

  return (
    <div>
      <div className="page-header">
        <h1 dir="auto">
          {script.title} <span className={badgeClass(script.status)}>{script.status}</span>
        </h1>
      </div>
      <p dir="auto" style={{ maxWidth: "48rem" }}>
        <strong>Brief:</strong> {script.brief}
      </p>
      <p className="row">
        {editable && (
          <button className="btn" onClick={() => void action("generate")}>
            Regenerate from brief
          </button>
        )}
        {editable && (
          <button
            className="btn"
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
        {editable && (
          <button className="btn btn-primary" onClick={() => void action("submit")}>
            Submit for review
          </button>
        )}
        {script.status === "in_review" && (
          <>
            <button className="btn btn-primary" onClick={() => void action("approve")}>
              Approve
            </button>
            <button
              className="btn btn-danger"
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
      {error && <p className="notice notice-error">{error}</p>}
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              {["#", "Narration", "Visual", "Sec", "Reference", ""].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {script.scenes.map((scene, index) => (
              <tr key={scene.id}>
                <td style={{ whiteSpace: "nowrap" }}>
                  {scene.position + 1}{" "}
                  {editable && index > 0 && (
                    <button
                      className="btn btn-sm"
                      onClick={() => void patchScene(scene.id, { position: index - 1 })}
                    >
                      ↑
                    </button>
                  )}
                  {editable && index < script.scenes.length - 1 && (
                    <button
                      className="btn btn-sm"
                      onClick={() => void patchScene(scene.id, { position: index + 1 })}
                    >
                      ↓
                    </button>
                  )}
                </td>
                <td style={{ minWidth: "18rem" }}>
                  <textarea
                    className="textarea"
                    aria-label={`Scene ${scene.position + 1} narration`}
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
                <td style={{ minWidth: "14rem" }}>
                  <textarea
                    className="textarea"
                    aria-label={`Scene ${scene.position + 1} visual description`}
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
                <td>{scene.durationTargetSeconds ?? "—"}</td>
                <td>
                  {scene.referenceMasked ? (
                    <em
                      className="child-flag"
                      title="reference restricted to child media reviewers"
                    >
                      restricted 🛡️
                    </em>
                  ) : editable ? (
                    <select
                      className="select"
                      aria-label={`Scene ${scene.position + 1} reference asset`}
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
                <td>
                  {editable && (
                    <button
                      className="btn btn-danger btn-sm"
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
                <td colSpan={6} className="muted">
                  No scenes — generate from the brief or add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {script.status === "approved" && (
        <section className="card" style={{ marginBlockStart: "1.5rem" }}>
          <h2>Generations</h2>
          <p className="row">
            <select
              className="select"
              aria-label="Target preset"
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
            >
              {PRESETS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <button
              className="btn btn-primary"
              onClick={() =>
                void call(`/api/scripts/${id}/generations`, {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ targetPreset: preset }),
                }).then(() => refreshGenerations())
              }
            >
              Start generation
            </button>
          </p>
          <table className="table">
            <thead>
              <tr>
                {["Preset", "Status", "Scenes", "Final video"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {generations.map((g) => (
                <tr key={g.id}>
                  <td>{g.targetPreset}</td>
                  <td>
                    <span className={badgeClass(g.status)}>{g.status}</span>
                    {g.error && <span className="muted"> {g.error}</span>}
                  </td>
                  <td>
                    {g.scenes.filter((s) => s.status === "succeeded").length}/{g.scenes.length}
                  </td>
                  <td>
                    {(g.status === "partial" || g.status === "failed") && (
                      <button
                        className="btn btn-sm"
                        onClick={() =>
                          void call(`/api/scripts/${id}/generations/${g.id}/resume`, {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            body: "{}",
                          }).then(() => refreshGenerations())
                        }
                      >
                        resume ({g.scenes.filter((s) => s.status !== "succeeded").length} scenes)
                      </button>
                    )}{" "}
                    {g.finalAssetId ? (
                      <button
                        className="btn btn-sm"
                        onClick={() => void openFinalVideo(g.finalAssetId!)}
                      >
                        open video
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {generations.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">
                    No generations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
