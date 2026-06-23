/**
 * Root Application Component
 *
 * Responsible for:
 * - Restoring authentication state from localStorage on mount
 * - Managing the login/app view toggle
 * - Routing to the correct role-based dashboard (Admin, Manager, User)
 * - Providing logout functionality that clears the session
 */
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
    // Attempt to restore a previous session from the stored JWT token
    const stored = getStoredAuth();
    const [view, setView] = useState<"login"|"app">(stored ? "app" : "login");
    const [role, setRole] = useState<Role>(stored?.role ?? "user");
    const [user, setUser] = useState<UserRecord>(
        stored ? buildUserFromAuth({ username: stored.username, role: stored.role, userId: stored.userId, unitName: stored.unitName }) : defaultUser
    );
    const [activeNav, setActiveNav] = useState(stored?.role === "admin" ? "units" : "home");
    const [navKey, setNavKey] = useState(0);

    /**
     * Handles successful login by storing the token and transitioning to the app view.
     * Sets the initial navigation based on role: admins see "units", others see "home".
     *
     * @param token - JWT access token from the login response
     * @param r - The authenticated user's role
     * @param username - The authenticated user's username
     * @param userId - The authenticated user's unique identifier
     * @param unitName - The user's organizational unit name (optional)
     */
    const handleLogin = (token: string, r: Role, username: string, userId: string, unitName?: string) => {
        localStorage.setItem("access_token", token);
        const userRecord = buildUserFromAuth({ username, role: r, userId, unitName });
        setRole(r);
        setUser(userRecord);
        setView("app");
        setActiveNav(r === "admin" ? "units" : "home");
    };

    /**
     * Logs the user out by clearing the stored token and resetting to the login view.
     */
    const handleLogout = () => {
        localStorage.removeItem("access_token");
        setView("login");
        setRole("user");
    };

    /**
     * Handles sidebar navigation clicks. Increments navKey to force
     * child components to re-fetch data when navigating back to the same tab.
     *
     * @param id - The navigation item identifier to activate
     */
    const handleNavClick = (id: string) => {
        setActiveNav(id);
        setNavKey(k => k + 1);
    };

    if (view === "login") return <LoginPage onLogin={handleLogin}/>;

    /**
     * Renders the appropriate dashboard component based on the user's role.
     * Admin → AdminDashboard, Manager → ManagerDashboard, User → UserDashboard.
     */
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
