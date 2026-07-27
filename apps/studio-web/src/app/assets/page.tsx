"use client";

/**
 * Minimal asset list/status page (ADR-AIVS-002 §7): upload form + polled
 * status badges. Deliberately unstyled beyond basics — real UI is a later
 * module.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { readActiveProject } from "@/app/project-selector";
import { badgeClass } from "@/lib/ui";

const POLL_MS = 2000;

interface AssetRow {
  id: string;
  displayName: string;
  kind: string;
  status: string;
  sizeBytes: number;
  featuresMinor: boolean;
  rejectionReason: string | null;
  versions: { id: string; role: string; preset: string | null }[];
}

interface ConsentOption {
  id: string;
  subjectLabel: string;
  status: string;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<string>("");
  const [featuresMinor, setFeaturesMinor] = useState(false);
  const [consentId, setConsentId] = useState("");
  const [consents, setConsents] = useState<ConsentOption[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void fetch("/api/projects").then(async (r) => {
      if (!r.ok) return;
      const data = (await r.json()) as { projects: { id: string }[] };
      // Active project (nav selector) wins; "All projects" creates
      // into the first project.
      const active = readActiveProject(data.projects.map((p) => p.id));
      setActiveProject(active);
      setProjectId(active || (data.projects[0]?.id ?? null));
    });
    // Consent list is reviewer+ only; 403 just hides the selector.
    void fetch("/api/consents").then(async (r) => {
      if (!r.ok) return;
      const data = (await r.json()) as { consents: ConsentOption[] };
      setConsents(data.consents.filter((c) => c.status === "active"));
    });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const query = activeProject ? `?projectId=${activeProject}` : "";
      const response = await fetch(`/api/assets${query}`);
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
  }, [activeProject]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  async function onUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || !projectId) return;
    setUploading(true);
    try {
      const form = new FormData();
      // Field order matters: metadata before the file part.
      form.append("projectId", projectId);
      form.append("featuresMinor", String(featuresMinor));
      if (featuresMinor && consentId) form.append("consentRecordId", consentId);
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
      <div className="page-header">
        <h1>Assets</h1>
        <p>Uploads and generated media — quarantine → validation → ready</p>
      </div>
      <div className="card">
        <form onSubmit={onUpload} className="form-row">
          <input
            ref={fileRef}
            type="file"
            accept="video/*,audio/*,image/*"
            aria-label="Media file"
            required
          />
          <label className="row">
            <input
              type="checkbox"
              checked={featuresMinor}
              onChange={(e) => setFeaturesMinor(e.target.checked)}
            />{" "}
            features a minor
          </label>
          {featuresMinor && consents && (
            <select
              className="select"
              aria-label="Consent record"
              value={consentId}
              onChange={(e) => setConsentId(e.target.value)}
            >
              <option value="">no consent (stays quarantined)</option>
              {consents.map((c) => (
                <option key={c.id} value={c.id}>
                  consent: {c.subjectLabel}
                </option>
              ))}
            </select>
          )}
          <button className="btn btn-primary" type="submit" disabled={uploading || !projectId}>
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </form>
        {error && <p className="notice notice-error">Error: {error}</p>}
      </div>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              {["Name", "Kind", "Status", "Size", "Versions", "Detail"].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id}>
                <td>
                  {asset.displayName}
                  {asset.featuresMinor && (
                    <span className="child-flag" title="features a minor">
                      {" "}
                      🛡️
                    </span>
                  )}
                </td>
                <td>{asset.kind}</td>
                <td>
                  <span className={badgeClass(asset.status)}>{asset.status}</span>
                  {asset.rejectionReason && <span className="muted"> {asset.rejectionReason}</span>}
                </td>
                <td>{(asset.sizeBytes / 1024).toFixed(1)} KiB</td>
                <td>{asset.versions.map((v) => v.preset ?? v.role).join(", ") || "—"}</td>
                <td>
                  <a href={`/api/assets/${asset.id}`}>json</a>
                </td>
              </tr>
            ))}
            {assets.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No assets yet — upload one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
