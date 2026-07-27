"use client";

/** Project registry: list with content counts, create, rename, delete (empty only). */
import { useCallback, useEffect, useState } from "react";
import { useMounted } from "@/lib/use-mounted";

interface ProjectRow {
  id: string;
  slug: string;
  name: string;
  assetCount: number;
  scriptCount: number;
  createdAt: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mounted = useMounted();

  const refresh = useCallback(async () => {
    const response = await fetch("/api/projects");
    if (response.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? `load failed: ${response.status}`);
      return;
    }
    setProjects(((await response.json()) as { projects: ProjectRow[] }).projects);
    setError(null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function call(path: string, init: RequestInit) {
    setError(null);
    const response = await fetch(path, init);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? `request failed: ${response.status}`);
      return false;
    }
    await refresh();
    return true;
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const ok = await call("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    if (ok) setName("");
  }

  function rename(project: ProjectRow) {
    const next = window.prompt("New project name:", project.name);
    if (!next || next.trim() === project.name) return;
    void call(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: next.trim() }),
    });
  }

  function remove(project: ProjectRow) {
    if (!window.confirm(`Delete empty project "${project.name}"? This cannot be undone.`)) return;
    void call(`/api/projects/${project.id}`, { method: "DELETE" });
  }

  return (
    <div>
      <div className="page-header">
        <h1>Projects</h1>
        <p>Organize assets and scripts — content-bearing projects cannot be deleted</p>
      </div>
      <div className="card">
        <form onSubmit={create} className="form-row">
          <input
            className="input"
            aria-label="Project name"
            placeholder="project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <button className="btn btn-primary" type="submit" disabled={!mounted || busy}>
            {busy ? "Creating…" : "Create project"}
          </button>
        </form>
        {error && <p className="notice notice-error">{error}</p>}
      </div>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              {["Name", "Slug", "Assets", "Scripts", "Created", ""].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>
                  <code>{p.slug}</code>
                </td>
                <td>{p.assetCount}</td>
                <td>{p.scriptCount}</td>
                <td>{p.createdAt.slice(0, 10)}</td>
                <td>
                  <span className="row">
                    <button className="btn btn-sm" onClick={() => rename(p)}>
                      rename
                    </button>
                    {p.assetCount === 0 && p.scriptCount === 0 && (
                      <button className="btn btn-danger btn-sm" onClick={() => remove(p)}>
                        delete
                      </button>
                    )}
                  </span>
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No projects yet — create one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
