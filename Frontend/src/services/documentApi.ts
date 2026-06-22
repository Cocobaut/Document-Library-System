import { Role, DocSection, Doc, FileType, ApiDoc, UnitStorageStats, UserResponse, UnitStatResponse, UnitDetailResponse, ApiUserResponse, UnitQuotaResponse, TotalQuotaSystemResponse, AnalyticsOverviewResponse, CompanyDocumentStatsResponse, DocListResponse } from "../types";
import { API_BASE } from "./authApi";
import { fmtSize } from "../utils";

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
}

export interface DocListResponse {
  items: { personal: ApiDoc[]; shared: ApiDoc[]; unit_inherited: ApiDoc[] };
  totals: { personal: number; shared: number; unit_inherited: number };
  page: number;
  page_size: number;
  total_pages: number;
}

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

export interface UnitStatResponse {
  unit_id: string;
  name: string;
  user_count: number;
  document_count: number;
}

export function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchUnitsStatsApi(): Promise<UnitStatResponse[]> {
  const res = await fetch(`${API_BASE}/admin/units/stats`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load unit stats");
  return res.json();
}

export async function fetchAllUnitsApi(): Promise<{unit_id: string, name: string}[]> {
  const res = await fetch(`${API_BASE}/documents/units`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load units");
  return res.json();
}

export interface UnitDetailMember {
  full_name: string;
  role: string;
  used_quota: number;
  total_quota: number;
  status: string;
}

export interface UnitDetailResponse {
  unit_id: string;
  unit_name: string;
  total_members: number;
  total_documents: number;
  used_quota: number;
  total_quota: number;
  members: UnitDetailMember[];
}

export async function fetchUnitDetailApi(unitId: string): Promise<UnitDetailResponse> {
  const res = await fetch(`${API_BASE}/admin/units/${unitId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load unit details");
  return res.json();
}

export async function createUnitApi(payload: { name: string; parent_id?: number | null; quota_bytes?: number }): Promise<any> {
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

export interface UnitQuotaResponse {
  unit_id: string;
  name: string;
  quota_bytes: number;
}

export interface TotalQuotaSystemResponse {
  total_quota_bytes: number;
  total_units: number;
}

export interface AnalyticsOverviewResponse {
  total_units: number;
  total_users: number;
  total_documents: number;
  quota_used_bytes: number;
}

export async function fetchAnalyticsOverviewApi(): Promise<AnalyticsOverviewResponse> {
  const res = await fetch(`${API_BASE}/admin/analytics/overview`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load analytics overview");
  return res.json();
}

export interface UnitDocumentStat {
  unit_id: string;
  unit_name: string;
  total_documents: number;
}

export interface CompanyDocumentStatsResponse {
  company_total_documents: number;
  details_by_unit: UnitDocumentStat[];
}

export async function fetchUsersApi(): Promise<ApiUserResponse[]> {
  const res = await fetch(`${API_BASE}/admin/users`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load users");
  return res.json();
}

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

export async function fetchSystemQuotaApi(): Promise<TotalQuotaSystemResponse> {
  const res = await fetch(`${API_BASE}/admin/quota/system`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load system quota");
  return res.json();
}

export async function fetchDocumentStatsApi(): Promise<CompanyDocumentStatsResponse> {
  const res = await fetch(`${API_BASE}/admin/documents/statistics`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load document stats");
  return res.json();
}

export async function fetchUnitsQuotaApi(): Promise<UnitQuotaResponse[]> {
  const res = await fetch(`${API_BASE}/admin/quota/units`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load units quota");
  return res.json();
}

export async function fetchManagerStatsApi(): Promise<UnitStorageStats> {
  const res = await fetch(`${API_BASE}/manager/storage/stats`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load unit stats");
  return res.json();
}

export async function fetchManagerUsersApi(): Promise<UserResponse[]> {
  const res = await fetch(`${API_BASE}/manager/users`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load unit users");
  return res.json();
}

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

export async function uploadFolderApi(files: File[]): Promise<ApiDoc[]> {
  const fd = new FormData();
  files.forEach(f => fd.append("files", f));
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

export async function fetchBookmarksApi(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/bookmark/`, {
    headers: authHeaders(),
  });
  if (!res.ok) return [];
  return res.json();
}

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

export function apiDocToDoc(d: ApiDoc, section: DocSection): Doc {
  return {
    id: d.document_id,
    name: d.title || "Untitled",
    type: (d.file_type?.toLowerCase().replace(".", "") || "txt") as FileType,
    size: fmtSize(d.file_size || 0),
    owner: d.owner_id,
    ownerId: d.owner_id,
    uploadDate: d.created_at ? new Date(d.created_at).toISOString().slice(0, 10) : "",
    isPublic: d.is_public ?? false,
    section,
    bookmarked: d.bookmarked ?? d.is_bookmarked ?? false,
    status: "active",
  };
}
