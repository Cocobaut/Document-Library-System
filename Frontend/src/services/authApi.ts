import { Role, UserRecord } from "../types";

export const API_BASE = "/api";

export const ROLE_MAP: Record<string, Role> = {
  USER: "user",
  UNIT_MANAGER: "manager",
  ADMIN: "admin",
};

export function decodeJwtPayload(token: string): { sub: string; username: string; role: string; unit_name?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload;
  } catch {
    return null;
  }
}

export async function loginApi(username: string, password: string): Promise<{ access_token: string; token_type: string }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? "Đăng nhập thất bại. Vui lòng thử lại.");
  }
  return res.json();
}

export function getStoredAuth(): { token: string; role: Role; username: string; userId: string; unitName: string } | null {
  try {
    const token = localStorage.getItem("access_token");
    if (!token) return null;
    const payload = decodeJwtPayload(token);
    if (!payload) return null;
    const role = ROLE_MAP[payload.role?.toUpperCase()] ?? null;
    if (!role) return null;
    // Check expiration
    const fullPayload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (fullPayload.exp && fullPayload.exp * 1000 < Date.now()) {
      localStorage.removeItem("access_token");
      return null;
    }
    return { token, role, username: payload.username, userId: payload.sub, unitName: payload.unit_name || "" };
  } catch {
    localStorage.removeItem("access_token");
    return null;
  }
}

export function buildUserFromAuth(auth: { username: string; role: Role; userId: string; unitName?: string }): UserRecord {
  const initials = auth.username.split(".").map(p => p[0]?.toUpperCase() ?? "").join("").slice(0, 2) || "U";
  return {
    id: auth.userId,
    name: auth.username,
    email: "",
    role: auth.role,
    unit: auth.unitName || "",
    status: "active",
    storageUsed: 0,
    storageQuota: 0,
    lastLogin: new Date().toISOString().slice(0, 16).replace("T", " "),
    avatar: initials,
    joined: "",
  };
}
