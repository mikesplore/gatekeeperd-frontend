import { Link } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  FolderPlus,
  GitBranch,
  Rocket,
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
import rideTillICanNoMoreImg from "@/images/undraw_jogging_tf9a.svg";

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
    title: "Create a project",
    description: "Add the client, the amount due and the due date. No container needed yet.",
  },
  {
    step: "02",
    icon: Rocket,
    title: "Configure and deploy",
    description: "Set the repository, runtime and environment variables, then ship a release.",
  },
  {
    step: "03",
    icon: Globe,
    title: "Attach the domain",
    description: "Gatekeeperd manages the nginx site and certificate in front of your app.",
  },
  {
    step: "04",
    icon: Bell,
    title: "Reminders run on schedule",
    description: "Clients hear from Gatekeeperd as the due date approaches and after it passes.",
  },
  {
    step: "05",
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
              href="#deployments"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:block"
            >
              Deployments
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
                Host your clients' apps. Get paid for them.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                Gatekeeperd deploys and routes each client project, then gates access by payment
                status. Reminders, enforcement and restoration run on their own, so you spend your
                time building.
              </p>
              {!token && (
                <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                  <Button size="lg" asChild>
                    <Link to="/login">
                      Get started
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <a href="#how-it-works">See how it works</a>
                  </Button>
                </div>
              )}
            </div>
            <div className="lg:block">
              <img
                src={rideTillICanNoMoreImg}
                alt=""
                className="w-full h-auto max-h-64 sm:max-h-none object-contain"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Payment enforcement */}
      <section id="features" className="border-b py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Stop chasing late payments
            </h2>
            <p className="mt-4 text-muted-foreground">
              Your terms are enforced by policy, so you don't have to argue about them.
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
                Deploy and manage the app too
              </h2>
              <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
                A project is the client's application. Containers come and go underneath it, while
                the customer, billing, domain and history stay put.
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
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Billing and deployments stay separate
          </h2>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            A failed deploy never changes a client's access or billing status, and a blocked client
            never needs their container stopped. Each side has its own state, so one problem cannot
            quietly cause another.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-b py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
            <p className="mt-4 text-muted-foreground">Set a project up once, then let it run.</p>
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
              One place for the app and the invoice
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Deploy client projects, route their domains, and let payment status decide who gets
              through.
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
                    Get started
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