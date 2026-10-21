import { useState } from "react";
import { Copy, ExternalLink, Check } from "lucide-react";

function truncate(hash: string, size = 10) {
  if (hash.length <= size * 2 + 3) return hash;
  return `${hash.slice(0, size)}...${hash.slice(-size)}`;
}

function explorerUrl(network: string | null | undefined, txHash: string): string | null {
  if (!network) return null;
  const n = network.toLowerCase();
  if (n.includes("amoy")) return `https://amoy.polygonscan.com/tx/${txHash}`;
  if (n.includes("polygon") && !n.includes("amoy")) return `https://polygonscan.com/tx/${txHash}`;
  return null; // local Hardhat network has no public explorer
}

export function TxDisplay({
  txHash,
  network,
  blockNumber,
  contractAddress,
  credentialId,
}: {
  txHash: string | null | undefined;
  network?: string | null;
  blockNumber?: number | null;
  contractAddress?: string | null;
  credentialId?: string;
}) {
  const [copied, setCopied] = useState(false);

  if (!txHash) {
    return (
      <div className="rounded-sm border border-amber-line bg-amber-light px-3 py-2 text-sm text-amber">
        Blockchain transaction pending — anchoring not yet confirmed.
      </div>
    );
  }

  const url = explorerUrl(network, txHash);

  function copy() {
    navigator.clipboard.writeText(txHash!);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-sm border border-rule bg-ink-soft p-3 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          Blockchain transaction
        </span>
        {network && (
          <span className="rounded-full bg-ink-faint px-2 py-0.5 text-xs font-medium text-ink-light">
            {network}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 font-mono text-xs text-ink">
        <span className="break-all">{truncate(txHash, 14)}</span>
        <button onClick={copy} className="shrink-0 text-ink-muted hover:text-ink" aria-label="Copy transaction hash">
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-seal hover:text-seal-dark"
            aria-label="View on explorer"
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink-muted">
        {typeof blockNumber === "number" && (
          <>
            <dt>Block</dt>
            <dd className="font-mono text-ink-light">{blockNumber}</dd>
          </>
        )}
        {contractAddress && (
          <>
            <dt>Contract</dt>
            <dd className="truncate font-mono text-ink-light">{truncate(contractAddress, 8)}</dd>
          </>
        )}
        {credentialId && (
          <>
            <dt>Credential ID</dt>
            <dd className="font-mono text-ink-light">{credentialId}</dd>
          </>
        )}
      </dl>
    </div>
  );
}
