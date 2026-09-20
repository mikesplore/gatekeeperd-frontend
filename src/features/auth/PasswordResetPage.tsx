import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, getApiErrorMessage } from "@/lib/api";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError("");
    try { await api.post("/auth/forgot-password", { email }); setSent(true); }
    catch (err) { setError(getApiErrorMessage(err)); }
  };
  return <AuthCard title="Forgot password?" description={sent ? "If that email is registered, a reset link is on its way." : "Enter your admin email and we’ll send a secure reset link."}>
    {sent ? <Link to="/login" className="text-sm text-primary hover:underline">Return to sign in</Link> : <form onSubmit={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="reset-email">Email</Label><Input id="reset-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>{error && <p className="text-sm text-destructive">{error}</p>}<Button className="w-full">Send reset link</Button><Link to="/login" className="block text-center text-sm text-muted-foreground hover:text-foreground">Back to sign in</Link></form>}
  </AuthCard>;
}

export function ResetPasswordPage() {
  const [params] = useSearchParams(); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [done, setDone] = useState(false); const [error, setError] = useState("");
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(""); if (password !== confirm) { setError("Passwords do not match."); return; } try { await api.post("/auth/reset-password", { token: params.get("token") ?? "", newPassword: password }); setDone(true); } catch (err) { setError(getApiErrorMessage(err)); } };
  return <AuthCard title="Reset password" description={done ? "Your password has been reset successfully." : "Choose a new password with at least 8 characters."}>
    {done ? <Link to="/login" className="text-sm text-primary hover:underline">Continue to sign in</Link> : <form onSubmit={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="confirm-password">Confirm password</Label><Input id="confirm-password" type="password" minLength={8} required value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>{error && <p className="text-sm text-destructive">{error}</p>}<Button className="w-full">Reset password</Button></form>}
  </AuthCard>;
}

function AuthCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent>{children}</CardContent></Card></div>;
}
