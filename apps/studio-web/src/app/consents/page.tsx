"use client";

/**
 * Child-media consent registry (child_media_reviewer+): list with derived
 * status, create form, revoke with confirmation + reason. Revocation is
 * irreversible — it hard-deletes all linked media.
 */
import { useCallback, useEffect, useState } from "react";

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

const STATUS_COLORS: Record<string, string> = {
  active: "#2e8b57",
  expired: "#b8860b",
  revoked: "#b22222",
};

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
        <p>Requires the child_media_reviewer role or higher.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Consent registry</h1>
      <form
        onSubmit={create}
        style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}
      >
        <input
          placeholder="subject (minimal identifier)"
          value={subjectLabel}
          onChange={(e) => setSubjectLabel(e.target.value)}
          required
        />
        <input
          placeholder="guardian name"
          value={guardianName}
          onChange={(e) => setGuardianName(e.target.value)}
          required
        />
        <input
          placeholder="guardian contact (optional)"
          value={guardianContact}
          onChange={(e) => setGuardianContact(e.target.value)}
        />
        <select value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="internal">internal</option>
          <option value="publishing">publishing</option>
        </select>
        <input
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          required
        />
        <button type="submit">Record consent</button>
      </form>
      {error && <p style={{ color: "#b22222" }}>{error}</p>}
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            {["Subject", "Guardian", "Scope", "Expires", "Status", "Linked assets", ""].map((h) => (
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
          {consents.map((c) => (
            <tr key={c.id}>
              <td style={{ padding: "0.4rem" }}>{c.subjectLabel}</td>
              <td style={{ padding: "0.4rem" }}>{c.guardianName}</td>
              <td style={{ padding: "0.4rem" }}>{c.scope}</td>
              <td style={{ padding: "0.4rem" }}>{c.expiresAt.slice(0, 10)}</td>
              <td style={{ padding: "0.4rem" }}>
                <span
                  style={{
                    background: STATUS_COLORS[c.status],
                    color: "white",
                    borderRadius: "4px",
                    padding: "0.1rem 0.5rem",
                    fontSize: "0.85rem",
                  }}
                >
                  {c.status}
                </span>
                {c.revokeReason && (
                  <span style={{ marginLeft: "0.5rem", fontSize: "0.85rem", color: "#888" }}>
                    {c.revokeReason}
                  </span>
                )}
              </td>
              <td style={{ padding: "0.4rem" }}>{c.linkedAssets}</td>
              <td style={{ padding: "0.4rem" }}>
                {c.status === "active" && <button onClick={() => void revoke(c)}>revoke</button>}
              </td>
            </tr>
          ))}
          {consents.length === 0 && (
            <tr>
              <td colSpan={7} style={{ padding: "0.6rem", color: "#888" }}>
                No consent records yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
