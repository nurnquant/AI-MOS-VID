"use client";

/** Script list: status badges, create form with optional mock generation. */
import { useCallback, useEffect, useState } from "react";

const DEV_PROJECT_ID = "00000000-0000-4000-8000-000000000002";

interface ScriptRow {
  id: string;
  title: string;
  language: string;
  status: string;
  sceneCount: number;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "#888",
  in_review: "#1e90ff",
  approved: "#2e8b57",
};

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<ScriptRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [language, setLanguage] = useState("en");
  const [generate, setGenerate] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/scripts");
    if (response.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (!response.ok) {
      setError(`load failed: ${response.status}`);
      return;
    }
    setScripts(((await response.json()) as { scripts: ScriptRow[] }).scripts);
    setError(null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/scripts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: DEV_PROJECT_ID, title, brief, language, generate }),
    });
    setBusy(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? `create failed: ${response.status}`);
      return;
    }
    const { scriptId } = (await response.json()) as { scriptId: string };
    window.location.href = `/scripts/${scriptId}`;
  }

  return (
    <div>
      <h1>Scripts</h1>
      <form
        onSubmit={create}
        style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}
      >
        <input
          placeholder="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          placeholder="brief (what should this video teach?)"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          required
          style={{ minWidth: "20rem" }}
          dir="auto"
        />
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="en">English</option>
          <option value="ar">العربية</option>
        </select>
        <label>
          <input
            type="checkbox"
            checked={generate}
            onChange={(e) => setGenerate(e.target.checked)}
          />{" "}
          generate scenes from brief
        </label>
        <button type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create script"}
        </button>
      </form>
      {error && <p style={{ color: "#b22222" }}>{error}</p>}
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            {["Title", "Language", "Status", "Scenes", "Updated", ""].map((h) => (
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
          {scripts.map((s) => (
            <tr key={s.id}>
              <td style={{ padding: "0.4rem" }} dir="auto">
                {s.title}
              </td>
              <td style={{ padding: "0.4rem" }}>{s.language}</td>
              <td style={{ padding: "0.4rem" }}>
                <span
                  style={{
                    background: STATUS_COLORS[s.status] ?? "#888",
                    color: "white",
                    borderRadius: "4px",
                    padding: "0.1rem 0.5rem",
                    fontSize: "0.85rem",
                  }}
                >
                  {s.status}
                </span>
              </td>
              <td style={{ padding: "0.4rem" }}>{s.sceneCount}</td>
              <td style={{ padding: "0.4rem" }}>{s.updatedAt.slice(0, 16).replace("T", " ")}</td>
              <td style={{ padding: "0.4rem" }}>
                <a href={`/scripts/${s.id}`}>open</a>
              </td>
            </tr>
          ))}
          {scripts.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: "0.6rem", color: "#888" }}>
                No scripts yet — create one above.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
