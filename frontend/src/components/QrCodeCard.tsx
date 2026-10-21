import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Link2, Check } from "lucide-react";

export function QrCodeCard({ credentialId }: { credentialId: string }) {
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const base = import.meta.env.VITE_VERIFICATION_BASE_URL || `${window.location.origin}/verify`;
  const verificationUrl = `${base}/${credentialId}`;

  function download() {
    const canvas = canvasWrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${credentialId}-verification-qr.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function copyLink() {
    navigator.clipboard.writeText(verificationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="card flex flex-col items-center gap-3 p-5">
      <div ref={canvasWrapRef} className="rounded-sm border border-rule p-3">
        <QRCodeCanvas value={verificationUrl} size={168} level="M" includeMargin={false} />
      </div>
      <p className="break-all text-center font-mono text-xs text-ink-muted">{verificationUrl}</p>
      <div className="flex w-full gap-2">
        <button onClick={download} className="btn-secondary flex-1 text-xs">
          <Download size={14} /> Download QR
        </button>
        <button onClick={copyLink} className="btn-secondary flex-1 text-xs">
          {copied ? <Check size={14} /> : <Link2 size={14} />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
