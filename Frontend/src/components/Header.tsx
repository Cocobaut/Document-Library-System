/**
 * Application Header Bar
 *
 * Displays the page title, optional subtitle, a quick search input,
 * and a notifications dropdown with unread indicator badge.
 */
import React, { useState } from "react";
import { Search, Bell } from "lucide-react";

/** Static notification data for the notification dropdown panel. */
export const NOTIFS = [
    { id:1, text:"Maria Santos shared «Sales Analytics Dashboard» with you", time:"2 min ago", read:false },
    { id:2, text:"Upload complete: Q4 Budget Forecast.xlsx", time:"1h ago", read:false },
    { id:3, text:"IT Security Policy v2 was published", time:"3h ago", read:true },
    { id:4, text:"Sara Kim's account has been disabled", time:"Yesterday", read:true },
];

/**
 * Top header bar component rendered above the main content area.
 * Includes page title/subtitle, search bar, and notification bell with dropdown.
 *
 * @param title - Primary heading text for the current page
 * @param subtitle - Optional secondary text displayed below the title
 */
export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
    const [notifOpen, setNotifOpen] = useState(false);
    const unread = NOTIFS.filter(n => !n.read).length;

    return (
        <header className="h-[60px] bg-white border-b border-slate-100 flex items-center justify-between px-6 flex-shrink-0 z-10">
            <div>
                <h2 className="text-[15px] font-semibold text-slate-900 leading-none" style={{ fontFamily:"var(--font-display)" }}>{title}</h2>
                {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2">
                {/* Search */}
                <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 w-52">
                    <Search size={14} className="text-slate-400 flex-shrink-0" />
                    <input placeholder="Quick search…" className="bg-transparent text-sm text-slate-600 placeholder:text-slate-400 outline-none w-full" style={{ fontFamily:"var(--font-sans)" }} />
                </div>

                {/* Notifications bell with dropdown */}
                <div className="relative">
                    <button onClick={() => setNotifOpen(!notifOpen)} className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors border border-transparent hover:border-slate-200">
                        <Bell size={17} />
                        {unread > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#2563EB] rounded-full ring-2 ring-white" />
                        )}
                    </button>
                    {notifOpen && (
                        <div className="absolute right-0 top-11 w-[340px] bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-slate-800" style={{ fontFamily:"var(--font-display)" }}>Notifications</span>
                                    {unread > 0 && <span className="w-5 h-5 bg-[#2563EB] text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unread}</span>}
                                </div>
                                <button className="text-xs text-[#2563EB] font-medium hover:text-blue-800">Mark all read</button>
                            </div>
                            {NOTIFS.map(n => (
                                <div key={n.id} className={`px-4 py-3.5 flex gap-3 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0 ${n.read ? "" : "bg-blue-50/40"}`}>
                                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.read ? "bg-transparent" : "bg-[#2563EB]"}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-slate-700 leading-relaxed">{n.text}</p>
                                        <p className="text-[10px] text-slate-400 mt-1">{n.time}</p>
                                    </div>
                                </div>
                            ))}
                            <div className="px-4 py-3 text-center">
                                <button className="text-xs text-[#2563EB] font-medium">View all notifications</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
