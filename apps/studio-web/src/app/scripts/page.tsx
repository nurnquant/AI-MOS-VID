"use client";

/** Script list: status badges, create form with optional mock generation. */
import { useCallback, useEffect, useState } from "react";
import { badgeClass } from "@/lib/ui";

interface ScriptRow {
  id: string;
  title: string;
  language: string;
  status: string;
  sceneCount: number;
  updatedAt: string;
}

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<ScriptRow[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
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
    void fetch("/api/projects").then(async (r) => {
      if (!r.ok) return;
      const data = (await r.json()) as { projects: { id: string }[] };
      setProjectId(data.projects[0]?.id ?? null);
    });
  }, [refresh]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!projectId) return;
    setBusy(true);
    setError(null);
    const response = await fetch("/api/scripts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId, title, brief, language, generate }),
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
      <div className="page-header">
        <h1>Scripts</h1>
        <p>Brief in, AI scenes out — review before anything generates</p>
      </div>
      <div className="card">
        <form onSubmit={create} className="form-row">
          <input
            className="input"
            aria-label="Title"
            placeholder="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <input
            className="input"
            aria-label="Brief"
            placeholder="brief (what should this video teach?)"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            required
            style={{ minWidth: "20rem" }}
            dir="auto"
          />
          <select
            className="select"
            aria-label="Language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </select>
          <label className="row">
            <input
              type="checkbox"
              checked={generate}
              onChange={(e) => setGenerate(e.target.checked)}
            />{" "}
            generate scenes from brief
          </label>
          <button className="btn btn-primary" type="submit" disabled={busy || !projectId}>
            {busy ? "Creating…" : "Create script"}
          </button>
        </form>
        {error && <p className="notice notice-error">{error}</p>}
      </div>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              {["Title", "Language", "Status", "Scenes", "Updated", ""].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scripts.map((s) => (
              <tr key={s.id}>
                <td dir="auto">{s.title}</td>
                <td>{s.language}</td>
                <td>
                  <span className={badgeClass(s.status)}>{s.status}</span>
                </td>
                <td>{s.sceneCount}</td>
                <td>{s.updatedAt.slice(0, 16).replace("T", " ")}</td>
                <td>
                  <a href={`/scripts/${s.id}`}>open</a>
                </td>
              </tr>
            ))}
            {scripts.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No scripts yet — create one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
