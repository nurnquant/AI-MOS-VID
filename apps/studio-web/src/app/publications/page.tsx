"use client";

/**
 * Publishing workflow (ADR-AIVS-008): create publication from a ready
 * video, review queue with role-appropriate actions, approvals progress,
 * mock external id when published.
 */
import { useCallback, useEffect, useState } from "react";

interface PublicationRow {
  id: string;
  platform: string;
  caption: string;
  status: string;
  externalId: string | null;
  error: string | null;
  assetName: string;
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

const STATUS_COLORS: Record<string, string> = {
  draft: "#888",
  in_review: "#1e90ff",
  approved: "#2e8b57",
  published: "#2e8b57",
  failed: "#b22222",
  retracted: "#b22222",
};

export default function PublicationsPage() {
  const [rows, setRows] = useState<PublicationRow[]>([]);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [assetId, setAssetId] = useState("");
  const [platform, setPlatform] = useState(PLATFORMS[0]!);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);

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
      <h1>Publishing</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (assetId) void call("/api/publications", { assetId, platform, caption });
        }}
        style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}
      >
        <select value={assetId} onChange={(e) => setAssetId(e.target.value)} required>
          <option value="">select ready video…</option>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.displayName}
            </option>
          ))}
        </select>
        <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          placeholder="caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          required
          style={{ minWidth: "18rem" }}
          dir="auto"
        />
        <button type="submit">Create</button>
      </form>
      {error && <p style={{ color: "#b22222" }}>{error}</p>}
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            {["Video", "Platform", "Caption", "Status", "Approvals", "External ID", "Actions"].map(
              (h) => (
                <th
                  key={h}
                  style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: "0.4rem" }}
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td style={{ padding: "0.4rem" }}>
                {row.assetName}
                {row.featuresMinor && (
                  <span title="features a minor" style={{ marginLeft: "0.3rem" }}>
                    🛡️
                  </span>
                )}
              </td>
              <td style={{ padding: "0.4rem" }}>{row.platform}</td>
              <td style={{ padding: "0.4rem", maxWidth: "16rem" }} dir="auto">
                {row.caption}
              </td>
              <td style={{ padding: "0.4rem" }}>
                <span
                  style={{
                    background: STATUS_COLORS[row.status] ?? "#888",
                    color: "white",
                    borderRadius: "4px",
                    padding: "0.1rem 0.5rem",
                    fontSize: "0.85rem",
                  }}
                >
                  {row.status}
                </span>
                {row.error && (
                  <span style={{ marginLeft: "0.5rem", color: "#b22222", fontSize: "0.85rem" }}>
                    {row.error}
                  </span>
                )}
              </td>
              <td style={{ padding: "0.4rem" }}>
                {row.approvals.length}/{requiredCount(row)}
              </td>
              <td style={{ padding: "0.4rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                {row.externalId ?? "—"}
              </td>
              <td style={{ padding: "0.4rem", whiteSpace: "nowrap" }}>
                {(row.status === "draft" || row.status === "failed") && (
                  <button
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
                      onClick={() =>
                        void call(`/api/publications/${row.id}/actions`, {
                          action: "final_approve",
                        })
                      }
                    >
                      final ✓
                    </button>{" "}
                    <button
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
              <td colSpan={7} style={{ padding: "0.6rem", color: "#888" }}>
                No publications yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
