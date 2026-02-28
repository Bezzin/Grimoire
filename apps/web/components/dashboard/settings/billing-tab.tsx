"use client"

import { trpc } from "@/lib/trpc/client"
import { PLANS, type PlanKey, formatCurrency } from "@grimoire/shared"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Check, Loader2, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

const PLAN_BADGE_STYLES: Record<string, string> = {
  FREE: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  STARTER: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  PRO: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  TEAM: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
}

const PLAN_FEATURES: Record<PlanKey, string[]> = {
  FREE: ["1 social account", "10 AI generations/mo"],
  STARTER: [
    "5 social accounts",
    "200 AI generations/mo",
    "Scheduling",
    "Basic analytics",
  ],
  PRO: [
    "15 social accounts",
    "Unlimited AI generations",
    "Full analytics",
    "Brand voice RAG",
    "Priority support",
  ],
  TEAM: [
    "Everything in Pro",
    "5 team seats",
    "Approval workflows",
    "Team analytics",
  ],
}

const PLAN_PRICES: Record<PlanKey, string> = {
  FREE: "$0/mo",
  STARTER: "$29/mo",
  PRO: "$39/mo",
  TEAM: "$79/mo",
}

const PLAN_ORDER: PlanKey[] = ["FREE", "STARTER", "PRO", "TEAM"]

const PRICE_KEYS: Record<PlanKey, string> = {
  FREE: "",
  STARTER: "STARTER_MONTHLY",
  PRO: "PRO_MONTHLY",
  TEAM: "TEAM_MONTHLY",
}

function BillingSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="h-6 w-24 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-5 w-20 animate-pulse rounded bg-muted" />
              <div className="h-8 w-24 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent className="space-y-2">
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="h-4 w-full animate-pulse rounded bg-muted"
                />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function getPlanIndex(plan: string): number {
  return PLAN_ORDER.indexOf(plan as PlanKey)
}

export function BillingTab() {
  const { data: subscription, isLoading } =
    trpc.billing.getSubscription.useQuery()

  const checkout = trpc.billing.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url
      }
    },
  })

  const portal = trpc.billing.createPortalSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url
      }
    },
  })

  function handleUpgrade(planKey: PlanKey) {
    const priceKey = PRICE_KEYS[planKey]
    if (!priceKey) return

    checkout.mutate({
      priceKey,
      successUrl: `${window.location.origin}/settings?tab=billing&success=true`,
      cancelUrl: `${window.location.origin}/settings?tab=billing`,
    })
  }

  function handleManageBilling() {
    portal.mutate({
      returnUrl: `${window.location.origin}/settings?tab=billing`,
    })
  }

  if (isLoading) {
    return <BillingSkeleton />
  }

  const currentPlan = (subscription?.plan ?? "FREE") as PlanKey
  const currentPlanIndex = getPlanIndex(currentPlan)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            Your current subscription and billing details
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold",
              PLAN_BADGE_STYLES[currentPlan] ?? PLAN_BADGE_STYLES.FREE
            )}
          >
            {PLANS[currentPlan]?.name ?? "Free"}
          </span>
          {subscription?.expiresAt && (
            <span className="text-sm text-muted-foreground">
              Renews{" "}
              {new Date(subscription.expiresAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
          {currentPlan !== "FREE" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleManageBilling}
              disabled={portal.isPending}
            >
              {portal.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Manage Billing
            </Button>
          )}
        </CardContent>
      </Card>

      <div>
        <h3 className="text-lg font-semibold mb-4">Compare Plans</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PLAN_ORDER.map((planKey) => {
            const planIndex = getPlanIndex(planKey)
            const isCurrent = planKey === currentPlan
            const isUpgrade = planIndex > currentPlanIndex
            const isDowngrade = planIndex < currentPlanIndex

            return (
              <Card
                key={planKey}
                className={cn(
                  "relative flex flex-col",
                  isCurrent && "border-primary ring-1 ring-primary"
                )}
              >
                <CardHeader>
                  <CardTitle className="text-lg">
                    {PLANS[planKey].name}
                  </CardTitle>
                  <p className="text-2xl font-bold">{PLAN_PRICES[planKey]}</p>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2">
                    {PLAN_FEATURES[planKey].map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <div className="p-6 pt-0">
                  {isCurrent ? (
                    <Button className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : isUpgrade ? (
                    <Button
                      className="w-full"
                      onClick={() => handleUpgrade(planKey)}
                      disabled={checkout.isPending}
                    >
                      {checkout.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Upgrade to {PLANS[planKey].name}
                    </Button>
                  ) : isDowngrade ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleUpgrade(planKey)}
                      disabled={checkout.isPending}
                    >
                      {checkout.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Switch to {PLANS[planKey].name}
                    </Button>
                  ) : null}
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
