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
      <h1>Environment Status</h1>
      <p>
        Node env: <code>{process.env.NODE_ENV}</code>
      </p>
      {!status ? (
        <p>Could not reach the services endpoint. Is the app running via `pnpm dev`?</p>
      ) : (
        <table style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "0.25rem 1rem" }}>Service</th>
              <th style={{ textAlign: "left", padding: "0.25rem 1rem" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(status.services).map(([name, up]) => (
              <tr key={name}>
                <td style={{ padding: "0.25rem 1rem" }}>{name}</td>
                <td style={{ padding: "0.25rem 1rem" }}>{up ? "✅ up" : "❌ down"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
