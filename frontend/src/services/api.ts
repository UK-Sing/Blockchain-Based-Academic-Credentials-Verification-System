import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export const ADMIN_TOKEN_KEY = "cc_token";
export const ADMIN_PROFILE_KEY = "cc_admin";
export const STUDENT_TOKEN_KEY = "cc_student_token";
export const STUDENT_PROFILE_KEY = "cc_student";

export const api = axios.create({
  baseURL: API_URL,
});

/** Student-only endpoints authenticate with the student token; everything else uses the admin token. */
function isStudentRequest(url = "") {
  return url.startsWith("/students/me");
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(isStudentRequest(config.url) ? STUDENT_TOKEN_KEY : ADMIN_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error.config?.url ?? "";
    // A 401 from a login endpoint just means wrong credentials, not an expired session.
    if (error.response?.status === 401 && !url.endsWith("/login")) {
      const student = isStudentRequest(url);
      localStorage.removeItem(student ? STUDENT_TOKEN_KEY : ADMIN_TOKEN_KEY);
      localStorage.removeItem(student ? STUDENT_PROFILE_KEY : ADMIN_PROFILE_KEY);
      const loginPath = student ? "/student/login" : "/login";
      if (window.location.pathname !== loginPath) {
        window.location.href = loginPath;
      }
    }
    return Promise.reject(error);
  }
);

/** Pulls a clean, user-facing message out of an API error response. */
export function apiErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
    if (Array.isArray(data?.message)) return data.message.join(" ");
    if (data?.message) return data.message;
    if (err.message === "Network Error") {
      return "Could not reach the server. Is the backend running?";
    }
  }
  return fallback;
}
