import { Link } from "react-router-dom";
import { PublicShell } from "../components/Layout";

export default function NotFound() {
  return (
    <PublicShell>
      <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="font-serif text-6xl font-semibold text-ink">404</div>
        <p className="mt-2 text-sm text-ink-muted">This page does not exist.</p>
        <Link to="/" className="btn-primary mt-6">
          Back to home
        </Link>
      </div>
    </PublicShell>
  );
}
