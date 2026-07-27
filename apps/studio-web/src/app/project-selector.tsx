"use client";

/**
 * Active-project selector (AIVS-PROJECTS-012). Persists to
 * localStorage["aivs-active-project"]; pages read the same key. An id
 * that no longer exists in the workspace falls back to "All projects".
 */
import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";

export const ACTIVE_PROJECT_KEY = "aivs-active-project";

interface ProjectOption {
  id: string;
  name: string;
}

export function ProjectSelector() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [active, setActive] = useState("");

  useEffect(() => {
    if (!session) return;
    void fetch("/api/projects").then(async (r) => {
      if (!r.ok) return;
      const data = (await r.json()) as { projects: ProjectOption[] };
      setProjects(data.projects);
      const stored = localStorage.getItem(ACTIVE_PROJECT_KEY) ?? "";
      setActive(data.projects.some((p) => p.id === stored) ? stored : "");
    });
  }, [session]);

  if (!session || projects.length === 0) return null;

  return (
    <select
      className="select"
      aria-label="Active project"
      value={active}
      onChange={(e) => {
        if (e.target.value) localStorage.setItem(ACTIVE_PROJECT_KEY, e.target.value);
        else localStorage.removeItem(ACTIVE_PROJECT_KEY);
        window.location.reload();
      }}
    >
      <option value="">All projects</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

/** Pages: resolve the persisted active project against a fetched list. */
export function readActiveProject(projectIds: string[]): string {
  const stored = localStorage.getItem(ACTIVE_PROJECT_KEY) ?? "";
  return projectIds.includes(stored) ? stored : "";
}
