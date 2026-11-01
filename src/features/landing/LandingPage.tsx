import { Link } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  FolderPlus,
  GitBranch,
  Globe,
  Zap,
  Bell,
  KeyRound,
  History,
  Layers,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import containerShipImg from "@/images/undraw_container-ship_t6yx.svg";
import firewallImg from "@/images/undraw_firewall_cfej.svg";
import heavyLiftingImg from "@/images/undraw_heavy-lifting_d753.svg";
import onlinePaymentsImg from "@/images/undraw_online-payments_d5ef.svg";
import relaxationImg from "@/images/undraw_relaxation_jsge.svg";

const paymentFeatures = [
  {
    title: "Reminders that send themselves",
    description:
      "Emails go out before and after each due date, so you never write a follow-up message by hand.",
    image: onlinePaymentsImg,
    imageAlt: "Online payments illustration",
  },
  {
    title: "A payment wall with a reason on it",
    description:
      "When a project is overdue, its sites show a wall that states why access is blocked. Your client's app code does not change.",
    image: firewallImg,
    imageAlt: "Firewall illustration showing blocked access",
  },
  {
    title: "Access returns when payment lands",
    description:
      "Once a payment is confirmed, the gate opens within seconds. Nobody has to flip a switch.",
    image: relaxationImg,
    imageAlt: "Relaxation illustration showing peace of mind",
  },
  {
    title: "Blocking never touches the app itself",
    description:
      "Only the gateway is gated. The container keeps running, so restoring access is instant and nothing needs a restart.",
    image: containerShipImg,
    imageAlt: "Container ship illustration representing infrastructure",
  },
];

const deployFeatures = [
  {
    icon: FolderPlus,
    title: "Projects exist before containers do",
    description:
      "Create the project, attach the customer and set billing first. Deploy when the app is ready.",
  },
  {
    icon: GitBranch,
    title: "Deploy from GitHub",
    description:
      "Point a project at a repository and branch. Push to deploy, or run a deployment from the dashboard.",
  },
  {
    icon: History,
    title: "Every release is on record",
    description:
      "See the commit, image, who triggered it, and the configuration it ran with. Roll back to an earlier release when a deploy goes wrong.",
  },
  {
    icon: Layers,
    title: "Shared and per-environment settings",
    description:
      "Keep environment variables scoped to a project and environment, with a clear view of what each deployment loaded.",
  },
  {
    icon: KeyRound,
    title: "Secrets stay on the server",
    description:
      "Secret values are encrypted at rest and masked after saving. Registry and GitHub credentials live apart from app settings.",
  },
  {
    icon: Globe,
    title: "Domains belong to the project",
    description:
      "Replace a container or image and the domain, TLS certificate and nginx site stay exactly where they were.",
  },
];

const steps = [
  {
    step: "01",
    icon: FolderPlus,
    title: "Add the client and billing terms",
    description: "Set the amount due and the date payment is expected for the client’s app.",
  },
  {
    step: "02",
    icon: Globe,
    title: "Put the gate in front of the app",
    description: "Connect the app’s domain through Gatekeeperd using the supported proxy setup.",
  },
  {
    step: "03",
    icon: Bell,
    title: "Let reminders go out",
    description: "Clients receive payment reminders as the due date approaches and after it passes.",
  },
  {
    step: "04",
    icon: Zap,
    title: "Access follows payment",
    description: "Overdue projects are gated. Paid projects are restored within seconds.",
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
            <span>Gatekeeperd</span>
          </div>
          <nav className="flex items-center gap-6">
            <a
              href="#payment-gating"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:block"
            >
              Payment gating
            </a>
            <a
              href="#deployments"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:block"
            >
              Deployment tools
            </a>
            <a
              href="#how-it-works"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:block"
            >
              How it works
            </a>
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
                  Sign in
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
                Keep client apps online when they pay. Gate access when they don’t.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                Put a payment-aware gate in front of your clients’ apps. Gatekeeperd restores access
                when payment is confirmed and shows an overdue notice when it isn’t. No manual
                follow-ups, container stops, or app code changes.
              </p>
              {!token && (
                <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                  <Button size="lg" asChild>
                    <Link to="/login">
                      Set up payment gating
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                  <a href="#payment-gating">See how the gate works</a>
                  </Button>
                </div>
              )}
            </div>
            <div className="mx-auto w-full max-w-xl">
              <div className="rounded-2xl border bg-card p-5 shadow-xl sm:p-7">
                <div className="flex items-center justify-between gap-4 border-b pb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Payment status controls access</p>
                    <p className="mt-1 text-lg font-semibold">Client application</p>
                  </div>
                  <ShieldCheck className="h-8 w-8 shrink-0 text-primary" />
                </div>
                <div className="grid gap-3 pt-5 sm:grid-cols-2">
                  <div className="rounded-xl border border-emerald-600/25 bg-emerald-500/5 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Payment received</p>
                    <p className="mt-2 text-lg font-semibold">App access allowed</p>
                    <p className="mt-1 text-sm text-muted-foreground">The gate lets the client through.</p>
                  </div>
                  <div className="rounded-xl border border-amber-600/25 bg-amber-500/5 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Payment overdue</p>
                    <p className="mt-2 text-lg font-semibold">Payment page shown</p>
                    <p className="mt-1 text-sm text-muted-foreground">The app keeps running behind the gate.</p>
                  </div>
                </div>
                <p className="mt-5 text-center text-sm text-muted-foreground">Confirmed payment restores access automatically.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Payment enforcement */}
      <section id="payment-gating" className="border-b py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Payment status should decide who gets through
            </h2>
            <p className="mt-4 text-muted-foreground">
              Gatekeeperd connects billing to traffic access. Your client sees a clear payment page
              when overdue, and access returns after payment is confirmed.
            </p>
          </div>
          <div className="mt-16 space-y-24">
            {paymentFeatures.map((feature, idx) => (
              <div
                key={feature.title}
                className={`flex flex-col gap-8 lg:gap-16 items-center ${
                  idx % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                }`}
              >
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    {feature.description}
                  </p>
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

      {/* Deployments */}
      <section id="deployments" className="border-b bg-muted/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Deployment management is included too
              </h2>
              <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
                The gate works with an existing app. When you want one place to manage delivery,
                Gatekeeperd also handles projects, deployments, domains and runtime settings.
              </p>
              <img
                src={heavyLiftingImg}
                alt="Heavy lifting illustration showing automation"
                className="mt-8 hidden h-auto max-h-64 w-full object-contain lg:block"
                loading="lazy"
              />
            </div>
            <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
              {deployFeatures.map((item) => (
                <div key={item.title}>
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mb-1 text-lg font-semibold">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Business state vs runtime */}
      <section className="border-b py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">A payment issue shouldn’t take your app down</h2>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              Gatekeeperd controls the request path in front of your app. If a client is overdue, it
              shows the payment page while the application and its container keep running. Once
              payment is confirmed, the gate opens again without a redeploy.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-b py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
            <p className="mt-4 text-muted-foreground">Connect billing to the gate. Deployment management is optional.</p>
          </div>
          <div className="mt-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
            {steps.map((item) => (
              <div key={item.step} className="flex flex-col items-center text-center">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                  <item.icon className="h-6 w-6" />
                </div>
                <span className="mb-2 text-sm font-semibold text-muted-foreground">
                  Step {item.step}
                </span>
                <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                <p className="max-w-xs text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
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
              Put payment enforcement on autopilot
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Let payment status control access to your clients’ apps. Add deployment and domain
              management when you want those tools in the same place.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              {token ? (
                <Button size="lg" asChild>
                  <Link to="/app">
                    Go to dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              ) : (
                <Button size="lg" asChild>
                  <Link to="/login">
                    Set up payment gating
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
          <p>
            &copy; {new Date().getFullYear()} Gatekeeperd. Built for freelancers who value their
            time.
          </p>
        </div>
      </footer>
    </div>
  );
}
