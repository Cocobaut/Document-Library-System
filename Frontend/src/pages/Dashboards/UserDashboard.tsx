import React, { useState, useEffect } from "react";
import { FileText, Inbox, Archive, Star } from "lucide-react";
import { UserRecord } from "../../types";
import { fetchDocumentsApi } from "../../services/documentApi";
import { Header } from "../../components/Header";
import { DocumentsTab } from "../User/DocumentsTab";
import { UploadTab } from "../User/UploadTab";

export function UserDashboard({ user, activeNav, navKey }: { user: UserRecord, activeNav: string, navKey?: number }) {
  const [totals, setTotals] = useState({ personal: 0, shared: 0, unit_inherited: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeNav === "home") {
      setLoading(true);
      fetchDocumentsApi(1, 20)
        .then(res => {
          setTotals({
            personal: res.totals.personal || 0,
            shared: res.totals.shared || 0,
            unit_inherited: res.totals.unit_inherited || 0
          });
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [activeNav, navKey]);

  if (activeNav === "documents") return <div className="flex-1 overflow-y-auto bg-slate-50 p-6"><DocumentsTab role={user.role}/></div>;
  if (activeNav === "upload") return <div className="flex-1 overflow-y-auto bg-slate-50 p-6"><UploadTab role={user.role}/></div>;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="Document Library"
        subtitle={`Welcome back, ${user.name.split(" ")[0]}${user.unit ? ` • ${user.unit}` : ""}`}
      />
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
          {/* Mini KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label:"My Documents", value:totals.personal, icon:<FileText size={15}/>, color:"blue" as const },
              { label:"Shared With Me", value:totals.shared, icon:<Inbox size={15}/>, color:"green" as const },
              { label:"Inherited Documents", value:totals.unit_inherited, icon:<Archive size={15}/>, color:"purple" as const },
            ].map(k => (
              <div key={k.label} className={`bg-white rounded-xl border border-slate-200 px-4 py-3.5 flex items-center gap-3 shadow-sm ${loading ? 'opacity-50' : ''}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  k.color === "blue" ? "bg-blue-50 text-[#2563EB]" :
                  k.color === "green" ? "bg-emerald-50 text-emerald-600" :
                  "bg-violet-50 text-violet-600"
                }`}>{k.icon}</div>
                <div>
                  <p className="text-lg font-bold text-slate-900 leading-none" style={{ fontFamily:"var(--font-display)" }}>
                    {loading ? "..." : k.value}
                  </p>
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
