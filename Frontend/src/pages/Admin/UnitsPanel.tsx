import React, { useState, useEffect } from "react";
import { RefreshCw, Plus, Building2, Users, FileText, AlertCircle, Edit3, Trash2 } from "lucide-react";
import { UnitStatResponse, UnitDetailResponse, fetchUnitsStatsApi, fetchUnitDetailApi, createUnitApi, updateUnitApi, deleteUnitApi } from "../../services/documentApi";
import { Modal, Unit } from "../../types";
import { fmtSize, Avatar, StatusPill, StorageBar } from "../../utils";
import { Btn, Field, TextInput } from "../../components/DesignSystem";
import { ModalShell, Confirm, ToastBar } from "../../components/Modal";

export function UnitsPanel() {
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
