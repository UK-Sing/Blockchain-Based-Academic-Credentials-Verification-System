import { Link } from "react-router-dom";
import { Brand, BRAND_NAME, BRAND_TAGLINE } from "./Brand";

const columns = [
  {
    title: "Verify",
    links: [
      { to: "/", label: "Verify a credential" },
      { to: "/student/login", label: "Student login" },
    ],
  },
  {
    title: "Institutions",
    links: [
      { to: "/login", label: "Institution login" },
      { to: "/register-institution", label: "Become an issuer" },
      { to: "/maintainer/login", label: "Platform maintainers" },
    ],
  },
];

/** Site footer on every page. `compact` is a single line for the signed-in consoles. */
export function Footer({ compact = false }: { compact?: boolean }) {
  const year = new Date().getFullYear();

  if (compact) {
    return (
      <footer className="mt-12 flex flex-wrap items-center justify-between gap-2 border-t border-rule pt-4 text-xs text-ink-muted">
        <span>
          © {year} {BRAND_NAME} · {BRAND_TAGLINE}
        </span>
        <span>Credential hashes anchored on Polygon Amoy</span>
      </footer>
    );
  }

  return (
    <footer className="bg-ink text-ink-line">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-10 sm:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Brand inverted sub={BRAND_TAGLINE} />
          <p className="mt-4 max-w-sm text-sm leading-relaxed">
            Universities issue credentials, a tamper-evident fingerprint of each one is anchored on the blockchain, and
            anyone can check a certificate in seconds.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-white">{col.title}</div>
            <ul className="space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-ink-light">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-4 text-xs">
          <span>
            © {year} {BRAND_NAME}. BCA final-year project.
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-seal-bright" />
            Credential hashes anchored on Polygon Amoy testnet
          </span>
        </div>
      </div>
    </footer>
  );
}
