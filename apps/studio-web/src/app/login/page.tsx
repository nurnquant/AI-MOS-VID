"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error: signInError } = await signIn.email({ email, password });
    setBusy(false);
    if (signInError) {
      setError(signInError.message ?? "sign-in failed");
      return;
    }
    router.push("/assets");
    router.refresh();
  }

  return (
    <div className="card" style={{ maxWidth: "24rem", marginInline: "auto" }}>
      <h1>Sign in</h1>
      <form onSubmit={onSubmit} className="stack">
        <input
          className="input"
          type="email"
          placeholder="email"
          aria-label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="input"
          type="password"
          placeholder="password"
          aria-label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {error && <p className="notice notice-error">{error}</p>}
      <p className="muted">
        No account? <a href="/register">Register</a>
      </p>
    </div>
  );
}
