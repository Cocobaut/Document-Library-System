import React, { useState } from "react";
import { EyeOff, Eye, AlertCircle, ChevronLeft, CheckCircle, X, Layers, Users } from "lucide-react";
import { Role } from "../types";
import { loginApi, decodeJwtPayload, ROLE_MAP } from "../services/authApi";
import { Field, TextInput } from "../components/DesignSystem";

export function LoginPage({ onLogin }: { onLogin: (token: string, role: Role, username: string, userId: string, unitName?: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login"|"change">("login");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [cpDone, setCpDone] = useState(false);

  const pwStrength = (pw: string) => [pw.length >= 8, /[A-Z]/.test(pw), /[0-9!@#$%]/.test(pw)];
  const strength = pwStrength(newPw);
  const strengthLabel = ["Weak", "Fair", "Strong"][strength.filter(Boolean).length - 1] ?? "";
  const strengthColor = ["bg-red-400", "bg-amber-400", "bg-emerald-500"][strength.filter(Boolean).length - 1] ?? "bg-slate-200";

  const handleLogin = async () => {
    if (!username.trim() || !password) { setError("Please enter your username and password."); return; }
    setError(""); setLoading(true);
    try {
      const data = await loginApi(username.trim(), password);
      const payload = decodeJwtPayload(data.access_token);
      if (!payload) { setError("Invalid token received from server."); setLoading(false); return; }
      const role = ROLE_MAP[payload.role?.toUpperCase()];
      if (!role) { setError("Unknown user role. Please contact your administrator."); setLoading(false); return; }
      onLogin(data.access_token, role, payload.username, payload.sub, payload.unit_name);
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily:"var(--font-sans)" }}>
      {/* Left panel */}
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

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-8">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-[#2563EB] rounded-2xl flex items-center justify-center shadow-sm shadow-blue-300">
              <Layers size={20} className="text-white"/>
            </div>
            <span className="text-slate-900 font-bold text-lg" style={{ fontFamily:"var(--font-display)" }}>DocLib Enterprise</span>
          </div>

          {mode === "login" ? (
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

                <button onClick={() => setMode("change")} className="w-full text-xs text-slate-400 hover:text-[#2563EB] transition-colors font-medium pt-1">
                  Change Password
                </button>
              </div>


            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8">
              <button onClick={() => setMode("login")} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#2563EB] transition-colors mb-6">
                <ChevronLeft size={13}/> Back to sign in
              </button>
              <h2 className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily:"var(--font-display)" }}>Change Password</h2>
              <p className="text-sm text-slate-400 mb-7">Enter your current and new password</p>

              <div className="space-y-4">
                <Field label="Current Password">
                  <TextInput value="" onChange={() => {}} type="password" placeholder="Current password"/>
                </Field>
                <Field label="New Password">
                  <TextInput value={newPw} onChange={setNewPw} type="password" placeholder="Min. 8 characters"/>
                  {newPw && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex gap-1">
                        {[0,1,2].map(i => (
                          <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors ${strength.filter(Boolean).length > i ? strengthColor : "bg-slate-100"}`}/>
                        ))}
                      </div>
                      <p className={`text-[10px] font-medium ${strength.filter(Boolean).length === 3 ? "text-emerald-600" : strength.filter(Boolean).length === 2 ? "text-amber-500" : "text-red-500"}`}>
                        {strengthLabel} password
                      </p>
                    </div>
                  )}
                </Field>
                <Field label="Confirm New Password">
                  <TextInput value={confirmPw} onChange={setConfirmPw} type="password" placeholder="Confirm password"
                    suffix={confirmPw && (newPw === confirmPw
                      ? <CheckCircle size={14} className="text-emerald-500"/>
                      : <X size={14} className="text-red-400"/>
                    )}
                  />
                </Field>

                {cpDone && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <CheckCircle size={15} className="text-emerald-500"/>
                    <p className="text-xs text-emerald-700 font-medium">Password updated successfully</p>
                  </div>
                )}

                <button
                  onClick={() => { setCpDone(true); setTimeout(() => { setCpDone(false); setMode("login"); setNewPw(""); setConfirmPw(""); }, 1500); }}
                  className="w-full py-3 bg-[#2563EB] text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-sm shadow-blue-300"
                >
                  Update Password
                </button>
              </div>
            </div>
          )}

          <p className="text-center text-[11px] text-slate-400 mt-5">
            © 2024 ACME Corporation · Document Library Management System
          </p>
        </div>
      </div>
    </div>
  );
}
