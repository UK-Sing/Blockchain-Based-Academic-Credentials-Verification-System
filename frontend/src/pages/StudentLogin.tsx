import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useStudentAuth } from "../context/StudentAuthContext";
import { apiErrorMessage } from "../services/api";
import { AuthShell } from "../components/Layout";

export default function StudentLogin() {
  const { login } = useStudentAuth();
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(studentId, password);
      navigate("/student");
    } catch (err) {
      setError(apiErrorMessage(err, "Login failed."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell area="Student Portal">
        <div className="card p-6">
          <h1 className="mb-1 font-serif text-xl font-semibold text-ink">Student login</h1>
          <p className="mb-5 text-sm text-ink-muted">Sign in to view and download your academic credentials.</p>

          {error && (
            <div className="mb-4 rounded-sm border border-danger-line bg-danger-light px-3 py-2 text-sm text-danger">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label" htmlFor="studentId">
                Student ID
              </label>
              <input
                id="studentId"
                required
                className="field-input"
                placeholder="STU2026001"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                className="field-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-4 text-xs text-ink-muted">
            Demo: <span className="font-mono">STU2026001</span> / <span className="font-mono">Student@123</span>. Accounts are
            created by the registrar.
          </p>
        </div>
    </AuthShell>
  );
}
