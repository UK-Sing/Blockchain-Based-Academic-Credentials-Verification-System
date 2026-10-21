import { canonicalizeCredential } from "./credential-hash.util";

describe("canonicalizeCredential", () => {
  const base = {
    credentialId: "CRED-2026-000001",
    studentName: "Rahul Sharma",
    studentId: "STU2026001",
    universityName: "Demo University",
    degree: "BCA",
    course: "Computer Applications",
    department: "Computer Science",
    graduationYear: 2026,
    issueDate: "2026-06-15T00:00:00.000Z",
    grade: "8.7 CGPA",
  };

  it("produces the same canonical string for identical input", () => {
    expect(canonicalizeCredential(base)).toEqual(canonicalizeCredential({ ...base }));
  });

  it("produces a different string when any field changes", () => {
    const tampered = { ...base, grade: "9.9 CGPA" };
    expect(canonicalizeCredential(base)).not.toEqual(canonicalizeCredential(tampered));
  });

  it("is independent of object key insertion order", () => {
    const reordered = {
      grade: base.grade,
      issueDate: base.issueDate,
      credentialId: base.credentialId,
      studentName: base.studentName,
      studentId: base.studentId,
      universityName: base.universityName,
      degree: base.degree,
      course: base.course,
      department: base.department,
      graduationYear: base.graduationYear,
    };
    expect(canonicalizeCredential(base)).toEqual(canonicalizeCredential(reordered));
  });
});
