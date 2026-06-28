/**
 * Login Page
 *
 * Dual-mode authentication page supporting:
 * - Standard username/password login with JWT-based authentication
 * - Password change form with real-time strength indicator
 *
 * Features a split-panel layout with branding on the left (desktop)
 * and the auth form on the right.
 */
import React, { useState } from "react";
import { EyeOff, Eye, AlertCircle, Layers, Users } from "lucide-react";
import { Role } from "../types";
import { loginApi, decodeJwtPayload, ROLE_MAP } from "../services/authApi";
import { Field, TextInput } from "../components/DesignSystem";

/**
 * Login page component with login and password change modes.
 *
 * @param onLogin - Callback invoked on successful authentication with token, role, and user info
 */
export function LoginPage({ onLogin }: { onLogin: (token: string, role: Role, username: string, userId: string, unitName?: string) => void }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);


    /*
     * Handles the login form submission. Validates inputs, calls the login API,
     * decodes the JWT payload, maps the backend role, and invokes the onLogin callback.
     */
    const handleLogin = async () => {
        if (!username.trim() || !password) { setError("Please enter your username and password."); return; }
        setError(""); 
        setLoading(true);
        
        try {
            const data = await loginApi(username.trim(), password);
            const payload = decodeJwtPayload(data.access_token);
            
            if (!payload) { 
                setError("Invalid token received from server."); 
                setLoading(false); 
                return; 
            }
            
            // Map backend role string (e.g., "USER", "UNIT_MANAGER") to frontend Role type
            const role = ROLE_MAP[payload.role?.toUpperCase()];
            
            if (!role) { 
                setError("Unknown user role. Please contact your administrator."); 
                setLoading(false); 
                return; 
            }

            onLogin(data.access_token, role, payload.username, payload.sub, payload.unit_name);
        } 
        catch (err: any) {
            setError(err.message || "Login failed. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex" style={{ fontFamily:"var(--font-sans)" }}>
            {/* Left panel — branding and statistics (hidden on mobile) */}
            <div className="hidden lg:flex lg:w-[52%] bg-gradient-to-br from-[#1e40af] via-[#2563EB] to-[#3b82f6] flex-col justify-between p-12 relative overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5"/>
                <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-white/5"/>
                <div className="absolute top-1/3 right-12 w-48 h-48 rounded-full bg-white/5"/>

                <div className="relative">
                    <div className="flex items-center gap-3 mb-16">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                            <Layers size={20} className="text-white"/>
                        </div>
                        <span className="text-white font-bold text-lg" style={{ fontFamily:"var(--font-display)" }}>DocLib Enterprise</span>
                    </div>
                    <h1 className="text-4xl font-bold text-white leading-tight mb-4" style={{ fontFamily:"var(--font-display)" }}>
                        Secure document<br/>management for<br/>your organization.
                    </h1>
                    <p className="text-blue-100 text-sm leading-relaxed max-w-sm">
                        Centralize, organize, and collaborate on all your documents. Enterprise-grade security with role-based access control.
                    </p>
                </div>

                <div className="relative grid grid-cols-3 gap-4">
                    {[
                        { value:"1,691", label:"Documents" },
                        { value:"85", label:"Active users" },
                        { value:"6", label:"Departments" },
                    ].map(s => (
                        <div key={s.label} className="bg-white/10 backdrop-blur rounded-2xl p-4">
                            <p className="text-2xl font-bold text-white" style={{ fontFamily:"var(--font-display)" }}>{s.value}</p>
                            <p className="text-blue-200 text-xs mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right panel — auth forms */}
            <div className="flex-1 flex items-center justify-center bg-slate-50 p-8">
                <div className="w-full max-w-[380px]">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
                        <div className="w-10 h-10 bg-[#2563EB] rounded-2xl flex items-center justify-center shadow-sm shadow-blue-300">
                            <Layers size={20} className="text-white"/>
                        </div>
                        <span className="text-slate-900 font-bold text-lg" style={{ fontFamily:"var(--font-display)" }}>DocLib Enterprise</span>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily:"var(--font-display)" }}>Welcome back</h2>
                        <p className="text-sm text-slate-400 mb-7">Sign in to your account to continue</p>

                        <div className="space-y-4">
                            <Field label="Username">
                                <TextInput value={username} onChange={v => { setUsername(v); setError(""); }} placeholder="e.g. alex.chen" icon={<Users size={14}/>} />
                            </Field>
                            <Field label="Password">
                                <TextInput value={password} onChange={v => { setPassword(v); setError(""); }} type={showPw ? "text" : "password"} placeholder="Enter your password"
                                    suffix={
                                        <button onClick={() => setShowPw(!showPw)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                            {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                                        </button>
                                    }
                                />
                            </Field>

                            {error && (
                                <div className="flex items-start gap-2.5 p-3 bg-red-50 rounded-xl border border-red-200">
                                    <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5"/>
                                    <p className="text-xs text-red-600">{error}</p>
                                </div>
                            )}

                            <button
                                onClick={handleLogin} disabled={loading}
                                className="w-full py-3 bg-[#2563EB] text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-sm shadow-blue-300 disabled:opacity-70 flex items-center justify-center gap-2 mt-2"
                            >
                                {loading ? (
                                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Signing in…</>
                                ) : "Sign In"}
                            </button>
                        </div>
                    </div>

                    <p className="text-center text-[11px] text-slate-400 mt-5">
                        © 2024 ACME Corporation · Document Library Management System
                    </p>
                </div>
            </div>
        </div>
    );
}
