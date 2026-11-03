import { Link } from "react-router-dom";
import { ArrowRight, Check, LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";

export function LandingPage() {
  const token = useAuthStore((state) => state.token);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span>Gatekeeperd</span>
          </Link>
          <Button size="sm" asChild>
            <Link to={token ? "/app" : "/login"}>
              {token ? "Dashboard" : "Sign in"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 items-center px-4 py-16 sm:px-6 sm:py-20">
        <section className="mx-auto w-full max-w-5xl">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Keep client access in sync with payment.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Gate overdue client sites and restore access when payment is confirmed. The app keeps running behind the gate.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Works with existing apps behind nginx or Traefik.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="flex items-center gap-3 border-b px-5 py-4 sm:px-7">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-semibold">Client app access</h2>
                <p className="text-sm text-muted-foreground">Payment status is checked at the gateway</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2">
              <div className="flex items-center gap-4 px-5 py-5 sm:px-7 sm:py-6">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-700">
                  <Check className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Paid</p>
                  <p className="mt-1 font-medium">Access allowed</p>
                </div>
              </div>
              <div className="flex items-center gap-4 border-t px-5 py-5 sm:border-l sm:border-t-0 sm:px-7 sm:py-6">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-600/10 text-amber-700">
                  <LockKeyhole className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Overdue</p>
                  <p className="mt-1 font-medium">Payment page shown</p>
                </div>
              </div>
            </div>
            <p className="border-t px-5 py-3 text-center text-sm text-muted-foreground sm:px-7">
              The application keeps running in either state.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
