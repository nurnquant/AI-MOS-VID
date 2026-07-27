export const dynamic = "force-dynamic";

interface ServicesStatus {
  status: string;
  services: Record<string, boolean>;
  timestamp: string;
}

async function getStatus(): Promise<ServicesStatus | null> {
  try {
    const base = process.env.APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/services`, { cache: "no-store" });
    return (await res.json()) as ServicesStatus;
  } catch {
    return null;
  }
}

export default async function StatusPage() {
  const status = await getStatus();

  return (
    <section>
      <div className="page-header">
        <h1>Environment Status</h1>
        <p>
          Node env: <code>{process.env.NODE_ENV}</code>
        </p>
      </div>
      <div className="card">
        {!status ? (
          <p className="notice notice-error">
            Could not reach the services endpoint. Is the app running via `pnpm dev`?
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(status.services).map(([name, up]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>
                    <span className={up ? "badge badge-ok" : "badge badge-danger"}>
                      {up ? "✅ up" : "❌ down"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
