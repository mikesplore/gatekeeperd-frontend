import { useForm } from "react-hook-form";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isInvalidCredentials, useLogin } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import enterImg from "@/images/undraw_enter_nwx3.svg";
import firewallImg from "@/images/undraw_firewall_cfej.svg";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const token = useAuthStore((s) => s.token);
  const login = useLogin();
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  if (token) {
    return <Navigate to="/app" replace />;
  }

  const onSubmit = (data: LoginForm) => {
    login.mutate(data, {
      onSuccess: result => { if (result.requiresTwoFactor && result.challengeToken) setChallenge(result.challengeToken); },
      onError: (err) => {
        if (isInvalidCredentials(err)) {
          setError("password", { message: getApiErrorMessage(err) });
        } else {
          setError("root", { message: getApiErrorMessage(err) });
        }
      },
    });
  };

  const onVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setVerifyError(null);
    try {
      const { data } = await api.post<{ token: string; refreshToken: string }>("/auth/2fa/verify", { challengeToken: challenge, code });
      const me = await api.get<{ email: string; role: string; permissions: string[] }>("/auth/me", { headers: { Authorization: `Bearer ${data.token}` } });
      useAuthStore.getState().login(data.token, data.refreshToken, me.data.email, me.data.role, me.data.permissions ?? []);
    } catch (error) {
      setVerifyError(getApiErrorMessage(error));
    }
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <aside className="relative hidden min-h-screen flex-col justify-start overflow-hidden border-r bg-[#f7f6ff] px-10 py-9 text-[#211d35] lg:flex xl:px-16 xl:py-12">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_48%_46%,rgba(108,99,255,0.12),transparent_62%)]" />
        <Link to="/" className="relative flex w-fit items-center gap-2.5 font-semibold tracking-tight">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span>Gatekeeperd</span>
        </Link>
        <div className="relative mx-auto my-auto w-full max-w-lg">
          <img src={challenge ? firewallImg : enterImg} alt="" className="mx-auto mb-8 block w-full max-w-md" loading="eager" />
          <h1 className="whitespace-nowrap text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">{challenge ? "Verify your identity." : "Manage client access."}</h1>
        </div>
      </aside>

      <main className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-12 xl:px-16">
        <div className="flex items-center justify-between lg:hidden">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span>Gatekeeperd</span>
          </Link>
          <Link to="/" aria-label="Back to home" className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-12 lg:py-0">
          <section className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
            <div className="mb-9">
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">{challenge ? "Verify it’s you" : "Welcome back"}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {challenge ? "Enter your authenticator code or a recovery code to continue." : "Sign in to manage your projects and client access."}
              </p>
            </div>

            {challenge ? (
              <form className="space-y-5" onSubmit={onVerify}>
                <div className="space-y-2">
                  <Label htmlFor="two-factor-code">Authentication code</Label>
                  <Input id="two-factor-code" inputMode="numeric" autoComplete="one-time-code" autoFocus value={code} onChange={event => setCode(event.target.value)} maxLength={20} />
                  <p className="text-xs text-muted-foreground">Recovery codes can only be used once.</p>
                </div>
                {verifyError && <p role="alert" className="text-sm text-destructive">{verifyError}</p>}
                <Button className="w-full" disabled={!code.trim()}>
                  Continue <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setChallenge(null)}>Back to sign in</Button>
              </form>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} />
                  {errors.email && <p role="alert" className="text-sm text-destructive">{errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="password">Password</Label>
                    <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">Forgot password?</Link>
                  </div>
                  <Input id="password" type="password" autoComplete="current-password" placeholder="Enter your password" {...register("password")} />
                  {errors.password && <p role="alert" className="text-sm text-destructive">{errors.password.message}</p>}
                </div>
                {errors.root && <p role="alert" className="text-sm text-destructive">{errors.root.message}</p>}
                <Button type="submit" className="w-full" loading={login.isPending} disabled={login.isPending}>
                  {login.isPending ? "Signing in..." : "Sign in"}
                  {!login.isPending && <ArrowRight className="ml-1 h-4 w-4" />}
                </Button>
              </form>
            )}

            <p className="mt-9 border-t pt-6 text-center text-xs text-muted-foreground lg:text-left">
              <Link to="/" className="transition-colors hover:text-foreground">Back to home</Link>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
