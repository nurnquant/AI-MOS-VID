"use client";

/**
 * Child-media consent registry (child_media_reviewer+): list with derived
 * status, create form, revoke with confirmation + reason. Revocation is
 * irreversible — it hard-deletes all linked media.
 */
import { useCallback, useEffect, useState } from "react";
import { badgeClass } from "@/lib/ui";

interface ConsentRow {
  id: string;
  subjectLabel: string;
  guardianName: string;
  scope: string;
  expiresAt: string;
  status: "active" | "expired" | "revoked";
  revokeReason: string | null;
  linkedAssets: number;
}

export default function ConsentsPage() {
  const [consents, setConsents] = useState<ConsentRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [subjectLabel, setSubjectLabel] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianContact, setGuardianContact] = useState("");
  const [scope, setScope] = useState("internal");
  const [expiresAt, setExpiresAt] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch("/api/consents");
    if (response.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (response.status === 403) {
      setForbidden(true);
      return;
    }
    if (!response.ok) {
      setError(`load failed: ${response.status}`);
      return;
    }
    setConsents(((await response.json()) as { consents: ConsentRow[] }).consents);
    setError(null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/consents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        subjectLabel,
        guardianName,
        guardianContact: guardianContact || undefined,
        scope,
        expiresAt,
      }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? `create failed: ${response.status}`);
      return;
    }
    setSubjectLabel("");
    setGuardianName("");
    setGuardianContact("");
    setExpiresAt("");
    await refresh();
  }

  async function revoke(consent: ConsentRow) {
    const reason = window.prompt(
      `Revoking consent for "${consent.subjectLabel}" PERMANENTLY DELETES its ${consent.linkedAssets} linked asset(s). This cannot be undone.\n\nEnter a reason to confirm:`,
    );
    if (!reason || reason.trim().length < 3) return;
    const response = await fetch(`/api/consents/${consent.id}/revoke`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? `revoke failed: ${response.status}`);
      return;
    }
    await refresh();
  }

  if (forbidden) {
    return (
      <div>
        <h1>Consent registry</h1>
        <p className="denied-state">Requires the child_media_reviewer role or higher.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Consent registry</h1>
        <p>Guardian consent for child media — revocation hard-deletes linked media</p>
      </div>
      <div className="card">
        <form onSubmit={create} className="form-row">
          <input
            className="input"
            aria-label="Subject"
            placeholder="subject (minimal identifier)"
            value={subjectLabel}
            onChange={(e) => setSubjectLabel(e.target.value)}
            required
          />
          <input
            className="input"
            aria-label="Guardian name"
            placeholder="guardian name"
            value={guardianName}
            onChange={(e) => setGuardianName(e.target.value)}
            required
          />
          <input
            className="input"
            aria-label="Guardian contact"
            placeholder="guardian contact (optional)"
            value={guardianContact}
            onChange={(e) => setGuardianContact(e.target.value)}
          />
          <select
            className="select"
            aria-label="Scope"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          >
            <option value="internal">internal</option>
            <option value="publishing">publishing</option>
          </select>
          <input
            className="input"
            aria-label="Expiry date"
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            required
          />
          <button className="btn btn-primary" type="submit">
            Record consent
          </button>
        </form>
        {error && <p className="notice notice-error">{error}</p>}
      </div>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              {["Subject", "Guardian", "Scope", "Expires", "Status", "Linked assets", ""].map(
                (h) => (
                  <th key={h}>{h}</th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {consents.map((c) => (
              <tr key={c.id}>
                <td>{c.subjectLabel}</td>
                <td>{c.guardianName}</td>
                <td>{c.scope}</td>
                <td>{c.expiresAt.slice(0, 10)}</td>
                <td>
                  <span className={badgeClass(c.status)}>{c.status}</span>
                  {c.revokeReason && <span className="muted"> {c.revokeReason}</span>}
                </td>
                <td>{c.linkedAssets}</td>
                <td>
                  {c.status === "active" && (
                    <button className="btn btn-danger btn-sm" onClick={() => void revoke(c)}>
                      revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {consents.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  No consent records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
