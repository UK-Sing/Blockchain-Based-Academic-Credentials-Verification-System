import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { StaffUser } from "../types";
import { authApi, RegisterInstitutionPayload } from "../services/credentials";
import { ADMIN_PROFILE_KEY, ADMIN_TOKEN_KEY } from "../services/api";

interface AuthContextValue {
  user: StaffUser | null;
  loading: boolean;
  /** True only for an ACTIVE institution: the backend rejects issue/revoke/register otherwise. */
  canIssue: boolean;
  login: (email: string, password: string) => Promise<StaffUser>;
  registerInstitution: (payload: RegisterInstitutionPayload) => Promise<StaffUser>;
  refresh: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Where each staff role lands after signing in. */
export function homeFor(user: StaffUser) {
  return user.role === "ADMIN" ? "/maintainer/overview" : "/institution/dashboard";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);

  function store(token: string, profile: StaffUser) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(profile));
    setUser(profile);
  }

  async function refresh() {
    const { data } = await authApi.me();
    localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(data));
    setUser(data);
  }

  useEffect(() => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    const stored = localStorage.getItem(ADMIN_PROFILE_KEY);
    if (!token || !stored) {
      setLoading(false);
      return;
    }
    try {
      const parsed = JSON.parse(stored) as StaffUser;
      // Profiles saved before roles existed have no role; force a fresh sign-in for those.
      if (parsed.role) setUser(parsed);
    } catch {
      /* ignore corrupt cache */
    }
    setLoading(false);
    // Institution status can change (approved/suspended) while the token is still valid.
    refresh().catch(() => undefined);
  }, []);

  async function login(email: string, password: string) {
    const { data } = await authApi.login(email, password);
    store(data.accessToken, data.user);
    return data.user;
  }

  async function registerInstitution(payload: RegisterInstitutionPayload) {
    const { data } = await authApi.registerInstitution(payload);
    store(data.accessToken, data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_PROFILE_KEY);
    setUser(null);
  }

  const canIssue = user?.role === "INSTITUTION" && user.status === "ACTIVE";

  return (
    <AuthContext.Provider value={{ user, loading, canIssue, login, registerInstitution, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
