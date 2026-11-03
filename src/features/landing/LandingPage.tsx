import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";

export function LandingPage() {
  const token = useAuthStore((state) => state.token);

  return (
    <div className="flex min-h-screen flex-col bg-[#090b0c] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <span>Gatekeeperd</span>
          </Link>
        </div>
      </header>

      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-20 sm:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.09),transparent_58%)]" />
        <section className="relative mx-auto w-full max-w-5xl text-center">
          <h1 className="mx-auto max-w-4xl text-5xl font-semibold leading-[1.04] tracking-[-0.045em] sm:text-6xl md:text-7xl lg:text-[5.5rem]">
            Client access should
            <br className="hidden sm:block" /> follow <span className="text-emerald-400">payment.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-white/60 sm:text-lg">
            Gate overdue sites and restore access after payment is confirmed. Your app keeps running behind the gate.
          </p>

          <div className="mx-auto mt-10 flex max-w-xl flex-col items-center justify-center gap-5 sm:flex-row sm:gap-10" aria-label="How access responds to payment status">
            <div className="flex items-center gap-3 text-left">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.55)]" />
              <span><span className="block text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">Paid</span><span className="mt-0.5 block text-sm text-white/70">Access allowed</span></span>
            </div>
            <span aria-hidden="true" className="hidden h-9 w-px bg-white/15 sm:block" />
            <div className="flex items-center gap-3 text-left">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.45)]" />
              <span><span className="block text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">Overdue</span><span className="mt-0.5 block text-sm text-white/70">Payment page shown</span></span>
            </div>
          </div>

          <p className="mt-9 text-sm text-white/40">Works with apps behind nginx or Traefik.</p>
          <div className="mt-8">
            <Button size="lg" asChild className="bg-emerald-400 px-6 font-semibold text-[#07110d] hover:bg-emerald-300">
              <Link to={token ? "/app" : "/login"}>
                {token ? "Open dashboard" : "Sign in"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
