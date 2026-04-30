import { API_BASE_URL } from "@/lib/api";

async function parseJsonResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.details || data?.error || data?.message || "Request failed");
  }
  return data;
}

function buildHeaders(token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export function getDashboardPath(role: string) {
  if (role === "instructor") return "/instructor";
  if (role === "admin") return "/admin";
  return "/student";
}

export async function authLogin(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ email, password }),
  });
  return parseJsonResponse(response);
}

export async function authSignup(name: string, email: string, password: string, role: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ name, email, password, role }),
  });
  return parseJsonResponse(response);
}

export async function authForgotPassword(email: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ email }),
  });
  return parseJsonResponse(response);
}

export async function authResetPassword(email: string, otp: string, newPassword: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ email, token: otp, password: newPassword }),
  });
  return parseJsonResponse(response);
}

export async function authMe(token: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: "GET",
    headers: buildHeaders(token),
  });
  return parseJsonResponse(response);
}
