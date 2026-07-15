"use client";

/**
 * Minimal asset list/status page (ADR-AIVS-002 §7): upload form + polled
 * status badges. Deliberately unstyled beyond basics — real UI is a later
 * module.
 */
import { useCallback, useEffect, useRef, useState } from "react";

const DEV_PROJECT_ID = "00000000-0000-4000-8000-000000000002";
const POLL_MS = 2000;

interface AssetRow {
  id: string;
  displayName: string;
  kind: string;
  status: string;
  sizeBytes: number;
  rejectionReason: string | null;
  versions: { id: string; role: string; preset: string | null }[];
}

const STATUS_COLORS: Record<string, string> = {
  uploaded: "#888",
  quarantined: "#b8860b",
  validating: "#1e90ff",
  ready: "#2e8b57",
  rejected: "#b22222",
  archived: "#555",
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/assets");
      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!response.ok) throw new Error(`list failed: ${response.status}`);
      const data = (await response.json()) as { assets: AssetRow[] };
      setAssets(data.assets);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  async function onUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      // Field order matters: metadata before the file part.
      form.append("projectId", DEV_PROJECT_ID);
      form.append("featuresMinor", "false");
      form.append("file", file);
      const response = await fetch("/api/assets/upload", { method: "POST", body: form });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `upload failed: ${response.status}`);
      }
      if (fileRef.current) fileRef.current.value = "";
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <h1>Assets</h1>
      <form onSubmit={onUpload} style={{ marginBottom: "1rem" }}>
        <input ref={fileRef} type="file" accept="video/*,audio/*,image/*" required />
        <button type="submit" disabled={uploading} style={{ marginLeft: "0.5rem" }}>
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </form>
      {error && <p style={{ color: "#b22222" }}>Error: {error}</p>}
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            {["Name", "Kind", "Status", "Size", "Versions", "Detail"].map((h) => (
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
          {assets.map((asset) => (
            <tr key={asset.id}>
              <td style={{ padding: "0.4rem" }}>{asset.displayName}</td>
              <td style={{ padding: "0.4rem" }}>{asset.kind}</td>
              <td style={{ padding: "0.4rem" }}>
                <span
                  style={{
                    background: STATUS_COLORS[asset.status] ?? "#888",
                    color: "white",
                    borderRadius: "4px",
                    padding: "0.1rem 0.5rem",
                    fontSize: "0.85rem",
                  }}
                >
                  {asset.status}
                </span>
                {asset.rejectionReason && (
                  <span style={{ marginLeft: "0.5rem", color: "#b22222", fontSize: "0.85rem" }}>
                    {asset.rejectionReason}
                  </span>
                )}
              </td>
              <td style={{ padding: "0.4rem" }}>{(asset.sizeBytes / 1024).toFixed(1)} KiB</td>
              <td style={{ padding: "0.4rem" }}>
                {asset.versions.map((v) => v.preset ?? v.role).join(", ") || "—"}
              </td>
              <td style={{ padding: "0.4rem" }}>
                <a href={`/api/assets/${asset.id}`}>json</a>
              </td>
            </tr>
          ))}
          {assets.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: "0.6rem", color: "#888" }}>
                No assets yet — upload one above.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
