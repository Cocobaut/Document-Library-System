/**
 * Application Sidebar Navigation
 *
 * Renders the left sidebar with:
 * - Brand logo and product name
 * - Role-based navigation menu items
 * - User profile block with logout button
 */
import React from "react";
import { Home, FileText, Upload, LayoutDashboard, Building2, Users, BarChart2, Layers, LogOut, Key } from "lucide-react";
import { Role, UserRecord } from "../types";
import { Avatar } from "../utils";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { useState } from "react";

/**
 * Navigation item configuration for each user role.
 * Each role gets a different set of menu items with optional section grouping.
 */
export const NAV_ITEMS: Record<Role, Array<{ id:string; label:string; icon:React.ReactNode; section?:string }>> = {
    user: [
        { id:"home", label:"Home", icon:<Home size={17}/> },
        { id:"documents", label:"My Documents", icon:<FileText size={17}/> },
        { id:"upload", label:"Upload", icon:<Upload size={17}/> },
    ],
    manager: [
        { id:"home", label:"Dashboard", icon:<LayoutDashboard size={17}/> },
        { id:"documents", label:"Documents", icon:<FileText size={17}/> },
        { id:"upload", label:"Upload", icon:<Upload size={17}/> },
    ],
    admin: [
        { id:"units", label:"Units", icon:<Building2 size={17}/>, section:"Management" },
        { id:"users", label:"Users", icon:<Users size={17}/> },
        { id:"analytics", label:"Analytics", icon:<BarChart2 size={17}/> },
    ],
};

/**
 * Sidebar component providing role-based navigation, branding, and user profile.
 *
 * @param role - Current user's role, determines which nav items to display
 * @param active - ID of the currently active navigation item
 * @param setActive - Callback to change the active navigation item
 * @param onLogout - Callback triggered when the user clicks the logout button
 * @param user - Current user record for displaying profile info
 */
export function Sidebar({ role, active, setActive, onLogout, user }: {
    role: Role; active: string; setActive: (s: string) => void; onLogout: () => void; user: UserRecord;
}) {
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const items = NAV_ITEMS[role];
    // Track the last rendered section header to avoid duplicate section labels
    let lastSection = "";

    return (
        <aside className="w-[220px] flex-shrink-0 flex flex-col bg-white border-r border-slate-100 h-full" style={{ fontFamily:"var(--font-sans)" }}>
            {/* Brand */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 h-[60px]">
                <div className="w-8 h-8 bg-[#2563EB] rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-300">
                    <Layers size={16} className="text-white" />
                </div>
                <div>
                    <p className="text-sm font-bold text-slate-900 leading-none" style={{ fontFamily:"var(--font-display)" }}>DocLib</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Enterprise DMS</p>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 py-4 px-3 overflow-y-auto">
                {items.map(item => {
                    // Only render section headers when the section label changes
                    const showSection = item.section && item.section !== lastSection;
                    if (item.section) lastSection = item.section;
                    return (
                        <div key={item.id}>
                            {showSection && (
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 pt-4 pb-1.5">{item.section}</p>
                            )}
                            <button
                                onClick={() => setActive(item.id)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 mb-0.5 ${
                                    active === item.id
                                        ? "bg-[#2563EB] text-white shadow-sm shadow-blue-300"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                                }`}
                            >
                                <span className="flex-shrink-0">{item.icon}</span>
                                <span>{item.label}</span>
                            </button>
                        </div>
                    );
                })}
            </nav>

            {/* User block */}
            <div className="border-t border-slate-100 p-3">
                <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                    <Avatar initials={user.avatar} size="sm" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate" style={{ fontFamily:"var(--font-display)" }}>{user.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                    </div>
                    <button onClick={() => setIsChangePasswordOpen(true)} title="Change Password" className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200 hover:text-slate-700 text-slate-400 transition-colors">
                        <Key size={13} />
                    </button>
                    <button onClick={onLogout} title="Sign out" className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors">
                        <LogOut size={13} />
                    </button>
                </div>
            </div>
            
            <ChangePasswordDialog 
                isOpen={isChangePasswordOpen} 
                onClose={() => setIsChangePasswordOpen(false)} 
                token={localStorage.getItem("access_token") || ""}
            />
        </aside>
    );
}
