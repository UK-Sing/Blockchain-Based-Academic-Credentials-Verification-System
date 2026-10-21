import { Navigate } from "react-router-dom";
import { homeFor, useAuth } from "../context/AuthContext";
import { useStudentAuth } from "../context/StudentAuthContext";
import { StaffRole } from "../types";

function Loading() {
  return <div className="flex min-h-screen items-center justify-center text-sm text-ink-muted">Loading...</div>;
}

/** Staff route for one role. A signed-in user of the other role is sent to their own console. */
export function StaffRoute({ role, children }: { role: StaffRole; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={homeFor(user)} replace />;
  return <>{children}</>;
}

export function StudentRoute({ children }: { children: React.ReactNode }) {
  const { student, loading } = useStudentAuth();
  if (loading) return <Loading />;
  return student ? <>{children}</> : <Navigate to="/student/login" replace />;
}
