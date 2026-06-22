import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard, FileText, Upload, Users, Building2, Settings,
  Bell, Search, Bookmark, Share2, Trash2, Eye, EyeOff, Plus,
  Edit3, UserX, Key, Shield, HardDrive, Download, Filter,
  X, CheckCircle, AlertCircle, Clock, FolderOpen, File as FileIcon,
  LogOut, ChevronRight, BarChart2, Activity, Star,
  Lock, Unlock, UserPlus, ChevronLeft, AlertTriangle, Info,
  MoreHorizontal, RefreshCw, SlidersHorizontal, Check,
  TrendingUp, TrendingDown, Layers, Globe, Paperclip,
  ChevronDown, Grid, List, Home, Inbox, Archive,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "user" | "manager" | "admin";
type DocSection = "mine" | "shared" | "inherited";
type DocStatus = "active" | "draft" | "archived";
type UserStatus = "active" | "inactive" | "suspended";
type FileType = "pdf" | "docx" | "xlsx" | "pptx" | "png" | "txt" | "csv" | "zip";
type Modal =
  | { type: "share"; doc: Doc }
  | { type: "delete-doc"; id: string }
  | { type: "add-unit" }
  | { type: "edit-unit"; unit: Unit }
  | { type: "delete-unit"; id: string }
  | { type: "add-user" }
  | { type: "edit-user"; user: UserRecord }
  | { type: "delete-user"; id: string }
  | { type: "reset-pw"; user: UserRecord }
  | null;

interface Doc {
  id: string; name: string; type: FileType; size: string;
  owner: string; ownerId: string; uploadDate: string;
  isPublic: boolean; section: DocSection;
  bookmarked: boolean; status: DocStatus;
  sharedWith?: string[];
}

interface UserRecord {
  id: string; name: string; email: string; role: Role;
  unit: string; status: UserStatus;
  storageUsed: number; storageQuota: number;
  lastLogin: string; avatar: string; joined: string;
}

interface Unit {
  id: string; name: string; manager: string;
  members: number; documents: number;
  storageUsed: number; storageQuota: number;
  description: string;
}

interface QueueFile {
  id: string; name: string; rawSize: number;
  progress: number; status: "queued" | "uploading" | "done" | "error";
  type: string;
}

// ─── Seed Data (Admin UI only) ────────────────────────────────────────────────

const defaultUser: UserRecord = {
  id: "", name: "", email: "", role: "user",
  unit: "", status: "active",
  storageUsed: 0, storageQuota: 10,
  lastLogin: "", avatar: "U", joined: ""
};

// ─── Auth API ─────────────────────────────────────────────────────────────────

const API_BASE = "/api";

const ROLE_MAP: Record<string, Role> = {
  USER: "user",
  UNIT_MANAGER: "manager",
  ADMIN: "admin",
};

function decodeJwtPayload(token: string): { sub: string; username: string; role: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload;
  } catch {
    return null;
  }
}

async function loginApi(username: string, password: string): Promise<{ access_token: string; token_type: string }> {
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

function getStoredAuth(): { token: string; role: Role; username: string; userId: string } | null {
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
    return { token, role, username: payload.username, userId: payload.sub };
  } catch {
    localStorage.removeItem("access_token");
    return null;
  }
}

function buildUserFromAuth(auth: { username: string; role: Role; userId: string }): UserRecord {
  const initials = auth.username.split(".").map(p => p[0]?.toUpperCase() ?? "").join("").slice(0, 2) || "U";
  return {
    id: auth.userId,
    name: auth.username,
    email: "",
    role: auth.role,
    unit: "",
    status: "active",
    storageUsed: 0,
    storageQuota: 0,
    lastLogin: new Date().toISOString().slice(0, 16).replace("T", " "),
    avatar: initials,
    joined: "",
  };
}

// ─── Document API ─────────────────────────────────────────────────────────────

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

interface DocListResponse {
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

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchUnitsStatsApi(): Promise<UnitStatResponse[]> {
  const res = await fetch(`${API_BASE}/admin/units/stats`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load unit stats");
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

async function fetchUnitDetailApi(unitId: string): Promise<UnitDetailResponse> {
  const res = await fetch(`${API_BASE}/admin/units/${unitId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load unit details");
  return res.json();
}

async function createUnitApi(payload: { name: string; parent_id?: number | null; quota_bytes?: number }): Promise<any> {
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

async function updateUnitApi(unitId: string, payload: { name?: string; quota_bytes?: number; manager_user_id?: string }): Promise<any> {
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

async function deleteUnitApi(unitId: string): Promise<void> {
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

async function fetchAnalyticsOverviewApi(): Promise<AnalyticsOverviewResponse> {
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

async function fetchUsersApi(): Promise<ApiUserResponse[]> {
  const res = await fetch(`${API_BASE}/admin/users`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load users");
  return res.json();
}

async function createUserApi(payload: any): Promise<ApiUserResponse> {
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

async function fetchSystemQuotaApi(): Promise<TotalQuotaSystemResponse> {
  const res = await fetch(`${API_BASE}/admin/quota/system`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load system quota");
  return res.json();
}

async function fetchDocumentStatsApi(): Promise<CompanyDocumentStatsResponse> {
  const res = await fetch(`${API_BASE}/admin/documents/statistics`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load document stats");
  return res.json();
}

async function fetchUnitsQuotaApi(): Promise<UnitQuotaResponse[]> {
  const res = await fetch(`${API_BASE}/admin/quota/units`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load units quota");
  return res.json();
}

async function fetchManagerStatsApi(): Promise<UnitStorageStats> {
  const res = await fetch(`${API_BASE}/manager/storage/stats`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load unit stats");
  return res.json();
}

async function fetchManagerUsersApi(): Promise<UserResponse[]> {
  const res = await fetch(`${API_BASE}/manager/users`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load unit users");
  return res.json();
}

async function fetchDocumentsApi(page = 1, pageSize = 100): Promise<DocListResponse> {
  const res = await fetch(`${API_BASE}/documents/?page=${page}&page_size=${pageSize}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? "Failed to load documents");
  }
  return res.json();
}

async function uploadDocumentApi(file: File, title?: string): Promise<ApiDoc> {
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

async function uploadFolderApi(files: File[]): Promise<ApiDoc[]> {
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

async function shareDocumentApi(documentId: string, username: string, unitId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/documents/${documentId}/share`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ username, unit_id: unitId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? "Failed to share document");
  }
  return res.json();
}

async function fetchBookmarksApi(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/bookmark/`, {
    headers: authHeaders(),
  });
  if (!res.ok) return [];
  return res.json();
}

async function markBookmarkApi(documentId: string): Promise<any> {
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

async function removeBookmarkApi(documentId: string): Promise<any> {
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

function apiDocToDoc(d: ApiDoc, section: DocSection): Doc {
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

// ─── Utilities ────────────────────────────────────────────────────────────────

function fmtSize(bytes: number) {
  if (bytes > 1e9) return `${(bytes/1e9).toFixed(1)} GB`;
  if (bytes > 1e6) return `${(bytes/1e6).toFixed(1)} MB`;
  return `${(bytes/1e3).toFixed(0)} KB`;
}

const FILE_TYPE_META: Record<string, { bg: string; text: string; label: string }> = {
  pdf:  { bg:"bg-red-50",    text:"text-red-600",    label:"PDF" },
  docx: { bg:"bg-blue-50",   text:"text-blue-600",   label:"DOC" },
  xlsx: { bg:"bg-green-50",  text:"text-green-700",  label:"XLS" },
  pptx: { bg:"bg-orange-50", text:"text-orange-600", label:"PPT" },
  png:  { bg:"bg-purple-50", text:"text-purple-600", label:"PNG" },
  txt:  { bg:"bg-gray-50",   text:"text-gray-500",   label:"TXT" },
  csv:  { bg:"bg-teal-50",   text:"text-teal-600",   label:"CSV" },
  zip:  { bg:"bg-yellow-50", text:"text-yellow-600", label:"ZIP" },
};

function FileChip({ type }: { type: string }) {
  const m = FILE_TYPE_META[type] ?? { bg:"bg-gray-50", text:"text-gray-500", label: type.toUpperCase() };
  return (
    <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-[10px] font-bold tracking-wide flex-shrink-0 ${m.bg} ${m.text}`} style={{ fontFamily:"var(--font-mono)" }}>
      {m.label}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:    "bg-emerald-50 text-emerald-700 border-emerald-200",
    draft:     "bg-amber-50  text-amber-700  border-amber-200",
    archived:  "bg-slate-100 text-slate-500  border-slate-200",
    inactive:  "bg-slate-100 text-slate-500  border-slate-200",
    suspended: "bg-red-50    text-red-600    border-red-200",
    uploading: "bg-blue-50   text-blue-600   border-blue-200",
    done:      "bg-emerald-50 text-emerald-700 border-emerald-200",
    error:     "bg-red-50    text-red-600    border-red-200",
    queued:    "bg-slate-50  text-slate-500  border-slate-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full border ${map[status] ?? map.active}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function RolePill({ role }: { role: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    admin:   { cls:"bg-violet-50 text-violet-700 border-violet-200", label:"Admin" },
    manager: { cls:"bg-blue-50   text-blue-700   border-blue-200",   label:"Unit Manager" },
    user:    { cls:"bg-slate-50  text-slate-600  border-slate-200",  label:"User" },
  };
  const normalized = role?.toLowerCase() || "user";
  const m = map[normalized] || { cls:"bg-slate-50 text-slate-600 border-slate-200", label: String(role || "Unknown") };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full border ${m.cls}`}>
      {m.label}
    </span>
  );
}

function Avatar({ initials, size = "md" }: { initials: string; size?: "xs"|"sm"|"md"|"lg" }) {
  const palette: Record<string, string> = {
    AC:"bg-blue-600", MS:"bg-emerald-600", TW:"bg-orange-500",
    SK:"bg-pink-500", JL:"bg-indigo-600", NP:"bg-violet-600",
    RC:"bg-teal-600", PN:"bg-rose-500",
  };
  const sizes = { xs:"w-6 h-6 text-[9px]", sm:"w-8 h-8 text-xs", md:"w-9 h-9 text-sm", lg:"w-11 h-11 text-base" };
  const bg = palette[initials] ?? "bg-slate-400";
  return (
    <div className={`${sizes[size]} ${bg} text-white rounded-full flex items-center justify-center font-semibold flex-shrink-0`}
      style={{ fontFamily:"var(--font-display)" }}>
      {initials}
    </div>
  );
}

function StorageBar({ used, quota, showLabel = true }: { used: number; quota: number; showLabel?: boolean }) {
  const pct = Math.min((used / quota) * 100, 100);
  const color = pct > 85 ? "bg-red-500" : pct > 65 ? "bg-amber-500" : "bg-[#2563EB]";
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-[60px]">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width:`${pct}%` }} />
      </div>
      {showLabel && (
        <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap flex-shrink-0">{used} / {quota} GB</span>
      )}
    </div>
  );
}

// ─── Design System Components ─────────────────────────────────────────────────

function Btn({
  children, variant = "primary", size = "md", onClick, disabled, className = "", icon,
}: {
  children?: React.ReactNode; variant?: "primary"|"secondary"|"ghost"|"danger"|"outline"|"success";
  size?: "xs"|"sm"|"md"|"lg"; onClick?: () => void; disabled?: boolean; className?: string; icon?: React.ReactNode;
}) {
  const base = "inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-all duration-150 select-none cursor-pointer whitespace-nowrap";
  const sizes = { xs:"px-2.5 py-1 text-[11px]", sm:"px-3 py-1.5 text-xs", md:"px-4 py-2 text-sm", lg:"px-5 py-2.5 text-sm" };
  const variants = {
    primary:   "bg-[#2563EB] text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm shadow-blue-200",
    secondary: "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200",
    ghost:     "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
    danger:    "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200",
    outline:   "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300",
    success:   "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200",
  };
  return (
    <button
      onClick={onClick} disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""} ${className}`}
      style={{ fontFamily:"var(--font-sans)" }}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function TextInput({
  value, onChange, placeholder, type = "text", icon, suffix,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; icon?: React.ReactNode; suffix?: React.ReactNode;
}) {
  return (
    <div className="relative flex items-center">
      {icon && <span className="absolute left-3 text-slate-400 pointer-events-none flex-shrink-0">{icon}</span>}
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full bg-white border border-slate-200 rounded-lg py-2 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-[#2563EB] transition-all ${icon ? "pl-9" : "pl-3"}`}
        style={{ fontFamily:"var(--font-sans)" }}
      />
      {suffix && <span className="absolute right-3">{suffix}</span>}
    </div>
  );
}

function SelectInput({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <select
      value={value} onChange={e => onChange(e.target.value)}
      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-[#2563EB] cursor-pointer appearance-none pr-8"
      style={{ fontFamily:"var(--font-sans)", backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat:"no-repeat", backgroundPosition:"right 8px center" }}
    >
      {children}
    </select>
  );
}

// ─── Modal / Dialog ───────────────────────────────────────────────────────────

function ModalShell({ title, subtitle, onClose, children, size = "md" }: {
  title: string; subtitle?: string; onClose: () => void;
  children: React.ReactNode; size?: "sm"|"md"|"lg";
}) {
  const widths = { sm:"max-w-sm", md:"max-w-md", lg:"max-w-2xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full ${widths[size]} flex flex-col max-h-[90vh]`}>
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-900" style={{ fontFamily:"var(--font-display)" }}>{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0 ml-4">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Confirm({ title, message, onConfirm, onCancel, danger = false }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void; danger?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-6">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${danger ? "bg-red-50" : "bg-blue-50"}`}>
          {danger ? <AlertTriangle size={22} className="text-red-500" /> : <Info size={22} className="text-[#2563EB]" />}
        </div>
        <h3 className="text-base font-semibold text-slate-900 mb-2" style={{ fontFamily:"var(--font-display)" }}>{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">{message}</p>
        <div className="flex gap-3">
          <Btn variant="outline" className="flex-1" onClick={onCancel}>Cancel</Btn>
          <Btn variant={danger ? "danger" : "primary"} className="flex-1" onClick={onConfirm}>
            {danger ? "Delete" : "Confirm"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function ToastBar({ msg, type = "success", onDone }: { msg: string; type?: "success"|"error"|"info"; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, []);
  const styles = {
    success: "bg-emerald-600 text-white",
    error:   "bg-red-500 text-white",
    info:    "bg-[#2563EB] text-white",
  };
  const icons = { success:<CheckCircle size={15}/>, error:<AlertCircle size={15}/>, info:<Info size={15}/> };
  return (
    <div className={`fixed bottom-5 right-5 z-[60] flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${styles[type]}`} style={{ fontFamily:"var(--font-sans)" }}>
      {icons[type]} {msg}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV_ITEMS: Record<Role, Array<{ id:string; label:string; icon:React.ReactNode; section?:string }>> = {
  user: [
    { id:"home", label:"Home", icon:<Home size={17}/> },
    { id:"documents", label:"My Documents", icon:<FileText size={17}/> },
    { id:"upload", label:"Upload", icon:<Upload size={17}/> },
  ],
  manager: [
    { id:"home", label:"Dashboard", icon:<LayoutDashboard size={17}/> },
    { id:"documents", label:"Documents", icon:<FileText size={17}/> },
    { id:"upload", label:"Upload", icon:<Upload size={17}/> },
  ],
  admin: [
    { id:"units", label:"Units", icon:<Building2 size={17}/>, section:"Management" },
    { id:"users", label:"Users", icon:<Users size={17}/> },
    { id:"analytics", label:"Analytics", icon:<BarChart2 size={17}/> },
  ],
};

function Sidebar({ role, active, setActive, onLogout, user }: {
  role: Role; active: string; setActive: (s: string) => void; onLogout: () => void; user: UserRecord;
}) {
  const items = NAV_ITEMS[role];
  let lastSection = "";

  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col bg-white border-r border-slate-100 h-full" style={{ fontFamily:"var(--font-sans)" }}>
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 h-[60px]">
        <div className="w-8 h-8 bg-[#2563EB] rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-300">
          <Layers size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 leading-none" style={{ fontFamily:"var(--font-display)" }}>DocLib</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Enterprise DMS</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        {items.map(item => {
          const showSection = item.section && item.section !== lastSection;
          if (item.section) lastSection = item.section;
          return (
            <div key={item.id}>
              {showSection && (
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 pt-4 pb-1.5">{item.section}</p>
              )}
              <button
                onClick={() => setActive(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 mb-0.5 ${
                  active === item.id
                    ? "bg-[#2563EB] text-white shadow-sm shadow-blue-300"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            </div>
          );
        })}
      </nav>

      {/* User block */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
          <Avatar initials={user.avatar} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700 truncate" style={{ fontFamily:"var(--font-display)" }}>{user.name}</p>
            <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
          </div>
          <button onClick={onLogout} title="Sign out" className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors">
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

const NOTIFS = [
  { id:1, text:"Maria Santos shared «Sales Analytics Dashboard» with you", time:"2 min ago", read:false },
  { id:2, text:"Upload complete: Q4 Budget Forecast.xlsx", time:"1h ago", read:false },
  { id:3, text:"IT Security Policy v2 was published", time:"3h ago", read:true },
  { id:4, text:"Sara Kim's account has been disabled", time:"Yesterday", read:true },
];

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const unread = NOTIFS.filter(n => !n.read).length;

  return (
    <header className="h-[60px] bg-white border-b border-slate-100 flex items-center justify-between px-6 flex-shrink-0 z-10">
      <div>
        <h2 className="text-[15px] font-semibold text-slate-900 leading-none" style={{ fontFamily:"var(--font-display)" }}>{title}</h2>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 w-52">
          <Search size={14} className="text-slate-400 flex-shrink-0" />
          <input placeholder="Quick search…" className="bg-transparent text-sm text-slate-600 placeholder:text-slate-400 outline-none w-full" style={{ fontFamily:"var(--font-sans)" }} />
        </div>

        {/* Notifs */}
        <div className="relative">
          <button onClick={() => setNotifOpen(!notifOpen)} className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors border border-transparent hover:border-slate-200">
            <Bell size={17} />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#2563EB] rounded-full ring-2 ring-white" />
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-11 w-[340px] bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800" style={{ fontFamily:"var(--font-display)" }}>Notifications</span>
                  {unread > 0 && <span className="w-5 h-5 bg-[#2563EB] text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unread}</span>}
                </div>
                <button className="text-xs text-[#2563EB] font-medium hover:text-blue-800">Mark all read</button>
              </div>
              {NOTIFS.map(n => (
                <div key={n.id} className={`px-4 py-3.5 flex gap-3 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0 ${n.read ? "" : "bg-blue-50/40"}`}>
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.read ? "bg-transparent" : "bg-[#2563EB]"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 leading-relaxed">{n.text}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{n.time}</p>
                  </div>
                </div>
              ))}
              <div className="px-4 py-3 text-center">
                <button className="text-xs text-[#2563EB] font-medium">View all notifications</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── Document Row ──────────────────────────────────────────────────────────────

function DocRow({
  doc, role, onBookmark, onShare, onDelete, onTogglePublic,
}: {
  doc: Doc; role: Role;
  onBookmark: (id: string) => void;
  onShare: (doc: Doc) => void;
  onDelete: (id: string) => void;
  onTogglePublic: (id: string) => void;
}) {
  const canDelete = role !== "user";
  const canToggle = role !== "user";

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50/80 transition-all group border border-transparent hover:border-slate-100">
      <FileChip type={doc.type} />
      <div className="flex-1 min-w-0 mr-2">
        <p className="text-sm font-medium text-slate-800 truncate group-hover:text-[#2563EB] transition-colors">{doc.name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[11px] text-slate-400">{doc.owner}</span>
          <span className="text-slate-200">·</span>
          <span className="text-[11px] text-slate-400">{doc.uploadDate}</span>
          <span className="text-slate-200">·</span>
          <span className="text-[11px] text-slate-400 font-mono">{doc.size}</span>
          {doc.section === "shared" && doc.sharedWith && (
            <>
              <span className="text-slate-200">·</span>
              <span className="text-[11px] text-blue-500 flex items-center gap-1"><Share2 size={9}/>Shared</span>
            </>
          )}
        </div>
      </div>

      {/* Status — shown on hover */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center gap-1.5">
        <StatusPill status={doc.status} />
        {canToggle && (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${doc.isPublic ? "bg-green-50 text-green-600 border-green-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
            {doc.isPublic ? "Public" : "Private"}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 flex-shrink-0 ml-1">
        {canToggle && (
          <button
            onClick={() => onTogglePublic(doc.id)}
            title={doc.isPublic ? "Make private" : "Make public"}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${doc.isPublic ? "text-green-500 hover:bg-green-50" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"}`}
          >
            {doc.isPublic ? <Globe size={14}/> : <Lock size={14}/>}
          </button>
        )}
        {doc.section === "mine" && (
          <button onClick={() => onShare(doc)} title="Share" className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-[#2563EB] transition-colors">
            <Share2 size={14}/>
          </button>
        )}
        <button onClick={() => onBookmark(doc.id)} title={doc.bookmarked ? "Remove bookmark" : "Bookmark"} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${doc.bookmarked ? "text-amber-400 hover:bg-amber-50" : "text-slate-400 hover:bg-amber-50 hover:text-amber-400"}`}>
          <Star size={14} fill={doc.bookmarked ? "currentColor" : "none"}/>
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors" title="Download">
          <Download size={14}/>
        </button>
        {canDelete && (
          <button onClick={() => onDelete(doc.id)} title="Delete" className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
            <Trash2 size={14}/>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Documents Tab ────────────────────────────────────────────────────────────

function DocumentsTab({ role }: { role: Role }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [totals, setTotals] = useState({ personal: 0, shared: 0, unit_inherited: 0 });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sort, setSort] = useState("date-desc");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState<{ msg:string; type:"success"|"error"|"info" }|null>(null);
  const [shareForm, setShareForm] = useState({ username: "", unitId: "" });
  const [shareLoading, setShareLoading] = useState(false);

  const loadDocs = async () => {
    setLoading(true);
    setFetchError("");
    try {
      const [data, bookmarks] = await Promise.all([
        fetchDocumentsApi(1, 100),
        fetchBookmarksApi()
      ]);
      const isBookmarked = (id: string) => bookmarks.includes(id);
      
      const allDocs: Doc[] = [
        ...data.items.personal.map(d => ({ ...apiDocToDoc(d, "mine"), bookmarked: isBookmarked(d.document_id) })),
        ...data.items.shared.map(d => ({ ...apiDocToDoc(d, "shared"), bookmarked: isBookmarked(d.document_id) })),
        ...data.items.unit_inherited.map(d => ({ ...apiDocToDoc(d, "inherited"), bookmarked: isBookmarked(d.document_id) })),
      ];
      setDocs(allDocs);
      setTotals(data.totals);
    } catch (err: any) {
      setFetchError(err.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDocs(); }, []);

  const PER_PAGE = 5;

  const filtered = docs
    .filter(d => {
      const q = search.toLowerCase();
      return (d.name.toLowerCase().includes(q) || d.owner.toLowerCase().includes(q))
        && (filterType === "all" || d.type === filterType);
    })
    .sort((a, b) => {
      if (sort === "name-asc") return a.name.localeCompare(b.name);
      if (sort === "name-desc") return b.name.localeCompare(a.name);
      if (sort === "date-asc") return a.uploadDate.localeCompare(b.uploadDate);
      return b.uploadDate.localeCompare(a.uploadDate);
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const sections: { key: DocSection; label: string; desc: string }[] = [
    { key:"mine",      label:"My Uploaded Documents",   desc:"Files you have uploaded" },
    { key:"shared",    label:"Shared With Me",           desc:"Documents others shared with you" },
    { key:"inherited", label:"Inherited Documents",      desc:"Organization-wide documents" },
  ];

  const onBookmark = async (id: string) => {
    const doc = docs.find(d => d.id === id);
    if (!doc) return;
    try {
      if (doc.bookmarked) {
        await removeBookmarkApi(id);
      } else {
        await markBookmarkApi(id);
      }
      setDocs(p => p.map(d => d.id === id ? { ...d, bookmarked: !doc.bookmarked } : d));
      showToast(doc.bookmarked ? "Bookmark removed" : "Bookmark added", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to update bookmark", "error");
    }
  };
  const onTogglePublic = (id: string) => {
    setDocs(p => p.map(d => d.id === id ? { ...d, isPublic: !d.isPublic } : d));
    showToast("Visibility updated", "info");
  };
  const confirmDelete = (id: string) => {
    setDocs(p => p.filter(d => d.id !== id));
    setModal(null);
    showToast("Document deleted", "success");
  };
  const showToast = (msg: string, type: "success"|"error"|"info" = "success") => setToast({ msg, type });

  const handleShare = async () => {
    if (!modal || modal.type !== "share") return;
    if (!shareForm.username.trim() || !shareForm.unitId.trim()) {
      showToast("Please fill in all fields", "error");
      return;
    }
    setShareLoading(true);
    try {
      await shareDocumentApi(modal.doc.id, shareForm.username.trim(), shareForm.unitId.trim());
      showToast("Document shared successfully");
      setModal(null);
      setShareForm({ username: "", unitId: "" });
    } catch (err: any) {
      showToast(err.message || "Failed to share document", "error");
    } finally {
      setShareLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-[#2563EB] rounded-full animate-spin mb-4" />
        <p className="text-sm">Loading documents…</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
          <AlertCircle size={22} className="text-red-500" />
        </div>
        <p className="text-sm text-red-600 mb-4">{fetchError}</p>
        <Btn onClick={loadDocs} icon={<RefreshCw size={13}/>}>Retry</Btn>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <TextInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search documents…" icon={<Search size={14}/>} />
        </div>
        <SelectInput value={filterType} onChange={v => { setFilterType(v); setPage(1); }}>
          <option value="all">All Types</option>
          <option value="pdf">PDF</option>
          <option value="docx">Word</option>
          <option value="xlsx">Excel</option>
          <option value="pptx">PowerPoint</option>
        </SelectInput>
        <SelectInput value={sort} onChange={setSort}>
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="name-asc">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
        </SelectInput>
        {role !== "user" && (
          <Btn variant="outline" size="md" icon={<SlidersHorizontal size={13}/>}>Bulk Actions</Btn>
        )}
        <Btn variant="ghost" size="sm" icon={<RefreshCw size={13}/>} onClick={loadDocs}>Refresh</Btn>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Sections */}
      {sections.map(sec => {
        const secDocs = paged.filter(d => d.section === sec.key);
        const totalInSec = docs.filter(d => d.section === sec.key).length;
        return (
          <div key={sec.key} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50/60 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-slate-800" style={{ fontFamily:"var(--font-display)" }}>{sec.label}</h3>
                <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono">{totalInSec}</span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">{sec.desc}</p>
            </div>
            {secDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-300">
                <FolderOpen size={36} strokeWidth={1.5} className="mb-2"/>
                <p className="text-sm text-slate-400">
                  {search || filterType !== "all" ? "No matching documents" : "No documents in this section"}
                </p>
              </div>
            ) : (
              <div className="p-2">
                {secDocs.map(doc => (
                  <DocRow
                    key={doc.id} doc={doc} role={role}
                    onBookmark={onBookmark}
                    onShare={doc => { setShareForm({ username: "", unitId: "" }); setModal({ type:"share", doc }); }}
                    onDelete={id => setModal({ type:"delete-doc", id })}
                    onTogglePublic={onTogglePublic}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-2.5 shadow-sm">
          <p className="text-xs text-slate-400">
            Page {page} of {totalPages} · {filtered.length} documents
          </p>
          <div className="flex items-center gap-1">
            <Btn variant="ghost" size="xs" icon={<ChevronLeft size={13}/>} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} />
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const n = i + 1;
              return (
                <button key={n} onClick={() => setPage(n)}
                  className={`w-7 h-7 text-xs rounded-lg transition-colors font-medium ${page === n ? "bg-[#2563EB] text-white" : "text-slate-500 hover:bg-slate-100"}`}
                >{n}</button>
              );
            })}
            <Btn variant="ghost" size="xs" icon={<ChevronRight size={13}/>} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} />
          </div>
        </div>
      )}

      {/* Share Modal */}
      {modal?.type === "share" && (
        <ModalShell title="Share Document" subtitle={modal.doc.name} onClose={() => setModal(null)}>
          <div className="space-y-5">
            <Field label="Username">
              <TextInput value={shareForm.username} onChange={v => setShareForm(p => ({ ...p, username: v }))} placeholder="Enter username to share with…" icon={<Users size={14}/>} />
            </Field>
            <Field label="Unit ID">
              <TextInput value={shareForm.unitId} onChange={v => setShareForm(p => ({ ...p, unitId: v }))} placeholder="Enter recipient's unit UUID…" icon={<Building2 size={14}/>} />
            </Field>
            <div className="flex gap-3 justify-end pt-1">
              <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn onClick={handleShare} disabled={shareLoading}>
                {shareLoading ? (
                  <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Sharing…</>
                ) : "Share"}
              </Btn>
            </div>
          </div>
        </ModalShell>
      )}

      {modal?.type === "delete-doc" && (
        <Confirm
          title="Delete Document"
          message="This action is permanent and cannot be undone. The document will be removed from all sections."
          onConfirm={() => confirmDelete(modal.id)}
          onCancel={() => setModal(null)}
          danger
        />
      )}

      {toast && <ToastBar msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}

// ─── Upload Tab ───────────────────────────────────────────────────────────────

function UploadTab({ role }: { role: Role }) {
  const [queue, setQueue] = useState<QueueFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [toast, setToast] = useState<{ msg:string; type:"success"|"error"|"info" }|null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: "success"|"error"|"info" = "success") => setToast({ msg, type });

  const uploadSingleFile = async (file: File) => {
    const id = `q${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const queueItem: QueueFile = {
      id,
      name: file.name,
      rawSize: file.size,
      progress: 0,
      status: "uploading",
      type: file.name.split(".").pop() ?? "bin",
    };
    setQueue(prev => [...prev, queueItem]);
    try {
      await uploadDocumentApi(file);
      setQueue(prev => prev.map(q => q.id === id ? { ...q, progress: 100, status: "done" } : q));
      showToast(`Uploaded ${file.name}`, "success");
    } catch (err: any) {
      setQueue(prev => prev.map(q => q.id === id ? { ...q, status: "error" } : q));
      showToast(err.message || `Failed to upload ${file.name}`, "error");
    }
  };

  const handleFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    arr.forEach(file => uploadSingleFile(file));
  };

  const handleFolderUpload = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    const ids = arr.map((file, i) => {
      const id = `q${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`;
      return { id, file };
    });
    const queueItems: QueueFile[] = ids.map(({ id, file }) => ({
      id,
      name: file.name,
      rawSize: file.size,
      progress: 0,
      status: "uploading" as const,
      type: file.name.split(".").pop() ?? "bin",
    }));
    setQueue(prev => [...prev, ...queueItems]);
    try {
      await uploadFolderApi(arr);
      const idSet = new Set(ids.map(i => i.id));
      setQueue(prev => prev.map(q => idSet.has(q.id) ? { ...q, progress: 100, status: "done" } : q));
      showToast(`Uploaded ${arr.length} files from folder`, "success");
    } catch (err: any) {
      const idSet = new Set(ids.map(i => i.id));
      setQueue(prev => prev.map(q => idSet.has(q.id) ? { ...q, status: "error" } : q));
      showToast(err.message || "Folder upload failed", "error");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Left col */}
      <div className="lg:col-span-2 space-y-4">
        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${dragging ? "border-[#2563EB] bg-blue-50 scale-[1.01]" : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30"}`}
        >
          <input ref={inputRef} type="file" multiple className="hidden"
            onChange={e => { if (e.target.files?.length) { handleFiles(e.target.files); e.target.value = ""; } }} />
          <input ref={folderInputRef} type="file" multiple className="hidden"
            {...({ webkitdirectory: "true", directory: "true" } as any)}
            onChange={e => { if (e.target.files?.length) { handleFolderUpload(e.target.files); e.target.value = ""; } }} />
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors ${dragging ? "bg-[#2563EB]" : "bg-blue-50"}`}>
            <Upload size={28} className={dragging ? "text-white" : "text-[#2563EB]"}/>
          </div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1" style={{ fontFamily:"var(--font-display)" }}>
            {dragging ? "Release to upload" : "Drop files here"}
          </h3>
          <p className="text-xs text-slate-400 mb-5">PDF, DOCX, XLSX, PPTX, PNG · up to 100 MB per file</p>
          <div className="flex items-center justify-center gap-3" onClick={e => e.stopPropagation()}>
            <Btn icon={<FileIcon size={13}/>} onClick={() => inputRef.current?.click()}>Select File</Btn>
            <Btn variant="outline" icon={<FolderOpen size={13}/>} onClick={() => folderInputRef.current?.click()}>
              Select Folder
            </Btn>
          </div>
        </div>

        {/* Queue */}
        {queue.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800" style={{ fontFamily:"var(--font-display)" }}>
                Upload Queue <span className="text-slate-400 font-normal text-xs ml-1">({queue.length})</span>
              </h3>
              <Btn size="xs" variant="ghost" onClick={() => setQueue([])}>Clear all</Btn>
            </div>
            <div className="p-3 space-y-1">
              {queue.map(f => (
                <div key={f.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                  <FileChip type={f.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-slate-700 truncate">{f.name}</p>
                      <span className="text-[10px] text-slate-400 font-mono ml-2 flex-shrink-0">{fmtSize(f.rawSize)}</span>
                    </div>
                    {f.status === "uploading" && (
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#2563EB] rounded-full transition-all duration-300 animate-pulse" style={{ width: "60%" }}/>
                      </div>
                    )}
                    {f.status === "done" && <p className="text-[10px] text-emerald-600 font-medium">Upload complete</p>}
                    {f.status === "error" && <p className="text-[10px] text-red-500">Upload failed</p>}
                    {f.status === "queued" && <p className="text-[10px] text-slate-400">Waiting…</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {f.status === "uploading" && (
                      <div className="flex items-center gap-1">
                        <div className="w-1 h-1 bg-[#2563EB] rounded-full animate-bounce" style={{ animationDelay:"0ms" }}/>
                        <div className="w-1 h-1 bg-[#2563EB] rounded-full animate-bounce" style={{ animationDelay:"150ms" }}/>
                        <div className="w-1 h-1 bg-[#2563EB] rounded-full animate-bounce" style={{ animationDelay:"300ms" }}/>
                      </div>
                    )}
                    {f.status === "done" && <CheckCircle size={15} className="text-emerald-500"/>}
                    {f.status === "error" && <AlertCircle size={15} className="text-red-500"/>}
                    {f.status === "queued" && <Clock size={15} className="text-slate-400"/>}
                    <button onClick={() => setQueue(p => p.filter(q => q.id !== f.id))} className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-400 transition-colors">
                      <X size={12}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right col — Upload tips */}
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Info size={16} className="text-[#2563EB]"/>
            </div>
            <h3 className="text-sm font-semibold text-slate-800" style={{ fontFamily:"var(--font-display)" }}>Upload Tips</h3>
          </div>
          <div className="space-y-3 text-xs text-slate-500">
            <div className="flex items-start gap-2">
              <CheckCircle size={12} className="text-emerald-500 mt-0.5 flex-shrink-0"/>
              <span>Use <strong>Select File</strong> for individual documents</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle size={12} className="text-emerald-500 mt-0.5 flex-shrink-0"/>
              <span>Use <strong>Select Folder</strong> to upload an entire directory</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle size={12} className="text-emerald-500 mt-0.5 flex-shrink-0"/>
              <span>Drag & drop files directly onto the upload area</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle size={12} className="text-emerald-500 mt-0.5 flex-shrink-0"/>
              <span>Supported formats: PDF, DOCX, XLSX, PPTX, PNG</span>
            </div>
          </div>
        </div>

        {/* Upload summary */}
        {queue.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 mb-3" style={{ fontFamily:"var(--font-display)" }}>Summary</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Total files</span>
                <span className="font-semibold text-slate-700 font-mono">{queue.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Completed</span>
                <span className="font-semibold text-emerald-600 font-mono">{queue.filter(q => q.status === "done").length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">In progress</span>
                <span className="font-semibold text-[#2563EB] font-mono">{queue.filter(q => q.status === "uploading").length}</span>
              </div>
              {queue.some(q => q.status === "error") && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Failed</span>
                  <span className="font-semibold text-red-500 font-mono">{queue.filter(q => q.status === "error").length}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {toast && <ToastBar msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
// ─── Admin — Analytics Panel ───────────────────────────────────────────────────

function AnalyticsPanel() {
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  
  const [totalUnits, setTotalUnits] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [storageUsed, setStorageUsed] = useState(0);
  
  const [barData, setBarData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    setFetchError("");
    try {
      const [overview, docStats, unitsQuota] = await Promise.all([
        fetchAnalyticsOverviewApi(),
        fetchDocumentStatsApi(),
        fetchUnitsQuotaApi()
      ]);

      setTotalUnits(overview.total_units);
      setTotalUsers(overview.total_users);
      
      setTotalDocuments(overview.total_documents);
      setStorageUsed(overview.quota_used_bytes);

      setBarData(docStats.details_by_unit.map(d => ({
        unit: d.unit_name.substring(0, 10),
        docs: d.total_documents
      })));

      const colors = ["#2563EB", "#7C3AED", "#059669", "#D97706", "#94A3B8"];
      setPieData(unitsQuota.map((u, i) => ({
        name: u.name,
        value: Number((u.quota_bytes / 1e9).toFixed(1)),
        color: colors[i % colors.length]
      })));

    } catch (err: any) {
      setFetchError(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-[#2563EB] rounded-full animate-spin mb-4" />
        <p className="text-sm">Loading analytics data...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 flex flex-col items-center justify-center shadow-sm">
        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
          <AlertCircle size={22} className="text-red-500" />
        </div>
        <p className="text-sm text-red-600 mb-4">{fetchError}</p>
        <Btn onClick={loadAnalytics} icon={<RefreshCw size={13}/>}>Retry</Btn>
      </div>
    );
  }

  const kpis = [
    { label:"Total Units",      value:String(totalUnits),          sub:"Total Unit",    icon:<Building2 size={18}/>,    color:"blue"   as const },
    { label:"Total Users",      value:String(totalUsers),          sub:"Total User", icon:<Users size={18}/>,        color:"green"  as const },
    { label:"Total Documents",  value:String(totalDocuments),       sub:"Total Document",         icon:<FileText size={18}/>,     color:"purple" as const },
    { label:"Quota Used",       value:fmtSize(storageUsed),   sub:"Total storage used",  icon:<HardDrive size={18}/>,    color:"orange" as const },
  ];
  
  const colorMap = {
    blue:   { bg:"bg-blue-50",   icon:"text-[#2563EB]" },
    green:  { bg:"bg-emerald-50", icon:"text-emerald-600" },
    purple: { bg:"bg-violet-50",  icon:"text-violet-600" },
    orange: { bg:"bg-amber-50",   icon:"text-amber-600" },
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => {
          const c = colorMap[k.color];
          return (
            <div key={k.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.bg} ${c.icon}`}>{k.icon}</div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mb-0.5" style={{ fontFamily:"var(--font-display)" }}>{k.value}</p>
              <p className="text-[11px] text-slate-400">{k.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-4" style={{ fontFamily:"var(--font-display)" }}>Documents per Department</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
              <XAxis dataKey="unit" tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, fontSize:12, boxShadow:"0 4px 12px rgba(0,0,0,.06)" }}/>
              <Bar dataKey="docs" name="Documents" fill="#2563EB" radius={[6,6,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-4" style={{ fontFamily:"var(--font-display)" }}>Storage Quota by Unit</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                {pieData.map((e, i) => <Cell key={i} fill={e.color}/>)}
              </Pie>
              <Tooltip formatter={(v: any) => [`${v} GB`, ""]} contentStyle={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, fontSize:12 }}/>
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background:d.color }}/>
                  <span className="text-xs text-slate-500">{d.name}</span>
                </div>
                <span className="text-xs font-semibold text-slate-700 font-mono">{d.value} GB</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Admin — Units Panel ──────────────────────────────────────────────────────

function UnitsPanel() {
  const [units, setUnits] = useState<UnitStatResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<UnitDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);
  const [form, setForm] = useState({ name: "", quota: "" });
  const [formLoading, setFormLoading] = useState(false);

  const showToast = (msg: string, type: "success" | "error" | "info" = "success") => setToast({ msg, type });

  const loadUnits = async () => {
    setLoading(true);
    setFetchError("");
    try {
      const data = await fetchUnitsStatsApi();
      setUnits(data);
    } catch (err: any) {
      setFetchError(err.message || "Failed to load units");
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (unitId: string) => {
    setDetailLoading(true);
    setDetailError("");
    try {
      const data = await fetchUnitDetailApi(unitId);
      setDetail(data);
    } catch (err: any) {
      setDetailError(err.message || "Failed to load unit details");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSelectUnit = (unitId: string) => {
    if (selectedId === unitId) {
      setSelectedId(null);
      setDetail(null);
      setDetailError("");
    } else {
      setSelectedId(unitId);
      loadDetail(unitId);
    }
  };

  const handleCreateUnit = async () => {
    if (!form.name.trim()) return;
    setFormLoading(true);
    try {
      await createUnitApi({
        name: form.name.trim(),
        quota_bytes: form.quota ? Number(form.quota) * 1e9 : 0,
      });
      showToast("Unit created successfully");
      setModal(null);
      await loadUnits();
    } catch (err: any) {
      showToast(err.message || "Failed to create unit", "error");
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateUnit = async () => {
    if (!modal || modal.type !== "edit-unit") return;
    setFormLoading(true);
    try {
      const payload: { name?: string; quota_bytes?: number } = {};
      if (form.name.trim()) payload.name = form.name.trim();
      if (form.quota) payload.quota_bytes = Number(form.quota) * 1e9;
      await updateUnitApi(modal.unit.id, payload);
      showToast("Unit updated successfully");
      setModal(null);
      await loadUnits();
      if (selectedId === modal.unit.id) await loadDetail(modal.unit.id);
    } catch (err: any) {
      showToast(err.message || "Failed to update unit", "error");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    setFormLoading(true);
    try {
      await deleteUnitApi(unitId);
      showToast("Unit deleted successfully");
      setModal(null);
      if (selectedId === unitId) { setSelectedId(null); setDetail(null); }
      await loadUnits();
    } catch (err: any) {
      showToast(err.message || "Failed to delete unit", "error");
    } finally {
      setFormLoading(false);
    }
  };

  useEffect(() => { loadUnits(); }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-[#2563EB] rounded-full animate-spin mb-4" />
        <p className="text-sm">Loading departments…</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
          <AlertCircle size={22} className="text-red-500" />
        </div>
        <p className="text-sm text-red-600 mb-4">{fetchError}</p>
        <Btn onClick={loadUnits} icon={<RefreshCw size={13}/>}>Retry</Btn>
      </div>
    );
  }

  const selectedUnit = units.find(u => u.unit_id === selectedId) ?? null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
      {/* Unit list */}
      <div className="xl:col-span-2 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700" style={{ fontFamily:"var(--font-display)" }}>
            Departments <span className="text-slate-400 font-normal">({units.length})</span>
          </h3>
          <div className="flex gap-2">
            <Btn size="sm" variant="ghost" icon={<RefreshCw size={13}/>} onClick={loadUnits}>Refresh</Btn>
            <Btn size="sm" icon={<Plus size={13}/>} onClick={() => { setForm({ name: "", quota: "" }); setModal({ type: "add-unit" }); }}>
              Add Unit
            </Btn>
          </div>
        </div>
        {units.map(unit => {
          const isSelected = selectedId === unit.unit_id;
          return (
            <button key={unit.unit_id} onClick={() => handleSelectUnit(unit.unit_id)}
              className={`w-full text-left bg-white rounded-2xl border p-4 transition-all hover:shadow-md ${isSelected ? "border-[#2563EB] shadow-md ring-1 ring-blue-200" : "border-slate-200 hover:border-slate-300 shadow-sm"}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800" style={{ fontFamily:"var(--font-display)" }}>{unit.name}</p>
                </div>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ml-3 ${isSelected ? "bg-[#2563EB]" : "bg-slate-100"}`}>
                  <Building2 size={15} className={isSelected ? "text-white" : "text-slate-500"}/>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1"><Users size={11}/>{unit.user_count} members</span>
                <span className="flex items-center gap-1"><FileText size={11}/>{unit.document_count} docs</span>
              </div>
            </button>
          );
        })}
        {units.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 flex flex-col items-center justify-center text-slate-300">
            <Building2 size={36} strokeWidth={1.2} className="mb-2"/>
            <p className="text-sm text-slate-400">No departments found</p>
          </div>
        )}
      </div>

      {/* Detail */}
      <div className="xl:col-span-3">
        {selectedId ? (
          detailLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 h-full min-h-[320px] flex flex-col items-center justify-center text-slate-400 shadow-sm">
              <div className="w-8 h-8 border-3 border-slate-200 border-t-[#2563EB] rounded-full animate-spin mb-4" />
              <p className="text-sm">Loading details…</p>
            </div>
          ) : detailError ? (
            <div className="bg-white rounded-2xl border border-slate-200 h-full min-h-[320px] flex flex-col items-center justify-center shadow-sm">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
                <AlertCircle size={22} className="text-red-500" />
              </div>
              <p className="text-sm text-red-600 mb-4">{detailError}</p>
              <Btn onClick={() => loadDetail(selectedId)} icon={<RefreshCw size={13}/>}>Retry</Btn>
            </div>
          ) : detail ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-50 to-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#2563EB] rounded-xl flex items-center justify-center shadow-sm shadow-blue-300">
                    <Building2 size={18} className="text-white"/>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900" style={{ fontFamily:"var(--font-display)" }}>{detail.unit_name}</h3>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Btn size="sm" variant="outline" icon={<Edit3 size={13}/>} onClick={() => {
                    setForm({ name: detail.unit_name, quota: detail.total_quota ? String(Math.round(detail.total_quota / 1e9)) : "" });
                    setModal({ type: "edit-unit", unit: { id: detail.unit_id, name: detail.unit_name, manager: "", members: detail.total_members, documents: detail.total_documents, storageUsed: detail.used_quota, storageQuota: detail.total_quota, description: "" } });
                  }}>Edit</Btn>
                  <Btn size="sm" variant="danger" icon={<Trash2 size={13}/>} onClick={() => setModal({ type: "delete-unit", id: detail.unit_id })}>Delete</Btn>
                </div>
              </div>

              {/* Stats strip */}
              <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                {[
                  { label: "Members", value: detail.total_members },
                  { label: "Documents", value: detail.total_documents },
                  { label: "Storage", value: `${fmtSize(detail.used_quota)} / ${fmtSize(detail.total_quota)}` },
                ].map(s => (
                  <div key={s.label} className="py-3.5 px-4 text-center">
                    <p className="text-lg font-bold text-slate-900" style={{ fontFamily:"var(--font-display)" }}>{s.value}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Members table */}
              <div className="overflow-x-auto">
                <table className="w-full" style={{ fontFamily:"var(--font-sans)" }}>
                  <thead>
                    <tr className="bg-slate-50/60 border-b border-slate-100">
                      {["Name", "Role", "Storage", "Status"].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.members.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">No members found in this unit</td></tr>
                    ) : detail.members.map((m, idx) => (
                      <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors last:border-0">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar initials={m.full_name.split(" ").map(w => w[0] ?? "").join("").toUpperCase().slice(0, 2) || "??"} size="sm"/>
                            <p className="text-sm font-medium text-slate-800">{m.full_name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full border ${
                            m.role === "admin" ? "bg-violet-50 text-violet-700 border-violet-200" :
                            m.role === "manager" ? "bg-blue-50 text-blue-700 border-blue-200" :
                            "bg-slate-50 text-slate-600 border-slate-200"
                          }`}>
                            {m.role === "admin" ? "Admin" : m.role === "manager" ? "Unit Manager" : m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 min-w-[160px]">
                          <StorageBar used={m.used_quota / 1e9} quota={m.total_quota / 1e9} />
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusPill status={m.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 h-full min-h-[320px] flex flex-col items-center justify-center text-slate-300 shadow-sm">
            <Building2 size={40} strokeWidth={1.2} className="mb-3"/>
            <p className="text-sm text-slate-400">Select a department to view details</p>
          </div>
        )}
      </div>

      {/* Add / Edit Unit Modal */}
      {(modal?.type === "add-unit" || modal?.type === "edit-unit") && (
        <ModalShell
          title={modal.type === "add-unit" ? "Add New Unit" : "Edit Unit"}
          subtitle={modal.type === "edit-unit" ? modal.unit.name : "Create a new organizational unit"}
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            <Field label="Unit Name">
              <TextInput value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="e.g. Marketing" />
            </Field>
            <Field label="Storage Quota (GB)">
              <TextInput value={form.quota} onChange={v => setForm(p => ({ ...p, quota: v }))} placeholder="e.g. 50" />
            </Field>
            <div className="flex gap-3 justify-end pt-2">
              <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn
                onClick={modal.type === "add-unit" ? handleCreateUnit : handleUpdateUnit}
                disabled={formLoading}
              >
                {formLoading ? (
                  <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Saving…</>
                ) : modal.type === "add-unit" ? "Create Unit" : "Save Changes"}
              </Btn>
            </div>
          </div>
        </ModalShell>
      )}

      {modal?.type === "delete-unit" && (
        <Confirm
          title="Delete Unit"
          message={`Delete "${units.find(u => u.unit_id === modal.id)?.name}"? All documents and user assignments in this unit will be affected. This cannot be undone.`}
          onConfirm={() => handleDeleteUnit(modal.id)}
          onCancel={() => setModal(null)}
          danger
        />
      )}

      {toast && <ToastBar msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}

// ─── Admin — Users Panel ──────────────────────────────────────────────────────

function UsersPanel() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [units, setUnits] = useState<UnitStatResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState<{ msg:string; type:"success"|"error"|"info" }|null>(null);
  
  const [form, setForm] = useState({ name:"", email:"", role:"user" as Role, unit:"", quota:"10" });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setFetchError("");
    try {
      const [usersData, unitsData] = await Promise.all([
        fetchUsersApi(),
        fetchUnitsStatsApi()
      ]);
      setUnits(unitsData);
      
      const unitMap = new Map(unitsData.map(u => [u.unit_id, u.name]));
      
      const mappedUsers: UserRecord[] = usersData.map(u => ({
        id: u.id,
        name: u.full_name || u.username || "Unknown",
        email: u.username || "Unknown",
        role: u.role || "user",
        unit: u.unit_id ? (unitMap.get(u.unit_id) || "Unknown") : "Unassigned",
        status: u.is_active ? "active" : "inactive",
        storageUsed: u.used_bytes || 0,
        storageQuota: u.quota_bytes || 1,
        lastLogin: u.updated_at,
        avatar: (u.full_name || u.username || "U").substring(0, 2).toUpperCase(),
        joined: u.created_at || new Date().toISOString(),
      }));
      setUsers(mappedUsers);
    } catch (err: any) {
      setFetchError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string, type: "success"|"error"|"info" = "success") => setToast({ msg, type });

  const handleCreateUser = async () => {
    if (!form.name || !form.email || !form.unit) {
      showToast("Please fill all required fields", "error");
      return;
    }
    const selectedUnit = units.find(u => u.name === form.unit);
    if (!selectedUnit) {
      showToast("Selected unit not found", "error");
      return;
    }
    
    setFormLoading(true);
    try {
      await createUserApi({
        username: form.email,
        password: "DefaultPassword123!", 
        full_name: form.name,
        role: form.role,
        unit_id: selectedUnit.unit_id,
        quota_bytes: Number(form.quota) * 1024 * 1024 * 1024 || 10737418240,
      });
      showToast("Account created successfully");
      setModal(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to create user", "error");
    } finally {
      setFormLoading(false);
    }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchQ = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.unit.toLowerCase().includes(q);
    const matchR = filterRole === "all" || u.role === filterRole;
    const matchS = filterStatus === "all" || u.status === filterStatus;
    return matchQ && matchR && matchS;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex-1 min-w-[180px] max-w-xs">
          <TextInput value={search} onChange={setSearch} placeholder="Search users…" icon={<Search size={14}/>} />
        </div>
        <SelectInput value={filterRole} onChange={setFilterRole}>
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Unit Manager</option>
          <option value="user">User</option>
        </SelectInput>
        <SelectInput value={filterStatus} onChange={setFilterStatus}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </SelectInput>
        <span className="text-xs text-slate-400">{filtered.length} user{filtered.length !== 1 ? "s" : ""}</span>
        <Btn icon={<UserPlus size={13}/>} onClick={() => { setForm({ name:"", email:"", role:"user", unit:"", quota:"10" }); setModal({ type:"add-user" }); }} className="ml-auto">
          Add User
        </Btn>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontFamily:"var(--font-sans)" }}>
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100">
                {["User", "Role", "Department", "Storage", "Status", "Joined", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Loading users...</td></tr>
              ) : fetchError ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-red-500">{fetchError}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center text-slate-300">
                    <Users size={32} strokeWidth={1.2} className="mb-2"/>
                    <p className="text-sm text-slate-400">No users match your filters</p>
                  </div>
                </td></tr>
              ) : filtered.map(u => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors last:border-0 group">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar initials={u.avatar} size="sm"/>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{u.name}</p>
                        <p className="text-[11px] text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5"><RolePill role={u.role}/></td>
                  <td className="px-4 py-3.5 text-sm text-slate-600">{u.unit}</td>
                  <td className="px-4 py-3.5 min-w-[160px]"><StorageBar used={u.storageUsed / 1e9} quota={u.storageQuota / 1e9}/></td>
                  <td className="px-4 py-3.5"><StatusPill status={u.status}/></td>
                  <td className="px-4 py-3.5 text-[11px] text-slate-400 font-mono whitespace-nowrap">
                    {u.joined ? (isNaN(new Date(u.joined).getTime()) ? "Unknown" : new Date(u.joined).toLocaleDateString()) : "Unknown"}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                     {/* Edit, delete, suspend buttons removed since there are no backend APIs for them yet */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {modal?.type === "add-user" && (
        <ModalShell
          title="Add New User"
          subtitle="Create a new user account"
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Full Name">
                  <TextInput value={form.name} onChange={v => setForm(p => ({ ...p, name:v }))} placeholder="Jane Smith" icon={<Users size={14}/>} />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Email Address">
                  <TextInput value={form.email} onChange={v => setForm(p => ({ ...p, email:v }))} placeholder="jane@acme.com" type="email" />
                </Field>
              </div>
              <Field label="Role">
                <SelectInput value={form.role} onChange={v => setForm(p => ({ ...p, role: v as Role }))}>
                  <option value="user">User</option>
                  <option value="manager">Unit Manager</option>
                  <option value="admin">Admin</option>
                </SelectInput>
              </Field>
              <Field label="Department">
                <SelectInput value={form.unit} onChange={v => setForm(p => ({ ...p, unit:v }))}>
                  <option value="">Select…</option>
                  {units.map(u => <option key={u.unit_id} value={u.name}>{u.name}</option>)}
                </SelectInput>
              </Field>
              <div className="col-span-2">
                <Field label="Storage Quota (GB)">
                  <TextInput value={form.quota} onChange={v => setForm(p => ({ ...p, quota:v }))} placeholder="10" />
                </Field>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-1">
              <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn disabled={formLoading} onClick={handleCreateUser}>
                {formLoading ? "Saving..." : "Create Account"}
              </Btn>
            </div>
          </div>
        </ModalShell>
      )}

      {modal?.type === "reset-pw" && (
        <ModalShell title="Reset Password" subtitle={modal.user.email} onClose={() => setModal(null)} size="sm">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <AlertTriangle size={18} className="text-amber-500 flex-shrink-0"/>
              <p className="text-xs text-amber-700 leading-relaxed">A password reset link will be sent to <strong>{modal.user.email}</strong>. The user will be required to set a new password.</p>
            </div>
            <div className="flex gap-3">
              <Btn variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn className="flex-1" onClick={() => { setModal(null); showToast("Reset email sent to " + modal.user.email, "info"); }}>
                Send Reset Link
              </Btn>
            </div>
          </div>
        </ModalShell>
      )}

      {modal?.type === "delete-user" && (
        <Confirm
          title="Delete User Account"
          message={`Delete ${users.find(u => u.id === modal.id)?.name}'s account? All their documents and data will be permanently removed.`}
          onConfirm={() => { setUsers(p => p.filter(u => u.id !== modal.id)); setModal(null); showToast("Account deleted", "error"); }}
          onCancel={() => setModal(null)}
          danger
        />
      )}

      {toast && <ToastBar msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}

// ─── Role Dashboards ──────────────────────────────────────────────────────────

function UserDashboard({ user, activeNav }: { user: UserRecord, activeNav: string }) {
  const [totals, setTotals] = useState({ personal: 0, shared: 0, unit_inherited: 0 });

  useEffect(() => {
    fetchDocumentsApi(1, 1).then(res => setTotals(res.totals)).catch(() => {});
  }, []);

  if (activeNav === "documents") return <div className="flex-1 overflow-y-auto bg-slate-50 p-6"><DocumentsTab role={user.role}/></div>;
  if (activeNav === "upload") return <div className="flex-1 overflow-y-auto bg-slate-50 p-6"><UploadTab role={user.role}/></div>;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="Document Library"
        subtitle={`Welcome back, ${user.name.split(" ")[0]}`}
      />
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
          {/* Mini KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label:"My Documents", value:totals.personal, icon:<FileText size={15}/>, color:"blue" as const },
              { label:"Shared With Me", value:totals.shared, icon:<Inbox size={15}/>, color:"green" as const },
              { label:"Inherited", value:totals.unit_inherited, icon:<Archive size={15}/>, color:"purple" as const },
              { label:"Bookmarked", value:0, icon:<Star size={15}/>, color:"orange" as const },
            ].map(k => (
              <div key={k.label} className={`bg-white rounded-xl border border-slate-200 px-4 py-3.5 flex items-center gap-3 shadow-sm`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  k.color === "blue" ? "bg-blue-50 text-[#2563EB]" :
                  k.color === "green" ? "bg-emerald-50 text-emerald-600" :
                  k.color === "purple" ? "bg-violet-50 text-violet-600" :
                  "bg-amber-50 text-amber-500"
                }`}>{k.icon}</div>
                <div>
                  <p className="text-lg font-bold text-slate-900 leading-none" style={{ fontFamily:"var(--font-display)" }}>{k.value}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{k.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function ManagerDashboard({ user, activeNav }: { user: UserRecord, activeNav: string }) {
  const [stats, setStats] = useState<UnitStorageStats | null>(null);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [s, u] = await Promise.all([
        fetchManagerStatsApi(),
        fetchManagerUsersApi()
      ]);
      setStats(s);
      setUsers(u);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeNav === "home") {
      loadData();
    }
  }, [activeNav]);

  if (activeNav === "documents") return <div className="flex-1 overflow-y-auto bg-slate-50 p-6"><DocumentsTab role={user.role}/></div>;
  if (activeNav === "upload") return <div className="flex-1 overflow-y-auto bg-slate-50 p-6"><UploadTab role={user.role}/></div>;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title={stats?.unit_name || "Document Management"} subtitle="Unit Manager Dashboard" />
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
          {loading && <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>}
          {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl shadow-sm border border-red-100">{error}</div>}
          
          {!loading && !error && stats && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {[
                  { label:"Documents", value:stats.total_documents, icon:<FileText size={15}/>, color:"blue" as const },
                  { label:"Team Members", value:stats.total_users, icon:<Users size={15}/>, color:"purple" as const },
                  { label:"Storage Used", value:fmtSize(stats.used_bytes), icon:<HardDrive size={15}/>, color:"orange" as const },
                  { label:"Storage Capacity", value:fmtSize(stats.used_bytes + stats.free_bytes), icon:<Layers size={15}/>, color:"green" as const },
                  { label:"Inherited Documents", value:stats.inherited_documents, icon:<Archive size={15}/>, color:"slate" as const },
                ].map(k => (
                  <div key={k.label} className="bg-white rounded-xl border border-slate-200 px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                      k.color === "blue" ? "bg-blue-50 text-[#2563EB]" :
                      k.color === "green" ? "bg-emerald-50 text-emerald-600" :
                      k.color === "purple" ? "bg-violet-50 text-violet-600" :
                      k.color === "slate" ? "bg-slate-100 text-slate-600" :
                      "bg-amber-50 text-amber-500"
                    }`}>{k.icon}</div>
                    <p className="text-2xl font-bold text-slate-900" style={{ fontFamily:"var(--font-display)" }}>{k.value}</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">{k.label}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mt-8">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900" style={{ fontFamily:"var(--font-display)" }}>Department Members</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="px-6 py-3.5">Full Name</th>
                        <th className="px-6 py-3.5">Quota</th>
                        <th className="px-6 py-3.5">Used Storage</th>
                        <th className="px-6 py-3.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">{u.full_name}</td>
                          <td className="px-6 py-4 text-slate-500">{fmtSize(u.quota_bytes)}</td>
                          <td className="px-6 py-4 text-slate-500">{fmtSize(u.used_bytes)}</td>
                          <td className="px-6 py-4 text-right">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${u.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                              {u.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No members found in this department.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function AdminDashboard({ user, activeNav: rawNav }: { user: UserRecord, activeNav: string }) {
  const activeNav = rawNav === "home" || rawNav === "settings" ? "units" : rawNav;
  const tabMeta: Record<string, string> = { analytics:"Analytics Overview", units:"Unit Management", users:"User Management" };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title={tabMeta[activeNav] || "Dashboard"} subtitle="System Administration" />
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
          {activeNav === "analytics" && <AnalyticsPanel/>}
          {activeNav === "units" && <UnitsPanel/>}
          {activeNav === "users" && <UsersPanel/>}
        </div>
      </main>
    </div>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────

function LoginPage({ onLogin }: { onLogin: (token: string, role: Role, username: string, userId: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login"|"change">("login");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [cpDone, setCpDone] = useState(false);

  const pwStrength = (pw: string) => [pw.length >= 8, /[A-Z]/.test(pw), /[0-9!@#$%]/.test(pw)];
  const strength = pwStrength(newPw);
  const strengthLabel = ["Weak", "Fair", "Strong"][strength.filter(Boolean).length - 1] ?? "";
  const strengthColor = ["bg-red-400", "bg-amber-400", "bg-emerald-500"][strength.filter(Boolean).length - 1] ?? "bg-slate-200";

  const handleLogin = async () => {
    if (!username.trim() || !password) { setError("Please enter your username and password."); return; }
    setError(""); setLoading(true);
    try {
      const data = await loginApi(username.trim(), password);
      const payload = decodeJwtPayload(data.access_token);
      if (!payload) { setError("Invalid token received from server."); setLoading(false); return; }
      const role = ROLE_MAP[payload.role?.toUpperCase()];
      if (!role) { setError("Unknown user role. Please contact your administrator."); setLoading(false); return; }
      onLogin(data.access_token, role, payload.username, payload.sub);
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily:"var(--font-sans)" }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[52%] bg-gradient-to-br from-[#1e40af] via-[#2563EB] to-[#3b82f6] flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5"/>
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-white/5"/>
        <div className="absolute top-1/3 right-12 w-48 h-48 rounded-full bg-white/5"/>

        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <Layers size={20} className="text-white"/>
            </div>
            <span className="text-white font-bold text-lg" style={{ fontFamily:"var(--font-display)" }}>DocLib Enterprise</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4" style={{ fontFamily:"var(--font-display)" }}>
            Secure document<br/>management for<br/>your organization.
          </h1>
          <p className="text-blue-100 text-sm leading-relaxed max-w-sm">
            Centralize, organize, and collaborate on all your documents. Enterprise-grade security with role-based access control.
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-4">
          {[
            { value:"1,691", label:"Documents" },
            { value:"85", label:"Active users" },
            { value:"6", label:"Departments" },
          ].map(s => (
            <div key={s.label} className="bg-white/10 backdrop-blur rounded-2xl p-4">
              <p className="text-2xl font-bold text-white" style={{ fontFamily:"var(--font-display)" }}>{s.value}</p>
              <p className="text-blue-200 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-8">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-[#2563EB] rounded-2xl flex items-center justify-center shadow-sm shadow-blue-300">
              <Layers size={20} className="text-white"/>
            </div>
            <span className="text-slate-900 font-bold text-lg" style={{ fontFamily:"var(--font-display)" }}>DocLib Enterprise</span>
          </div>

          {mode === "login" ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily:"var(--font-display)" }}>Welcome back</h2>
              <p className="text-sm text-slate-400 mb-7">Sign in to your account to continue</p>

              <div className="space-y-4">
                <Field label="Username">
                  <TextInput value={username} onChange={v => { setUsername(v); setError(""); }} placeholder="e.g. alex.chen" icon={<Users size={14}/>} />
                </Field>
                <Field label="Password">
                  <TextInput value={password} onChange={v => { setPassword(v); setError(""); }} type={showPw ? "text" : "password"} placeholder="Enter your password"
                    suffix={
                      <button onClick={() => setShowPw(!showPw)} className="text-slate-400 hover:text-slate-600 transition-colors">
                        {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                      </button>
                    }
                  />
                </Field>

                {error && (
                  <div className="flex items-start gap-2.5 p-3 bg-red-50 rounded-xl border border-red-200">
                    <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5"/>
                    <p className="text-xs text-red-600">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleLogin} disabled={loading}
                  className="w-full py-3 bg-[#2563EB] text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-sm shadow-blue-300 disabled:opacity-70 flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Signing in…</>
                  ) : "Sign In"}
                </button>

                <button onClick={() => setMode("change")} className="w-full text-xs text-slate-400 hover:text-[#2563EB] transition-colors font-medium pt-1">
                  Change Password
                </button>
              </div>


            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8">
              <button onClick={() => setMode("login")} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#2563EB] transition-colors mb-6">
                <ChevronLeft size={13}/> Back to sign in
              </button>
              <h2 className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily:"var(--font-display)" }}>Change Password</h2>
              <p className="text-sm text-slate-400 mb-7">Enter your current and new password</p>

              <div className="space-y-4">
                <Field label="Current Password">
                  <TextInput value="" onChange={() => {}} type="password" placeholder="Current password"/>
                </Field>
                <Field label="New Password">
                  <TextInput value={newPw} onChange={setNewPw} type="password" placeholder="Min. 8 characters"/>
                  {newPw && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex gap-1">
                        {[0,1,2].map(i => (
                          <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors ${strength.filter(Boolean).length > i ? strengthColor : "bg-slate-100"}`}/>
                        ))}
                      </div>
                      <p className={`text-[10px] font-medium ${strength.filter(Boolean).length === 3 ? "text-emerald-600" : strength.filter(Boolean).length === 2 ? "text-amber-500" : "text-red-500"}`}>
                        {strengthLabel} password
                      </p>
                    </div>
                  )}
                </Field>
                <Field label="Confirm New Password">
                  <TextInput value={confirmPw} onChange={setConfirmPw} type="password" placeholder="Confirm password"
                    suffix={confirmPw && (newPw === confirmPw
                      ? <CheckCircle size={14} className="text-emerald-500"/>
                      : <X size={14} className="text-red-400"/>
                    )}
                  />
                </Field>

                {cpDone && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <CheckCircle size={15} className="text-emerald-500"/>
                    <p className="text-xs text-emerald-700 font-medium">Password updated successfully</p>
                  </div>
                )}

                <button
                  onClick={() => { setCpDone(true); setTimeout(() => { setCpDone(false); setMode("login"); setNewPw(""); setConfirmPw(""); }, 1500); }}
                  className="w-full py-3 bg-[#2563EB] text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-sm shadow-blue-300"
                >
                  Update Password
                </button>
              </div>
            </div>
          )}

          <p className="text-center text-[11px] text-slate-400 mt-5">
            © 2024 ACME Corporation · Document Library Management System
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────

export default function App() {
  const stored = getStoredAuth();
  const [view, setView] = useState<"login"|"app">(stored ? "app" : "login");
  const [role, setRole] = useState<Role>(stored?.role ?? "user");
  const [user, setUser] = useState<UserRecord>(
    stored ? buildUserFromAuth({ username: stored.username, role: stored.role, userId: stored.userId }) : defaultUser
  );
  const [activeNav, setActiveNav] = useState(stored?.role === "admin" ? "units" : "home");

  const handleLogin = (token: string, r: Role, username: string, userId: string) => {
    localStorage.setItem("access_token", token);
    const userRecord = buildUserFromAuth({ username, role: r, userId });
    setRole(r);
    setUser(userRecord);
    setView("app");
    setActiveNav(r === "admin" ? "units" : "home");
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    setView("login");
    setRole("user");
  };

  if (view === "login") return <LoginPage onLogin={handleLogin}/>;

  const renderMain = () => {
    if (role === "admin")   return <AdminDashboard user={user} activeNav={activeNav}/>;
    if (role === "manager") return <ManagerDashboard user={user} activeNav={activeNav}/>;
    return <UserDashboard user={user} activeNav={activeNav}/>;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar role={role} active={activeNav} setActive={setActiveNav} onLogout={handleLogout} user={user}/>
      <div className="flex flex-col flex-1 overflow-hidden">
        {renderMain()}
      </div>
    </div>
  );
}
