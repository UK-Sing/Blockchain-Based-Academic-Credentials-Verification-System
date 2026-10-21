import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, XCircle, AlertTriangle, Loader2, ScanLine, ShieldAlert, ImageUp } from "lucide-react";
import { credentialsApi } from "../services/credentials";
import { apiErrorMessage } from "../services/api";
import { Issuer, VerificationResult } from "../types";
import { TrustBadge } from "../components/InstitutionBadges";
import { TxDisplay } from "../components/TxDisplay";

const QR_SCANNER_ELEMENT_ID = "qr-file-scanner";

/** QR codes encode `<base>/verify/<credentialId>`; plain IDs are accepted too. */
function extractCredentialId(decoded: string): string {
  const text = decoded.trim();
  try {
    const parts = new URL(text).pathname.split("/").filter(Boolean);
    const i = parts.lastIndexOf("verify");
    return decodeURIComponent(i >= 0 && parts[i + 1] ? parts[i + 1] : parts[parts.length - 1] ?? "");
  } catch {
    return text;
  }
}

/**
 * Public verification box (ID or QR image) with its result. Lives on the home page; `/verify/:id`
 * (the URL printed in certificate QR codes) renders the home page with this pre-filled.
 */
export function VerifyPanel() {
  const { credentialId: paramId } = useParams<{ credentialId?: string }>();
  const navigate = useNavigate();
  const [input, setInput] = useState(paramId || "");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runVerification(id: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data } = await credentialsApi.verify(id);
      setResult(data);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not reach the verification service."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (paramId) {
      setInput(paramId);
      runVerification(paramId);
    } else {
      // Back on plain "/" (e.g. via the logo): start fresh.
      setInput("");
      setResult(null);
      setError(null);
    }
  }, [paramId]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    navigate(`/verify/${input.trim()}`);
  }

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);

  async function handleQrUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setScanning(true);
    setError(null);
    setResult(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(QR_SCANNER_ELEMENT_ID);
      const decoded = await scanner.scanFile(file, false);
      scanner.clear();
      const id = extractCredentialId(decoded);
      if (!id) throw new Error("empty");
      setInput(id);
      // Same URL wouldn't re-trigger the param effect, so verify directly in that case.
      if (id === paramId) runVerification(id);
      else navigate(`/verify/${encodeURIComponent(id)}`);
    } catch {
      setError("No readable QR code was found in that image. Try a sharper, well-lit photo or enter the ID manually.");
    } finally {
      setScanning(false);
    }
  }

  return (
    <div>
      <div className="card p-5">
        <label htmlFor="credential-id" className="field-label">
          Credential ID
        </label>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
          <input
            id="credential-id"
            className="field-input py-2.5 text-base"
            placeholder="e.g. CRED-2026-000001"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" disabled={loading || !input.trim()} className="btn-primary shrink-0">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ScanLine size={16} />}
            Verify
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-ink-muted">
          <span>Have a certificate instead?</span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={scanning || loading}
            className="btn-secondary py-1.5 text-sm"
          >
            {scanning ? <Loader2 size={16} className="animate-spin" /> : <ImageUp size={16} />}
            {scanning ? "Reading QR code..." : "Upload a photo of its QR code"}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleQrUpload} />
          <div id={QR_SCANNER_ELEMENT_ID} className="hidden" />
        </div>
      </div>

      {(error || result) && (
        <div className="mt-4" aria-live="polite">
          {error && (
            <div className="rounded-sm border border-danger-line bg-danger-light px-4 py-3 text-sm text-danger">{error}</div>
          )}
          {result && <VerificationResultCard result={result} />}
        </div>
      )}
    </div>
  );
}

function VerificationResultCard({ result }: { result: VerificationResult }) {
  if (result.status === "NOT_FOUND") {
    return (
      <div className="card border-rule p-6 text-center">
        <XCircle size={32} className="mx-auto mb-3 text-ink-muted" />
        <h2 className="font-serif text-lg font-semibold text-ink">Credential not found</h2>
        <p className="mt-1 text-sm text-ink-muted">
          The provided credential could not be verified. Please check the credential ID and try again.
        </p>
      </div>
    );
  }

  if (result.status === "REVOKED") {
    return (
      <div className="card border-danger-line bg-danger-light p-6">
        <div className="mb-3 flex items-center gap-2 text-danger">
          <AlertTriangle size={22} />
          <h2 className="font-serif text-lg font-semibold">Credential revoked</h2>
        </div>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-ink-muted">Credential ID</dt>
            <dd className="font-mono text-ink">{result.credentialId}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Reason</dt>
            <dd className="text-ink">{result.reason}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Revoked on</dt>
            <dd className="text-ink">{result.revokedAt ? new Date(result.revokedAt).toLocaleString() : "—"}</dd>
          </div>
        </dl>
        {result.issuer && (
          <div className="mt-4">
            <IssuerPanel issuer={result.issuer} />
          </div>
        )}
        {result.blockchainTxHash && (
          <div className="mt-4">
            <TxDisplay txHash={result.blockchainTxHash} />
          </div>
        )}
      </div>
    );
  }

  // VALID
  const { credential, integrity } = result;
  const showIntegrityWarning = !integrity.hashMatchesDatabase || (integrity.onChainRecordFound && integrity.onChainHashMatches === false);

  return (
    <div className="card border-seal-line bg-seal-light p-6">
      <div className="mb-4 flex items-center gap-2 text-seal-dark">
        <CheckCircle2 size={22} />
        <h2 className="font-serif text-lg font-semibold">Credential verified — Valid</h2>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-ink-muted">Student name</dt>
          <dd className="text-ink">{credential.studentName}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Credential ID</dt>
          <dd className="font-mono text-ink">{credential.credentialId}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Degree</dt>
          <dd className="text-ink">{credential.degree}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">University</dt>
          <dd className="text-ink">{credential.universityName}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Course</dt>
          <dd className="text-ink">{credential.course}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Issue date</dt>
          <dd className="text-ink">{new Date(credential.issueDate).toLocaleDateString()}</dd>
        </div>
      </dl>

      {result.issuer && (
        <div className="mt-4">
          <IssuerPanel issuer={result.issuer} />
        </div>
      )}

      <div className="mt-4">
        <TxDisplay txHash={result.blockchainTxHash} network={result.network} contractAddress={result.contractAddress} />
      </div>

      {!integrity.blockchainReachable && (
        <div className="mt-3 flex items-start gap-2 rounded-sm border border-amber-line bg-amber-light px-3 py-2 text-xs text-amber">
          <ShieldAlert size={14} className="mt-0.5 shrink-0" />
          The blockchain node could not be reached during this check, so on-chain confirmation is unavailable
          right now. The result above reflects the database record only.
        </div>
      )}

      {showIntegrityWarning && integrity.blockchainReachable && (
        <div className="mt-3 flex items-start gap-2 rounded-sm border border-danger-line bg-danger-light px-3 py-2 text-xs text-danger">
          <ShieldAlert size={14} className="mt-0.5 shrink-0" />
          The recalculated hash does not match the on-chain record. This credential's data may have been
          altered after issuance.
        </div>
      )}
    </div>
  );
}

/** Who issued the credential and how far the platform maintainers vouch for them. */
function IssuerPanel({ issuer }: { issuer: Issuer }) {
  const notActive = issuer.status !== "ACTIVE";
  return (
    <div className="rounded-sm border border-rule bg-white px-4 py-3 text-sm">
      <div className="mb-1 text-xs uppercase tracking-wide text-ink-muted">Issued by</div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-ink">{issuer.name}</span>
        <TrustBadge level={issuer.trustLevel} />
        {issuer.website && (
          <a href={issuer.website} target="_blank" rel="noreferrer" className="text-xs text-seal hover:underline">
            {issuer.website.replace(/^https?:\/\//, "")}
          </a>
        )}
      </div>
      {notActive && (
        <div className="mt-2 flex items-start gap-2 text-xs text-danger">
          <ShieldAlert size={14} className="mt-0.5 shrink-0" />
          This issuer is currently {issuer.status.toLowerCase()} on the platform. The credential record is intact, but treat
          it with caution and confirm with the institution directly.
        </div>
      )}
    </div>
  );
}
