import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, LogOut, ScanLine, ChevronDown, ChevronUp } from "lucide-react";
import { Brand } from "../components/Brand";
import { Footer } from "../components/Footer";
import { useStudentAuth } from "../context/StudentAuthContext";
import { studentsApi } from "../services/credentials";
import { apiErrorMessage } from "../services/api";
import { Credential } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { TxDisplay } from "../components/TxDisplay";
import { QrCodeCard } from "../components/QrCodeCard";
import { CertificatePreview } from "../components/CertificatePreview";

export default function StudentPortal() {
  const { student, logout } = useStudentAuth();
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    studentsApi
      .myCredentials()
      .then((res) => {
        setCredentials(res.data);
        if (res.data.length === 1) setExpanded(res.data[0].credentialId);
      })
      .catch((err) => setError(apiErrorMessage(err, "Could not load your credentials.")))
      .finally(() => setLoading(false));
  }, []);

  function handleLogout() {
    logout();
    navigate("/student/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="bg-ink">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Brand sub="Student Portal" inverted />
          <div className="flex items-center gap-4">
            <div className="hidden text-right text-xs sm:block">
              <div className="font-medium text-white">{student?.name}</div>
              <div className="font-mono text-ink-line">{student?.studentId}</div>
            </div>
            <button onClick={handleLogout} className="btn-secondary text-sm">
              <LogOut size={15} /> Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <h1 className="font-serif text-2xl font-semibold text-ink">My credentials</h1>
        <p className="mb-6 text-sm text-ink-muted">
          {student?.department} · Batch {student?.batchYear} · Every credential below is anchored on the blockchain and can be
          verified by anyone with its ID or QR code.
        </p>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <Loader2 size={16} className="animate-spin" /> Loading credentials...
          </div>
        )}
        {error && (
          <div className="rounded-sm border border-danger-line bg-danger-light px-4 py-3 text-sm text-danger">{error}</div>
        )}
        {!loading && !error && credentials.length === 0 && (
          <div className="card p-6 text-center text-sm text-ink-muted">
            No credentials have been issued to your Student ID yet.
          </div>
        )}

        <div className="space-y-4">
          {credentials.map((c) => {
            const open = expanded === c.credentialId;
            return (
              <div key={c.id} className="card">
                <button
                  onClick={() => setExpanded(open ? null : c.credentialId)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left"
                >
                  <div>
                    <div className="font-mono text-xs text-ink-muted">{c.credentialId}</div>
                    <div className="font-serif text-lg font-semibold text-ink">{c.degree}</div>
                    <div className="text-sm text-ink-light">
                      {c.universityName} · {c.course} · Issued {new Date(c.issueDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={c.status} />
                    {open ? <ChevronUp size={18} className="text-ink-muted" /> : <ChevronDown size={18} className="text-ink-muted" />}
                  </div>
                </button>

                {open && (
                  <div className="space-y-6 border-t border-rule p-5">
                    {c.status === "REVOKED" && c.revocation && (
                      <div className="rounded-sm border border-danger-line bg-danger-light px-4 py-3 text-sm text-danger">
                        Revoked on {new Date(c.revocation.revokedAt).toLocaleDateString()}: {c.revocation.reason}
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                      <div className="space-y-3 md:col-span-2">
                        <TxDisplay txHash={c.blockchainTxHash} network={c.network} blockNumber={c.blockNumber} contractAddress={c.contractAddress} />
                        <div className="flex flex-wrap gap-2">
                          <Link to={`/verify/${c.credentialId}`} className="btn-secondary text-sm">
                            <ScanLine size={15} /> Verify now
                          </Link>
                          <Link to={`/credential/${c.credentialId}`} className="btn-secondary text-sm">
                            Public share page
                          </Link>
                        </div>
                      </div>
                      <QrCodeCard credentialId={c.credentialId} />
                    </div>
                    <CertificatePreview credential={c} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
