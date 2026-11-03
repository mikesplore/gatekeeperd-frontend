import { Link } from "react-router-dom";
import { ArrowRight, Check, LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";

export function LandingPage() {
  const token = useAuthStore((state) => state.token);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span>Gatekeeperd</span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:py-28">
          <div className="max-w-xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Keep client access in sync with payment.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              Gate overdue client sites and restore access when payment is confirmed. The app keeps running behind the gate.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Works with existing apps behind nginx or Traefik.
            </p>
            <div className="mt-8">
              <Button size="lg" asChild>
                <Link to={token ? "/app" : "/login"}>
                  {token ? "Open dashboard" : "Sign in"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7" aria-label="How payment status controls app access">
            <div className="flex items-center gap-3 border-b pb-4">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <div>
                <p className="font-semibold">Client app access</p>
                <p className="text-sm text-muted-foreground">Controlled at the gateway</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-3 rounded-lg border border-emerald-600/25 bg-emerald-500/5 p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-700"><Check className="h-4 w-4" /></span>
                <div>
                  <p className="font-medium">Payment confirmed</p>
                  <p className="text-sm text-muted-foreground">App access allowed</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-amber-600/25 bg-amber-500/5 p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-600/10 text-amber-700"><LockKeyhole className="h-4 w-4" /></span>
                <div>
                  <p className="font-medium">Payment overdue</p>
                  <p className="text-sm text-muted-foreground">Payment page shown; app keeps running</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-5 text-center text-sm text-muted-foreground">
        Gatekeeperd · Payment-aware access for client apps
      </footer>
    </div>
  );
}
