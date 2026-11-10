import { Problem, Submission, User } from "./types";

const TOKEN_KEY = "oj_auth_token";
const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setStoredToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeStoredToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  const token = getStoredToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    setStoredToken(data.token);
    return data;
  },

  async register(
    email: string,
    password: string,
    name: string
  ): Promise<{ user: User; token: string }> {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    setStoredToken(data.token);
    return data;
  },

  async getMe(): Promise<User | null> {
    const token = getStoredToken();
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: getHeaders(),
      });
      if (!res.ok) {
        removeStoredToken();
        return null;
      }
      const data = await res.json();
      return data.user;
    } catch {
      return null;
    }
  },

  logout(): void {
    removeStoredToken();
  },

  // Problems
  async getProblems(difficulty?: string): Promise<Problem[]> {
    const query = difficulty ? `?difficulty=${difficulty}` : "";
    const res = await fetch(`${API_BASE}/api/problems${query}`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch problems");
    return data.problems;
  },

  async getProblemBySlug(slug: string): Promise<{ problem: Problem; hasHiddenTestCasesOmitted: boolean }> {
    const res = await fetch(`${API_BASE}/api/problems/${slug}`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Problem not found");
    return data;
  },

  // Submissions
  async createSubmission(problemId: string, code: string, language = "cpp"): Promise<Submission> {
    const res = await fetch(`${API_BASE}/api/submissions`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ problemId, code, language }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Submission failed");
    return data.submission;
  },

  async getSubmissionById(id: string): Promise<Submission> {
    const res = await fetch(`${API_BASE}/api/submissions/${id}`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch submission");
    return data.submission;
  },

  async getSubmissions(problemId?: string): Promise<Submission[]> {
    const query = problemId ? `?problemId=${problemId}` : "";
    const res = await fetch(`${API_BASE}/api/submissions${query}`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch submissions");
    return data.submissions;
  },
};

