import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, getApiErrorMessage } from "@/lib/api";
import recoveryImg from "@/images/undraw_firewall_cfej.svg";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };
  return <AuthCard title={sent ? "Check your email" : "Forgot password?"} description={sent ? "If that email is registered, a reset link is on its way." : "Enter your admin email and we’ll send a secure reset link."}>
    {sent ? (
      <Button asChild className="w-full">
        <Link to="/login">Return to sign in <ArrowRight className="ml-1 h-4 w-4" /></Link>
      </Button>
    ) : (
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="reset-email">Email</Label>
          <Input id="reset-email" type="email" autoComplete="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" loading={isSubmitting} loadingText="Sending reset link…" disabled={isSubmitting}>
          Send reset link <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </form>
    )}
  </AuthCard>;
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    try {
      await api.post("/auth/reset-password", { token: params.get("token") ?? "", newPassword: password });
      setDone(true);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };
  return <AuthCard title="Reset password" description={done ? "Your password has been reset successfully." : "Choose a new password with at least 8 characters."}>
    {done ? (
      <Button asChild className="w-full">
        <Link to="/login">Continue to sign in <ArrowRight className="ml-1 h-4 w-4" /></Link>
      </Button>
    ) : (
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button className="w-full">Reset password <ArrowRight className="ml-1 h-4 w-4" /></Button>
      </form>
    )}
  </AuthCard>;
}

function AuthCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <aside className="relative hidden min-h-screen flex-col justify-start overflow-hidden border-r bg-[#f7f6ff] px-10 py-9 text-[#211d35] lg:flex xl:px-16 xl:py-12">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_48%_46%,rgba(108,99,255,0.12),transparent_62%)]" />
        <Link to="/" className="relative flex w-fit items-center gap-2.5 font-semibold tracking-tight">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span>Gatekeeperd</span>
        </Link>
        <div className="relative mx-auto my-auto w-full max-w-lg">
          <img src={recoveryImg} alt="" className="mx-auto mb-8 block w-full max-w-md" loading="eager" />
          <h1 className="whitespace-nowrap text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">Account recovery.</h1>
        </div>
      </aside>
      <main className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-12 xl:px-16">
        <div className="flex items-center justify-between lg:hidden">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span>Gatekeeperd</span>
          </Link>
          <Link to="/login" aria-label="Back to sign in" className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center py-12 lg:py-0">
          <section className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
            <div className="mb-9">
              <h2 className="text-3xl font-semibold tracking-tight">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
            {children}
            <p className="mt-9 border-t pt-6 text-center text-xs text-muted-foreground lg:text-left">
              <Link to="/login" className="transition-colors hover:text-foreground">Back to sign in</Link>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
