import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Student } from "../types";
import { studentsApi } from "../services/credentials";
import { STUDENT_PROFILE_KEY, STUDENT_TOKEN_KEY } from "../services/api";

interface StudentAuthContextValue {
  student: Student | null;
  loading: boolean;
  login: (studentId: string, password: string) => Promise<void>;
  logout: () => void;
}

const StudentAuthContext = createContext<StudentAuthContextValue | undefined>(undefined);

export function StudentAuthProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(STUDENT_TOKEN_KEY);
    const stored = localStorage.getItem(STUDENT_PROFILE_KEY);
    if (token && stored) {
      setStudent(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  async function login(studentId: string, password: string) {
    const { data } = await studentsApi.login(studentId, password);
    localStorage.setItem(STUDENT_TOKEN_KEY, data.accessToken);
    localStorage.setItem(STUDENT_PROFILE_KEY, JSON.stringify(data.student));
    setStudent(data.student);
  }

  function logout() {
    localStorage.removeItem(STUDENT_TOKEN_KEY);
    localStorage.removeItem(STUDENT_PROFILE_KEY);
    setStudent(null);
  }

  return (
    <StudentAuthContext.Provider value={{ student, loading, login, logout }}>{children}</StudentAuthContext.Provider>
  );
}

export function useStudentAuth() {
  const ctx = useContext(StudentAuthContext);
  if (!ctx) throw new Error("useStudentAuth must be used within StudentAuthProvider");
  return ctx;
}
