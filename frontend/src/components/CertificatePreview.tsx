import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Loader2 } from "lucide-react";
import { Credential } from "../types";
import { downloadElementAsPdf, PDF_ROOT_ATTR } from "../lib/pdf";

// Fixed A4-landscape canvas (297:210); the preview scales it down to fit its container.
const CERT_WIDTH = 1000;
const CERT_HEIGHT = Math.round((CERT_WIDTH * 210) / 297);

function verificationUrl(credentialId: string) {
  const base = import.meta.env.VITE_VERIFICATION_BASE_URL || `${window.location.origin}/verify`;
  return `${base}/${credentialId}`;
}

function shortHash(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

export function CertificatePreview({ credential }: { credential: Credential }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const certRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / CERT_WIDTH)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  async function handleDownload() {
    if (!certRef.current) return;
    setDownloading(true);
    setError(null);
    try {
      await downloadElementAsPdf(certRef.current, `${credential.credentialId}.pdf`);
    } catch {
      setError("Could not generate the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  const revoked = credential.status === "REVOKED";

  return (
    <div className="space-y-3">
      <div ref={wrapRef} className="w-full overflow-hidden rounded-sm border border-rule" style={{ height: CERT_HEIGHT * scale }}>
        <div
          ref={certRef}
          {...{ [PDF_ROOT_ATTR]: "" }}
          className="relative bg-white text-ink"
          style={{ width: CERT_WIDTH, height: CERT_HEIGHT, transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          <div className="absolute inset-4 border-[3px] border-seal" />
          <div className="absolute inset-6 border border-seal-line" />

          <div className="relative flex h-full flex-col items-center px-20 pt-16 text-center">
            <div className="font-serif text-[34px] font-semibold tracking-wide text-seal-dark">{credential.universityName}</div>
            <div className="mt-1 text-[13px] uppercase tracking-[0.35em] text-ink-muted">Certificate of Academic Achievement</div>

            <div className="mt-10 text-[16px] italic text-ink-light">This is to certify that</div>
            <div className="mt-2 font-serif text-[40px] font-semibold">{credential.studentName}</div>
            <div className="text-[13px] text-ink-muted">Student ID: {credential.studentId}</div>

            <div className="mt-6 text-[16px] italic text-ink-light">has been awarded the degree of</div>
            <div className="mt-1 font-serif text-[26px] font-semibold">{credential.degree}</div>
            <div className="mt-2 text-[15px] text-ink-light">
              in {credential.course}, Department of {credential.department}
            </div>
            <div className="mt-1 text-[15px] text-ink-light">
              with {credential.grade} · Class of {credential.graduationYear}
            </div>

            <div className="absolute inset-x-20 bottom-14 flex items-end justify-between text-left">
              <div className="space-y-1 text-[12px] text-ink-muted">
                <div>
                  <span className="font-medium text-ink">Credential ID:</span>{" "}
                  <span className="font-mono">{credential.credentialId}</span>
                </div>
                <div>
                  <span className="font-medium text-ink">Issued:</span> {new Date(credential.issueDate).toLocaleDateString(undefined, { dateStyle: "long" })}
                </div>
                {credential.blockchainTxHash ? (
                  <div>
                    <span className="font-medium text-ink">Anchored on {credential.network ?? "blockchain"}:</span>{" "}
                    <span className="font-mono">{shortHash(credential.blockchainTxHash)}</span>
                  </div>
                ) : (
                  <div className="text-amber">Blockchain anchoring pending</div>
                )}
              </div>

              <div className="flex flex-col items-center">
                <div className="mb-1 w-48 border-b border-ink-muted" />
                <div className="text-[12px] text-ink-muted">Registrar</div>
              </div>

              <div className="flex flex-col items-center">
                <QRCodeCanvas value={verificationUrl(credential.credentialId)} size={96} level="M" />
                <div className="mt-1 text-[11px] text-ink-muted">Scan to verify</div>
              </div>
            </div>
          </div>

          {revoked && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="-rotate-[18deg] rounded-sm border-[6px] border-danger px-10 py-3 font-serif text-[72px] font-bold tracking-widest text-danger">
                REVOKED
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleDownload} disabled={downloading} className="btn-secondary text-sm">
          {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {downloading ? "Generating PDF..." : "Download certificate (PDF)"}
        </button>
        {error && <span className="text-sm text-danger">{error}</span>}
      </div>
    </div>
  );
}
