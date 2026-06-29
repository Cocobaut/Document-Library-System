/*
 * Documents Tab
 *
 * Main document browsing interface shared by User and Manager dashboards.
 * Responsible for:
 * - Loading documents from the API with bookmark status merging
 * - Searching documents by name and owner
 * - Filtering by file type, sorting by name/date, and filtering by Task (Label)
 * - Displaying documents grouped into sections (My Documents, Shared, Inherited)
 * - Bookmark toggling, visibility toggling, document sharing, task assignment, and deletion
 * - Infinite scrolling for each document section independently
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, RefreshCw, SlidersHorizontal, FolderOpen, Users, AlertCircle, Tag } from "lucide-react";
import { Role, Doc, DocSection, Modal, Task } from "../../types";
import { fetchDocumentsApi, fetchBookmarksApi, removeBookmarkApi, markBookmarkApi, shareDocumentApi, apiDocToDoc, fetchAllUnitsApi, downloadDocumentApi, deleteDocumentApi } from "../../services/documentApi";
import { fetchTasksApi } from "../../services/taskApi";
import { TextInput, SelectInput, Btn, Field } from "../../components/DesignSystem";
import { ModalShell, Confirm, ToastBar } from "../../components/Modal";
import { DocRow } from "../../components/DocumentRow";
import { TaskDialog } from "../../components/TaskDialog";

const PAGE_SIZE = 15;

function ScrollTrigger({ onTrigger, loading, hasMore }: { onTrigger: () => void, loading: boolean, hasMore: boolean }) {
    const observer = useRef<IntersectionObserver | null>(null);
    const triggerRef = useCallback((node: HTMLDivElement) => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                onTrigger();
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore, onTrigger]);

    if (!hasMore) {
        return <div className="text-center py-4 text-xs text-slate-400">No more documents.</div>;
    }

    return (
        <div ref={triggerRef} className="py-4 flex justify-center">
            {loading && <div className="w-5 h-5 border-2 border-slate-200 border-t-[#2563EB] rounded-full animate-spin" />}
        </div>
    );
}

export function DocumentsTab({ role, userUnitName }: { role: Role, userUnitName?: string }) {
    const [docs, setDocs] = useState<Doc[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [totals, setTotals] = useState({ personal: 0, shared: 0, unit_inherited: 0 });
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState("");
    
    // Filters
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [sort, setSort] = useState("date-desc");
    const [filterTask, setFilterTask] = useState("all");
    const [filterBookmark, setFilterBookmark] = useState("all");

    const [modal, setModal] = useState<Modal>(null);
    const [toast, setToast] = useState<{ msg:string; type:"success"|"error"|"info" }|null>(null);
    
    const [shareForm, setShareForm] = useState({ username: "", unitId: "" });
    const [shareLoading, setShareLoading] = useState(false);
    
    const [units, setUnits] = useState<{unit_id: string, name: string}[]>([]);

    // Pagination states
    const [pages, setPages] = useState({ mine: 1, shared: 1, inherited: 1 });
    const [hasMore, setHasMore] = useState({ mine: true, shared: true, inherited: true });
    const [loadingMore, setLoadingMore] = useState({ mine: false, shared: false, inherited: false });
    // Keep bookmarks cached to avoid fetching on every pagination
    const [bookmarksCache, setBookmarksCache] = useState<string[]>([]);

    const loadDocs = async () => {
        setLoading(true);
        setFetchError("");
        try {
            const [data, bookmarks, tasksData] = await Promise.all([
                fetchDocumentsApi(1, PAGE_SIZE),
                fetchBookmarksApi(),
                fetchTasksApi()
            ]);

            setBookmarksCache(bookmarks);
            const isBookmarked = (id: string) => bookmarks.includes(id);

            const allDocs: Doc[] = [
                ...data.items.personal.map(d => ({ ...apiDocToDoc(d, "mine"), bookmarked: isBookmarked(d.document_id) })),
                ...data.items.shared.map(d => ({ ...apiDocToDoc(d, "shared"), bookmarked: isBookmarked(d.document_id) })),
                ...data.items.unit_inherited.map(d => ({ ...apiDocToDoc(d, "inherited"), bookmarked: isBookmarked(d.document_id) })),
            ];
            setDocs(allDocs);
            setTotals(data.totals);
            setTasks(tasksData);
            
            setPages({ mine: 1, shared: 1, inherited: 1 });
            setHasMore({
                mine: data.items.personal.length === PAGE_SIZE,
                shared: data.items.shared.length === PAGE_SIZE,
                inherited: data.items.unit_inherited.length === PAGE_SIZE,
            });
        } 
        catch (err: any) {
            setFetchError(err.message || "Failed to load documents");
        } 
        finally {
            setLoading(false);
        }
    };

    const loadMore = async (section: DocSection) => {
        if (loadingMore[section] || !hasMore[section]) return;
        
        setLoadingMore(p => ({ ...p, [section]: true }));
        try {
            const nextPage = pages[section] + 1;
            const data = await fetchDocumentsApi(nextPage, PAGE_SIZE);
            const isBookmarked = (id: string) => bookmarksCache.includes(id);

            let newDocs: Doc[] = [];
            if (section === "mine") {
                newDocs = data.items.personal.map(d => ({ ...apiDocToDoc(d, "mine"), bookmarked: isBookmarked(d.document_id) }));
            } else if (section === "shared") {
                newDocs = data.items.shared.map(d => ({ ...apiDocToDoc(d, "shared"), bookmarked: isBookmarked(d.document_id) }));
            } else if (section === "inherited") {
                newDocs = data.items.unit_inherited.map(d => ({ ...apiDocToDoc(d, "inherited"), bookmarked: isBookmarked(d.document_id) }));
            }

            setDocs(p => {
                const existingIds = new Set(p.map(d => d.id));
                const uniqueNew = newDocs.filter(d => !existingIds.has(d.id));
                return [...p, ...uniqueNew];
            });

            setPages(p => ({ ...p, [section]: nextPage }));
            setHasMore(p => ({ ...p, [section]: newDocs.length === PAGE_SIZE }));
            
        } catch (err: any) {
            showToast(err.message || `Failed to load more documents`, "error");
        } finally {
            setLoadingMore(p => ({ ...p, [section]: false }));
        }
    };

    useEffect(() => {
        loadDocs();
        fetchAllUnitsApi().then(setUnits).catch(() => {});
    }, []);

    // Unique tasks for filter dropdown
    const uniqueTaskNames = Array.from(new Map(tasks.map(t => [t.taskName, t])).values());

    const filtered = docs
        .filter(d => {
            const q = search.toLowerCase();
            const docTask = tasks.find(t => t.documentId === d.id);
            const matchesName = d.name.toLowerCase().includes(q);
            const matchesOwner = d.owner.toLowerCase().includes(q);
            const matchesFolder = d.folderName ? d.folderName.toLowerCase().includes(q) : false;
            
            return (matchesName || matchesOwner || matchesFolder)
                && (filterType === "all" || d.type === filterType)
                && (filterTask === "all" || docTask?.taskName === filterTask)
                && (filterBookmark === "all" || (filterBookmark === "bookmarked" && d.bookmarked));
        })
        .sort((a, b) => {
            if (sort === "name-asc") return a.name.localeCompare(b.name);
            if (sort === "name-desc") return b.name.localeCompare(a.name);
            if (sort === "date-asc") return a.uploadDate.localeCompare(b.uploadDate);
            return b.uploadDate.localeCompare(a.uploadDate);
        });

    const sections: { key: DocSection; label: string; desc: string }[] = [
        { key:"mine",      label:"My Uploaded Documents",   desc:"Files you have uploaded" },
        { key:"shared",    label:"Shared With Me",           desc:"Documents others shared with you" },
        { key:"inherited", label:"Inherited Documents",      desc:"Organization-wide documents" },
    ];

    const onBookmark = async (id: string) => {
        const doc = docs.find(d => d.id === id);
        if (!doc) return;
        try {
            if (doc.bookmarked) await removeBookmarkApi(id);
            else await markBookmarkApi(id);
            
            setDocs(p => p.map(d => d.id === id ? { ...d, bookmarked: !doc.bookmarked } : d));
            
            setBookmarksCache(p => {
                if (doc.bookmarked) return p.filter(bid => bid !== id);
                return [...p, id];
            });
            showToast(doc.bookmarked ? "Bookmark removed" : "Bookmark added", "success");
        } 
        catch (err: any) {
            showToast(err.message || "Failed to update bookmark", "error");
        }
    };

    const onDownload = async (doc: Doc) => {
        try {
            await downloadDocumentApi(doc.id, doc.name);
        } catch (err: any) {
            showToast(err.message || "Failed to download document", "error");
        }
    };

    const onTogglePublic = (id: string) => {
        setDocs(p => p.map(d => d.id === id ? { ...d, isPublic: !d.isPublic } : d));
        showToast("Visibility updated", "info");
    };

    const confirmDelete = async (id: string) => {
        try {
            await deleteDocumentApi(id);
            setDocs(p => p.filter(d => d.id !== id));
            setModal(null);
            showToast("Document deleted", "success");
        } catch (err: any) {
            showToast(err.message || "Failed to delete document", "error");
        }
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
                    <option value="name-asc">Name A-Z</option>
                    <option value="name-desc">Name Z-A</option>
                </SelectInput>
                <SelectInput value={filterTask} onChange={setFilterTask}>
                    <option value="all">All Tasks</option>
                    {uniqueTaskNames.map(t => (
                        <option key={t.taskId} value={t.taskName}>{t.taskName}</option>
                    ))}
                </SelectInput>
                <SelectInput value={filterBookmark} onChange={setFilterBookmark}>
                    <option value="all">All Documents</option>
                    <option value="bookmarked">Bookmarked Only</option>
                </SelectInput>

                <Btn variant="ghost" size="sm" icon={<RefreshCw size={13}/>} onClick={loadDocs}>Refresh</Btn>
                <span className="text-xs text-slate-400 ml-auto">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
            </div>

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
                                    {search || filterType !== "all" || filterTask !== "all" ? "No matching documents" : "No documents in this section"}
                                </p>
                            </div>
                        ) : (
                            <div className="p-2 max-h-[400px] overflow-y-auto">
                                {secDocs.map(doc => {
                                    const unitName = units.find(u => u.unit_id === doc.unitId)?.name;
                                    const docTask = tasks.find(t => t.documentId === doc.id);
                                    return (
                                        <DocRow
                                            key={doc.id} doc={doc} role={role} unitName={unitName} task={docTask} userUnitName={userUnitName}
                                            onBookmark={onBookmark}
                                            onShare={doc => { setShareForm({ username: "", unitId: "" }); setModal({ type:"share", doc }); }}
                                            onTask={doc => setModal({ type: "task", doc })}
                                            onDelete={id => setModal({ type:"delete-doc", id })}
                                            onTogglePublic={onTogglePublic}
                                            onDownload={() => onDownload(doc)}
                                        />
                                    );
                                })}
                                <ScrollTrigger 
                                    loading={loadingMore[sec.key]} 
                                    hasMore={hasMore[sec.key]} 
                                    onTrigger={() => loadMore(sec.key)} 
                                />
                            </div>
                        )}
                    </div>
                );
            })}

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

            {modal?.type === "task" && (
                <TaskDialog
                    doc={modal.doc}
                    existingTask={tasks.find(t => t.documentId === modal.doc.id)}
                    onClose={() => setModal(null)}
                    onSuccess={(newTask) => {
                        setTasks(prev => {
                            const index = prev.findIndex(t => t.taskId === newTask.taskId);
                            if (index >= 0) {
                                const newTasks = [...prev];
                                newTasks[index] = newTask;
                                return newTasks;
                            }
                            return [...prev, newTask];
                        });
                        showToast(`Task '${newTask.taskName}' saved successfully`);
                    }}
                    onDelete={(taskId) => {
                        setTasks(prev => prev.filter(t => t.taskId !== taskId));
                        showToast(`Task removed successfully`);
                    }}
                    onError={(msg) => showToast(msg, "error")}
                />
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
