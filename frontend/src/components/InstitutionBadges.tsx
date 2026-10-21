import { BadgeCheck, Award, ShieldQuestion, Clock, CheckCircle2, Ban, XCircle } from "lucide-react";
import { InstitutionStatus, TrustLevel } from "../types";

const trustStyles: Record<TrustLevel, { cls: string; icon: JSX.Element; label: string; hint: string }> = {
  ACCREDITED: {
    cls: "bg-seal-light text-seal-dark",
    icon: <Award size={13} strokeWidth={2.25} />,
    label: "Accredited",
    hint: "Accreditation confirmed by platform maintainers",
  },
  VERIFIED: {
    cls: "bg-seal-light text-seal-dark",
    icon: <BadgeCheck size={13} strokeWidth={2.25} />,
    label: "Verified issuer",
    hint: "Identity verified by platform maintainers",
  },
  UNVERIFIED: {
    cls: "bg-amber-light text-amber",
    icon: <ShieldQuestion size={13} strokeWidth={2.25} />,
    label: "Unverified issuer",
    hint: "Platform maintainers have not yet verified this institution",
  },
};

export function TrustBadge({ level }: { level: TrustLevel }) {
  const s = trustStyles[level];
  return (
    <span title={s.hint} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${s.cls}`}>
      {s.icon}
      {s.label}
    </span>
  );
}

const statusStyles: Record<InstitutionStatus, { cls: string; icon: JSX.Element; label: string }> = {
  ACTIVE: { cls: "bg-seal-light text-seal-dark", icon: <CheckCircle2 size={13} strokeWidth={2.25} />, label: "Active" },
  PENDING: { cls: "bg-amber-light text-amber", icon: <Clock size={13} strokeWidth={2.25} />, label: "Pending approval" },
  SUSPENDED: { cls: "bg-danger-light text-danger", icon: <Ban size={13} strokeWidth={2.25} />, label: "Suspended" },
  REJECTED: { cls: "bg-ink-faint text-ink-muted", icon: <XCircle size={13} strokeWidth={2.25} />, label: "Rejected" },
};

export function InstitutionStatusBadge({ status }: { status: InstitutionStatus }) {
  const s = statusStyles[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${s.cls}`}>
      {s.icon}
      {s.label}
    </span>
  );
}
