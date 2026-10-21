import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, Database, Server, Link2, Wallet, AlertTriangle, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { MaintainerLayout } from "../components/Layout";
import { StatusBadge } from "../components/StatusBadge";
import { adminApi } from "../services/credentials";
import { apiErrorMessage } from "../services/api";
import { PlatformOverview } from "../types";

const REFRESH_MS = 30_000;
// Below this the platform wallet may not cover the next few issue/revoke transactions.
const LOW_BALANCE = 0.05;

function short(value: string) {
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

export default function MaintainerOverview() {
  const [data, setData] = useState<PlatformOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  function load() {
    setLoading(true);
    adminApi
      .overview()
      .then((res) => {
        setData(res.data);
        setError(null);
        setUpdatedAt(new Date());
      })
      .catch((err) => setError(apiErrorMessage(err, "Could not load the platform overview.")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  const chain = data?.chain;
  const explorer = chain?.explorerUrl;
  const balance = chain?.walletBalance != null ? Number(chain.walletBalance) : null;

  return (
    <MaintainerLayout>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-ink">Platform overview</h1>
          <p className="text-sm text-ink-muted">
            Health of the API, database and blockchain, plus platform-wide activity. Refreshes every 30 seconds.
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary shrink-0 text-sm">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          {updatedAt ? `Updated ${updatedAt.toLocaleTimeString()}` : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-sm border border-danger-line bg-danger-light px-4 py-3 text-sm text-danger">{error}</div>
      )}
      {!data && !error && <div className="text-sm text-ink-muted">Loading overview...</div>}

      {data && chain && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <HealthCard
              icon={Server}
              label="API"
              ok={data.health.status === "ok"}
              okText="Operational"
              badText="Degraded"
              detail={`Up ${formatUptime(data.health.uptimeSeconds)} · Node ${data.health.nodeVersion} · ${data.health.memoryMb} MB`}
            />
            <HealthCard icon={Database} label="Database" ok={data.health.database} okText="Connected" badText="Unreachable" detail="PostgreSQL" />
            <HealthCard
              icon={Link2}
              label="Blockchain"
              ok={chain.reachable}
              okText={`Connected · block ${chain.latestBlock?.toLocaleString()}`}
              badText="Unreachable"
              detail={chain.network}
            />
          </div>

          <div className="card p-5">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-ink-muted">Smart contract & platform wallet</h2>
            {chain.error && !chain.reachable && (
              <div className="mb-4 flex items-start gap-2 rounded-sm border border-danger-line bg-danger-light px-3 py-2 text-sm text-danger">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {chain.error}
              </div>
            )}
            <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm md:grid-cols-2">
              <Row label="Network" value={`${chain.network}${chain.chainId ? ` (chain ${chain.chainId})` : ""}`} />
              <Row
                label="Contract"
                value={chain.contractAddress ? <AddressLink explorer={explorer} kind="address" value={chain.contractAddress} /> : "Not configured"}
                flag={chain.contractDeployed === false ? "No contract code at this address" : undefined}
              />
              <Row label="Contract owner" value={chain.contractOwner ? <AddressLink explorer={explorer} kind="address" value={chain.contractOwner} /> : "—"} />
              <Row
                label="Platform wallet"
                value={chain.walletAddress ? <AddressLink explorer={explorer} kind="address" value={chain.walletAddress} /> : "—"}
                flag={chain.walletIsOwner === false ? "Wallet is NOT the contract owner: issuing and revoking will fail" : undefined}
              />
              <Row
                label="Wallet balance"
                value={balance != null ? `${balance.toFixed(4)} POL` : "—"}
                flag={balance != null && balance < LOW_BALANCE ? "Low balance: top up from the faucet before it runs out" : undefined}
              />
              <Row label="Owner check" value={chain.walletIsOwner ? "Wallet owns the contract" : chain.walletIsOwner === false ? "Mismatch" : "—"} />
            </dl>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-medium uppercase tracking-wide text-ink-muted">Institutions</h2>
                <Link to="/maintainer/institutions" className="text-xs font-medium text-seal hover:underline">
                  Manage
                </Link>
              </div>
              <div className="mb-3 font-serif text-3xl font-semibold text-ink">{data.stats.institutions.total}</div>
              <ul className="space-y-1 text-sm">
                <Stat label="Active" value={data.stats.institutions.ACTIVE} />
                <Stat label="Pending approval" value={data.stats.institutions.PENDING} highlight={data.stats.institutions.PENDING > 0} />
                <Stat label="Suspended" value={data.stats.institutions.SUSPENDED} />
                <Stat label="Rejected" value={data.stats.institutions.REJECTED} />
              </ul>
            </div>
            <div className="card p-5">
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-muted">Credentials</h2>
              <div className="mb-3 font-serif text-3xl font-semibold text-ink">{data.stats.credentials.total}</div>
              <ul className="space-y-1 text-sm">
                <Stat label="Valid" value={data.stats.credentials.valid} />
                <Stat label="Revoked" value={data.stats.credentials.revoked} />
                <Stat label="Issued in last 30 days" value={data.stats.credentials.issuedLast30Days} />
              </ul>
            </div>
            <div className="card p-5">
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-muted">On-chain anchoring</h2>
              <div className="mb-3 font-serif text-3xl font-semibold text-ink">
                {data.stats.credentials.total ? Math.round((data.stats.credentials.anchored / data.stats.credentials.total) * 100) : 100}%
              </div>
              <ul className="space-y-1 text-sm">
                <Stat label="Anchored" value={data.stats.credentials.anchored} />
                <Stat label="Pending anchor" value={data.stats.credentials.pendingAnchor} highlight={data.stats.credentials.pendingAnchor > 0} />
                <Stat label="Registered students" value={data.stats.students} />
              </ul>
            </div>
          </div>

          <div>
            <h2 className="mb-3 font-serif text-lg font-semibold text-ink">Recent anchoring activity</h2>
            <div className="card overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-rule bg-ink-soft text-xs uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Credential</th>
                    <th className="px-4 py-2.5 font-medium">Institution</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Transaction</th>
                    <th className="px-4 py-2.5 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentActivity.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-ink-muted">
                        No credentials issued yet.
                      </td>
                    </tr>
                  )}
                  {data.recentActivity.map((a) => (
                    <tr key={a.credentialId} className="border-b border-rule last:border-0">
                      <td className="px-4 py-2.5 font-mono text-xs">{a.credentialId}</td>
                      <td className="px-4 py-2.5">{a.institution ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="px-4 py-2.5">
                        {a.blockchainTxHash ? (
                          <AddressLink explorer={explorer} kind="tx" value={a.blockchainTxHash} />
                        ) : (
                          <span className="text-xs text-amber">Not anchored</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-ink-muted">{new Date(a.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-ink-muted">Maintainers see anchoring metadata only. Student details stay with the issuing institution.</p>
          </div>
        </div>
      )}
    </MaintainerLayout>
  );
}

function HealthCard({ icon: Icon, label, ok, okText, badText, detail }: { icon: any; label: string; ok: boolean; okText: string; badText: string; detail: string }) {
  return (
    <div className={`card p-5 ${ok ? "" : "border-danger-line"}`}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-ink">
          <Icon size={16} className="text-ink-muted" /> {label}
        </div>
        {ok ? <CheckCircle2 size={18} className="text-seal" /> : <XCircle size={18} className="text-danger" />}
      </div>
      <div className={`text-sm font-medium ${ok ? "text-seal-dark" : "text-danger"}`}>{ok ? okText : badText}</div>
      <div className="mt-1 text-xs text-ink-muted">{detail}</div>
    </div>
  );
}

function Row({ label, value, flag }: { label: string; value: React.ReactNode; flag?: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="text-ink">{value}</dd>
      {flag && (
        <dd className="mt-0.5 flex items-center gap-1 text-xs text-danger">
          <Wallet size={12} /> {flag}
        </dd>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <li className="flex justify-between">
      <span className="text-ink-light">{label}</span>
      <span className={`font-mono ${highlight ? "font-semibold text-amber" : "text-ink"}`}>{value}</span>
    </li>
  );
}

function AddressLink({ explorer, kind, value }: { explorer: string | null | undefined; kind: "address" | "tx"; value: string }) {
  if (!explorer) return <span className="font-mono text-xs">{short(value)}</span>;
  return (
    <a href={`${explorer}/${kind}/${value}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-seal hover:underline">
      {short(value)} <ExternalLink size={11} />
    </a>
  );
}
