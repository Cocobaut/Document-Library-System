/**
 * Document Row Component
 *
 * Renders a single document entry in the document list view.
 * Displays file type badge, document metadata, status indicators,
 * and action buttons (share, bookmark, download, delete, visibility toggle).
 * Action visibility is controlled by the current user's role.
 */
import React from "react";
import { Share2, Globe, Lock, Star, Download, Trash2 } from "lucide-react";
import { Doc, Role } from "../types";
import { FileChip, StatusPill } from "../utils";

/**
 * Renders a single document row with metadata, status, and action buttons.
 * Role-based permissions control which actions are available.
 *
 * @param doc - The document data to display
 * @param role - Current user's role (controls delete and visibility toggle access)
 * @param onBookmark - Callback when bookmark button is clicked
 * @param onShare - Callback when share button is clicked
 * @param onDelete - Callback when delete button is clicked
 * @param onTogglePublic - Callback when public/private toggle is clicked
 */
export function DocRow({
    doc, role, onBookmark, onShare, onDelete, onTogglePublic,
}: {
    doc: Doc; role: Role;
    onBookmark: (id: string) => void;
    onShare: (doc: Doc) => void;
    onDelete: (id: string) => void;
    onTogglePublic: (id: string) => void;
}) {
    // Only non-user roles (manager, admin) can delete documents and toggle visibility
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

            {/* Status indicators — only visible on hover */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center gap-1.5">
                <StatusPill status={doc.status} />
                {canToggle && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${doc.isPublic ? "bg-green-50 text-green-600 border-green-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                        {doc.isPublic ? "Public" : "Private"}
                    </span>
                )}
            </div>

            {/* Action buttons */}
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
                {/* Share button only available for the user's own documents */}
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
