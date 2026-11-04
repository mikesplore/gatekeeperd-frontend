import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";

export function LandingPage() {
  const token = useAuthStore((state) => state.token);

  return (
    <div className="landing-page flex min-h-screen flex-col bg-[#090b0c] text-white">
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
        <section className="relative mx-auto w-full max-w-6xl text-center">
          <h1 className="landing-hero-title mx-auto">
            Client access should<br className="hidden sm:block" /> follow <span className="text-emerald-400">payment.</span>
          </h1>
          <p className="landing-hero-copy mx-auto mt-7 max-w-3xl text-white/60">
            Gate overdue sites and restore access after payment is confirmed. Your app keeps running behind the gate.
          </p>

          <p className="landing-hero-proxy mt-9 text-white/45">Use Gatekeeperd’s nginx integration or connect Traefik through ForwardAuth.</p>
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
