export type CredentialStatus = "VALID" | "REVOKED";
export type InstitutionStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED";
export type TrustLevel = "UNVERIFIED" | "VERIFIED" | "ACCREDITED";

/** Public facts about a credential's issuer, shown to verifiers. */
export interface Issuer {
  name: string;
  status: InstitutionStatus;
  trustLevel: TrustLevel;
  website?: string | null;
}

export interface Revocation {
  id: string;
  credentialId: string;
  reason: string;
  blockchainTxHash: string | null;
  blockNumber: number | null;
  revokedAt: string;
}

export interface Credential {
  id: string;
  credentialId: string;
  studentName: string;
  studentId: string;
  universityName: string;
  degree: string;
  course: string;
  department: string;
  graduationYear: number;
  issueDate: string;
  grade: string;
  credentialHash: string;
  blockchainTxHash: string | null;
  blockchainCredentialId: string | null;
  blockNumber: number | null;
  contractAddress: string | null;
  network: string | null;
  status: CredentialStatus;
  createdAt: string;
  updatedAt: string;
  revocation?: Revocation | null;
  institution?: Issuer | null;
}

export interface Stats {
  totalCredentials: number;
  validCredentials: number;
  revokedCredentials: number;
  recentCredentials: Credential[];
  network: string;
  blockchainConnected: boolean;
  contractAddress: string;
}

export interface Student {
  id: string;
  studentId: string;
  name: string;
  email: string;
  phone: string | null;
  department: string;
  batchYear: number;
  createdAt: string;
  credentialCount?: number;
}

export interface Bucket {
  label: string;
  count: number;
}

export interface Analytics {
  totalCredentials: number;
  totalStudents: number;
  anchoredCredentials: number;
  pendingAnchor: number;
  byStatus: Bucket[];
  byDegree: Bucket[];
  byDepartment: Bucket[];
  byGraduationYear: Bucket[];
  issuedPerMonth: { month: string; count: number }[];
}

export type StaffRole = "ADMIN" | "INSTITUTION";

/** Signed-in maintainer (ADMIN) or issuing institution. Institution fields are absent for ADMIN. */
export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  status?: InstitutionStatus;
  statusReason?: string | null;
  trustLevel?: TrustLevel;
}

export interface InstitutionSummary {
  id: string;
  name: string;
  email: string;
  contactName: string;
  phone: string | null;
  website: string | null;
  registrationNumber: string | null;
  address: string | null;
  status: InstitutionStatus;
  statusReason: string | null;
  reviewedAt: string | null;
  trustLevel: TrustLevel;
  createdAt: string;
  activity: {
    credentials: number;
    revoked: number;
    pendingAnchor: number;
    students: number;
    lastIssuedAt: string | null;
  };
}

export interface ChainStatus {
  configured: boolean;
  reachable: boolean;
  network: string;
  chainId: number | null;
  latestBlock: number | null;
  contractAddress: string | null;
  contractDeployed: boolean | null;
  contractOwner: string | null;
  walletAddress: string | null;
  walletBalance: string | null;
  walletIsOwner: boolean | null;
  explorerUrl: string | null;
  error: string | null;
}

export interface PlatformOverview {
  health: {
    status: "ok" | "degraded";
    database: boolean;
    blockchain: boolean;
    uptimeSeconds: number;
    startedAt: string;
    nodeVersion: string;
    memoryMb: number;
  };
  chain: ChainStatus;
  stats: {
    institutions: Record<InstitutionStatus, number> & { total: number };
    credentials: { total: number; valid: number; revoked: number; anchored: number; pendingAnchor: number; issuedLast30Days: number };
    students: number;
  };
  recentActivity: {
    credentialId: string;
    institution: string | null;
    status: CredentialStatus;
    anchored: boolean;
    blockchainTxHash: string | null;
    createdAt: string;
  }[];
}

export type VerificationResult =
  | { status: "NOT_FOUND" }
  | {
      status: "REVOKED";
      credentialId: string;
      reason: string;
      revokedAt: string | null;
      blockchainTxHash: string | null;
      issuer: Issuer | null;
    }
  | {
      status: "VALID";
      credential: {
        credentialId: string;
        studentName: string;
        degree: string;
        universityName: string;
        course: string;
        department: string;
        issueDate: string;
        grade: string;
      };
      blockchainTxHash: string | null;
      network: string | null;
      contractAddress: string | null;
      issuer: Issuer | null;
      integrity: {
        hashMatchesDatabase: boolean;
        blockchainReachable: boolean;
        onChainRecordFound: boolean;
        onChainHashMatches: boolean | null;
      };
    };
