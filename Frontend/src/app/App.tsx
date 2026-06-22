import React, { useState } from "react";
import { Role, UserRecord } from "../types";
import { getStoredAuth, buildUserFromAuth } from "../services/authApi";
import { defaultUser } from "../data/seedData";
import { Sidebar } from "../components/Sidebar";
import { LoginPage } from "../pages/LoginPage";
import { AdminDashboard } from "../pages/Dashboards/AdminDashboard";
import { ManagerDashboard } from "../pages/Dashboards/UnitManagerDashboard";
import { UserDashboard } from "../pages/Dashboards/UserDashboard";

export default function App() {
  const stored = getStoredAuth();
  const [view, setView] = useState<"login"|"app">(stored ? "app" : "login");
  const [role, setRole] = useState<Role>(stored?.role ?? "user");
  const [user, setUser] = useState<UserRecord>(
    stored ? buildUserFromAuth({ username: stored.username, role: stored.role, userId: stored.userId, unitName: stored.unitName }) : defaultUser
  );
  const [activeNav, setActiveNav] = useState(stored?.role === "admin" ? "units" : "home");
  const [navKey, setNavKey] = useState(0);

  const handleLogin = (token: string, r: Role, username: string, userId: string, unitName?: string) => {
    localStorage.setItem("access_token", token);
    const userRecord = buildUserFromAuth({ username, role: r, userId, unitName });
    setRole(r);
    setUser(userRecord);
    setView("app");
    setActiveNav(r === "admin" ? "units" : "home");
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    setView("login");
    setRole("user");
  };

  const handleNavClick = (id: string) => {
    setActiveNav(id);
    setNavKey(k => k + 1);
  };

  if (view === "login") return <LoginPage onLogin={handleLogin}/>;

  const renderMain = () => {
    if (role === "admin")   return <AdminDashboard user={user} activeNav={activeNav}/>;
    if (role === "manager") return <ManagerDashboard user={user} activeNav={activeNav}/>;
    return <UserDashboard user={user} activeNav={activeNav} navKey={navKey}/>;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar role={role} active={activeNav} setActive={handleNavClick} onLogout={handleLogout} user={user}/>
      <div className="flex flex-col flex-1 overflow-hidden">
        {renderMain()}
      </div>
    </div>
  );
}
