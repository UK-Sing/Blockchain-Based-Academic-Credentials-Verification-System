import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { InstitutionLayout } from "../components/Layout";
import { StatusBadge } from "../components/StatusBadge";
import { credentialsApi } from "../services/credentials";
import { Credential } from "../types";
import { apiErrorMessage } from "../services/api";

export default function CredentialsList() {
  const [items, setItems] = useState<Credential[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const handle = setTimeout(() => {
      credentialsApi
        .list({ search: search || undefined, status: status || undefined, page, pageSize: 10 })
        .then((res) => {
          setItems(res.data.items);
          setTotal(res.data.total);
          setTotalPages(res.data.totalPages);
        })
        .catch((err) => setError(apiErrorMessage(err, "Could not load credentials.")))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [search, status, page]);

  return (
    <InstitutionLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-ink">Credential management</h1>
          <p className="text-sm text-ink-muted">{total} credential{total === 1 ? "" : "s"} on record.</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative w-64">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            className="field-input pl-8"
            placeholder="Search by ID, name, student ID"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>
        <select
          className="field-input w-44"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">All statuses</option>
          <option value="VALID">Valid</option>
          <option value="REVOKED">Revoked</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-sm border border-danger-line bg-danger-light px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-rule bg-ink-soft text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Credential ID</th>
              <th className="px-4 py-2.5 font-medium">Student</th>
              <th className="px-4 py-2.5 font-medium">Degree</th>
              <th className="px-4 py-2.5 font-medium">Issue date</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-muted">Loading...</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-muted">No credentials match your filters.</td></tr>
            )}
            {!loading && items.map((c) => (
              <tr key={c.id} className="border-b border-rule last:border-0 hover:bg-ink-soft">
                <td className="px-4 py-2.5 font-mono text-xs text-ink">{c.credentialId}</td>
                <td className="px-4 py-2.5">{c.studentName}</td>
                <td className="px-4 py-2.5 text-ink-muted">{c.degree}</td>
                <td className="px-4 py-2.5 text-ink-muted">{new Date(c.issueDate).toLocaleDateString()}</td>
                <td className="px-4 py-2.5"><StatusBadge status={c.status} /></td>
                <td className="px-4 py-2.5">
                  <Link to={`/institution/credentials/${c.credentialId}`} className="font-medium text-seal hover:text-seal-dark">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-ink-muted">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </div>
      )}
    </InstitutionLayout>
  );
}
