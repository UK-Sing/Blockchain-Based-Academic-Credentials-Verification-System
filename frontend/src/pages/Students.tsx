import { FormEvent, useEffect, useState } from "react";
import { Loader2, Search, UserPlus, CheckCircle2 } from "lucide-react";
import { InstitutionLayout } from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { studentsApi, RegisterStudentPayload } from "../services/credentials";
import { apiErrorMessage } from "../services/api";
import { Student } from "../types";

const emptyForm: RegisterStudentPayload = {
  studentId: "",
  name: "",
  email: "",
  phone: "",
  department: "",
  batchYear: new Date().getFullYear(),
  password: "",
};

export default function Students() {
  const { canIssue } = useAuth();
  const [form, setForm] = useState<RegisterStudentPayload>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [registered, setRegistered] = useState<Student | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  function load(query = search) {
    setLoading(true);
    studentsApi
      .list({ search: query || undefined, pageSize: 100 })
      .then((res) => {
        setStudents(res.data.items);
        setListError(null);
      })
      .catch((err) => setListError(apiErrorMessage(err, "Could not load students.")))
      .finally(() => setLoading(false));
  }

  useEffect(() => load(""), []);

  function update<K extends keyof RegisterStudentPayload>(key: K, value: RegisterStudentPayload[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setRegistered(null);
    setSaving(true);
    try {
      const { data } = await studentsApi.register({ ...form, phone: form.phone?.trim() || undefined });
      setRegistered(data);
      setForm(emptyForm);
      load();
    } catch (err) {
      setFormError(apiErrorMessage(err, "Could not register the student."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <InstitutionLayout>
      <h1 className="mb-1 font-serif text-2xl font-semibold text-ink">Students</h1>
      <p className="mb-6 text-sm text-ink-muted">
        Register students so they can sign in to the student portal and see the credentials issued to their Student ID.
      </p>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-5">
        <form onSubmit={handleSubmit} className="card space-y-4 p-5 xl:col-span-2">
          <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-ink">
            <UserPlus size={18} className="text-seal" /> Register student
          </h2>

          {formError && (
            <div className="rounded-sm border border-danger-line bg-danger-light px-3 py-2 text-sm text-danger">{formError}</div>
          )}
          {registered && (
            <div className="flex items-start gap-2 rounded-sm border border-seal-line bg-seal-light px-3 py-2 text-sm text-seal-dark">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <span>
                Registered <span className="font-mono">{registered.studentId}</span> ({registered.name}). Share the Student ID
                and password with them to sign in.
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Student ID">
              <input required className="field-input" placeholder="STU2026010" value={form.studentId} onChange={(e) => update("studentId", e.target.value)} />
            </Field>
            <Field label="Batch year">
              <input required type="number" min={2000} max={2100} className="field-input" value={form.batchYear} onChange={(e) => update("batchYear", Number(e.target.value))} />
            </Field>
          </div>
          <Field label="Full name">
            <input required className="field-input" value={form.name} onChange={(e) => update("name", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email">
              <input required type="email" className="field-input" value={form.email} onChange={(e) => update("email", e.target.value)} />
            </Field>
            <Field label="Phone (optional)">
              <input className="field-input" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </Field>
          </div>
          <Field label="Department">
            <input required className="field-input" placeholder="Computer Science" value={form.department} onChange={(e) => update("department", e.target.value)} />
          </Field>
          <Field label="Initial password">
            <input required type="password" minLength={8} autoComplete="new-password" className="field-input" value={form.password} onChange={(e) => update("password", e.target.value)} />
            <p className="mt-1 text-xs text-ink-muted">At least 8 characters. Stored as a bcrypt hash, never on-chain.</p>
          </Field>

          <button type="submit" disabled={saving || !canIssue} className="btn-primary w-full">
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? "Registering..." : "Register student"}
          </button>
        </form>

        <div className="xl:col-span-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
            className="mb-3 flex gap-2"
          >
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input className="field-input pl-9" placeholder="Search by ID, name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button type="submit" className="btn-secondary">
              Search
            </button>
          </form>

          {listError && (
            <div className="mb-3 rounded-sm border border-danger-line bg-danger-light px-3 py-2 text-sm text-danger">{listError}</div>
          )}

          <div className="card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-rule bg-ink-soft text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Student ID</th>
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Department</th>
                  <th className="px-4 py-2.5 font-medium">Batch</th>
                  <th className="px-4 py-2.5 text-right font-medium">Credentials</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-ink-muted">
                      Loading...
                    </td>
                  </tr>
                )}
                {!loading && students.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-ink-muted">
                      No students found.
                    </td>
                  </tr>
                )}
                {!loading &&
                  students.map((s) => (
                    <tr key={s.id} className="border-b border-rule last:border-0 hover:bg-ink-soft">
                      <td className="px-4 py-2.5 font-mono text-xs">{s.studentId}</td>
                      <td className="px-4 py-2.5">
                        <div className="text-ink">{s.name}</div>
                        <div className="text-xs text-ink-muted">{s.email}</div>
                      </td>
                      <td className="px-4 py-2.5 text-ink-muted">{s.department}</td>
                      <td className="px-4 py-2.5 text-ink-muted">{s.batchYear}</td>
                      <td className="px-4 py-2.5 text-right">{s.credentialCount ?? 0}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </InstitutionLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}
