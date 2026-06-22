import React, { useState, useEffect } from "react";
import { AlertCircle, RefreshCw, Building2, Users, FileText, HardDrive } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { fetchAnalyticsOverviewApi, fetchDocumentStatsApi, fetchUnitsQuotaApi } from "../../services/documentApi";
import { fmtSize } from "../../utils";
import { Btn } from "../../components/DesignSystem";

export function AnalyticsPanel() {
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
