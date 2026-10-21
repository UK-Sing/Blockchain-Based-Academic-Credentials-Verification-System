import { api } from "./api";
import {
  Analytics,
  Credential,
  InstitutionStatus,
  InstitutionSummary,
  PlatformOverview,
  StaffUser,
  Stats,
  Student,
  TrustLevel,
  VerificationResult,
} from "../types";

export interface RegisterInstitutionPayload {
  name: string;
  email: string;
  password: string;
  contactName: string;
  phone?: string;
  website?: string;
  registrationNumber?: string;
  address?: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ accessToken: string; user: StaffUser }>("/auth/login", { email, password }),
  registerInstitution: (payload: RegisterInstitutionPayload) =>
    api.post<{ accessToken: string; user: StaffUser }>("/auth/register-institution", payload),
  me: () => api.get<StaffUser>("/auth/me"),
};

/** Platform maintainer endpoints: observation and institution moderation only. */
export const adminApi = {
  overview: () => api.get<PlatformOverview>("/admin/overview"),
  analytics: () => api.get<Analytics>("/admin/analytics"),
  institutions: (params: { status?: InstitutionStatus; search?: string }) =>
    api.get<InstitutionSummary[]>("/admin/institutions", { params }),
  updateStatus: (id: string, status: Exclude<InstitutionStatus, "PENDING">, reason?: string) =>
    api.patch(`/admin/institutions/${id}/status`, { status, reason }),
  updateTrust: (id: string, trustLevel: TrustLevel) => api.patch(`/admin/institutions/${id}/trust`, { trustLevel }),
};

export interface IssueCredentialPayload {
  studentName: string;
  studentId: string;
  degree: string;
  course: string;
  department: string;
  graduationYear: number;
  issueDate: string;
  grade: string;
}

export const credentialsApi = {
  issue: (payload: IssueCredentialPayload) => api.post<Credential>("/credentials", payload),

  list: (params: { search?: string; status?: string; page?: number; pageSize?: number }) =>
    api.get<{ items: Credential[]; total: number; page: number; pageSize: number; totalPages: number }>(
      "/credentials",
      { params }
    ),

  stats: () => api.get<Stats>("/credentials/stats"),

  analytics: () => api.get<Analytics>("/credentials/analytics"),

  getOne: (credentialId: string) => api.get<Credential>(`/credentials/${credentialId}`),

  getPublic: (credentialId: string) => api.get<Credential>(`/credentials/${credentialId}/public`),

  verify: (credentialId: string) => api.get<VerificationResult>(`/credentials/${credentialId}/verify`),

  revoke: (credentialId: string, reason: string) =>
    api.post<Credential>(`/credentials/${credentialId}/revoke`, { reason }),

  retryAnchor: (credentialId: string) => api.post<Credential>(`/credentials/${credentialId}/retry-anchor`),
};

export interface RegisterStudentPayload {
  studentId: string;
  name: string;
  email: string;
  phone?: string;
  department: string;
  batchYear: number;
  password: string;
}

export const studentsApi = {
  register: (payload: RegisterStudentPayload) => api.post<Student>("/students", payload),

  list: (params: { search?: string; page?: number; pageSize?: number }) =>
    api.get<{ items: Student[]; total: number; page: number; pageSize: number; totalPages: number }>("/students", {
      params,
    }),

  getOne: (studentId: string) => api.get<Student>(`/students/${encodeURIComponent(studentId)}`),

  login: (studentId: string, password: string) =>
    api.post<{ accessToken: string; student: Student }>("/students/login", { studentId, password }),

  me: () => api.get<Student>("/students/me"),

  myCredentials: () => api.get<Credential[]>("/students/me/credentials"),
};
