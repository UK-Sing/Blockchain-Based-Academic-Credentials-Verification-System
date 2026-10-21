import { FormEvent, useEffect, useState } from "react";
import { Search, Loader2, ExternalLink } from "lucide-react";
import { MaintainerLayout } from "../components/Layout";
import { InstitutionStatusBadge, TrustBadge } from "../components/InstitutionBadges";
import { adminApi } from "../services/credentials";
import { apiErrorMessage } from "../services/api";
import { InstitutionStatus, InstitutionSummary, TrustLevel } from "../types";

const FILTERS: { value: InstitutionStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "REJECTED", label: "Rejected" },
];

const TRUST_LEVELS: TrustLevel[] = ["UNVERIFIED", "VERIFIED", "ACCREDITED"];

type Action = { status: "ACTIVE" | "SUSPENDED" | "REJECTED"; label: string; needsReason: boolean; style: string };

function actionsFor(status: InstitutionStatus): Action[] {
  switch (status) {
    case "PENDING":
      return [
        { status: "ACTIVE", label: "Approve", needsReason: false, style: "btn-primary" },
        { status: "REJECTED", label: "Reject", needsReason: true, style: "btn-secondary" },
      ];
    case "ACTIVE":
      return [{ status: "SUSPENDED", label: "Suspend", needsReason: true, style: "btn-danger" }];
    default:
      return [{ status: "ACTIVE", label: "Reactivate", needsReason: false, style: "btn-secondary" }];
  }
}

export default function MaintainerInstitutions() {
  const [items, setItems] = useState<InstitutionSummary[]>([]);
  const [filter, setFilter] = useState<InstitutionStatus | "">("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load(status = filter, query = search) {
    setLoading(true);
    adminApi
      .institutions({ status: status || undefined, search: query || undefined })
      .then((res) => {
        setItems(res.data);
        setError(null);
      })
      .catch((err) => setError(apiErrorMessage(err, "Could not load institutions.")))
      .finally(() => setLoading(false));
  }

  useEffect(() => load(filter, search), [filter]);

  return (
    <MaintainerLayout>
      <h1 className="mb-1 font-serif text-2xl font-semibold text-ink">Institutions</h1>
      <p className="mb-6 text-sm text-ink-muted">
        Review issuer applications and set trust levels. Approving lets an institution issue credentials; suspending stops it
        immediately. Maintainers can't issue, edit or revoke credentials themselves.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-sm border border-ink-line bg-white p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => setFilter(f.value)}
              className={`rounded-sm px-3 py-1.5 text-sm font-medium ${filter === f.value ? "bg-ink text-paper" : "text-ink-light hover:bg-ink-faint"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
          className="relative min-w-60 flex-1"
        >
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input className="field-input pl-9" placeholder="Search name, email or registration no." value={search} onChange={(e) => setSearch(e.target.value)} />
        </form>
      </div>

      {error && <div className="mb-4 rounded-sm border border-danger-line bg-danger-light px-4 py-3 text-sm text-danger">{error}</div>}
      {loading && items.length === 0 && <div className="text-sm text-ink-muted">Loading institutions...</div>}
      {!loading && items.length === 0 && !error && <div className="card p-6 text-center text-sm text-ink-muted">No institutions match.</div>}

      <div className="space-y-4">
        {items.map((inst) => (
          <InstitutionCard key={inst.id} inst={inst} onChanged={() => load()} />
        ))}
      </div>
    </MaintainerLayout>
  );
}

function InstitutionCard({ inst, onChanged }: { inst: InstitutionSummary; onChanged: () => void }) {
  const [pending, setPending] = useState<Action | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const revocationRate = inst.activity.credentials ? Math.round((inst.activity.revoked / inst.activity.credentials) * 100) : 0;

  async function applyStatus(action: Action, e?: FormEvent) {
    e?.preventDefault();
    if (action.needsReason && reason.trim().length < 5) {
      setError("Please give a reason of at least 5 characters. The institution will see it.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adminApi.updateStatus(inst.id, action.status, reason.trim() || undefined);
      setPending(null);
      setReason("");
      onChanged();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not update the institution."));
    } finally {
      setBusy(false);
    }
  }

  async function changeTrust(level: TrustLevel) {
    setBusy(true);
    setError(null);
    try {
      await adminApi.updateTrust(inst.id, level);
      onChanged();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not update the trust level."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`card p-5 ${inst.status === "PENDING" ? "border-amber-line" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-serif text-lg font-semibold text-ink">{inst.name}</h2>
            <InstitutionStatusBadge status={inst.status} />
            <TrustBadge level={inst.trustLevel} />
          </div>
          <div className="mt-1 text-sm text-ink-light">
            {inst.contactName} · {inst.email}
            {inst.phone && ` · ${inst.phone}`}
          </div>
          <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-ink-muted">
            {inst.registrationNumber && <span>Reg. no. {inst.registrationNumber}</span>}
            {inst.website && (
              <a href={inst.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-seal hover:underline">
                {inst.website.replace(/^https?:\/\//, "")} <ExternalLink size={11} />
              </a>
            )}
            {inst.address && <span>{inst.address}</span>}
            <span>Applied {new Date(inst.createdAt).toLocaleDateString()}</span>
            {inst.reviewedAt && <span>Reviewed {new Date(inst.reviewedAt).toLocaleDateString()}</span>}
          </div>
          {inst.statusReason && <div className="mt-1 text-xs text-ink-light">Reason on record: {inst.statusReason}</div>}
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            {actionsFor(inst.status).map((a) => (
              <button
                key={a.label}
                disabled={busy}
                className={`${a.style} text-sm`}
                onClick={() => (a.needsReason ? setPending(a) : applyStatus(a))}
              >
                {busy && !a.needsReason && <Loader2 size={14} className="animate-spin" />}
                {a.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-ink-muted">
            Trust level
            <select
              className="field-input w-36 py-1 text-xs"
              value={inst.trustLevel}
              disabled={busy}
              onChange={(e) => changeTrust(e.target.value as TrustLevel)}
            >
              {TRUST_LEVELS.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-rule pt-4 text-sm sm:grid-cols-5">
        <Metric label="Credentials" value={inst.activity.credentials} />
        <Metric label="Revocation rate" value={`${revocationRate}%`} warn={revocationRate >= 20 && inst.activity.credentials >= 5} />
        <Metric label="Pending anchor" value={inst.activity.pendingAnchor} warn={inst.activity.pendingAnchor > 0} />
        <Metric label="Students" value={inst.activity.students} />
        <Metric label="Last issued" value={inst.activity.lastIssuedAt ? new Date(inst.activity.lastIssuedAt).toLocaleDateString() : "—"} />
      </dl>

      {pending && (
        <form onSubmit={(e) => applyStatus(pending, e)} className="mt-4 space-y-2 border-t border-rule pt-4">
          <label className="field-label">Reason for {pending.label.toLowerCase()} (shown to the institution)</label>
          <textarea className="field-input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={`${pending.style} text-sm`}>
              {busy && <Loader2 size={14} className="animate-spin" />}
              Confirm {pending.label.toLowerCase()}
            </button>
            <button type="button" className="btn-secondary text-sm" onClick={() => setPending(null)} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <div className="mt-3 rounded-sm border border-danger-line bg-danger-light px-3 py-2 text-sm text-danger">{error}</div>}
    </div>
  );
}

function Metric({ label, value, warn }: { label: string; value: number | string; warn?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className={`font-mono ${warn ? "font-semibold text-amber" : "text-ink"}`}>{value}</dd>
    </div>
  );
}
