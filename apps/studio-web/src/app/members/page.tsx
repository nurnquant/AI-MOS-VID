"use client";

/** Members of the active workspace: list, invite, role change, remove. */
import { useCallback, useEffect, useState } from "react";
import { useMounted } from "@/lib/use-mounted";

interface MemberRow {
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}

const ROLES = ["viewer", "editor", "child_media_reviewer", "admin"];

export default function MembersPage() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [notice, setNotice] = useState<string | null>(null);
  const mounted = useMounted();

  const refresh = useCallback(async () => {
    const response = await fetch("/api/members");
    if (!response.ok) {
      if (response.status === 401) window.location.href = "/login";
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? `load failed: ${response.status}`);
      return;
    }
    setMembers(((await response.json()) as { members: MemberRow[] }).members);
    setError(null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function call(path: string, init: RequestInit, successNote: string) {
    setError(null);
    setNotice(null);
    const response = await fetch(path, init);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? `request failed: ${response.status}`);
      return false;
    }
    setNotice(successNote);
    await refresh();
    return true;
  }

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    const ok = await call(
      "/api/members",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      },
      `Invitation sent to ${inviteEmail} (link printed in the server log locally)`,
    );
    if (ok) setInviteEmail("");
  }

  return (
    <div>
      <div className="page-header">
        <h1>Members</h1>
        <p>Workspace roles — grants strictly below your own level</p>
      </div>
      <div className="card">
        <form onSubmit={invite} className="form-row">
          <input
            className="input"
            aria-label="Invite email"
            type="email"
            placeholder="invite email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />
          <select
            className="select"
            aria-label="Invite role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" type="submit" disabled={!mounted}>
            Invite
          </button>
        </form>
        {notice && <p className="notice notice-ok">{notice}</p>}
        {error && <p className="notice notice-error">{error}</p>}
      </div>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              {["Name", "Email", "Role", "Actions"].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId}>
                <td>{m.name}</td>
                <td>{m.email}</td>
                <td>
                  <span className={m.role === "owner" ? "badge badge-ok" : "badge badge-muted"}>
                    {m.role}
                  </span>
                </td>
                <td>
                  {m.role !== "owner" && (
                    <span className="row">
                      <select
                        className="select"
                        aria-label={`Role for ${m.email}`}
                        value={m.role}
                        onChange={(e) =>
                          void call(
                            `/api/members/${m.userId}`,
                            {
                              method: "PATCH",
                              headers: { "content-type": "application/json" },
                              body: JSON.stringify({ role: e.target.value }),
                            },
                            `Role updated for ${m.email}`,
                          )
                        }
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() =>
                          void call(
                            `/api/members/${m.userId}`,
                            { method: "DELETE" },
                            `Removed ${m.email}`,
                          )
                        }
                      >
                        remove
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
