/**
 * Builds the canonical string representation of a credential's off-chain
 * data. The SAME input here always produces the SAME hash (via
 * BlockchainService.computeHash, keccak256). If any field of the credential
 * changes, the resulting hash will no longer match what is stored on-chain,
 * which is exactly the tamper-evidence property the system relies on.
 *
 * Field order is fixed and alphabetical by key so the canonical form never
 * depends on object property insertion order.
 */
export interface CanonicalCredentialInput {
  credentialId: string;
  studentName: string;
  studentId: string;
  universityName: string;
  degree: string;
  course: string;
  department: string;
  graduationYear: number;
  issueDate: string; // ISO string
  grade: string;
}

export function canonicalizeCredential(input: CanonicalCredentialInput): string {
  const record: Record<string, string | number> = {
    course: input.course,
    credentialId: input.credentialId,
    degree: input.degree,
    department: input.department,
    graduationYear: input.graduationYear,
    grade: input.grade,
    issueDate: input.issueDate,
    studentId: input.studentId,
    studentName: input.studentName,
    universityName: input.universityName,
  };

  return Object.keys(record)
    .sort()
    .map((key) => `${key}:${record[key]}`)
    .join("|");
}
