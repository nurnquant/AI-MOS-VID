"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signUp } from "@/lib/auth-client";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error: signUpError } = await signUp.email({ name, email, password });
    if (signUpError) {
      setBusy(false);
      setError(signUpError.message ?? "registration failed");
      return;
    }
    if (workspace.trim()) {
      const slug = workspace
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const response = await fetch("/api/tenants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: workspace.trim(), slug }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setBusy(false);
        setError(`account created, but workspace failed: ${body.error ?? response.status}`);
        return;
      }
    }
    setBusy(false);
    router.push("/assets");
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 360 }}>
      <h1>Register</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: "0.6rem" }}>
        <input placeholder="name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input
          type="email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="password (min 10 chars)"
          value={password}
          minLength={10}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          placeholder="workspace name (optional — skip if joining by invite)"
          value={workspace}
          onChange={(e) => setWorkspace(e.target.value)}
        />
        <button type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      {error && <p style={{ color: "#b22222" }}>{error}</p>}
      <p>
        Have an account? <a href="/login">Sign in</a>
      </p>
    </div>
  );
}
