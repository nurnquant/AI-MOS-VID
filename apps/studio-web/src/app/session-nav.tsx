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
      <span style={{ marginLeft: "auto" }}>
        <a href="/login">Sign in</a>
      </span>
    );
  }

  return (
    <span style={{ marginLeft: "auto", display: "flex", gap: "0.75rem", alignItems: "center" }}>
      {tenants.length > 0 && (
        <select
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
      <span>{session.user.email}</span>
      <button onClick={() => void signOut().then(() => (window.location.href = "/login"))}>
        Sign out
      </button>
    </span>
  );
}
