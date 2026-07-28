import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, FolderPlus, Zap, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import containerShipImg from "@/images/undraw_container-ship_t6yx.svg";
import firewallImg from "@/images/undraw_firewall_cfej.svg";
import heavyLiftingImg from "@/images/undraw_heavy-lifting_d753.svg";
import onlinePaymentsImg from "@/images/undraw_online-payments_d5ef.svg";
import relaxationImg from "@/images/undraw_relaxation_jsge.svg";
import rideTillICanNoMoreImg from "@/images/undraw_jogging_tf9a.svg";

const features = [
  {
    title: "Automatic payment reminders",
    description:
      "No more manually chasing clients. When a payment is approaching or overdue, Gatekeeper sends reminders automatically. You focus on the work, not the follow-ups.",
    image: onlinePaymentsImg,
    imageAlt: "Online payments illustration",
  },
  {
    title: "Smart payment blocking",
    description:
      "If a payment goes unpaid beyond the grace period, client access is silently redirected behind a payment wall. No code changes, and no confrontation from you.",
    image: firewallImg,
    imageAlt: "Firewall illustration showing blocked access",
  },
  {
    title: "Instant restoration on payment",
    description:
      "The moment a payment is confirmed, access is restored automatically. Clients see a professional payment wall, not a broken site. Pay and get back to business in seconds.",
    image: relaxationImg,
    imageAlt: "Relaxation illustration showing peace of mind",
  },
  {
    title: "Infrastructure stays untouched",
    description:
      "Containers keep running the whole time. Only client-facing access is gated, so nothing needs to restart when payment clears.",
    image: containerShipImg,
    imageAlt: "Container ship illustration representing infrastructure",
  },
  {
    title: "Set it and forget it",
    description:
      "Grace periods, reminders, auto-blocking, and reinstatement all run on their own once a project is registered. No manual intervention needed.",
    image: heavyLiftingImg,
    imageAlt: "Heavy lifting illustration showing automation",
  },
];

const steps = [
  {
    step: "01",
    icon: FolderPlus,
    title: "Register a project",
    description: "Point Gatekeeper at a client's container and set the amount due and due date.",
  },
  {
    step: "02",
    icon: Bell,
    title: "Automatic reminders kick in",
    description: "Gatekeeper sends payment reminders to the client as the due date approaches and when overdue.",
  },
  {
    step: "03",
    icon: Zap,
    title: "Let it enforce itself",
    description: "Overdue access is gated automatically. Paid access is restored within seconds.",
  },
];

export function LandingPage() {
  const token = useAuthStore((s) => s.token);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 font-bold text-xl">
            <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
            <span>Gatekeeper</span>
          </div>
          <nav>
            {token ? (
              <Button asChild>
                <Link to="/app">
                  Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild>
                <Link to="/login">
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-tight">
                <span className="text-foreground">Never chase a</span>{" "}
                <span className="text-primary">payment</span>{" "}
                <span className="text-foreground">again</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                Stop arguing with clients over overdue payments. Gatekeeper handles the reminders, blocks access when
                payments are late, and restores it the moment they pay. No awkward conversations. No code changes.
              </p>
              {!token && (
                <div className="mt-10 flex justify-center lg:justify-start">
                  <Button size="lg" asChild>
                    <Link to="/login">
                      Get Started
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
            <div className="lg:block">
              <img src={rideTillICanNoMoreImg} alt="" className="w-full h-auto max-h-64 sm:max-h-none object-contain" loading="eager" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Put an end to the payment chase
            </h2>
            <p className="mt-4 text-muted-foreground">
              Tired of false promises and delayed payments? Gatekeeper enforces your terms so you don't have to argue.
            </p>
          </div>
          <div className="mt-16 space-y-24">
            {features.map((feature, idx) => (
              <div
                key={feature.title}
                className={`flex flex-col gap-8 lg:gap-16 items-center ${
                  idx % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                }`}
              >
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">{feature.description}</p>
                </div>
                <div className="flex-1">
                  <img
                    src={feature.image}
                    alt={feature.imageAlt}
                    className="w-full h-auto max-h-80 object-contain"
                    loading="lazy"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-b py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
            <p className="mt-4 text-muted-foreground">Three steps, then it runs on its own.</p>
          </div>
          <div className="relative mt-16">
            <div className="absolute top-8 left-1/2 -translate-x-1/2 hidden md:block w-[70%] h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />
            <div className="grid gap-12 md:grid-cols-3">
              {steps.map((item) => (
                <div key={item.step} className="relative flex flex-col items-center text-center">
                  <div className="z-10 mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                    <item.icon className="h-7 w-7" />
                  </div>
                  <span className="mb-2 text-sm font-semibold text-muted-foreground">STEP {item.step}</span>
                  <h3 className="mb-2 text-xl font-semibold">{item.title}</h3>
                  <p className="text-muted-foreground max-w-xs">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-primary/5 p-12">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Stop sending payment reminders
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Set your terms once. Gatekeeper handles the reminders, enforcement, and restoration from there.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              {token ? (
                <Button size="lg" asChild>
                  <Link to="/app">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              ) : (
                <Button size="lg" asChild>
                  <Link to="/login">
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground sm:px-6 lg:px-8">
          <p>&copy; {new Date().getFullYear()} Gatekeeper. Built for freelancers who value their time.</p>
        </div>
      </footer>
    </div>
  );
}