/*
 * Shared Utility Components and Helpers
 *
 * Provides reusable display components (FileChip, StatusPill, RolePill, Avatar, StorageBar)
 * and utility functions (fmtSize) used across multiple pages and panels.
 */

import React from "react";

/*
 * Formats a byte count into a human-readable size string.
 * Automatically selects GB, MB, or KB based on magnitude.
 *
 * @param bytes - Raw byte count to format
 * @returns Formatted string (e.g., "1.5 GB", "350 KB")
 */
export function fmtSize(bytes: number) {
    if (bytes > 1e9) return `${(bytes/1e9).toFixed(1)} GB`;
    if (bytes > 1e6) return `${(bytes/1e6).toFixed(1)} MB`;
    return `${(bytes/1e3).toFixed(0)} KB`;
}

/**
 * Color and label configuration for each supported file type.
 * Used by FileChip to render type-specific badges.
 */
export const FILE_TYPE_META: Record<string, { bg: string; text: string; label: string }> = {
    pdf:  { bg:"bg-red-50",    text:"text-red-600",    label:"PDF" },
    docx: { bg:"bg-blue-50",   text:"text-blue-600",   label:"DOC" },
    xlsx: { bg:"bg-green-50",  text:"text-green-700",  label:"XLS" },
    pptx: { bg:"bg-orange-50", text:"text-orange-600", label:"PPT" },
    png:  { bg:"bg-purple-50", text:"text-purple-600", label:"PNG" },
    txt:  { bg:"bg-gray-50",   text:"text-gray-500",   label:"TXT" },
    csv:  { bg:"bg-teal-50",   text:"text-teal-600",   label:"CSV" },
    zip:  { bg:"bg-yellow-50", text:"text-yellow-600", label:"ZIP" },
};

/*
 * Displays a compact colored badge indicating the file type.
 * Falls back to a generic gray style for unrecognized types.
 *
 * @param type - File extension string (e.g., "pdf", "docx")
 */
export function FileChip({ type }: { type: string }) {
    const m = FILE_TYPE_META[type] ?? { bg:"bg-gray-50", text:"text-gray-500", label: type.toUpperCase() };
    return (
        <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-[10px] font-bold tracking-wide flex-shrink-0 ${m.bg} ${m.text}`} style={{ fontFamily:"var(--font-mono)" }}>
            {m.label}
        </span>
    );
}

/*
 * Renders a colored pill badge for entity statuses (active, inactive, etc.).
 * Maps status strings to appropriate color schemes.
 *
 * @param status - Status string to display
 */
export function StatusPill({ status }: { status: string }) {
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

/*
 * Renders a colored pill badge for user roles with human-readable labels.
 * Normalizes input to lowercase and falls back to a generic style for unknown roles.
 *
 * @param role - Role string (admin, manager, user, or backend variant)
 */
export function RolePill({ role }: { role: string }) {
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

/*
 * Renders a circular avatar with initials and a deterministic background color.
 * Colors are assigned based on specific known initials, with a slate fallback.
 *
 * @param initials - One or two character string to display (e.g., "AC")
 * @param size - Avatar size variant controlling dimensions and font size
 */
export function Avatar({ initials, size = "md" }: { initials: string; size?: "xs"|"sm"|"md"|"lg" }) {
    // Predefined color palette keyed by common initials
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

/*
 * Renders a horizontal storage usage bar with percentage fill and optional label.
 * Color changes based on usage thresholds: blue (<65%), amber (65-85%), red (>85%).
 *
 * @param used - Amount of storage used (in GB)
 * @param quota - Total storage quota (in GB)
 * @param showLabel - Whether to display the "used / quota GB" text label
 */
export function StorageBar({ used, quota, showLabel = true }: { used: number; quota: number; showLabel?: boolean }) {
    const pct = Math.min((used / quota) * 100, 100);
    // Threshold-based color: red for >85%, amber for >65%, blue otherwise
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
