"use client";

/** Provider spend vs budget caps (admin+) — estimates from the ledger. */
import { useCallback, useEffect, useState } from "react";
import type { UsageSummary } from "@aivs/providers";

function usd(value: number): string {
  return `$${value.toFixed(2)}`;
}

function Meter({ spent, cap }: { spent: number; cap: number }) {
  if (cap <= 0) {
    return <span className="badge badge-danger">no budget configured — calls fail closed</span>;
  }
  const ratio = Math.min(1, spent / cap);
  const variant = ratio >= 0.9 ? "meter-fill-danger" : ratio >= 0.6 ? "meter-fill-warn" : "";
  return (
    <span className="row">
      <span className="meter" role="progressbar" aria-valuenow={Math.round(ratio * 100)}>
        <span className={`meter-fill ${variant}`} style={{ width: `${ratio * 100}%` }} />
      </span>
      <span className="muted">
        {usd(spent)} / {usd(cap)}
      </span>
    </span>
  );
}

export default function UsagePage() {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/usage");
    if (response.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (response.status === 403) {
      setForbidden(true);
      return;
    }
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? `load failed: ${response.status}`);
      return;
    }
    setUsage(((await response.json()) as { usage: UsageSummary }).usage);
    setError(null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (forbidden) {
    return (
      <div>
        <h1>Provider usage</h1>
        <p className="denied-state">Requires the admin role or higher.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Provider usage</h1>
        <p>Ledger estimates — reconcile with provider dashboards for billing truth</p>
      </div>
      {error && <p className="notice notice-error">{error}</p>}
      {!usage ? (
        <p>Loading…</p>
      ) : (
        <div className="stack">
          <div className="card">
            <h2>Budgets (fail closed)</h2>
            <table className="table">
              <tbody>
                <tr>
                  <td>Today</td>
                  <td>
                    <Meter spent={usage.totals.dayUsd} cap={usage.caps.dailyUsd} />
                  </td>
                </tr>
                <tr>
                  <td>This month</td>
                  <td>
                    <Meter spent={usage.totals.monthUsd} cap={usage.caps.monthlyUsd} />
                  </td>
                </tr>
                <tr>
                  <td>Blocked calls today</td>
                  <td>
                    {usage.blockedToday > 0 ? (
                      <span className="badge badge-warn">{usage.blockedToday}</span>
                    ) : (
                      <span className="badge badge-ok">0</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="card">
            <h2>Per provider (this month)</h2>
            <table className="table">
              <thead>
                <tr>
                  {["Provider", "Today", "This month", "Calls"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usage.providers.map((p) => (
                  <tr key={p.provider}>
                    <td>
                      <code>{p.provider}</code>
                    </td>
                    <td>{usd(p.dayUsd)}</td>
                    <td>{usd(p.monthUsd)}</td>
                    <td>{p.calls}</td>
                  </tr>
                ))}
                {usage.providers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted">
                      No provider spend this month.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="card">
            <h2>Recent calls</h2>
            <table className="table">
              <thead>
                <tr>
                  {["When", "Provider", "Operation", "Units", "Cost", "Job"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usage.recent.map((r, i) => (
                  <tr key={`${r.createdAt}-${i}`}>
                    <td>{r.createdAt.slice(5, 16).replace("T", " ")}</td>
                    <td>
                      <code>{r.provider}</code>
                    </td>
                    <td>{r.operation}</td>
                    <td>
                      {r.units} {r.unitType}
                    </td>
                    <td>${r.estimatedCostUsd.toFixed(4)}</td>
                    <td className="muted">{r.jobId ? r.jobId.slice(0, 12) : "—"}</td>
                  </tr>
                ))}
                {usage.recent.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted">
                      No provider calls recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
