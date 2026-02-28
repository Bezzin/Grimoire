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
  },
  {
    icon: Workflow,
    title: "End-to-End Workflow",
    description:
      "Research \u2192 Create \u2192 Review \u2192 Schedule \u2192 Publish \u2192 Analyze. All in one tool.",
  },
  {
    icon: Fingerprint,
    title: "Your Brand Voice",
    description:
      "Deep brand voice training with RAG. Content that sounds like you, not a robot.",
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
    period: "/month",
    description: "For solo creators and small businesses",
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
    period: "/month",
    description: "For growing teams and agencies",
    features: [
      "15 social accounts",
      "Unlimited generations",
      "Full analytics",
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
    period: "/month",
    description: "For teams that need collaboration",
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
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4 text-center">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
          <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered marketing copilot
          </div>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            Your Marketing Wingman
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl">
            Stop juggling 5 different tools. Grimoire is your all-in-one AI
            marketing copilot &mdash; create, schedule, and analyze content
            across every platform for one flat price.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#pricing">See Pricing</a>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            No credit card required. 14-day Pro trial.
          </p>
        </div>
      </div>
    </section>
  )
}

function ProblemSection() {
  return (
    <section className="border-t bg-muted/50 py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">The Problem</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Marketing tools are fragmented and overpriced
          </p>
        </div>
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {PAIN_POINTS.map((point) => (
            <Card key={point.title} className="border-none bg-background">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <point.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="text-lg">{point.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  {point.description}
                </CardDescription>
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
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">The Solution</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything you need in one powerful platform
          </p>
        </div>
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {DIFFERENTIATORS.map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  {item.description}
                </CardDescription>
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
    <section id="pricing" className="border-t bg-muted/50 py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            No credits. No tokens. No surprises.
          </p>
        </div>
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PRICING_PLANS.map((plan) => (
            <Card
              key={plan.key}
              className={
                plan.highlighted
                  ? "relative ring-2 ring-primary"
                  : ""
              }
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                  Most Popular
                </div>
              )}
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground">{plan.period}</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  asChild
                  variant={plan.highlighted ? "default" : "outline"}
                  className="w-full"
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
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight">
            Ready to simplify your marketing?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start your 14-day free trial today. No credit card required.
          </p>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link href="/signup">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
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
