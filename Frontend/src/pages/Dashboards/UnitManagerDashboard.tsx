/*
 * Unit Manager Dashboard
 *
 * Responsible for:
 * - Displaying department-level KPI cards (documents, members, storage, inherited docs)
 * - Showing a members table with quota and status information
 * - Routing to Documents and Upload tabs based on sidebar navigation
 * - Loading data from the manager-specific API endpoints
 */
import React, { useState, useEffect } from "react";
import { FileText, Users, HardDrive, Layers, Archive } from "lucide-react";
import { UserRecord } from "../../types";
import { UnitStorageStats, UserResponse, fetchManagerStatsApi, fetchManagerUsersApi } from "../../services/documentApi";
import { fmtSize } from "../../utils";
import { Header } from "../../components/Header";
import { DocumentsTab } from "../User/DocumentsTab";
import { UploadTab } from "../User/UploadTab";

/*
 * Dashboard component for unit managers showing department statistics and member list.
 * Switches to DocumentsTab or UploadTab based on navigation.
 *
 * @param user - Current manager user record
 * @param activeNav - Active sidebar navigation item (home, documents, upload)
 */
export function ManagerDashboard({ user, activeNav }: { user: UserRecord, activeNav: string }) {
    const [stats, setStats] = useState<UnitStorageStats | null>(null);
    const [users, setUsers] = useState<UserResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    /*
     * Loads department statistics and member list in parallel.
     * Updates both stats and users state, or sets an error message on failure.
     */
    const loadData = async () => {
        setLoading(true);
        setError("");
        
        try {
            // Fetch unit stats and user list concurrently for faster page load
            const [s, u] = await Promise.all([
                fetchManagerStatsApi(),
                fetchManagerUsersApi()
            ]);
            setStats(s);
            setUsers(u);
        } 
        catch (err: any) {
            setError(err.message || "Failed to load dashboard data");
        } 
        finally {
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
