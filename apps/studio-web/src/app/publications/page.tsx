"use client";

/**
 * Publishing workflow (ADR-AIVS-008): create publication from a ready
 * video, review queue with role-appropriate actions, approvals progress,
 * mock external id when published.
 */
import { useCallback, useEffect, useState } from "react";
import { useMounted } from "@/lib/use-mounted";
import { badgeClass } from "@/lib/ui";

interface PublicationRow {
  id: string;
  platform: string;
  caption: string;
  status: string;
  externalId: string | null;
  error: string | null;
  assetName: string;
  projectName: string | null;
  featuresMinor: boolean;
  approvals: { kind: string }[];
}

interface AssetOption {
  id: string;
  displayName: string;
  kind: string;
  status: string;
}

const PLATFORMS = ["youtube", "instagram", "tiktok", "facebook", "whatsapp"];

export default function PublicationsPage() {
  const [rows, setRows] = useState<PublicationRow[]>([]);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [assetId, setAssetId] = useState("");
  const [platform, setPlatform] = useState(PLATFORMS[0]!);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mounted = useMounted();

  const refresh = useCallback(async () => {
    const response = await fetch("/api/publications");
    if (response.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (!response.ok) {
      setError(`load failed: ${response.status}`);
      return;
    }
    setRows(((await response.json()) as { publications: PublicationRow[] }).publications);
    setError(null);
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 2500);
    void fetch("/api/assets").then(async (r) => {
      if (!r.ok) return;
      const data = (await r.json()) as { assets: AssetOption[] };
      setAssets(data.assets.filter((a) => a.status === "ready" && a.kind === "video"));
    });
    return () => clearInterval(timer);
  }, [refresh]);

  async function call(path: string, body: unknown) {
    setError(null);
    const response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? `request failed: ${response.status}`);
      return;
    }
    await refresh();
  }

  const requiredCount = (row: PublicationRow) => (row.featuresMinor ? 3 : 1);

  return (
    <div>
      <div className="page-header">
        <h1>Publishing</h1>
        <p>Ready videos → review → approval matrix → platform</p>
      </div>
      <div className="card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (assetId) void call("/api/publications", { assetId, platform, caption });
          }}
          className="form-row"
        >
          <select
            className="select"
            aria-label="Ready video"
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            required
          >
            <option value="">select ready video…</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.displayName}
              </option>
            ))}
          </select>
          <select
            className="select"
            aria-label="Platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input
            className="input"
            aria-label="Caption"
            placeholder="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            required
            style={{ minWidth: "18rem" }}
            dir="auto"
          />
          <button className="btn btn-primary" type="submit" disabled={!mounted}>
            Create
          </button>
        </form>
        {error && <p className="notice notice-error">{error}</p>}
      </div>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              {[
                "Video",
                "Platform",
                "Caption",
                "Status",
                "Approvals",
                "External ID",
                "Actions",
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  {row.assetName}
                  {row.featuresMinor && (
                    <span className="child-flag" title="features a minor">
                      {" "}
                      🛡️
                    </span>
                  )}
                </td>
                <td>{row.platform}</td>
                <td style={{ maxWidth: "16rem" }} dir="auto">
                  {row.caption}
                </td>
                <td>
                  <span className={badgeClass(row.status)}>{row.status}</span>
                  {row.error && <span className="muted"> {row.error}</span>}
                </td>
                <td>
                  {row.approvals.length}/{requiredCount(row)}
                </td>
                <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                  {row.externalId ?? "—"}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {(row.status === "draft" || row.status === "failed") && (
                    <button
                      className="btn btn-sm"
                      onClick={() =>
                        void call(`/api/publications/${row.id}/actions`, { action: "submit" })
                      }
                    >
                      submit
                    </button>
                  )}
                  {row.status === "in_review" && (
                    <>
                      {row.featuresMinor && (
                        <button
                          className="btn btn-sm"
                          onClick={() =>
                            void call(`/api/publications/${row.id}/actions`, {
                              action: "content_approve",
                            })
                          }
                        >
                          content ✓
                        </button>
                      )}{" "}
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() =>
                          void call(`/api/publications/${row.id}/actions`, {
                            action: "final_approve",
                          })
                        }
                      >
                        final ✓
                      </button>{" "}
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => {
                          const reason = window.prompt("Reject — reason:");
                          if (reason)
                            void call(`/api/publications/${row.id}/actions`, {
                              action: "reject",
                              reason,
                            });
                        }}
                      >
                        reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="muted">
                  No publications yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
