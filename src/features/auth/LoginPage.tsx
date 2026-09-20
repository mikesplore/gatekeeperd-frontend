import { useForm } from "react-hook-form";
import { useState } from "react";
import { api } from "@/lib/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, Navigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isInvalidCredentials, useLogin } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import enterImg from "@/images/undraw_enter_nwx3.svg";

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

  if (challenge) return <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Two-factor verification</CardTitle><CardDescription>Enter the 6-digit code from Google Authenticator, or a recovery code.</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={async event => { event.preventDefault(); setVerifyError(null); try { const { data } = await api.post<{ token: string; refreshToken: string }>("/auth/2fa/verify", { challengeToken: challenge, code }); const me = await api.get<{ email: string; role: string }>("/auth/me", { headers: { Authorization: `Bearer ${data.token}` } }); useAuthStore.getState().login(data.token, data.refreshToken, me.data.email, me.data.role); } catch (error) { setVerifyError(getApiErrorMessage(error)); } }}><Label htmlFor="two-factor-code">Authentication code</Label><Input id="two-factor-code" inputMode="numeric" autoComplete="one-time-code" autoFocus value={code} onChange={event => setCode(event.target.value)} maxLength={20} /><p className="text-xs text-muted-foreground">Recovery codes may be used once.</p>{verifyError && <p className="text-sm text-destructive">{verifyError}</p>}<Button className="w-full" disabled={!code.trim()}>Verify</Button><Button type="button" variant="ghost" className="w-full" onClick={() => setChallenge(null)}>Back to sign in</Button></form></CardContent></Card></div>;

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

  return (
    <div className="flex min-h-screen">
      {/* Left side - illustration */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-12">
        <div className="max-w-md text-center">
          <img
            src={enterImg}
            alt=""
            className="w-full h-auto mb-8"
            loading="eager"
          />
          <h2 className="text-2xl font-bold tracking-tight">
            Welcome back to{" "}
            <span className="text-primary">Gatekeeper</span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            Your projects are waiting. Sign in to manage client access, track payments, and keep everything running smoothly.
          </p>
          <div className="mt-6 flex items-center justify-center gap-1 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Secure admin access only</span>
          </div>
        </div>
      </div>

      {/* Right side - login form */}
      <div className="flex flex-1 items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md border-0 shadow-none bg-transparent sm:border sm:shadow-sm sm:bg-card">
          <CardHeader className="text-center sm:text-left">
            <div className="flex items-center justify-center gap-2 font-bold text-xl mb-2 sm:hidden">
              <ShieldCheck className="h-6 w-6 text-primary" />
              Gatekeeperd
            </div>
            <CardTitle className="text-2xl">Sign in</CardTitle>
            <CardDescription>Enter your credentials to access the dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" {...register("email")} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>
              {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
              <Button type="submit" className="w-full" disabled={login.isPending}>
                {login.isPending ? "Signing in..." : "Sign in"}
              </Button>
              <Link to="/forgot-password" className="block text-center text-sm text-muted-foreground hover:text-foreground">Forgot password?</Link>
            </form>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              <Link to="/" className="hover:text-foreground transition-colors">
                Back to home
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
