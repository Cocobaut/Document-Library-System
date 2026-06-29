/**
 * Document API Service
 *
 * Provides all API wrappers for document management, unit administration,
 * user management, analytics, bookmarks, and file uploads.
 * Each function handles authentication headers, error parsing, and response typing.
 */
import { Role, DocSection, Doc, FileType, ApiDoc, UnitStorageStats, UserResponse, UnitStatResponse, UnitDetailResponse, ApiUserResponse, UnitQuotaResponse, TotalQuotaSystemResponse, AnalyticsOverviewResponse, CompanyDocumentStatsResponse, DocListResponse } from "../types";
import { API_BASE } from "./authApi";
import { fmtSize } from "../utils";

/** Shape of a single document as returned by the backend API. */
export interface ApiDoc {
    document_id: string;
    title: string;
    owner_id: string;
    unit_id: string;
    file_type: string;
    file_size: number;
    is_public: boolean;
    created_at: string;
    file_path?: string;
    folder_id?: string | null;
    bookmarked?: boolean;
    is_bookmarked?: boolean;
    folder_name?: string | null;
}

/** Paginated document list response with items grouped by ownership section. */
export interface DocListResponse {
    items: { personal: ApiDoc[]; shared: ApiDoc[]; unit_inherited: ApiDoc[] };
    totals: { personal: number; shared: number; unit_inherited: number };
    page: number;
    page_size: number;
    total_pages: number;
}

/** Storage statistics for a single organizational unit. */
export interface UnitStorageStats {
    unit_id: string;
    unit_name: string;
    quota_bytes: number;
    used_bytes: number;
    free_bytes: number;
    usage_percent: number;
    total_documents: number;
    total_users: number;
    inherited_documents: number;
}

/** Minimal user information returned by management endpoints. */
export interface UserResponse {
    id: string;
    username: string;
    full_name: string;
    role: string;
    unit_id: string | null;
    quota_bytes: number;
    used_bytes: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

/** Summary statistics for a unit (used in unit listings). */
export interface UnitStatResponse {
    unit_id: string;
    name: string;
    parent_id: string | null;
    path: string;
    user_count: number;
    document_count: number;
}

/**
 * Builds the Authorization header object from the stored JWT token.
 *
 * @returns Object with Bearer token header, or empty object if no token exists
 */
export function authHeaders(): Record<string, string> {
    const token = localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Fetches summary statistics for all organizational units (admin endpoint).
 *
 * @returns Promise containing an array of unit stat summaries
 * @throws Error if the request fails
 */
export async function fetchUnitsStatsApi(): Promise<UnitStatResponse[]> {
    const res = await fetch(`${API_BASE}/admin/units/stats`, {
        headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load unit stats");
    return res.json();
}

/**
 * Fetches a flat list of all units (id + name) available to the current user.
 * Used for populating unit selection dropdowns.
 *
 * @returns Promise containing an array of unit id/name pairs
 * @throws Error if the request fails
 */
export async function fetchAllUnitsApi(): Promise<{unit_id: string, name: string}[]> {
    const res = await fetch(`${API_BASE}/documents/units`, {
        headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load units");
    return res.json();
}

/** A single member's details within a unit detail response. */
export interface UnitDetailMember {
    full_name: string;
    role: string;
    used_quota: number;
    total_quota: number;
    status: string;
}

/** Detailed information about a specific unit, including its member list. */
export interface UnitDetailResponse {
    unit_id: string;
    unit_name: string;
    total_members: number;
    total_documents: number;
    used_quota: number;
    total_quota: number;
    members: UnitDetailMember[];
}

/**
 * Fetches detailed information for a specific unit, including member list and quotas.
 *
 * @param unitId - The unique identifier of the unit to retrieve
 * @returns Promise containing the full unit detail
 * @throws Error if the request fails
 */
export async function fetchUnitDetailApi(unitId: string): Promise<UnitDetailResponse> {
    const res = await fetch(`${API_BASE}/admin/units/${unitId}`, {
        headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load unit details");
    return res.json();
}

/**
 * Creates a new organizational unit.
 *
 * @param payload - Unit creation data (name, optional parent_id, optional quota in bytes)
 * @returns Promise containing the created unit data
 * @throws Error with the server's detail message on failure
 */
export async function createUnitApi(payload: { name: string; parent_id?: string | null; quota_bytes?: number }): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/units`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? "Failed to create unit");
    }
    return res.json();
}

/**
 * Updates an existing organizational unit's properties.
 *
 * @param unitId - The unique identifier of the unit to update
 * @param payload - Fields to update (name, quota_bytes, manager_user_id)
 * @returns Promise containing the updated unit data
 * @throws Error with the server's detail message on failure
 */
export async function updateUnitApi(unitId: string, payload: { name?: string; quota_bytes?: number; manager_user_id?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/units/${unitId}`, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? "Failed to update unit");
    }
    return res.json();
}

/**
 * Permanently deletes an organizational unit.
 *
 * @param unitId - The unique identifier of the unit to delete
 * @throws Error with the server's detail message on failure
 */
export async function deleteUnitApi(unitId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/units/${unitId}`, {
        method: "DELETE",
        headers: authHeaders(),
    });
    if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? "Failed to delete unit");
    }
}

/** Full user record returned by admin user management endpoints. */
export interface ApiUserResponse {
    id: string;
    username: string;
    full_name: string;
    role: Role;
    unit_id: string | null;
    quota_bytes: number;
    used_bytes: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

/** Quota allocation for a single unit. */
export interface UnitQuotaResponse {
    unit_id: string;
    name: string;
    quota_bytes: number;
}

/** System-wide total quota aggregation. */
export interface TotalQuotaSystemResponse {
    total_quota_bytes: number;
    total_units: number;
}

/** High-level analytics overview counters. */
export interface AnalyticsOverviewResponse {
    total_units: number;
    total_users: number;
    total_documents: number;
    quota_used_bytes: number;
}

/**
 * Fetches the system-wide analytics overview (total units, users, documents, storage).
 *
 * @returns Promise containing the analytics overview counters
 * @throws Error if the request fails
 */
export async function fetchAnalyticsOverviewApi(): Promise<AnalyticsOverviewResponse> {
    const res = await fetch(`${API_BASE}/admin/analytics/overview`, {
        headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load analytics overview");
    return res.json();
}

/** Document count for a single unit, used in analytics charts. */
export interface UnitDocumentStat {
    unit_id: string;
    unit_name: string;
    total_documents: number;
}

/** Company-wide document statistics grouped by unit. */
export interface CompanyDocumentStatsResponse {
    company_total_documents: number;
    details_by_unit: UnitDocumentStat[];
}

/**
 * Fetches all user accounts for admin management.
 *
 * @returns Promise containing an array of all user records
 * @throws Error if the request fails
 */
export async function fetchUsersApi(): Promise<ApiUserResponse[]> {
    const res = await fetch(`${API_BASE}/admin/users`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to load users");
    return res.json();
}

/**
 * Creates a new user account via the admin API.
 *
 * @param payload - User creation data (username, password, full_name, role, unit_id, quota_bytes)
 * @returns Promise containing the created user record
 * @throws Error with the server's detail message on failure
 */
export async function createUserApi(payload: any): Promise<ApiUserResponse> {
    const res = await fetch(`${API_BASE}/admin/users`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? "Failed to create user");
    }
    return res.json();
}

/**
 * Fetches the total system-wide storage quota allocation.
 *
 * @returns Promise containing total quota bytes and unit count
 * @throws Error if the request fails
 */
export async function fetchSystemQuotaApi(): Promise<TotalQuotaSystemResponse> {
    const res = await fetch(`${API_BASE}/admin/quota/system`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to load system quota");
    return res.json();
}

/**
 * Fetches company-wide document statistics grouped by department.
 *
 * @returns Promise containing total document count and per-unit breakdown
 * @throws Error if the request fails
 */
export async function fetchDocumentStatsApi(): Promise<CompanyDocumentStatsResponse> {
    const res = await fetch(`${API_BASE}/admin/documents/statistics`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to load document stats");
    return res.json();
}

/**
 * Fetches quota allocation for all units (used in analytics pie chart).
 *
 * @returns Promise containing an array of unit quota records
 * @throws Error if the request fails
 */
export async function fetchUnitsQuotaApi(): Promise<UnitQuotaResponse[]> {
    const res = await fetch(`${API_BASE}/admin/quota/units`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to load units quota");
    return res.json();
}

/**
 * Fetches storage statistics for the current unit manager's department.
 *
 * @returns Promise containing the manager's unit storage stats
 * @throws Error if the request fails
 */
export async function fetchManagerStatsApi(): Promise<UnitStorageStats> {
    const res = await fetch(`${API_BASE}/manager/storage/stats`, {
        headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load unit stats");
    return res.json();
}

/**
 * Fetches all users belonging to the current manager's unit.
 *
 * @returns Promise containing an array of users in the manager's department
 * @throws Error if the request fails
 */
export async function fetchManagerUsersApi(): Promise<UserResponse[]> {
    const res = await fetch(`${API_BASE}/manager/users`, {
        headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load unit users");
    return res.json();
}

/**
 * Fetches the current user's documents, paginated and grouped by section
 * (personal, shared, unit_inherited).
 *
 * @param page - Current page number (1-indexed, defaults to 1)
 * @param pageSize - Number of documents per page (defaults to 100)
 * @returns Promise containing paginated document list with section grouping
 * @throws Error with the server's detail message on failure
 */
export async function fetchDocumentsApi(page = 1, pageSize = 100): Promise<DocListResponse> {
    const res = await fetch(`${API_BASE}/documents/?page=${page}&page_size=${pageSize}`, {
        headers: authHeaders(),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? "Failed to load documents");
    }
    return res.json();
}

/**
 * Uploads a single file document to the server.
 *
 * @param file - The File object to upload
 * @param title - Optional custom title for the document (defaults to filename)
 * @returns Promise containing the created document record
 * @throws Error with the server's detail message on failure
 */
export async function uploadDocumentApi(file: File, title?: string): Promise<ApiDoc> {
    const fd = new FormData();
    fd.append("file", file);
    if (title) fd.append("title", title);
    const res = await fetch(`${API_BASE}/documents/upload`, {
        method: "POST",
        headers: authHeaders(),
        body: fd,
    });
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? "Upload failed");
    }
    return res.json();
}

/**
 * Downloads a document from the server.
 *
 * @param documentId - The ID of the document to download
 * @param filename - The filename to save the downloaded file as
 * @throws Error if the download fails
 */
export async function downloadDocumentApi(documentId: string, filename: string): Promise<void> {
    const res = await fetch(`${API_BASE}/documents/${documentId}/download`, {
        headers: authHeaders(),
    });
    
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? "Download failed");
    }
    
    // Create a blob URL and trigger the download
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

/**
 * Deletes a document from the server. (Manager only)
 *
 * @param documentId - The ID of the document to delete
 * @throws Error if the deletion fails
 */
export async function deleteDocumentApi(documentId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/manager/documents/${documentId}`, {
        method: "DELETE",
        headers: authHeaders(),
    });
    
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? "Failed to delete document");
    }
}

/**
 * Uploads multiple files as a folder batch to the server.
 *
 * @param files - Array of File objects to upload together
 * @param folderName - The extracted name of the folder being uploaded
 * @returns Promise containing an array of created document records
 * @throws Error with the server's detail message on failure
 */
export async function uploadFolderApi(files: File[], folderName: string): Promise<ApiDoc[]> {
    const fd = new FormData();
    fd.append("folder_name", folderName);
    files.forEach(f => fd.append("files", f, f.name));
    const res = await fetch(`${API_BASE}/documents/upload-folder`, {
        method: "POST",
        headers: authHeaders(),
        body: fd,
    });
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? "Folder upload failed");
    }
    return res.json();
}

/**
 * Shares a document with another user within a specified unit.
 *
 * @param documentId - The document to share
 * @param username - The target user's username
 * @param unitId - The unit context for the share
 * @param permission - Access level to grant (defaults to "view")
 * @returns Promise containing the share confirmation
 * @throws Error with the server's detail message on failure
 */
export async function shareDocumentApi(documentId: string, username: string, unitId: string, permission: string = "view"): Promise<any> {
    const res = await fetch(`${API_BASE}/documents/${documentId}/share`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ username, unit_id: unitId, permission }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? "Failed to share document");
    }
    return res.json();
}

/**
 * Fetches the list of document IDs bookmarked by the current user.
 *
 * @returns Promise containing an array of bookmarked document IDs.
 *          Returns empty array on failure (graceful degradation).
 */
export async function fetchBookmarksApi(): Promise<string[]> {
    const res = await fetch(`${API_BASE}/bookmark/`, {
        headers: authHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
}

/**
 * Adds a bookmark for a specific document.
 *
 * @param documentId - The document to bookmark
 * @returns Promise containing the bookmark confirmation
 * @throws Error with the server's detail message on failure
 */
export async function markBookmarkApi(documentId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/bookmark/${documentId}`, {
        method: "POST",
        headers: authHeaders(),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? "Failed to add bookmark");
    }
    return res.json().catch(() => null);
}



/**
 * Updates an existing user's information.
 */
export async function updateUserApi(userId: string, payload: any): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to update user");
    }
    return res.json();
}

/**
 * Deletes a user by ID.
 */
export async function deleteUserApi(userId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: "DELETE",
        headers: authHeaders()
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to delete user");
    }
}

/**
 * Removes a bookmark for a specific document.
 *
 * @param documentId - The document to un-bookmark
 * @returns Promise containing the removal confirmation, or null for 204 responses
 * @throws Error with the server's detail message on failure
 */
export async function removeBookmarkApi(documentId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/bookmark/${documentId}`, {
        method: "DELETE",
        headers: authHeaders(),
    });
    if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? "Failed to remove bookmark");
    }
    if (res.status !== 204) return res.json().catch(() => null);
    return null;
}

/**
 * Converts a backend API document object into the frontend Doc model.
 * Maps field names, formats file size, and normalizes boolean/date values.
 *
 * @param d - Raw document object from the API response
 * @param section - The ownership section this document belongs to (mine/shared/inherited)
 * @returns A frontend-compatible Doc object
 */
export function apiDocToDoc(d: ApiDoc, section: DocSection): Doc {
    return {
        id: d.document_id,
        name: d.title || "Untitled",
        // Normalize file type: strip leading dot and lowercase (e.g., ".PDF" → "pdf")
        type: (d.file_type?.toLowerCase().replace(".", "") || "txt") as FileType,
        size: fmtSize(d.file_size || 0),
        owner: d.owner_id,
        ownerId: d.owner_id,
        uploadDate: d.created_at ? new Date(d.created_at).toISOString().slice(0, 10) : "",
        isPublic: d.is_public ?? false,
        section,
        // Support both "bookmarked" and "is_bookmarked" fields from different API versions
        bookmarked: d.bookmarked ?? d.is_bookmarked ?? false,
        status: "active",
        unitId: d.unit_id,
        folderName: d.folder_name ?? undefined,
    };
}
