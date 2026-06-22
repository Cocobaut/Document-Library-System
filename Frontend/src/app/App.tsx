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

// ─── Seed Data ────────────────────────────────────────────────────────────────

const DOCS: Doc[] = [
  { id:"d1", name:"Q3 2024 Financial Report.pdf", type:"pdf", size:"2.4 MB", owner:"Alex Chen", ownerId:"u1", uploadDate:"2024-11-12", isPublic:false, section:"mine", bookmarked:true, status:"active" },
  { id:"d2", name:"Product Roadmap H2 2024.pptx", type:"pptx", size:"8.1 MB", owner:"Alex Chen", ownerId:"u1", uploadDate:"2024-11-08", isPublic:true, section:"mine", bookmarked:false, status:"active" },
  { id:"d3", name:"Employee Handbook v3.docx", type:"docx", size:"1.2 MB", owner:"Alex Chen", ownerId:"u1", uploadDate:"2024-10-30", isPublic:false, section:"mine", bookmarked:false, status:"draft" },
  { id:"d4", name:"Sales Analytics Dashboard.xlsx", type:"xlsx", size:"3.7 MB", owner:"Maria Santos", ownerId:"u2", uploadDate:"2024-11-15", isPublic:false, section:"shared", bookmarked:true, status:"active", sharedWith:["Alex Chen"] },
  { id:"d5", name:"Brand Guidelines 2024.pdf", type:"pdf", size:"15.3 MB", owner:"Tom Walker", ownerId:"u3", uploadDate:"2024-11-01", isPublic:true, section:"shared", bookmarked:false, status:"active" },
  { id:"d6", name:"IT Security Policy v2.pdf", type:"pdf", size:"0.8 MB", owner:"IT Department", ownerId:"dept", uploadDate:"2024-09-15", isPublic:true, section:"inherited", bookmarked:false, status:"active" },
  { id:"d7", name:"Annual Leave Policy 2024.docx", type:"docx", size:"0.4 MB", owner:"HR Department", ownerId:"dept", uploadDate:"2024-08-20", isPublic:true, section:"inherited", bookmarked:true, status:"active" },
  { id:"d8", name:"Onboarding Checklist Q4.xlsx", type:"xlsx", size:"0.6 MB", owner:"Operations", ownerId:"dept", uploadDate:"2024-07-10", isPublic:true, section:"inherited", bookmarked:false, status:"active" },
];

const USERS: UserRecord[] = [
  { id:"u1", name:"Alex Chen", email:"alex.chen@acme.com", role:"user", unit:"Engineering", status:"active", storageUsed:4.2, storageQuota:10, lastLogin:"2024-11-15 09:42", avatar:"AC", joined:"2023-03-12" },
  { id:"u2", name:"Maria Santos", email:"m.santos@acme.com", role:"manager", unit:"Sales", status:"active", storageUsed:8.7, storageQuota:20, lastLogin:"2024-11-15 11:05", avatar:"MS", joined:"2022-07-18" },
  { id:"u3", name:"Tom Walker", email:"t.walker@acme.com", role:"user", unit:"Design", status:"active", storageUsed:12.1, storageQuota:15, lastLogin:"2024-11-14 16:30", avatar:"TW", joined:"2023-09-01" },
  { id:"u4", name:"Sara Kim", email:"s.kim@acme.com", role:"user", unit:"Engineering", status:"inactive", storageUsed:1.0, storageQuota:10, lastLogin:"2024-10-22 08:15", avatar:"SK", joined:"2024-01-08" },
  { id:"u5", name:"James Liu", email:"j.liu@acme.com", role:"manager", unit:"Finance", status:"active", storageUsed:6.3, storageQuota:20, lastLogin:"2024-11-13 14:22", avatar:"JL", joined:"2022-04-25" },
  { id:"u6", name:"Nina Patel", email:"n.patel@acme.com", role:"admin", unit:"IT", status:"active", storageUsed:3.2, storageQuota:50, lastLogin:"2024-11-15 08:00", avatar:"NP", joined:"2021-11-01" },
  { id:"u7", name:"Ryan Cho", email:"r.cho@acme.com", role:"manager", unit:"Operations", status:"active", storageUsed:9.8, storageQuota:20, lastLogin:"2024-11-12 10:50", avatar:"RC", joined:"2022-12-14" },
  { id:"u8", name:"Priya Nair", email:"p.nair@acme.com", role:"user", unit:"HR", status:"suspended", storageUsed:0.5, storageQuota:10, lastLogin:"2024-11-01 11:30", avatar:"PN", joined:"2024-02-20" },
];

const UNITS: Unit[] = [
  { id:"un1", name:"Engineering", manager:"David Park", members:24, documents:342, storageUsed:48.2, storageQuota:100, description:"Software development and infrastructure" },
  { id:"un2", name:"Sales", manager:"Maria Santos", members:18, documents:214, storageUsed:22.1, storageQuota:50, description:"Revenue and customer acquisition" },
  { id:"un3", name:"Design", manager:"Lisa Grant", members:9, documents:487, storageUsed:78.4, storageQuota:100, description:"UX, visual design and brand" },
  { id:"un4", name:"Finance", manager:"James Liu", members:12, documents:156, storageUsed:14.7, storageQuota:50, description:"Accounting and financial planning" },
  { id:"un5", name:"HR", manager:"Karen Moss", members:7, documents:203, storageUsed:8.9, storageQuota:30, description:"People operations and talent" },
  { id:"un6", name:"Operations", manager:"Ryan Cho", members:15, documents:289, storageUsed:31.5, storageQuota:75, description:"Business processes and logistics" },
];

const UPLOAD_HISTORY: QueueFile[] = [
  { id:"h1", name:"Q4 Budget Forecast.xlsx", rawSize:2.1*1024*1024, progress:100, status:"done", type:"xlsx" },
  { id:"h2", name:"Marketing Assets Pack.zip", rawSize:48.7*1024*1024, progress:100, status:"done", type:"zip" },
  { id:"h3", name:"Meeting Notes Nov.docx", rawSize:0.3*1024*1024, progress:100, status:"done", type:"docx" },
  { id:"h4", name:"System Architecture v2.pdf", rawSize:5.6*1024*1024, progress:65, status:"uploading", type:"pdf" },
  { id:"h5", name:"Legacy Data Export.csv", rawSize:112*1024*1024, progress:0, status:"error", type:"csv" },
];

const AREA_DATA = [
  { month:"Jun", uploads:42, downloads:89 },
  { month:"Jul", uploads:58, downloads:112 },
  { month:"Aug", uploads:73, downloads:95 },
  { month:"Sep", uploads:61, downloads:134 },
  { month:"Oct", uploads:89, downloads:156 },
  { month:"Nov", uploads:104, downloads:178 },
];

const BAR_DATA = [
  { unit:"Eng", docs:342 }, { unit:"Design", docs:487 },
  { unit:"Sales", docs:214 }, { unit:"Finance", docs:156 },
  { unit:"HR", docs:203 }, { unit:"Ops", docs:289 },
];

const PIE_DATA = [
  { name:"Engineering", value:48.2, color:"#2563EB" },
  { name:"Design", value:78.4, color:"#7C3AED" },
  { name:"Sales", value:22.1, color:"#059669" },
  { name:"Finance", value:14.7, color:"#D97706" },
  { name:"Others", value:40.4, color:"#94A3B8" },
];

const CREDENTIALS: Record<string, { pass: string; role: Role }> = {
  "alex.chen": { pass:"user123", role:"user" },
  "maria.santos": { pass:"mgr123", role:"manager" },
  "nina.patel": { pass:"admin123", role:"admin" },
};

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

function RolePill({ role }: { role: Role }) {
  const map: Record<Role, { cls: string; label: string }> = {
    admin:   { cls:"bg-violet-50 text-violet-700 border-violet-200", label:"Admin" },
    manager: { cls:"bg-blue-50   text-blue-700   border-blue-200",   label:"Unit Manager" },
    user:    { cls:"bg-slate-50  text-slate-600  border-slate-200",  label:"User" },
  };
  const m = map[role];
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
    { id:"bookmarks", label:"Bookmarks", icon:<Bookmark size={17}/> },
  ],
  manager: [
    { id:"home", label:"Dashboard", icon:<LayoutDashboard size={17}/> },
    { id:"documents", label:"Documents", icon:<FileText size={17}/> },
    { id:"upload", label:"Upload", icon:<Upload size={17}/> },
    { id:"team", label:"My Team", icon:<Users size={17}/> },
  ],
  admin: [
    { id:"home", label:"Overview", icon:<LayoutDashboard size={17}/> },
    { id:"units", label:"Units", icon:<Building2 size={17}/>, section:"Management" },
    { id:"users", label:"Users", icon:<Users size={17}/> },
    { id:"analytics", label:"Analytics", icon:<BarChart2 size={17}/> },
    { id:"settings", label:"Settings", icon:<Settings size={17}/> },
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
  const [docs, setDocs] = useState<Doc[]>(DOCS);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sort, setSort] = useState("date-desc");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState<{ msg:string; type:"success"|"error"|"info" }|null>(null);

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

  const onBookmark = (id: string) => {
    setDocs(p => p.map(d => d.id === id ? { ...d, bookmarked: !d.bookmarked } : d));
    showToast("Bookmark updated", "info");
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
                    onShare={doc => setModal({ type:"share", doc })}
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
        <ModalShell title={`Share Document`} subtitle={modal.doc.name} onClose={() => setModal(null)}>
          <div className="space-y-5">
            <Field label="Share with people">
              <TextInput value="" onChange={() => {}} placeholder="Name or email…" icon={<Users size={14}/>} />
            </Field>
            <Field label="Permission level">
              <SelectInput value="view" onChange={() => {}}>
                <option value="view">View only</option>
                <option value="comment">Can comment</option>
                <option value="edit">Can edit</option>
              </SelectInput>
            </Field>
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Share via link</p>
              <div className="flex gap-2 items-center">
                <div className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-400 font-mono truncate">
                  https://doclib.acme.com/s/{modal.doc.id}
                </div>
                <Btn size="sm" variant="secondary" onClick={() => { setModal(null); showToast("Link copied to clipboard"); }}>
                  Copy
                </Btn>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-1">
              <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn onClick={() => { setModal(null); showToast("Document shared successfully"); }}>Share</Btn>
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
  const [history] = useState<QueueFile[]>(UPLOAD_HISTORY);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const storageUsed = role === "manager" ? 22.1 : 4.2;
  const storageQuota = role === "manager" ? 50 : 10;
  const storagePct = (storageUsed / storageQuota) * 100;

  const enqueue = (names: string[]) => {
    const items: QueueFile[] = names.map((name, i) => ({
      id: `q${Date.now()}-${i}`,
      name,
      rawSize: Math.random() * 20e6 + 100000,
      progress: 0,
      status: "queued",
      type: name.split(".").pop() ?? "bin",
    }));
    setQueue(prev => [...prev, ...items]);
    items.forEach(item => {
      let p = 0;
      const iv = setInterval(() => {
        p += Math.random() * 18 + 4;
        if (p >= 100) {
          p = 100;
          clearInterval(iv);
          setQueue(prev => prev.map(q => q.id === item.id ? { ...q, progress: 100, status: "done" } : q));
        } else {
          setQueue(prev => prev.map(q => q.id === item.id ? { ...q, progress: Math.round(p), status: "uploading" } : q));
        }
      }, 250);
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Left col */}
      <div className="lg:col-span-2 space-y-4">
        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); enqueue(["Dropped File.pdf"]); }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${dragging ? "border-[#2563EB] bg-blue-50 scale-[1.01]" : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30"}`}
        >
          <input ref={inputRef} type="file" multiple className="hidden"
            onChange={e => { enqueue(Array.from(e.target.files ?? []).map(f => f.name)); }} />
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors ${dragging ? "bg-[#2563EB]" : "bg-blue-50"}`}>
            <Upload size={28} className={dragging ? "text-white" : "text-[#2563EB]"}/>
          </div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1" style={{ fontFamily:"var(--font-display)" }}>
            {dragging ? "Release to upload" : "Drop files here"}
          </h3>
          <p className="text-xs text-slate-400 mb-5">PDF, DOCX, XLSX, PPTX, PNG · up to 100 MB per file</p>
          <div className="flex items-center justify-center gap-3" onClick={e => e.stopPropagation()}>
            <Btn icon={<FileIcon size={13}/>} onClick={() => inputRef.current?.click()}>Select File</Btn>
            <Btn variant="outline" icon={<FolderOpen size={13}/>} onClick={() => enqueue(["Folder — Document A.pdf", "Folder — Document B.docx", "Folder — Spreadsheet.xlsx"])}>
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
                        <div className="h-full bg-[#2563EB] rounded-full transition-all duration-300" style={{ width:`${f.progress}%` }}/>
                      </div>
                    )}
                    {f.status === "done" && <p className="text-[10px] text-emerald-600 font-medium">Upload complete</p>}
                    {f.status === "error" && <p className="text-[10px] text-red-500">Failed — click to retry</p>}
                    {f.status === "queued" && <p className="text-[10px] text-slate-400">Waiting…</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {f.status === "uploading" && <span className="text-xs text-[#2563EB] font-semibold font-mono w-8 text-right">{f.progress}%</span>}
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

      {/* Right col */}
      <div className="space-y-4">
        {/* Storage (manager/admin) */}
        {role !== "user" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <HardDrive size={16} className="text-[#2563EB]"/>
              </div>
              <h3 className="text-sm font-semibold text-slate-800" style={{ fontFamily:"var(--font-display)" }}>Storage Usage</h3>
            </div>
            <div className="relative w-24 h-24 mx-auto mb-4">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="none" stroke="#f1f5f9" strokeWidth="3"/>
                <circle cx="18" cy="18" r="16" fill="none" stroke={storagePct > 85 ? "#ef4444" : storagePct > 65 ? "#f59e0b" : "#2563EB"}
                  strokeWidth="3" strokeDasharray={`${storagePct} 100`} strokeLinecap="round"/>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-slate-800" style={{ fontFamily:"var(--font-display)" }}>{Math.round(storagePct)}%</span>
                <span className="text-[9px] text-slate-400">used</span>
              </div>
            </div>
            <div className="text-center mb-3">
              <p className="text-xs text-slate-500"><span className="font-semibold text-slate-800">{storageUsed} GB</span> of {storageQuota} GB</p>
            </div>
            <div className="text-xs text-slate-400 text-center">{(storageQuota - storageUsed).toFixed(1)} GB remaining</div>
          </div>
        )}

        {/* History */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800" style={{ fontFamily:"var(--font-display)" }}>Recent Uploads</h3>
            <button className="text-xs text-[#2563EB] font-medium">View all</button>
          </div>
          <div className="p-3 space-y-1">
            {history.map(f => (
              <div key={f.id} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 rounded-xl transition-colors">
                <FileChip type={f.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">{f.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{fmtSize(f.rawSize)}</p>
                </div>
                <div className="flex-shrink-0">
                  {f.status === "done" && <CheckCircle size={14} className="text-emerald-500"/>}
                  {f.status === "uploading" && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-1 h-1 bg-[#2563EB] rounded-full animate-bounce" style={{ animationDelay:"0ms" }}/>
                      <div className="w-1 h-1 bg-[#2563EB] rounded-full animate-bounce" style={{ animationDelay:"150ms" }}/>
                      <div className="w-1 h-1 bg-[#2563EB] rounded-full animate-bounce" style={{ animationDelay:"300ms" }}/>
                    </div>
                  )}
                  {f.status === "error" && <AlertCircle size={14} className="text-red-500"/>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Admin — Analytics Panel ───────────────────────────────────────────────────

function AnalyticsPanel() {
  const kpis = [
    { label:"Total Units",      value:"6",          sub:"Across organization",    icon:<Building2 size={18}/>,    color:"blue"   as const, trend:+1 },
    { label:"Total Users",      value:"85",          sub:"78 active · 7 inactive", icon:<Users size={18}/>,        color:"green"  as const, trend:+3 },
    { label:"Total Documents",  value:"1,691",       sub:"+104 this month",         icon:<FileText size={18}/>,     color:"purple" as const, trend:+104 },
    { label:"Storage Used",     value:"203.8 GB",   sub:"of 405 GB total (50%)",  icon:<HardDrive size={18}/>,    color:"orange" as const, trend:null },
  ];
  const colorMap = {
    blue:   { bg:"bg-blue-50",   icon:"text-[#2563EB]",   pill:"bg-blue-100 text-blue-600" },
    green:  { bg:"bg-emerald-50", icon:"text-emerald-600", pill:"bg-emerald-100 text-emerald-600" },
    purple: { bg:"bg-violet-50",  icon:"text-violet-600",  pill:"bg-violet-100 text-violet-600" },
    orange: { bg:"bg-amber-50",   icon:"text-amber-600",   pill:"bg-amber-100 text-amber-600" },
  };

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => {
          const c = colorMap[k.color];
          return (
            <div key={k.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.bg} ${c.icon}`}>{k.icon}</div>
                {k.trend !== null && (
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${c.pill}`}>
                    <TrendingUp size={10}/> +{k.trend}
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-slate-900 mb-0.5" style={{ fontFamily:"var(--font-display)" }}>{k.value}</p>
              <p className="text-[11px] text-slate-400">{k.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-slate-800" style={{ fontFamily:"var(--font-display)" }}>Document Activity</h3>
            <span className="text-[11px] text-slate-400">Last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={AREA_DATA}>
              <defs>
                <linearGradient id="gUp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gDn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
              <XAxis dataKey="month" tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, fontSize:12, boxShadow:"0 4px 12px rgba(0,0,0,.06)" }}/>
              <Legend wrapperStyle={{ fontSize:12, paddingTop:8 }}/>
              <Area type="monotone" dataKey="uploads" name="Uploads" stroke="#2563EB" strokeWidth={2.5} fill="url(#gUp)"/>
              <Area type="monotone" dataKey="downloads" name="Downloads" stroke="#059669" strokeWidth={2.5} fill="url(#gDn)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-4" style={{ fontFamily:"var(--font-display)" }}>Storage by Unit</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                {PIE_DATA.map((e, i) => <Cell key={i} fill={e.color}/>)}
              </Pie>
              <Tooltip formatter={v => [`${v} GB`, ""]} contentStyle={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, fontSize:12 }}/>
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {PIE_DATA.map(d => (
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

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-4" style={{ fontFamily:"var(--font-display)" }}>Documents per Department</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={BAR_DATA} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
              <XAxis dataKey="unit" tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, fontSize:12, boxShadow:"0 4px 12px rgba(0,0,0,.06)" }}/>
              <Bar dataKey="docs" name="Documents" fill="#2563EB" radius={[6,6,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800" style={{ fontFamily:"var(--font-display)" }}>Most Active Users</h3>
          </div>
          <table className="w-full" style={{ fontFamily:"var(--font-sans)" }}>
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100">
                {["User", "Docs", "Activity"].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { name:"Tom Walker",   av:"TW", docs:487, pct:94 },
                { name:"Alex Chen",    av:"AC", docs:342, pct:78 },
                { name:"Maria Santos", av:"MS", docs:214, pct:65 },
                { name:"James Liu",    av:"JL", docs:156, pct:52 },
              ].map(u => (
                <tr key={u.name} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar initials={u.av} size="xs"/>
                      <span className="text-xs font-medium text-slate-700">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-600">{u.docs}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#2563EB] rounded-full" style={{ width:`${u.pct}%` }}/>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono w-7">{u.pct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Admin — Units Panel ──────────────────────────────────────────────────────

function UnitsPanel() {
  const [units, setUnits] = useState<Unit[]>(UNITS);
  const [selected, setSelected] = useState<Unit | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState({ name:"", manager:"", quota:"", description:"" });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const unitUsers = (name: string) => USERS.filter(u => u.unit === name);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
      {/* Unit list */}
      <div className="xl:col-span-2 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700" style={{ fontFamily:"var(--font-display)" }}>
            Departments <span className="text-slate-400 font-normal">({units.length})</span>
          </h3>
          <Btn size="sm" icon={<Plus size={13}/>} onClick={() => { setForm({ name:"", manager:"", quota:"", description:"" }); setModal({ type:"add-unit" }); }}>
            Add Unit
          </Btn>
        </div>
        {units.map(unit => {
          const pct = (unit.storageUsed / unit.storageQuota) * 100;
          const isSelected = selected?.id === unit.id;
          return (
            <button key={unit.id} onClick={() => setSelected(isSelected ? null : unit)}
              className={`w-full text-left bg-white rounded-2xl border p-4 transition-all hover:shadow-md ${isSelected ? "border-[#2563EB] shadow-md ring-1 ring-blue-200" : "border-slate-200 hover:border-slate-300 shadow-sm"}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800" style={{ fontFamily:"var(--font-display)" }}>{unit.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{unit.description}</p>
                </div>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ml-3 ${isSelected ? "bg-[#2563EB]" : "bg-slate-100"}`}>
                  <Building2 size={15} className={isSelected ? "text-white" : "text-slate-500"}/>
                </div>
              </div>
              <div className="flex items-center gap-3 mb-2.5 text-[11px] text-slate-500">
                <span className="flex items-center gap-1"><Users size={11}/>{unit.members} members</span>
                <span className="flex items-center gap-1"><FileText size={11}/>{unit.documents} docs</span>
              </div>
              <StorageBar used={unit.storageUsed} quota={unit.storageQuota}/>
            </button>
          );
        })}
      </div>

      {/* Detail */}
      <div className="xl:col-span-3">
        {selected ? (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-50 to-slate-50 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#2563EB] rounded-xl flex items-center justify-center shadow-sm shadow-blue-300">
                  <Building2 size={18} className="text-white"/>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900" style={{ fontFamily:"var(--font-display)" }}>{selected.name}</h3>
                  <p className="text-xs text-slate-500">Managed by {selected.manager}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Btn size="sm" variant="outline" icon={<Edit3 size={13}/>} onClick={() => { setForm({ name:selected.name, manager:selected.manager, quota:String(selected.storageQuota), description:selected.description }); setModal({ type:"edit-unit", unit:selected }); }}>Edit</Btn>
                <Btn size="sm" variant="danger" icon={<Trash2 size={13}/>} onClick={() => setModal({ type:"delete-unit", id:selected.id })}>Delete</Btn>
              </div>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
              {[
                { label:"Members", value:selected.members },
                { label:"Documents", value:selected.documents },
                { label:"Storage", value:`${selected.storageUsed} / ${selected.storageQuota} GB` },
              ].map(s => (
                <div key={s.label} className="py-3.5 px-4 text-center">
                  <p className="text-lg font-bold text-slate-900" style={{ fontFamily:"var(--font-display)" }}>{s.value}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Users table */}
            <div className="overflow-x-auto">
              <table className="w-full" style={{ fontFamily:"var(--font-sans)" }}>
                <thead>
                  <tr className="bg-slate-50/60 border-b border-slate-100">
                    {["Employee", "Role", "Storage", "Status", "Last Login"].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {unitUsers(selected.name).length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">No employees found in this unit</td></tr>
                  ) : unitUsers(selected.name).map(u => (
                    <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors last:border-0">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar initials={u.avatar} size="sm"/>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{u.name}</p>
                            <p className="text-[11px] text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><RolePill role={u.role}/></td>
                      <td className="px-4 py-3.5 min-w-[160px]"><StorageBar used={u.storageUsed} quota={u.storageQuota}/></td>
                      <td className="px-4 py-3.5"><StatusPill status={u.status}/></td>
                      <td className="px-4 py-3.5 text-[11px] text-slate-400 font-mono whitespace-nowrap">{u.lastLogin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 h-full min-h-[320px] flex flex-col items-center justify-center text-slate-300 shadow-sm">
            <Building2 size={40} strokeWidth={1.2} className="mb-3"/>
            <p className="text-sm text-slate-400">Select a department to view details</p>
          </div>
        )}
      </div>

      {/* Add Unit Modal */}
      {(modal?.type === "add-unit" || modal?.type === "edit-unit") && (
        <ModalShell
          title={modal.type === "add-unit" ? "Add New Unit" : "Edit Unit"}
          subtitle={modal.type === "edit-unit" ? modal.unit.name : "Create a new organizational unit"}
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            <Field label="Unit Name">
              <TextInput value={form.name} onChange={v => setForm(p => ({ ...p, name:v }))} placeholder="e.g. Marketing" />
            </Field>
            <Field label="Manager">
              <TextInput value={form.manager} onChange={v => setForm(p => ({ ...p, manager:v }))} placeholder="Manager full name" />
            </Field>
            <Field label="Description">
              <TextInput value={form.description} onChange={v => setForm(p => ({ ...p, description:v }))} placeholder="Brief description…" />
            </Field>
            <Field label="Storage Quota (GB)">
              <TextInput value={form.quota} onChange={v => setForm(p => ({ ...p, quota:v }))} placeholder="e.g. 50" />
            </Field>
            <div className="flex gap-3 justify-end pt-2">
              <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn onClick={() => {
                if (!form.name) return;
                if (modal.type === "add-unit") {
                  setUnits(p => [...p, { id:`un${Date.now()}`, name:form.name, manager:form.manager || "TBD", members:0, documents:0, storageUsed:0, storageQuota:Number(form.quota) || 50, description:form.description }]);
                  showToast("Unit created successfully");
                } else {
                  setUnits(p => p.map(u => u.id === modal.unit.id ? { ...u, name:form.name, manager:form.manager, storageQuota:Number(form.quota) || u.storageQuota, description:form.description } : u));
                  showToast("Unit updated");
                }
                setModal(null);
              }}>
                {modal.type === "add-unit" ? "Create Unit" : "Save Changes"}
              </Btn>
            </div>
          </div>
        </ModalShell>
      )}

      {modal?.type === "delete-unit" && (
        <Confirm
          title="Delete Unit"
          message={`Delete "${units.find(u => u.id === modal.id)?.name}"? All documents and user assignments in this unit will be affected. This cannot be undone.`}
          onConfirm={() => { setUnits(p => p.filter(u => u.id !== modal.id)); setSelected(null); setModal(null); showToast("Unit deleted"); }}
          onCancel={() => setModal(null)}
          danger
        />
      )}
      {toast && <ToastBar msg={toast} type="success" onDone={() => setToast(null)} />}
    </div>
  );
}

// ─── Admin — Users Panel ──────────────────────────────────────────────────────

function UsersPanel() {
  const [users, setUsers] = useState<UserRecord[]>(USERS);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState<{ msg:string; type:"success"|"error"|"info" }|null>(null);
  const [form, setForm] = useState({ name:"", email:"", role:"user" as Role, unit:"", quota:"10" });

  const showToast = (msg: string, type: "success"|"error"|"info" = "success") => setToast({ msg, type });

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
                {["User", "Role", "Department", "Storage", "Status", "Last Login", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
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
                  <td className="px-4 py-3.5 min-w-[160px]"><StorageBar used={u.storageUsed} quota={u.storageQuota}/></td>
                  <td className="px-4 py-3.5"><StatusPill status={u.status}/></td>
                  <td className="px-4 py-3.5 text-[11px] text-slate-400 font-mono whitespace-nowrap">{u.lastLogin.split(" ")[0]}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setForm({ name:u.name, email:u.email, role:u.role, unit:u.unit, quota:String(u.storageQuota) }); setModal({ type:"edit-user", user:u }); }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#2563EB] transition-colors" title="Edit">
                        <Edit3 size={13}/>
                      </button>
                      <button
                        onClick={() => { setUsers(p => p.map(x => x.id === u.id ? { ...x, status: x.status === "active" ? "inactive" : "active" } : x)); showToast(u.status === "active" ? "User disabled" : "User enabled"); }}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg hover:bg-amber-50 transition-colors ${u.status !== "active" ? "text-amber-500" : "text-slate-400 hover:text-amber-500"}`}
                        title={u.status === "active" ? "Disable" : "Enable"}
                      >
                        <UserX size={13}/>
                      </button>
                      <button
                        onClick={() => setModal({ type:"reset-pw", user:u })}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-slate-400 hover:text-[#2563EB] transition-colors" title="Reset Password">
                        <Key size={13}/>
                      </button>
                      <button onClick={() => setModal({ type:"delete-user", id:u.id })}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      {(modal?.type === "add-user" || modal?.type === "edit-user") && (
        <ModalShell
          title={modal.type === "add-user" ? "Add New User" : "Edit User Account"}
          subtitle={modal.type === "edit-user" ? modal.user.email : "Create a new user account"}
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
                  {UNITS.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
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
              <Btn onClick={() => {
                if (!form.name || !form.email) return;
                if (modal.type === "add-user") {
                  const av = form.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2);
                  setUsers(p => [...p, {
                    id:`u${Date.now()}`, name:form.name, email:form.email, role:form.role,
                    unit:form.unit || "Unassigned", status:"active",
                    storageUsed:0, storageQuota:Number(form.quota)||10,
                    lastLogin:"Never", avatar:av, joined:new Date().toISOString().slice(0,10),
                  }]);
                  showToast("Account created successfully");
                } else {
                  setUsers(p => p.map(u => u.id === modal.user.id ? { ...u, name:form.name, email:form.email, role:form.role, unit:form.unit, storageQuota:Number(form.quota)||u.storageQuota } : u));
                  showToast("User account updated");
                }
                setModal(null);
              }}>
                {modal.type === "add-user" ? "Create Account" : "Save Changes"}
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

function UserDashboard({ user }: { user: UserRecord }) {
  const [tab, setTab] = useState<"documents"|"upload">("documents");

  const myDocs = DOCS.filter(d => d.ownerId === user.id).length;
  const sharedDocs = DOCS.filter(d => d.section === "shared").length;
  const bookmarked = DOCS.filter(d => d.bookmarked).length;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title={tab === "documents" ? "Document Library" : "Upload Documents"}
        subtitle={tab === "documents" ? `Welcome back, ${user.name.split(" ")[0]}` : "Add files to your library"}
      />
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
          {/* Mini KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label:"My Documents", value:myDocs, icon:<FileText size={15}/>, color:"blue" as const },
              { label:"Shared With Me", value:sharedDocs, icon:<Inbox size={15}/>, color:"green" as const },
              { label:"Inherited", value:3, icon:<Archive size={15}/>, color:"purple" as const },
              { label:"Bookmarked", value:bookmarked, icon:<Star size={15}/>, color:"orange" as const },
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

          {/* Tab bar */}
          <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 w-fit shadow-sm">
            {([["documents","Documents"],["upload","Upload"]] as const).map(([t,l]) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${tab === t ? "bg-[#2563EB] text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
                style={{ fontFamily:"var(--font-sans)" }}
              >
                {l}
              </button>
            ))}
          </div>

          {tab === "documents" ? <DocumentsTab role={user.role}/> : <UploadTab role={user.role}/>}
        </div>
      </main>
    </div>
  );
}

function ManagerDashboard({ user }: { user: UserRecord }) {
  const [tab, setTab] = useState<"documents"|"upload">("documents");
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Document Management" subtitle="Sales · Unit Manager" />
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label:"Team Documents", value:"38", icon:<FileText size={15}/>, sub:"+12 this week", color:"blue" as const },
              { label:"Active Shares", value:"14", icon:<Share2 size={15}/>, sub:"across team", color:"green" as const },
              { label:"Team Members", value:"18", icon:<Users size={15}/>, sub:"in Sales unit", color:"purple" as const },
              { label:"Storage Used", value:"22.1 GB", icon:<HardDrive size={15}/>, sub:"of 50 GB", color:"orange" as const },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3.5 shadow-sm">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                  k.color === "blue" ? "bg-blue-50 text-[#2563EB]" :
                  k.color === "green" ? "bg-emerald-50 text-emerald-600" :
                  k.color === "purple" ? "bg-violet-50 text-violet-600" :
                  "bg-amber-50 text-amber-500"
                }`}>{k.icon}</div>
                <p className="text-xl font-bold text-slate-900" style={{ fontFamily:"var(--font-display)" }}>{k.value}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 w-fit shadow-sm">
            {([["documents","Documents"],["upload","Upload"]] as const).map(([t,l]) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${tab === t ? "bg-[#2563EB] text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
              >{l}</button>
            ))}
          </div>
          {tab === "documents" ? <DocumentsTab role={user.role}/> : <UploadTab role={user.role}/>}
        </div>
      </main>
    </div>
  );
}

function AdminDashboard({ user }: { user: UserRecord }) {
  const [tab, setTab] = useState<"analytics"|"units"|"users">("analytics");
  const tabMeta = { analytics:"Analytics Overview", units:"Unit Management", users:"User Management" };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title={tabMeta[tab]} subtitle="System Administration" />
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
          <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 w-fit shadow-sm">
            {([["analytics","Analytics"],["units","Units"],["users","Users"]] as const).map(([t,l]) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${tab === t ? "bg-[#2563EB] text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
              >{l}</button>
            ))}
          </div>
          {tab === "analytics" && <AnalyticsPanel/>}
          {tab === "units" && <UnitsPanel/>}
          {tab === "users" && <UsersPanel/>}
        </div>
      </main>
    </div>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────

function LoginPage({ onLogin }: { onLogin: (role: Role) => void }) {
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

  const handleLogin = () => {
    if (!username.trim() || !password) { setError("Please enter your username and password."); return; }
    setError(""); setLoading(true);
    setTimeout(() => {
      const cred = CREDENTIALS[username.toLowerCase()];
      if (cred && cred.pass === password) { onLogin(cred.role); }
      else { setError("Incorrect username or password. Please try again."); setLoading(false); }
    }, 900);
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

              {/* Demo accounts */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Demo Accounts</p>
                <div className="space-y-1.5">
                  {[
                    { role:"user" as Role, user:"alex.chen", pass:"user123", name:"Alex Chen" },
                    { role:"manager" as Role, user:"maria.santos", pass:"mgr123", name:"Maria Santos" },
                    { role:"admin" as Role, user:"nina.patel", pass:"admin123", name:"Nina Patel" },
                  ].map(d => (
                    <button key={d.role} onClick={() => { setUsername(d.user); setPassword(d.pass); setError(""); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 transition-all group text-left"
                    >
                      <Avatar initials={d.name.split(" ").map(n=>n[0]).join("")} size="xs"/>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700">{d.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{d.user}</p>
                      </div>
                      <RolePill role={d.role}/>
                      <ChevronRight size={12} className="text-slate-300 group-hover:text-[#2563EB] transition-colors"/>
                    </button>
                  ))}
                </div>
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

const ROLE_USER: Record<Role, UserRecord> = {
  user:    USERS[0],
  manager: USERS[1],
  admin:   USERS[5],
};

export default function App() {
  const [view, setView] = useState<"login"|"app">("login");
  const [role, setRole] = useState<Role>("user");
  const [activeNav, setActiveNav] = useState("home");

  const user = ROLE_USER[role];

  const handleLogin = (r: Role) => { setRole(r); setView("app"); setActiveNav("home"); };
  const handleLogout = () => { setView("login"); setRole("user"); };

  if (view === "login") return <LoginPage onLogin={handleLogin}/>;

  const renderMain = () => {
    if (role === "admin")   return <AdminDashboard user={user}/>;
    if (role === "manager") return <ManagerDashboard user={user}/>;
    return <UserDashboard user={user}/>;
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
