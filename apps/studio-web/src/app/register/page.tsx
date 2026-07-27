"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMounted } from "@/lib/use-mounted";
import { signUp } from "@/lib/auth-client";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mounted = useMounted();

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
    <div className="card" style={{ maxWidth: "24rem", marginInline: "auto" }}>
      <h1>Register</h1>
      <form onSubmit={onSubmit} className="stack">
        <input
          className="input"
          aria-label="Name"
          placeholder="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="email"
          className="input"
          aria-label="Email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          className="input"
          aria-label="Password"
          placeholder="password (min 10 chars)"
          value={password}
          minLength={10}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          className="input"
          aria-label="Workspace name"
          placeholder="workspace name (optional — skip if joining by invite)"
          value={workspace}
          onChange={(e) => setWorkspace(e.target.value)}
        />
        <button className="btn btn-primary" type="submit" disabled={!mounted || busy}>
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      {error && <p className="notice notice-error">{error}</p>}
      <p className="muted">
        Have an account? <a href="/login">Sign in</a>
      </p>
    </div>
  );
}
