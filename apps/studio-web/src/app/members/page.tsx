"use client";

/** Members of the active workspace: list, invite, role change, remove. */
import { useCallback, useEffect, useState } from "react";

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
      <h1>Members</h1>
      <form onSubmit={invite} style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <input
          type="email"
          placeholder="invite email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          required
        />
        <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button type="submit">Invite</button>
      </form>
      {notice && <p style={{ color: "#2e8b57" }}>{notice}</p>}
      {error && <p style={{ color: "#b22222" }}>{error}</p>}
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            {["Name", "Email", "Role", "Actions"].map((h) => (
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
          {members.map((m) => (
            <tr key={m.userId}>
              <td style={{ padding: "0.4rem" }}>{m.name}</td>
              <td style={{ padding: "0.4rem" }}>{m.email}</td>
              <td style={{ padding: "0.4rem" }}>{m.role}</td>
              <td style={{ padding: "0.4rem" }}>
                {m.role !== "owner" && (
                  <>
                    <select
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
                    </select>{" "}
                    <button
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
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
