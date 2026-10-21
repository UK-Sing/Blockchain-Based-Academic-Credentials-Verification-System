import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import RegisterInstitution from "./pages/RegisterInstitution";
import InstitutionDashboard from "./pages/InstitutionDashboard";
import CredentialsList from "./pages/CredentialsList";
import IssueCredential from "./pages/IssueCredential";
import CredentialDetail from "./pages/CredentialDetail";
import Students from "./pages/Students";
import Analytics from "./pages/Analytics";
import MaintainerOverview from "./pages/MaintainerOverview";
import MaintainerInstitutions from "./pages/MaintainerInstitutions";
import StudentCredential from "./pages/StudentCredential";
import StudentLogin from "./pages/StudentLogin";
import StudentPortal from "./pages/StudentPortal";
import NotFound from "./pages/NotFound";
import { StaffRoute, StudentRoute } from "./components/ProtectedRoute";
import { StaffRole } from "./types";

function staff(role: StaffRole, page: JSX.Element) {
  return <StaffRoute role={role}>{page}</StaffRoute>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      {/* One sign-in for institutions and maintainers; the account's role decides the console. */}
      <Route path="/login" element={<Login />} />
      <Route path="/maintainer/login" element={<Login maintainer />} />
      <Route path="/register-institution" element={<RegisterInstitution />} />

      {/* Issuing institution console */}
      <Route path="/institution/dashboard" element={staff("INSTITUTION", <InstitutionDashboard />)} />
      <Route path="/institution/credentials" element={staff("INSTITUTION", <CredentialsList />)} />
      <Route path="/institution/credentials/issue" element={staff("INSTITUTION", <IssueCredential />)} />
      <Route path="/institution/credentials/:credentialId" element={staff("INSTITUTION", <CredentialDetail />)} />
      {/* Revocation happens inline on the detail page; this route lands on the same view. */}
      <Route path="/institution/credentials/:credentialId/revoke" element={staff("INSTITUTION", <CredentialDetail />)} />
      <Route path="/institution/students" element={staff("INSTITUTION", <Students />)} />
      <Route path="/institution/analytics" element={staff("INSTITUTION", <Analytics scope="institution" />)} />

      {/* Platform maintainer console: observe + moderate institutions, never touch credentials */}
      <Route path="/maintainer/overview" element={staff("ADMIN", <MaintainerOverview />)} />
      <Route path="/maintainer/institutions" element={staff("ADMIN", <MaintainerInstitutions />)} />
      <Route path="/maintainer/analytics" element={staff("ADMIN", <Analytics scope="platform" />)} />

      {/* Old admin bookmarks: /login forwards a signed-in user to their own console. */}
      <Route path="/admin/*" element={<Navigate to="/login" replace />} />

      <Route path="/student/login" element={<StudentLogin />} />
      <Route path="/student" element={<StudentRoute><StudentPortal /></StudentRoute>} />

      {/* Verification lives on the home page. /verify/:id is the URL in certificate QR codes. */}
      <Route path="/verify" element={<Navigate to="/" replace />} />
      <Route path="/verify/:credentialId" element={<Home />} />
      <Route path="/credential/:credentialId" element={<StudentCredential />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
