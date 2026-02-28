import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { prisma } from "@grimoire/db"
import type { Plan } from "@grimoire/db"

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-02-24.acacia",
  })
}

const PRICE_TO_PLAN: Record<string, Plan> = {
  [process.env.STRIPE_STARTER_MONTHLY_PRICE_ID ?? ""]: "STARTER",
  [process.env.STRIPE_STARTER_ANNUAL_PRICE_ID ?? ""]: "STARTER",
  [process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? ""]: "PRO",
  [process.env.STRIPE_PRO_ANNUAL_PRICE_ID ?? ""]: "PRO",
  [process.env.STRIPE_TEAM_MONTHLY_PRICE_ID ?? ""]: "TEAM",
  [process.env.STRIPE_TEAM_ANNUAL_PRICE_ID ?? ""]: "TEAM",
}

export async function POST(req: Request) {
  const stripe = getStripe()
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("Webhook signature verification failed:", message)
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const orgId = session.metadata?.organizationId
        if (orgId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          )
          const priceId = subscription.items.data[0]?.price.id ?? ""
          const plan = PRICE_TO_PLAN[priceId] ?? "FREE"

          await prisma.organization.update({
            where: { id: orgId },
            data: {
              plan,
              stripeCustomerId: session.customer as string,
              planExpiresAt: new Date(
                subscription.current_period_end * 1000
              ),
            },
          })
        }
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const priceId = subscription.items.data[0]?.price.id ?? ""
        const plan = PRICE_TO_PLAN[priceId] ?? "FREE"

        await prisma.organization.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            plan,
            planExpiresAt: new Date(
              subscription.current_period_end * 1000
            ),
          },
        })
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        await prisma.organization.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            plan: "FREE",
            planExpiresAt: null,
          },
        })
        break
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("Webhook handler error:", message)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}
