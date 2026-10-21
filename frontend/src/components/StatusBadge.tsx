import { CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react";

type Kind = "VALID" | "REVOKED" | "NOT_FOUND" | "PENDING";

const styles: Record<Kind, { bg: string; text: string; icon: JSX.Element; label: string }> = {
  VALID: {
    bg: "bg-seal-light",
    text: "text-seal-dark",
    icon: <CheckCircle2 size={14} strokeWidth={2.25} />,
    label: "Valid",
  },
  REVOKED: {
    bg: "bg-danger-light",
    text: "text-danger",
    icon: <XCircle size={14} strokeWidth={2.25} />,
    label: "Revoked",
  },
  NOT_FOUND: {
    bg: "bg-ink-faint",
    text: "text-ink-muted",
    icon: <AlertTriangle size={14} strokeWidth={2.25} />,
    label: "Not found",
  },
  PENDING: {
    bg: "bg-amber-light",
    text: "text-amber",
    icon: <Clock size={14} strokeWidth={2.25} />,
    label: "Pending",
  },
};

export function StatusBadge({ status }: { status: Kind }) {
  const s = styles[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.bg} ${s.text}`}
    >
      {s.icon}
      {s.label}
    </span>
  );
}
