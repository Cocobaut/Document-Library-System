/**
 * Modal Dialog Components
 *
 * Provides reusable overlay dialog primitives:
 * - ModalShell: General-purpose modal with title, subtitle, and scrollable content
 * - Confirm: Confirmation dialog with accept/cancel actions and danger variant
 * - ToastBar: Auto-dismissing notification bar for success/error/info messages
 */
import React, { useEffect } from "react";
import { X, AlertTriangle, Info, CheckCircle, AlertCircle } from "lucide-react";
import { Btn } from "./DesignSystem";

/**
 * General-purpose modal shell with backdrop overlay, title bar, and scrollable content area.
 * Clicking the backdrop dismisses the modal.
 *
 * @param title - Modal heading text
 * @param subtitle - Optional secondary description text
 * @param onClose - Callback triggered when the modal is dismissed
 * @param children - Modal body content
 * @param size - Width variant: "sm" (max-w-sm), "md" (max-w-md), or "lg" (max-w-2xl)
 */
export function ModalShell({ title, subtitle, onClose, children, size = "md" }: {
    title: string; subtitle?: string; onClose: () => void;
    children: React.ReactNode; size?: "sm"|"md"|"lg";
}) {
    const widths = { sm:"max-w-sm", md:"max-w-md", lg:"max-w-2xl" };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} />
            <div className={`relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full ${widths[size]} flex flex-col max-h-[90vh]`}>
                <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
                    <div>
                        <h3 className="text-base font-semibold text-slate-900" style={{ fontFamily:"var(--font-display)" }}>{title}</h3>
                        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0 ml-4">
                        <X size={16} />
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
            </div>
        </div>
    );
}

/**
 * Confirmation dialog with an icon, message, and two action buttons.
 * Supports a "danger" variant for destructive actions (red icon, "Delete" label).
 *
 * @param title - Confirmation heading
 * @param message - Descriptive text explaining the action
 * @param onConfirm - Callback when the user confirms the action
 * @param onCancel - Callback when the user cancels
 * @param danger - If true, renders with a red warning icon and "Delete" button
 */
export function Confirm({ title, message, onConfirm, onCancel, danger = false }: {
    title: string; message: string; onConfirm: () => void; onCancel: () => void; danger?: boolean;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={onCancel} />
            <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${danger ? "bg-red-50" : "bg-blue-50"}`}>
                    {danger ? <AlertTriangle size={22} className="text-red-500" /> : <Info size={22} className="text-[#2563EB]" />}
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2" style={{ fontFamily:"var(--font-display)" }}>{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-6">{message}</p>
                <div className="flex gap-3">
                    <Btn variant="outline" className="flex-1" onClick={onCancel}>Cancel</Btn>
                    <Btn variant={danger ? "danger" : "primary"} className="flex-1" onClick={onConfirm}>
                        {danger ? "Delete" : "Confirm"}
                    </Btn>
                </div>
            </div>
        </div>
    );
}

/**
 * Auto-dismissing toast notification bar displayed at the bottom-right of the screen.
 * Automatically calls onDone after 3 seconds to remove itself.
 *
 * @param msg - The notification message text
 * @param type - Visual style: "success" (green), "error" (red), or "info" (blue)
 * @param onDone - Callback fired after the 3-second auto-dismiss timer expires
 */
export function ToastBar({ msg, type = "success", onDone }: { msg: string; type?: "success"|"error"|"info"; onDone: () => void }) {
    // Auto-dismiss after 3 seconds; cleanup timer on unmount
    useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, []);
    const styles = {
        success: "bg-emerald-600 text-white",
        error:   "bg-red-500 text-white",
        info:    "bg-[#2563EB] text-white",
    };
    const icons = { success:<CheckCircle size={15}/>, error:<AlertCircle size={15}/>, info:<Info size={15}/> };
    return (
        <div className={`fixed bottom-5 right-5 z-[60] flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${styles[type]}`} style={{ fontFamily:"var(--font-sans)" }}>
            {icons[type]} {msg}
        </div>
    );
}
