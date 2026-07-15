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
    <div style={{ maxWidth: 360 }}>
      <h1>Sign in</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: "0.6rem" }}>
        <input
          type="email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {error && <p style={{ color: "#b22222" }}>{error}</p>}
      <p>
        No account? <a href="/register">Register</a>
      </p>
    </div>
  );
}
