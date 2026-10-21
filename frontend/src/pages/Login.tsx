import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { homeFor, useAuth } from "../context/AuthContext";
import { apiErrorMessage } from "../services/api";
import { AuthShell } from "../components/Layout";

/**
 * Shared sign-in for issuing institutions and platform maintainers. The backend decides the
 * role from the account, so a maintainer signing in here lands on the maintainer console.
 * `maintainer` only changes the wording (used by /maintainer/login).
 */
export default function Login({ maintainer = false }: { maintainer?: boolean }) {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={homeFor(user)} replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const signedIn = await login(email, password);
      navigate(homeFor(signedIn));
    } catch (err) {
      setError(apiErrorMessage(err, "Login failed."));
    } finally {
      setLoading(false);
    }
  }


  return (
    <AuthShell area={maintainer ? "Maintainer Console" : "Issuer Console"}>
        <div className="card p-6">
          <h1 className="mb-1 font-serif text-xl font-semibold text-ink">{maintainer ? "Platform maintainer login" : "Institution login"}</h1>
          <p className="mb-5 text-sm text-ink-muted">
            {maintainer
              ? "Monitor the blockchain, platform health and registered institutions."
              : "Sign in to issue and manage your institution's academic credentials."}
          </p>

          {error && (
            <div className="mb-4 rounded-sm border border-danger-line bg-danger-light px-3 py-2 text-sm text-danger">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label" htmlFor="email">
                Email
              </label>
              <input id="email" type="email" required autoComplete="username" className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
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

          {!maintainer && (
            <p className="mt-4 text-sm text-ink-light">
              New institution?{" "}
              <Link to="/register-institution" className="font-medium text-seal hover:underline">
                Register to become an issuer
              </Link>
            </p>
          )}

          <div className="mt-4 space-y-1 border-t border-rule pt-3 text-xs text-ink-muted">
            <div>
              Demo institution: <span className="font-mono">registrar@demo-university.edu</span> / <span className="font-mono">Institution@123</span>
            </div>
            <div>
              Demo maintainer: <span className="font-mono">admin@credential-chain.dev</span> / <span className="font-mono">Admin@123</span>
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-ink-muted">
          {maintainer ? (
            <Link to="/login" className="hover:text-ink">
              Institution login
            </Link>
          ) : (
            <Link to="/maintainer/login" className="hover:text-ink">
              Platform maintainer? Sign in here
            </Link>
          )}
        </p>
    </AuthShell>
  );
}
