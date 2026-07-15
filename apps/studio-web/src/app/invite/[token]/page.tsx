"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/lib/auth-client";

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function accept() {
    setBusy(true);
    setError(null);
    const response = await fetch("/api/invitations/accept", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    setBusy(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? `accept failed: ${response.status}`);
      return;
    }
    router.push("/assets");
    router.refresh();
  }

  if (isPending) return <p>Loading…</p>;
  if (!session) {
    return (
      <div>
        <h1>Workspace invitation</h1>
        <p>
          <a href="/register">Register</a> or <a href="/login">sign in</a> with the invited email,
          then reopen this link.
        </p>
      </div>
    );
  }
  return (
    <div>
      <h1>Workspace invitation</h1>
      <p>Signed in as {session.user.email}. Accept the invitation with this account?</p>
      <button onClick={accept} disabled={busy}>
        {busy ? "Joining…" : "Accept invitation"}
      </button>
      {error && <p style={{ color: "#b22222" }}>{error}</p>}
    </div>
  );
}
