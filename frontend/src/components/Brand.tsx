import { Link } from "react-router-dom";

export const BRAND_NAME = "CredentialChain";
export const BRAND_TAGLINE = "Blockchain-verified academic credentials";

/** Logo mark: a seal-green tile with a shield, a check and a chain link. Solid colours only. */
export function BrandMark({ size = 32, inverted = false }: { size?: number; inverted?: boolean }) {
  const tile = inverted ? "#FFFFFF" : "#0F5C52";
  const fg = inverted ? "#0F5C52" : "#FFFFFF";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill={tile} />
      <path d="M16 5.5 7.5 9v6.2c0 5.1 3.6 9.6 8.5 11.1 4.9-1.5 8.5-6 8.5-11.1V9L16 5.5Z" fill={fg} />
      <path d="m12.2 15.8 2.6 2.6 5-5.2" fill="none" stroke={tile} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Logo + wordmark. `sub` names the area of the app (e.g. "Issuer Console").
 * `inverted` is for dark (ink) backgrounds such as the footer.
 */
export function Brand({ sub, inverted = false, to = "/" }: { sub?: string; inverted?: boolean; to?: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2.5" aria-label={`${BRAND_NAME} home`}>
      <BrandMark inverted={inverted} />
      <span className="leading-tight">
        <span className={`block font-serif text-lg font-semibold ${inverted ? "text-white" : "text-ink"}`}>
          Credential<span className={inverted ? "text-seal-bright" : "text-seal"}>Chain</span>
        </span>
        {sub && <span className={`block text-xs font-medium ${inverted ? "text-ink-line" : "text-ink-muted"}`}>{sub}</span>}
      </span>
    </Link>
  );
}
