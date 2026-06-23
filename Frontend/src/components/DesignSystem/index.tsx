/**
 * Design System Primitives
 *
 * Provides foundational UI components used throughout the application:
 * - Btn: Multi-variant button component
 * - Field: Labeled form field wrapper
 * - TextInput: Styled text input with icon/suffix support
 * - SelectInput: Styled native select dropdown
 */
import React from "react";

/**
 * Multi-variant button component supporting primary, secondary, ghost,
 * danger, outline, and success visual styles with configurable sizes.
 *
 * @param children - Button label content
 * @param variant - Visual style variant (defaults to "primary")
 * @param size - Size variant controlling padding and font size (defaults to "md")
 * @param onClick - Click event handler
 * @param disabled - Whether the button is disabled
 * @param className - Additional CSS classes to merge
 * @param icon - Optional icon element rendered before the label
 */
export function Btn({
    children, variant = "primary", size = "md", onClick, disabled, className = "", icon,
}: {
    children?: React.ReactNode; variant?: "primary"|"secondary"|"ghost"|"danger"|"outline"|"success";
    size?: "xs"|"sm"|"md"|"lg"; onClick?: () => void; disabled?: boolean; className?: string; icon?: React.ReactNode;
}) {
    const base = "inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-all duration-150 select-none cursor-pointer whitespace-nowrap";
    const sizes = { xs:"px-2.5 py-1 text-[11px]", sm:"px-3 py-1.5 text-xs", md:"px-4 py-2 text-sm", lg:"px-5 py-2.5 text-sm" };
    const variants = {
        primary:   "bg-[#2563EB] text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm shadow-blue-200",
        secondary: "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200",
        ghost:     "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
        danger:    "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200",
        outline:   "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300",
        success:   "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200",
    };
    return (
        <button
            onClick={onClick} disabled={disabled}
            className={`${base} ${sizes[size]} ${variants[variant]} ${disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""} ${className}`}
            style={{ fontFamily:"var(--font-sans)" }}
        >
            {icon && <span className="flex-shrink-0">{icon}</span>}
            {children}
        </button>
    );
}

/**
 * Form field wrapper that renders a styled label above its children.
 *
 * @param label - The field label text (displayed as uppercase)
 * @param children - The form control(s) to render inside the field
 */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
            {children}
        </div>
    );
}

/**
 * Styled text input with optional leading icon and trailing suffix element.
 * Supports all standard input types (text, password, email, etc.).
 *
 * @param value - Current input value (controlled)
 * @param onChange - Callback fired with the new value on change
 * @param placeholder - Placeholder text
 * @param type - HTML input type (defaults to "text")
 * @param icon - Optional icon element displayed at the left edge
 * @param suffix - Optional element displayed at the right edge (e.g., toggle button)
 */
export function TextInput({
    value, onChange, placeholder, type = "text", icon, suffix,
}: {
    value: string; onChange: (v: string) => void; placeholder?: string;
    type?: string; icon?: React.ReactNode; suffix?: React.ReactNode;
}) {
    return (
        <div className="relative flex items-center">
            {icon && <span className="absolute left-3 text-slate-400 pointer-events-none flex-shrink-0">{icon}</span>}
            <input
                type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                className={`w-full bg-white border border-slate-200 rounded-lg py-2 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-[#2563EB] transition-all ${icon ? "pl-9" : "pl-3"}`}
                style={{ fontFamily:"var(--font-sans)" }}
            />
            {suffix && <span className="absolute right-3">{suffix}</span>}
        </div>
    );
}

/**
 * Styled native select dropdown with a custom chevron icon.
 * Wraps a standard HTML select element with consistent design system styling.
 *
 * @param value - Currently selected option value (controlled)
 * @param onChange - Callback fired with the new selected value
 * @param children - Option elements to render inside the select
 */
export function SelectInput({ value, onChange, children }: {
    value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
    return (
        <select
            value={value} onChange={e => onChange(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-[#2563EB] cursor-pointer appearance-none pr-8"
            style={{ fontFamily:"var(--font-sans)", backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat:"no-repeat", backgroundPosition:"right 8px center" }}
        >
            {children}
        </select>
    );
}
