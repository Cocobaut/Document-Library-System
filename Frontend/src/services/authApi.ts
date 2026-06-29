/**
 * Authentication API Service
 *
 * Handles user authentication, JWT token management, and session restoration.
 * Provides login, token decoding, and user record construction utilities.
 */
import { Role, UserRecord } from "../types";

/** Base URL prefix for all API endpoints, proxied to the backend server. */
export const API_BASE = import.meta.env.PROD && import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/api` 
    : "/api";

/**
 * Maps backend role strings (uppercase) to frontend Role type values.
 * The backend uses "USER", "UNIT_MANAGER", "ADMIN" while the frontend
 * uses lowercase "user", "manager", "admin".
 */
export const ROLE_MAP: Record<string, Role> = {
    USER: "user",
    UNIT_MANAGER: "manager",
    ADMIN: "admin",
};

/**
 * Decodes a JWT token's payload without verifying the signature.
 * Extracts user identity fields from the Base64-encoded middle segment.
 *
 * @param token - Raw JWT string (header.payload.signature)
 * @returns Decoded payload object, or null if the token is malformed
 */
export function decodeJwtPayload(token: string): { sub: string; username: string; role: string; unit_name?: string } | null {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;
        // Replace URL-safe Base64 characters before decoding
        const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
        return payload;
    } catch {
        return null;
    }
}

/**
 * Authenticates a user against the backend login endpoint.
 *
 * @param username - The user's login username
 * @param password - The user's password
 * @returns Promise containing the access token and token type
 * @throws Error with the server's detail message on authentication failure
 */
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

/**
 * Changes the user's password.
 * 
 * @param old_password - The current password
 * @param new_password - The new password
 * @param token - The user's JWT access token
 * @returns Promise containing a success message
 */
export async function changePasswordApi(old_password: string, new_password: string, token: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: "PUT",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ old_password, new_password }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? "Đổi mật khẩu thất bại. Vui lòng thử lại.");
    }
    return res.json();
}

/**
 * Restores authentication state from localStorage on application load.
 * Validates the stored JWT token, checks expiration, and extracts user info.
 *
 * @returns Stored auth data if a valid, non-expired token exists; null otherwise.
 *          Automatically removes expired tokens from localStorage.
 */
export function getStoredAuth(): { token: string; role: Role; username: string; userId: string; unitName: string } | null {
    try {
        const token = localStorage.getItem("access_token");
        if (!token) return null;
        const payload = decodeJwtPayload(token);
        if (!payload) return null;
        const role = ROLE_MAP[payload.role?.toUpperCase()] ?? null;
        if (!role) return null;
        // Decode full payload again to access the expiration claim (exp)
        const fullPayload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        // JWT exp is in seconds; compare against current time in milliseconds
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

/**
 * Constructs a frontend UserRecord from authentication data.
 * Generates avatar initials from the username (e.g., "alex.chen" → "AC").
 *
 * @param auth - Authentication fields extracted from the JWT token
 * @returns A UserRecord with sensible defaults for fields not available in the token
 */
export function buildUserFromAuth(auth: { username: string; role: Role; userId: string; unitName?: string }): UserRecord {
    // Split username by "." and take the first character of each segment for initials
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
