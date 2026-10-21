import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { InstitutionLayout } from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { StatusBadge } from "../components/StatusBadge";
import { TxDisplay } from "../components/TxDisplay";
import { QrCodeCard } from "../components/QrCodeCard";
import { CertificatePreview } from "../components/CertificatePreview";
import { credentialsApi } from "../services/credentials";
import { apiErrorMessage } from "../services/api";
import { Credential } from "../types";

export default function CredentialDetail() {
  const { canIssue } = useAuth();
  const { credentialId } = useParams<{ credentialId: string }>();
  const navigate = useNavigate();
  const [credential, setCredential] = useState<Credential | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [showRevokeForm, setShowRevokeForm] = useState(false);
  const [reason, setReason] = useState("");
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const [retrying, setRetrying] = useState(false);

  function load() {
    if (!credentialId) return;
    setLoading(true);
    credentialsApi
      .getOne(credentialId)
      .then((res) => setCredential(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load this credential.")))
      .finally(() => setLoading(false));
  }

  useEffect(load, [credentialId]);

  async function handleRevoke() {
    if (!credentialId || reason.trim().length < 5) {
      setRevokeError("Please provide a reason of at least 5 characters.");
      return;
    }
    setRevoking(true);
    setRevokeError(null);
    try {
      const { data } = await credentialsApi.revoke(credentialId, reason.trim());
      setCredential(data);
      setShowRevokeForm(false);
    } catch (err) {
      setRevokeError(apiErrorMessage(err, "Could not revoke this credential."));
    } finally {
      setRevoking(false);
    }
  }

  async function handleRetryAnchor() {
    if (!credentialId) return;
    setRetrying(true);
    try {
      const { data } = await credentialsApi.retryAnchor(credentialId);
      setCredential(data);
    } catch (err) {
      setError(apiErrorMessage(err, "Retry failed."));
    } finally {
      setRetrying(false);
    }
  }

  if (loading) {
    return (
      <InstitutionLayout>
        <div className="flex items-center gap-2 text-sm text-ink-muted">
          <Loader2 size={16} className="animate-spin" /> Loading credential...
        </div>
      </InstitutionLayout>
    );
  }

  if (error || !credential) {
    return (
      <InstitutionLayout>
        <div className="flex items-center gap-2 rounded-sm border border-danger-line bg-danger-light px-4 py-3 text-sm text-danger">
          <AlertTriangle size={16} /> {error || "Credential not found."}
        </div>
        <button className="btn-secondary mt-4" onClick={() => navigate("/institution/credentials")}>
          Back to credentials
        </button>
      </InstitutionLayout>
    );
  }

  return (
    <InstitutionLayout>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 font-mono text-xs text-ink-muted">{credential.credentialId}</div>
          <h1 className="font-serif text-2xl font-semibold text-ink">{credential.studentName}</h1>
        </div>
        <StatusBadge status={credential.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-muted">Credential details</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Detail label="Student ID" value={credential.studentId} />
              <Detail label="University" value={credential.universityName} />
              <Detail label="Degree" value={credential.degree} />
              <Detail label="Course" value={credential.course} />
              <Detail label="Department" value={credential.department} />
              <Detail label="Graduation year" value={String(credential.graduationYear)} />
              <Detail label="Issue date" value={new Date(credential.issueDate).toLocaleDateString()} />
              <Detail label="Grade" value={credential.grade} />
            </dl>
          </div>

          <div className="card p-5">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-muted">Integrity</h2>
            <Detail label="Credential hash" value={credential.credentialHash} mono />
            <div className="mt-3">
              <TxDisplay
                txHash={credential.blockchainTxHash}
                network={credential.network}
                blockNumber={credential.blockNumber}
                contractAddress={credential.contractAddress}
              />
              {!credential.blockchainTxHash && (
                <button onClick={handleRetryAnchor} disabled={retrying || !canIssue} className="btn-secondary mt-2 text-xs">
                  <RefreshCw size={13} className={retrying ? "animate-spin" : ""} />
                  {retrying ? "Retrying..." : "Retry blockchain anchor"}
                </button>
              )}
            </div>
          </div>

          {credential.status === "REVOKED" && credential.revocation && (
            <div className="card border-danger-line bg-danger-light p-5">
              <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-danger">Revocation</h2>
              <p className="text-sm text-ink">{credential.revocation.reason}</p>
              <p className="mt-1 text-xs text-ink-muted">
                Revoked on {new Date(credential.revocation.revokedAt).toLocaleString()}
              </p>
              <TxDisplay txHash={credential.revocation.blockchainTxHash} network={credential.network} blockNumber={credential.revocation.blockNumber} />
            </div>
          )}

          {credential.status === "VALID" && (
            <div className="card p-5">
              <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-ink-muted">Revoke credential</h2>
              {!showRevokeForm ? (
                <button className="btn-danger" disabled={!canIssue} onClick={() => setShowRevokeForm(true)}>
                  Revoke this credential
                </button>
              ) : (
                <div className="space-y-3">
                  {revokeError && (
                    <div className="rounded-sm border border-danger-line bg-danger-light px-3 py-2 text-sm text-danger">
                      {revokeError}
                    </div>
                  )}
                  <div>
                    <label className="field-label">Reason for revocation</label>
                    <textarea
                      className="field-input"
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Academic integrity violation confirmed after review"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-danger" disabled={revoking} onClick={handleRevoke}>
                      {revoking && <Loader2 size={14} className="animate-spin" />}
                      {revoking ? "Submitting to blockchain..." : "Confirm revocation"}
                    </button>
                    <button className="btn-secondary" onClick={() => setShowRevokeForm(false)} disabled={revoking}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <QrCodeCard credentialId={credential.credentialId} />
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-muted">Certificate</h2>
        <CertificatePreview credential={credential} />
      </div>
    </InstitutionLayout>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className={`text-ink ${mono ? "break-all font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
