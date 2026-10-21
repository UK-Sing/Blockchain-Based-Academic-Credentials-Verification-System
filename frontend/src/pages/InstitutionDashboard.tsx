import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileStack, CheckCircle2, XCircle, Wifi, WifiOff } from "lucide-react";
import { InstitutionLayout } from "../components/Layout";
import { StatusBadge } from "../components/StatusBadge";
import { credentialsApi } from "../services/credentials";
import { Stats } from "../types";
import { apiErrorMessage } from "../services/api";

export default function InstitutionDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    credentialsApi
      .stats()
      .then((res) => setStats(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load dashboard statistics.")));
  }, []);

  return (
    <InstitutionLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-ink">Dashboard</h1>
          <p className="text-sm text-ink-muted">Live statistics from the credential database.</p>
        </div>
        {stats && (
          <div
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
              stats.blockchainConnected ? "bg-seal-light text-seal-dark" : "bg-amber-light text-amber"
            }`}
          >
            {stats.blockchainConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
            {stats.blockchainConnected ? `Connected — ${stats.network}` : `${stats.network} (not reachable)`}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-sm border border-danger-line bg-danger-light px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {!stats && !error && <div className="text-sm text-ink-muted">Loading statistics...</div>}

      {stats && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard icon={FileStack} label="Total credentials" value={stats.totalCredentials} tone="ink" />
            <StatCard icon={CheckCircle2} label="Valid credentials" value={stats.validCredentials} tone="seal" />
            <StatCard icon={XCircle} label="Revoked credentials" value={stats.revokedCredentials} tone="danger" />
          </div>

          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-ink">Recently issued</h2>
              <Link to="/institution/credentials" className="text-sm font-medium text-seal hover:text-seal-dark">
                View all
              </Link>
            </div>
            <div className="card overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-rule bg-ink-soft text-xs uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Credential ID</th>
                    <th className="px-4 py-2.5 font-medium">Student</th>
                    <th className="px-4 py-2.5 font-medium">Degree</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentCredentials.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-ink-muted">
                        No credentials issued yet.
                      </td>
                    </tr>
                  )}
                  {stats.recentCredentials.map((c) => (
                    <tr key={c.id} className="border-b border-rule last:border-0 hover:bg-ink-soft">
                      <td className="px-4 py-2.5">
                        <Link to={`/institution/credentials/${c.credentialId}`} className="font-mono text-xs text-seal hover:underline">
                          {c.credentialId}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">{c.studentName}</td>
                      <td className="px-4 py-2.5 text-ink-muted">{c.degree}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={c.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </InstitutionLayout>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: number;
  tone: "ink" | "seal" | "danger";
}) {
  const toneClasses = {
    ink: "text-ink bg-ink-faint",
    seal: "text-seal-dark bg-seal-light",
    danger: "text-danger bg-danger-light",
  }[tone];

  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-sm ${toneClasses}`}>
        <Icon size={18} />
      </div>
      <div>
        <div className="font-serif text-2xl font-semibold text-ink">{value}</div>
        <div className="text-xs text-ink-muted">{label}</div>
      </div>
    </div>
  );
}
