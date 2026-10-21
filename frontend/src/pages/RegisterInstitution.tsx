import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { RegisterInstitutionPayload } from "../services/credentials";
import { apiErrorMessage } from "../services/api";
import { AuthShell } from "../components/Layout";

const emptyForm: RegisterInstitutionPayload = {
  name: "",
  email: "",
  password: "",
  contactName: "",
  phone: "",
  website: "",
  registrationNumber: "",
  address: "",
};

export default function RegisterInstitution() {
  const { registerInstitution } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof RegisterInstitutionPayload>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      // Drop empty optional fields so the API's URL/format validation doesn't reject blanks.
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v.trim() !== "")
      ) as unknown as RegisterInstitutionPayload;
      await registerInstitution(payload);
      navigate("/institution/dashboard");
    } catch (err) {
      setError(apiErrorMessage(err, "Registration failed."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell area="Issuer Console" width="max-w-xl">
        <div className="card p-6">
          <h1 className="mb-1 font-serif text-xl font-semibold text-ink">Register your institution</h1>
          <p className="mb-5 text-sm text-ink-muted">
            Applications are reviewed by the platform maintainers. You can sign in straight away, and issuing unlocks once
            your institution is approved.
          </p>

          {error && (
            <div className="mb-4 rounded-sm border border-danger-line bg-danger-light px-3 py-2 text-sm text-danger">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Institution name">
              <input required className="field-input" placeholder="Northbridge Institute of Technology" value={form.name} onChange={(e) => update("name", e.target.value)} />
              <p className="mt-1 text-xs text-ink-muted">Printed on every credential you issue. It can't be changed later.</p>
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Official email">
                <input required type="email" autoComplete="username" className="field-input" value={form.email} onChange={(e) => update("email", e.target.value)} />
              </Field>
              <Field label="Contact person / office">
                <input required className="field-input" placeholder="Registrar Office" value={form.contactName} onChange={(e) => update("contactName", e.target.value)} />
              </Field>
              <Field label="Registration no. (AISHE/UGC, optional)">
                <input className="field-input" value={form.registrationNumber} onChange={(e) => update("registrationNumber", e.target.value)} />
              </Field>
              <Field label="Website (optional)">
                <input type="url" className="field-input" placeholder="https://example.edu" value={form.website} onChange={(e) => update("website", e.target.value)} />
              </Field>
              <Field label="Phone (optional)">
                <input className="field-input" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
              </Field>
              <Field label="Address (optional)">
                <input className="field-input" value={form.address} onChange={(e) => update("address", e.target.value)} />
              </Field>
              <Field label="Password">
                <input required type="password" minLength={8} autoComplete="new-password" className="field-input" value={form.password} onChange={(e) => update("password", e.target.value)} />
              </Field>
              <Field label="Confirm password">
                <input required type="password" minLength={8} autoComplete="new-password" className="field-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </Field>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Submitting..." : "Submit for approval"}
            </button>
          </form>

          <p className="mt-4 text-sm text-ink-light">
            Already registered?{" "}
            <Link to="/login" className="font-medium text-seal hover:underline">
              Sign in
            </Link>
          </p>
        </div>
    </AuthShell>
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
