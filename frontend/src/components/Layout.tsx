import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileStack,
  PlusCircle,
  LogOut,
  Users,
  ArrowLeft,
  BarChart3,
  GraduationCap,
  Building2,
  Activity,
  Clock,
  Ban,
  XCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { TrustBadge } from "./InstitutionBadges";
import { Brand } from "./Brand";
import { Footer } from "./Footer";

export function PublicNavbar() {
  return (
    <header className="border-b border-rule bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <Brand />
        <nav className="flex items-center gap-2">
          <Link to="/student/login" className="btn-secondary text-sm">
            <GraduationCap size={16} /> <span className="hidden sm:inline">Student login</span><span className="sm:hidden">Student</span>
          </Link>
          <Link to="/login" className="btn-primary text-sm">
            <Building2 size={16} /> <span className="hidden sm:inline">Institution login</span><span className="sm:hidden">Institution</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

/** Public page frame: branded header, content, full footer pinned to the bottom. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <PublicNavbar />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}

/** Shown above every sign-in / registration form so users can always get back to the home page. */
export function BackToHome() {
  return (
    <Link to="/" className="btn-secondary py-1.5 text-sm">
      <ArrowLeft size={15} /> Back to home
    </Link>
  );
}

/** Frame for sign-in and registration pages: back button, branding, centred form, footer. */
export function AuthShell({ area, width = "max-w-sm", children }: { area: string; width?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className={`w-full ${width}`}>
          <div className="mb-6 flex items-center justify-between gap-4">
            <Brand sub={area} />
            <BackToHome />
          </div>
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean };

function navClass({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? "bg-seal text-white" : "text-ink-line hover:bg-ink-light hover:text-white"
  }`;
}

function ConsoleLayout({
  area,
  links,
  banner,
  footerExtra,
  children,
}: {
  area: string;
  links: NavItem[];
  banner?: React.ReactNode;
  footerExtra?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-paper md:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-ink md:flex">
        <div className="border-b border-ink-light px-5 py-5">
          <Brand inverted sub={area} />
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={navClass}>
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-ink-light p-4">
          <div className="mb-3 space-y-1 text-xs text-ink-line">
            <div className="uppercase tracking-wider">Signed in as</div>
            <div className="truncate text-sm font-medium text-white">{user?.name}</div>
            <div className="truncate">{user?.email}</div>
            {footerExtra}
          </div>
          <button onClick={handleLogout} className="btn-secondary w-full text-sm">
            <LogOut size={15} /> Log out
          </button>
        </div>
      </aside>

      {/* Mobile top bar (the sidebar is desktop-only) */}
      <div className="bg-ink md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Brand inverted sub={area} />
          <button onClick={handleLogout} className="btn-secondary py-1.5 text-xs">
            <LogOut size={14} /> Log out
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={(s) => `${navClass(s)} shrink-0 whitespace-nowrap`}>
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <main className="flex min-w-0 flex-1 flex-col px-6 py-6 md:px-10 md:py-8">
        <div className="flex-1">
          {banner}
          {children}
        </div>
        <Footer compact />
      </main>
    </div>
  );
}

const institutionLinks: NavItem[] = [
  { to: "/institution/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/institution/credentials", label: "Credentials", icon: FileStack, end: true },
  { to: "/institution/credentials/issue", label: "Issue credential", icon: PlusCircle },
  { to: "/institution/students", label: "Students", icon: Users },
  { to: "/institution/analytics", label: "Analytics", icon: BarChart3 },
];

function InstitutionStatusBanner() {
  const { user } = useAuth();
  if (!user || user.status === "ACTIVE" || !user.status) return null;

  const content = {
    PENDING: {
      cls: "border-amber-line bg-amber-light text-amber",
      icon: <Clock size={18} className="mt-0.5 shrink-0" />,
      title: "Awaiting approval",
      body: "Your institution is being reviewed by the platform maintainers. You can explore the console, but issuing credentials and registering students unlock once you're approved.",
    },
    SUSPENDED: {
      cls: "border-danger-line bg-danger-light text-danger",
      icon: <Ban size={18} className="mt-0.5 shrink-0" />,
      title: "Institution suspended",
      body: "Issuing, revoking and registering students are disabled. Credentials you already issued remain verifiable, and verifiers are shown that your institution is suspended.",
    },
    REJECTED: {
      cls: "border-ink-line bg-ink-faint text-ink-light",
      icon: <XCircle size={18} className="mt-0.5 shrink-0" />,
      title: "Registration rejected",
      body: "The platform maintainers did not approve this institution. Contact them if you believe this is a mistake.",
    },
  }[user.status];

  return (
    <div className={`mb-6 flex items-start gap-3 rounded-sm border px-4 py-3 text-sm ${content.cls}`}>
      {content.icon}
      <div>
        <div className="font-medium">{content.title}</div>
        <div className="mt-0.5">{content.body}</div>
        {user.statusReason && <div className="mt-1 text-xs">Reason given: {user.statusReason}</div>}
      </div>
    </div>
  );
}

export function InstitutionLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <ConsoleLayout
      area="Issuer Console"
      links={institutionLinks}
      banner={<InstitutionStatusBanner />}
      footerExtra={user?.trustLevel && <div className="pt-1"><TrustBadge level={user.trustLevel} /></div>}
    >
      {children}
    </ConsoleLayout>
  );
}

const maintainerLinks: NavItem[] = [
  { to: "/maintainer/overview", label: "Overview", icon: Activity },
  { to: "/maintainer/institutions", label: "Institutions", icon: Building2 },
  { to: "/maintainer/analytics", label: "Analytics", icon: BarChart3 },
];

export function MaintainerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConsoleLayout area="Maintainer Console" links={maintainerLinks}>
      {children}
    </ConsoleLayout>
  );
}
