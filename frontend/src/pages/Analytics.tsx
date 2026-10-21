import { useEffect, useState } from "react";
import { FileStack, Users, Link2, Clock } from "lucide-react";
import { InstitutionLayout, MaintainerLayout } from "../components/Layout";
import { adminApi, credentialsApi } from "../services/credentials";
import { apiErrorMessage } from "../services/api";
import { Analytics as AnalyticsData, Bucket } from "../types";

/** `institution`: the signed-in issuer's own credentials. `platform`: aggregate across all issuers (maintainers). */
export default function Analytics({ scope }: { scope: "institution" | "platform" }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const Layout = scope === "platform" ? MaintainerLayout : InstitutionLayout;

  useEffect(() => {
    (scope === "platform" ? adminApi.analytics() : credentialsApi.analytics())
      .then((res) => setData(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load analytics.")));
  }, [scope]);

  return (
    <Layout>
      <h1 className="mb-1 font-serif text-2xl font-semibold text-ink">{scope === "platform" ? "Platform analytics" : "Analytics"}</h1>
      <p className="mb-6 text-sm text-ink-muted">
        {scope === "platform"
          ? "Aggregate issuance across every institution on the platform. Counts only; no individual records."
          : "Issuance trends and breakdowns across your institution's credentials."}
      </p>

      {error && (
        <div className="mb-6 rounded-sm border border-danger-line bg-danger-light px-4 py-3 text-sm text-danger">{error}</div>
      )}
      {!data && !error && <div className="text-sm text-ink-muted">Loading analytics...</div>}

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi icon={FileStack} label="Total credentials" value={data.totalCredentials} />
            <Kpi icon={Users} label={scope === "platform" ? "Students (all institutions)" : "Registered students"} value={data.totalStudents} />
            <Kpi icon={Link2} label="Anchored on-chain" value={data.anchoredCredentials} />
            <Kpi icon={Clock} label="Pending anchor" value={data.pendingAnchor} warn={data.pendingAnchor > 0} />
          </div>

          <div className="card p-5">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-ink-muted">Issued per month (last 12 months)</h2>
            <MonthlyChart months={data.issuedPerMonth} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <BarList title="By status" buckets={data.byStatus} colorFor={(l) => (l === "REVOKED" ? "bg-danger" : "bg-seal")} />
            <BarList title="By graduation year" buckets={data.byGraduationYear} />
            <BarList title="By degree" buckets={data.byDegree} />
            <BarList title="By department" buckets={data.byDepartment} />
          </div>
        </div>
      )}
    </Layout>
  );
}

function Kpi({ icon: Icon, label, value, warn }: { icon: any; label: string; value: number; warn?: boolean }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-sm ${warn ? "bg-amber-light text-amber" : "bg-seal-light text-seal-dark"}`}>
        <Icon size={18} />
      </div>
      <div>
        <div className="font-serif text-2xl font-semibold text-ink">{value}</div>
        <div className="text-xs text-ink-muted">{label}</div>
      </div>
    </div>
  );
}

function BarList({ title, buckets, colorFor }: { title: string; buckets: Bucket[]; colorFor?: (label: string) => string }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <div className="card p-5">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-ink-muted">{title}</h2>
      {buckets.length === 0 && <p className="text-sm text-ink-muted">No data yet.</p>}
      <ul className="space-y-3">
        {buckets.map((b) => (
          <li key={b.label}>
            <div className="mb-1 flex justify-between gap-3 text-sm">
              <span className="truncate text-ink">{b.label}</span>
              <span className="font-mono text-ink-muted">{b.count}</span>
            </div>
            <div className="h-2 rounded-full bg-ink-faint">
              <div className={`h-2 rounded-full ${colorFor?.(b.label) ?? "bg-ink-light"}`} style={{ width: `${(b.count / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MonthlyChart({ months }: { months: { month: string; count: number }[] }) {
  const max = Math.max(1, ...months.map((m) => m.count));
  return (
    <div className="flex h-48 items-end gap-2">
      {months.map((m) => {
        const label = new Date(`${m.month}-01T00:00:00Z`).toLocaleDateString(undefined, { month: "short", timeZone: "UTC" });
        return (
          <div key={m.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${m.month}: ${m.count}`}>
            <span className="font-mono text-[11px] text-ink-muted">{m.count || ""}</span>
            <div className="flex w-full flex-1 items-end">
              <div className="w-full rounded-t-sm bg-seal" style={{ height: `${(m.count / max) * 100}%`, minHeight: m.count ? 4 : 0 }} />
            </div>
            <span className="text-[11px] text-ink-muted">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
