/*
 * Documents Tab
 *
 * Main document browsing interface shared by User and Manager dashboards.
 * Responsible for:
 * - Loading documents from the API with bookmark status merging
 * - Searching documents by name and owner
 * - Filtering by file type and sorting by name/date
 * - Displaying documents grouped into sections (My Documents, Shared, Inherited)
 * - Bookmark toggling, visibility toggling, document sharing, and deletion
 */
import React, { useState, useEffect } from "react";
import { Search, RefreshCw, SlidersHorizontal, FolderOpen, Users, Building2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Role, Doc, DocSection, Modal } from "../../types";
import { fetchDocumentsApi, fetchBookmarksApi, removeBookmarkApi, markBookmarkApi, shareDocumentApi, apiDocToDoc, fetchAllUnitsApi } from "../../services/documentApi";
import { TextInput, SelectInput, Btn, Field } from "../../components/DesignSystem";
import { ModalShell, Confirm, ToastBar } from "../../components/Modal";
import { DocRow } from "../../components/DocumentRow";

/*
 * Document listing component with search, filter, sort, and CRUD actions.
 *
 * @param role - Current user's role, controls which actions are available
 */
export function DocumentsTab({ role }: { role: Role }) {
    const [docs, setDocs] = useState<Doc[]>([]);
    const [totals, setTotals] = useState({ personal: 0, shared: 0, unit_inherited: 0 });
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState("");
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [sort, setSort] = useState("date-desc");
    const [modal, setModal] = useState<Modal>(null);
    const [toast, setToast] = useState<{ msg:string; type:"success"|"error"|"info" }|null>(null);
    const [shareForm, setShareForm] = useState({ username: "", unitId: "" });
    const [shareLoading, setShareLoading] = useState(false);
    const [units, setUnits] = useState<{unit_id: string, name: string}[]>([]);

    /*
     * Loads all documents and bookmarks in parallel, then merges bookmark status
     * into the document list. Documents from all three API sections (personal,
     * shared, unit_inherited) are combined into a single flat array.
     */
    const loadDocs = async () => {
        setLoading(true);
        setFetchError("");
        try {
            // Fetch documents and bookmarks concurrently to merge bookmark state
            const [data, bookmarks] = await Promise.all([
                fetchDocumentsApi(1, 100),
                fetchBookmarksApi()
            ]);

            const isBookmarked = (id: string) => bookmarks.includes(id);

            // Flatten all three document sections into a single array with section tags
            const allDocs: Doc[] = [
                ...data.items.personal.map(d => ({ ...apiDocToDoc(d, "mine"), bookmarked: isBookmarked(d.document_id) })),
                ...data.items.shared.map(d => ({ ...apiDocToDoc(d, "shared"), bookmarked: isBookmarked(d.document_id) })),
                ...data.items.unit_inherited.map(d => ({ ...apiDocToDoc(d, "inherited"), bookmarked: isBookmarked(d.document_id) })),
            ];
            setDocs(allDocs);
            setTotals(data.totals);
        } 
        catch (err: any) {
            setFetchError(err.message || "Failed to load documents");
        } 
        finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDocs();
        // Load available units for the share dialog's department dropdown
        fetchAllUnitsApi().then(setUnits).catch(() => {});
    }, []);

    /*
     * Applies search, type filter, and sort order to the document list.
     * Search matches against document name and owner (case-insensitive).
     */
    const filtered = docs
        .filter(d => {
            const q = search.toLowerCase();
            return (d.name.toLowerCase().includes(q) || d.owner.toLowerCase().includes(q))
                && (filterType === "all" || d.type === filterType);
        })
        .sort((a, b) => {
            // Sort by name or upload date in ascending or descending order
            if (sort === "name-asc") return a.name.localeCompare(b.name);
            if (sort === "name-desc") return b.name.localeCompare(a.name);
            if (sort === "date-asc") return a.uploadDate.localeCompare(b.uploadDate);
            return b.uploadDate.localeCompare(a.uploadDate);
        });

    /** Section configuration defining the three document groupings displayed in order. */
    const sections: { key: DocSection; label: string; desc: string }[] = [
        { key:"mine",      label:"My Uploaded Documents",   desc:"Files you have uploaded" },
        { key:"shared",    label:"Shared With Me",           desc:"Documents others shared with you" },
        { key:"inherited", label:"Inherited Documents",      desc:"Organization-wide documents" },
    ];

    /**
     * Toggles the bookmark status of a document via the API.
     * Optimistically updates the local state on success.
     *
     * @param id - Document ID to bookmark or un-bookmark
     */
    const onBookmark = async (id: string) => {
        const doc = docs.find(d => d.id === id);

        if (!doc) return;
        
        try {
            if (doc.bookmarked) {
                await removeBookmarkApi(id);
            } 
            else {
                await markBookmarkApi(id);
            }
            setDocs(p => p.map(d => d.id === id ? { ...d, bookmarked: !doc.bookmarked } : d));
            showToast(doc.bookmarked ? "Bookmark removed" : "Bookmark added", "success");
        } 
        catch (err: any) {
            showToast(err.message || "Failed to update bookmark", "error");
        }
    };

    /*
     * Toggles the public/private visibility of a document (local state only).
     *
     * @param id - Document ID to toggle
     */
    const onTogglePublic = (id: string) => {
        setDocs(p => p.map(d => d.id === id ? { ...d, isPublic: !d.isPublic } : d));
        showToast("Visibility updated", "info");
    };

    /*
     * Removes a document from the local list after deletion confirmation.
     *
     * @param id - Document ID to remove
     */
    const confirmDelete = (id: string) => {
        setDocs(p => p.filter(d => d.id !== id));
        setModal(null);
        showToast("Document deleted", "success");
    };

    /*
     * Displays a toast notification message.
     *
     * @param msg - Message text
     * @param type - Visual style variant
     */
    const showToast = (msg: string, type: "success"|"error"|"info" = "success") => setToast({ msg, type });

    /*
     * Shares a document with another user in a specified department via the API.
     * Validates that both username and unit are provided before submitting.
     */
    const handleShare = async () => {
        if (!modal || modal.type !== "share") return;
        
        if (!shareForm.username.trim() || !shareForm.unitId.trim()) {
            showToast("Please fill in all fields", "error");
            return;
        }
        
        setShareLoading(true);
        
        try {
            await shareDocumentApi(modal.doc.id, shareForm.username.trim(), shareForm.unitId.trim(), "view");
            showToast("Document shared successfully");
            setModal(null);
            setShareForm({ username: "", unitId: "" });
        } 
        catch (err: any) {
            showToast(err.message || "Failed to share document", "error");
        } 
        finally {
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
                    <TextInput value={search} onChange={v => setSearch(v)} placeholder="Search documents…" icon={<Search size={14}/>} />
                </div>
                <SelectInput value={filterType} onChange={v => setFilterType(v)}>
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

            {/* Document sections — each section shows documents filtered by ownership type */}
            {sections.map(sec => {
                const secDocs = filtered.filter(d => d.section === sec.key);
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


            {/* Share Modal */}
            {modal?.type === "share" && (
                <ModalShell title="Share Document" subtitle={modal.doc.name} onClose={() => setModal(null)}>
                    <div className="space-y-5">
                        <Field label="Username">
                            <TextInput value={shareForm.username} onChange={v => setShareForm(p => ({ ...p, username: v }))} placeholder="Enter username to share with…" icon={<Users size={14}/>} />
                        </Field>
                        <Field label="Department">
                            <SelectInput value={shareForm.unitId} onChange={v => setShareForm(p => ({ ...p, unitId: v }))}>
                                <option value="">Select department...</option>
                                {units.map(u => (
                                    <option key={u.unit_id} value={u.unit_id}>{u.name}</option>
                                ))}
                            </SelectInput>
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
