import { Link } from "react-router-dom";
import { ScanLine, ShieldCheck, Hash, Link2, QrCode, GraduationCap, Building2, ArrowRight, Lock, Zap, Eye } from "lucide-react";
import { PublicShell } from "../components/Layout";
import { VerifyPanel } from "./Verify";

const portals = [
  { to: "/student/login", icon: GraduationCap, title: "I'm a student", desc: "See your credentials and download them as PDF certificates." },
  { to: "/login", icon: Building2, title: "I'm an institution", desc: "Issue and manage credentials, or register as a new issuer." },
];

const highlights = [
  { icon: Zap, text: "Instant result" },
  { icon: Lock, text: "Tamper-evident" },
  { icon: Eye, text: "No account needed" },
];

const steps = [
  { icon: ShieldCheck, label: "Issue", desc: "The institution records the credential" },
  { icon: Hash, label: "Fingerprint", desc: "A keccak256 hash of the record is created" },
  { icon: Link2, label: "Anchor", desc: "The hash is written to the blockchain" },
  { icon: QrCode, label: "Share", desc: "The certificate carries a verification QR code" },
  { icon: ScanLine, label: "Verify", desc: "Anyone can check it, right here" },
];

export default function Home() {
  return (
    <PublicShell>
      <section className="bg-ink">
        <div className="mx-auto max-w-3xl px-6 pb-14 pt-12 md:pb-16 md:pt-16">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-ink-light bg-ink-deep px-3 py-1 text-xs font-medium text-ink-line">
            <span className="inline-block h-2 w-2 rounded-full bg-seal-bright" />
            Secured by the Polygon blockchain
          </div>
          <h1 className="font-serif text-3xl font-semibold text-white md:text-5xl">Is this certificate genuine?</h1>
          <p className="mt-4 max-w-xl text-base text-ink-line md:text-lg">
            Enter the credential ID printed on the certificate, or upload a photo of its QR code. We check it against the
            blockchain in seconds.
          </p>
          <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-line">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="inline-flex items-center gap-1.5">
                <Icon size={15} className="text-seal-bright" /> {text}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <VerifyPanel />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-12">
        <h2 className="mb-4 font-serif text-xl font-semibold text-ink">Sign in</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {portals.map(({ to, icon: Icon, title, desc }) => (
            <Link key={to} to={to} className="card group flex items-start gap-4 p-5 transition-colors hover:border-seal">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-seal-light text-seal">
                <Icon size={20} />
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-1 font-medium text-ink">
                  {title} <ArrowRight size={15} className="text-ink-muted transition-transform group-hover:translate-x-0.5" />
                </div>
                <div className="mt-1 text-sm leading-snug text-ink-muted">{desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-rule bg-white">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <h2 className="mb-2 font-serif text-xl font-semibold text-ink">How it works</h2>
          <p className="mb-6 max-w-2xl text-sm text-ink-muted">
            Student records stay with the institution. Only a fingerprint goes on the blockchain, so nothing personal is
            public, but any change to a certificate is caught immediately.
          </p>
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-5">
            {steps.map(({ icon: Icon, label, desc }, i) => (
              <li key={label} className="rounded-sm border border-rule bg-paper p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-seal text-white">
                    <Icon size={16} />
                  </span>
                  <span className="font-mono text-xs text-ink-placeholder">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <div className="text-sm font-medium text-ink">{label}</div>
                <div className="mt-1 text-xs leading-snug text-ink-muted">{desc}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </PublicShell>
  );
}
