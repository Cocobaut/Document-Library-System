/**
 * Users Management Panel
 *
 * Admin panel for managing user accounts.
 * Responsible for:
 * - Loading and displaying all users in a filterable table
 * - Searching users by name, email, or department
 * - Filtering by role and account status
 * - Creating new user accounts with unit assignment
 * - Password reset dialog (UI only)
 * - User deletion with confirmation
 */
import React, { useState, useEffect } from "react";
import { Search, UserPlus, Users, AlertTriangle } from "lucide-react";
import { UserRecord, Role, Modal } from "../../types";
import { UnitStatResponse, fetchUsersApi, fetchUnitsStatsApi, createUserApi } from "../../services/documentApi";
import { Avatar, RolePill, StatusPill, StorageBar } from "../../utils";
import { Btn, Field, TextInput, SelectInput } from "../../components/DesignSystem";
import { ModalShell, Confirm, ToastBar } from "../../components/Modal";

/**
 * User management panel with search, filtering, and CRUD operations.
 * Fetches users and units in parallel to enable unit name resolution.
 */
export function UsersPanel() {
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [units, setUnits] = useState<UnitStatResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState("");

    const [search, setSearch] = useState("");
    const [filterRole, setFilterRole] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");
    const [modal, setModal] = useState<Modal>(null);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);

    const [form, setForm] = useState({ username: "", password: "", full_name: "", role: "USER", unit: "", quota: "10" });
    const [formLoading, setFormLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    /**
     * Loads all users and units in parallel. Maps API user responses to frontend
     * UserRecord format, resolving unit_id to unit name via a lookup map.
     */
    const loadData = async () => {
        setLoading(true);
        setFetchError("");
        try {
            const [usersData, unitsData] = await Promise.all([
                fetchUsersApi(),
                fetchUnitsStatsApi()
            ]);
            setUnits(unitsData);

            // Build a unit_id → unit_name lookup map for resolving user assignments
            const unitMap = new Map(unitsData.map(u => [u.unit_id, u.name]));

            /**
             * Transform API user responses into frontend UserRecord format.
             * Maps unit_id to human-readable unit name, normalizes status,
             * and generates avatar initials from the display name.
             */
            const mappedUsers: UserRecord[] = usersData.map(u => {
                const rawRole = (u.role || "user").toLowerCase();
                let normalizedRole: Role = "user";
                if (rawRole === "admin" || rawRole === "system admin" || rawRole === "system_admin") normalizedRole = "admin";
                else if (rawRole === "manager" || rawRole === "unit manager" || rawRole === "unit_manager") normalizedRole = "manager";

                return {
                    id: u.id,
                    name: u.full_name || u.username || "Unknown",
                    email: u.username || "Unknown",
                    role: normalizedRole,
                    unit: u.unit_id ? (unitMap.get(u.unit_id) || "Unknown") : "Unassigned",
                    status: u.is_active ? "active" : "inactive",
                    storageUsed: u.used_bytes || 0,
                    storageQuota: u.quota_bytes || 1,
                    lastLogin: u.updated_at,
                    avatar: (u.full_name || u.username || "U").substring(0, 2).toUpperCase(),
                    joined: u.created_at || new Date().toISOString(),
                };
            });
            setUsers(mappedUsers);
        }
        catch (err: any) {
            setFetchError(err.message || "Failed to load users");
        }
        finally {
            setLoading(false);
        }
    };

    /**
     * Displays a toast notification message.
     *
     * @param msg - Message text to display
     * @param type - Visual style variant
     */
    const showToast = (msg: string, type: "success" | "error" | "info" = "success") => setToast({ msg, type });

    /**
     * Creates a new user account. Resolves the selected unit name to its unit_id
     * before submitting to the API. Converts quota from GB to bytes.
     */
    const handleCreateUser = async () => {
        if (!form.username || !form.password || !form.full_name || !form.unit) {
            showToast("Please fill all required fields", "error");
            return;
        }
        // Resolve the user-selected department name to its backend unit_id
        const selectedUnit = units.find(u => u.name === form.unit);
        if (!selectedUnit) {
            showToast("Selected unit not found", "error");
            return;
        }

        setFormLoading(true);

        try {
            await createUserApi({
                username: form.username,
                password: form.password,
                full_name: form.full_name,
                role: form.role,
                unit_id: selectedUnit.unit_id,
                // Convert GB input to bytes (1 GB = 1024^3 bytes); fallback to 10 GB
                quota_bytes: Number(form.quota) * 1024 * 1024 * 1024 || 10737418240,
            });
            showToast("Account created successfully");
            setModal(null);
            loadData();
        }
        catch (err: any) {
            showToast(err.message || "Failed to create user", "error");
        }
        finally {
            setFormLoading(false);
        }
    };

    /**
     * Filters the user list based on search query, role filter, and status filter.
     * Search matches against name, email, and unit name (case-insensitive).
     */
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
                    <TextInput value={search} onChange={setSearch} placeholder="Search users…" icon={<Search size={14} />} />
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
                <Btn icon={<UserPlus size={13} />} onClick={() => { setForm({ username: "", password: "", full_name: "", role: "USER", unit: "", quota: "10" }); setModal({ type: "add-user" }); }} className="ml-auto">
                    Add User
                </Btn>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full" style={{ fontFamily: "var(--font-sans)" }}>
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
                                        <Users size={32} strokeWidth={1.2} className="mb-2" />
                                        <p className="text-sm text-slate-400">No users match your filters</p>
                                    </div>
                                </td></tr>
                            ) : filtered.map(u => (
                                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors last:border-0 group">
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center gap-2.5">
                                            <Avatar initials={u.avatar} size="sm" />
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">{u.name}</p>
                                                <p className="text-[11px] text-slate-400">{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5"><RolePill role={u.role} /></td>
                                    <td className="px-4 py-3.5 text-sm text-slate-600">{u.unit}</td>
                                    {/* Convert raw byte values to GB for the storage bar display */}
                                    <td className="px-4 py-3.5 min-w-[160px]"><StorageBar used={u.storageUsed / 1e9} quota={u.storageQuota / 1e9} /></td>
                                    <td className="px-4 py-3.5"><StatusPill status={u.status} /></td>
                                    <td className="px-4 py-3.5 text-[11px] text-slate-400 font-mono whitespace-nowrap">
                                        {/* Safely parse join date; show "Unknown" for invalid dates */}
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
                                <Field label="Username">
                                    <TextInput value={form.username} onChange={v => setForm(p => ({ ...p, username: v }))} placeholder="nguyenvand" icon={<Users size={14} />} />
                                </Field>
                            </div>
                            <div className="col-span-2">
                                <Field label="Password">
                                    <TextInput value={form.password} onChange={v => setForm(p => ({ ...p, password: v }))} placeholder="Password" type="password" />
                                </Field>
                            </div>
                            <div className="col-span-2">
                                <Field label="Full Name">
                                    <TextInput value={form.full_name} onChange={v => setForm(p => ({ ...p, full_name: v }))} placeholder="Nguyễn Văn C" />
                                </Field>
                            </div>
                            <div className="col-span-2">
                                <Field label="Role">
                                    <SelectInput value={form.role} onChange={v => setForm(p => ({ ...p, role: v }))}>
                                        <option value="USER">USER</option>
                                        <option value="UNIT_MANAGER">UNIT_MANAGER</option>
                                        <option value="ADMIN">ADMIN</option>
                                    </SelectInput>
                                </Field>
                            </div>
                            <div className="col-span-2">
                                <Field label="Department">
                                    {/* Populate department options from the loaded units list; value is unit name (resolved to unit_id on submit) */}
                                    <SelectInput value={form.unit} onChange={v => setForm(p => ({ ...p, unit: v }))}>
                                        <option value="">Select…</option>
                                        {units.map(u => <option key={u.unit_id} value={u.name}>{u.name}</option>)}
                                    </SelectInput>
                                </Field>
                            </div>
                            <div className="col-span-2">
                                <Field label="Quota (GB)">
                                    <TextInput value={form.quota} onChange={v => setForm(p => ({ ...p, quota: v }))} placeholder="10" />
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
                            <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
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
