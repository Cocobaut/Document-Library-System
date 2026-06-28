import React, { useState } from "react";
import { CheckCircle, X, AlertCircle } from "lucide-react";
import { ModalShell } from "./Modal";
import { Field, TextInput, Btn } from "./DesignSystem";
import { changePasswordApi } from "../services/authApi";

export function ChangePasswordDialog({ isOpen, onClose, token }: { isOpen: boolean; onClose: () => void; token: string }) {
    const [currentPw, setCurrentPw] = useState("");
    const [newPw, setNewPw] = useState("");
    const [confirmPw, setConfirmPw] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const pwStrength = (pw: string) => [pw.length >= 8, /[A-Z]/.test(pw), /[0-9!@#$%]/.test(pw)];
    const strength = pwStrength(newPw);
    const strengthLabel = ["Weak", "Fair", "Strong"][strength.filter(Boolean).length - 1] ?? "";
    const strengthColor = ["bg-red-400", "bg-amber-400", "bg-emerald-500"][strength.filter(Boolean).length - 1] ?? "bg-slate-200";

    const handleSubmit = async () => {
        if (!currentPw || !newPw || !confirmPw) {
            setError("All fields are required.");
            setSuccess("");
            return;
        }
        if (newPw !== confirmPw) {
            setError("New password and confirmation do not match.");
            setSuccess("");
            return;
        }
        
        setError("");
        setSuccess("");
        setLoading(true);
        try {
            const res = await changePasswordApi(currentPw, newPw, token);
            setSuccess(res.message || "Password updated successfully.");
            setTimeout(() => {
                onClose();
                setCurrentPw("");
                setNewPw("");
                setConfirmPw("");
                setSuccess("");
            }, 1500);
        } catch (err: any) {
            setError(err.message || "Failed to update password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ModalShell title="Change Password" subtitle="Enter your current and new password" onClose={onClose}>
            <div className="space-y-4">
                <Field label="Current Password">
                    <TextInput value={currentPw} onChange={v => { setCurrentPw(v); setError(""); }} type="password" placeholder="Current password"/>
                </Field>
                <Field label="New Password">
                    <TextInput value={newPw} onChange={v => { setNewPw(v); setError(""); }} type="password" placeholder="Min. 8 characters"/>
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
                    <TextInput value={confirmPw} onChange={v => { setConfirmPw(v); setError(""); }} type="password" placeholder="Confirm password"
                        suffix={confirmPw && (newPw === confirmPw
                            ? <CheckCircle size={14} className="text-emerald-500"/>
                            : <X size={14} className="text-red-400"/>
                        )}
                    />
                </Field>

                {error && (
                    <div className="flex items-start gap-2.5 p-3 bg-red-50 rounded-xl border border-red-200">
                        <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5"/>
                        <p className="text-xs text-red-600">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                        <CheckCircle size={15} className="text-emerald-500"/>
                        <p className="text-xs text-emerald-700 font-medium">{success}</p>
                    </div>
                )}

                <Btn variant="primary" className="w-full mt-2" onClick={handleSubmit} disabled={loading}>
                    {loading ? "Updating..." : "Update Password"}
                </Btn>
            </div>
        </ModalShell>
    );
}
