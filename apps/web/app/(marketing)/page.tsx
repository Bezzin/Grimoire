import Link from "next/link"
import {
  Check,
  Sparkles,
  ArrowRight,
  CreditCard,
  Workflow,
  Fingerprint,
  Layers,
  Bot,
  ClipboardList,
  Star,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const PAIN_POINTS = [
  {
    icon: Layers,
    title: "Too Many Tools",
    description:
      "You're paying for Buffer + Jasper + Canva + Analytics. That's $100-300/month for basic marketing.",
  },
  {
    icon: Bot,
    title: "Generic AI Output",
    description:
      "AI tools produce cookie-cutter content that sounds like everyone else. Your brand voice gets lost.",
  },
  {
    icon: ClipboardList,
    title: "No Review Workflow",
    description:
      "AI generates content, but there's no approval pipeline. It's either fully manual or dangerously automated.",
  },
] as const

const DIFFERENTIATORS = [
  {
    icon: CreditCard,
    title: "One Flat Price",
    description:
      "$29-39/month. No credits, no tokens, no surprises. One price for everything.",
    gradient: "from-primary/20 to-primary/5",
  },
  {
    icon: Workflow,
    title: "End-to-End Workflow",
    description:
      "Research \u2192 Create \u2192 Review \u2192 Schedule \u2192 Publish \u2192 Analyze. All in one tool.",
    gradient: "from-accent/20 to-accent/5",
  },
  {
    icon: Fingerprint,
    title: "Your Brand Voice",
    description:
      "Deep brand voice training with RAG. Content that sounds like you, not a robot.",
    gradient: "from-chart-4/20 to-chart-4/5",
  },
] as const

const PRICING_PLANS = [
  {
    key: "FREE",
    name: "Free",
    price: "$0",
    period: "",
    description: "Get started with the basics",
    features: ["1 social account", "10 AI generations/mo"],
    cta: "Get Started",
    highlighted: false,
  },
  {
    key: "STARTER",
    name: "Starter",
    price: "$29",
    period: "/mo",
    description: "For solo creators",
    features: [
      "5 social accounts",
      "200 AI generations/mo",
      "Scheduling",
      "Basic analytics",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
  {
    key: "PRO",
    name: "Pro",
    price: "$39",
    period: "/mo",
    description: "For growing businesses",
    features: [
      "15 social accounts",
      "Unlimited generations",
      "Full analytics suite",
      "Brand voice RAG",
      "Priority support",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    key: "TEAM",
    name: "Team",
    price: "$79",
    period: "/mo",
    description: "For collaborative teams",
    features: [
      "Everything in Pro",
      "5 team seats",
      "Approval workflows",
      "Team analytics",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
] as const

function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[500px] translate-x-1/4 rounded-full bg-accent/6 blur-[100px]" />
        <div className="dot-grid absolute inset-0 opacity-40" />
      </div>

      <div className="container relative mx-auto px-6 pb-20 pt-24 md:pb-32 md:pt-36">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
          {/* Badge */}
          <div className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered marketing copilot
          </div>

          {/* Headline */}
          <h1
            className="animate-fade-in-up text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl"
            style={{ animationDelay: "0.1s" }}
          >
            Your Marketing{" "}
            <span className="font-display italic grimoire-gradient-text">
              Wingman
            </span>
          </h1>

          {/* Subheadline */}
          <p
            className="animate-fade-in-up mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl"
            style={{ animationDelay: "0.2s" }}
          >
            Stop juggling 5 different tools. Grimoire is your all-in-one AI
            marketing copilot &mdash; create, schedule, and analyze content
            across every platform for one flat price.
          </p>

          {/* CTAs */}
          <div
            className="animate-fade-in-up flex flex-col items-center gap-3 sm:flex-row"
            style={{ animationDelay: "0.3s" }}
          >
            <Button
              asChild
              size="lg"
              className="group h-12 gap-2 rounded-xl grimoire-gradient px-8 text-white shadow-glow-md transition-shadow hover:shadow-glow-lg"
            >
              <Link href="/signup">
                Start Free Trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 rounded-xl border-border/50 px-8"
            >
              <a href="#pricing">See Pricing</a>
            </Button>
          </div>

          <p
            className="animate-fade-in-up text-sm text-muted-foreground"
            style={{ animationDelay: "0.4s" }}
          >
            No credit card required &middot; 14-day Pro trial
          </p>
        </div>
      </div>
    </section>
  )
}

function ProblemSection() {
  return (
    <section className="relative border-t border-border/40 py-20 md:py-28">
      <div className="container mx-auto px-6">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-destructive">
            The Problem
          </span>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Marketing tools are{" "}
            <span className="font-display italic">broken</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Fragmented, overpriced, and impossible to manage alone.
          </p>
        </div>
        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
          {PAIN_POINTS.map((point, i) => (
            <Card
              key={point.title}
              className="group border-border/40 bg-card/50 shadow-soft transition-all duration-300 hover:border-destructive/20 hover:shadow-elevated"
            >
              <CardHeader className="pb-3">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 transition-colors group-hover:bg-destructive/15">
                  <point.icon className="h-5 w-5 text-destructive" />
                </div>
                <CardTitle className="text-base font-semibold">{point.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {point.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

function SolutionSection() {
  return (
    <section className="relative border-t border-border/40 py-20 md:py-28">
      {/* Background glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/4 blur-[120px]" />

      <div className="container relative mx-auto px-6">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-primary">
            The Solution
          </span>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Everything you need.{" "}
            <span className="font-display italic grimoire-gradient-text">
              Nothing you don&apos;t.
            </span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            One powerful platform. One flat price. Zero complexity.
          </p>
        </div>
        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
          {DIFFERENTIATORS.map((item) => (
            <Card
              key={item.title}
              className="group border-border/40 shadow-soft transition-all duration-300 hover:shadow-elevated"
            >
              <CardHeader className="pb-3">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base font-semibold">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingSection() {
  return (
    <section id="pricing" className="relative border-t border-border/40 py-20 md:py-28">
      <div className="container mx-auto px-6">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-primary">
            Pricing
          </span>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Simple,{" "}
            <span className="font-display italic">transparent</span> pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            No credits. No tokens. No surprises.
          </p>
        </div>
        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PRICING_PLANS.map((plan) => (
            <Card
              key={plan.key}
              className={
                plan.highlighted
                  ? "relative border-primary/30 shadow-glow-sm"
                  : "border-border/40 shadow-soft"
              }
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full grimoire-gradient px-3 py-1 text-xs font-semibold text-white shadow-glow-sm">
                    <Star className="h-3 w-3" />
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">{plan.name}</CardTitle>
                <CardDescription className="text-xs">{plan.description}</CardDescription>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                  {plan.period && (
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 pb-4">
                <ul className="space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  asChild
                  variant={plan.highlighted ? "default" : "outline"}
                  className={
                    plan.highlighted
                      ? "w-full rounded-lg grimoire-gradient text-white shadow-glow-sm transition-shadow hover:shadow-glow-md"
                      : "w-full rounded-lg border-border/50"
                  }
                >
                  <Link href="/signup">{plan.cta}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

function CtaSection() {
  return (
    <section className="relative overflow-hidden border-t border-border/40 py-20 md:py-28">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/6 blur-[100px]" />
      </div>

      <div className="container relative mx-auto px-6 text-center">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Zap className="h-3.5 w-3.5" />
            Get started in 30 seconds
          </div>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Ready to simplify your{" "}
            <span className="font-display italic grimoire-gradient-text">
              marketing?
            </span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start your 14-day free trial today. No credit card required.
          </p>
          <div className="mt-8">
            <Button
              asChild
              size="lg"
              className="group h-12 gap-2 rounded-xl grimoire-gradient px-8 text-white shadow-glow-md transition-shadow hover:shadow-glow-lg"
            >
              <Link href="/signup">
                Get Started Free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <PricingSection />
      <CtaSection />
    </>
  )
}
