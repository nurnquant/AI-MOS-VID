"use client";

/** Session status + tenant switcher for the top nav. */
import { useEffect, useState } from "react";
import { signOut, useSession } from "@/lib/auth-client";

interface TenantOption {
  id: string;
  slug: string;
  name: string;
  role: string;
}

export function SessionNav() {
  const { data: session, isPending } = useSession();
  const [tenants, setTenants] = useState<TenantOption[]>([]);

  useEffect(() => {
    if (!session) return;
    void fetch("/api/tenants")
      .then((r) => (r.ok ? r.json() : { tenants: [] }))
      .then((data) => setTenants((data as { tenants: TenantOption[] }).tenants));
  }, [session]);

  if (isPending) return null;
  if (!session) {
    return (
      <span>
        <a href="/login">Sign in</a>
      </span>
    );
  }

  const createWorkspace = () => {
    const name = window.prompt("Workspace name:");
    if (!name?.trim()) return;
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    void fetch("/api/tenants", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim(), slug }),
    }).then(async (r) => {
      if (!r.ok) {
        const body = (await r.json().catch(() => ({}))) as { error?: string };
        window.alert(body.error ?? `workspace creation failed: ${r.status}`);
        return;
      }
      window.location.reload();
    });
  };

  return (
    <span className="row">
      {tenants.length === 0 && (
        <button className="btn btn-primary btn-sm" onClick={createWorkspace}>
          Create workspace
        </button>
      )}
      {tenants.length > 0 && (
        <select
          className="select"
          aria-label="Switch workspace"
          defaultValue=""
          onChange={(e) => {
            if (!e.target.value) return;
            void fetch("/api/tenants/active", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ tenantId: e.target.value }),
            }).then(() => window.location.reload());
          }}
        >
          <option value="" disabled>
            workspace…
          </option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.role})
            </option>
          ))}
        </select>
      )}
      <span className="muted">{session.user.email}</span>
      <button
        className="btn btn-sm"
        onClick={() => void signOut().then(() => (window.location.href = "/login"))}
      >
        Sign out
      </button>
    </span>
  );
}
