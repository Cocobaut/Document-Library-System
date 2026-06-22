import React from "react";
import { UserRecord } from "../../types";
import { Header } from "../../components/Header";
import { AnalyticsPanel } from "../Admin/AnalyticsPanel";
import { UnitsPanel } from "../Admin/UnitsPanel";
import { UsersPanel } from "../Admin/UsersPanel";

export function AdminDashboard({ user, activeNav: rawNav }: { user: UserRecord, activeNav: string }) {
  const activeNav = rawNav === "home" || rawNav === "settings" ? "units" : rawNav;
  const tabMeta: Record<string, string> = { analytics:"Analytics Overview", units:"Unit Management", users:"User Management" };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title={tabMeta[activeNav] || "Dashboard"} subtitle="System Administration" />
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
          {activeNav === "analytics" && <AnalyticsPanel/>}
          {activeNav === "units" && <UnitsPanel/>}
          {activeNav === "users" && <UsersPanel/>}
        </div>
      </main>
    </div>
  );
}
