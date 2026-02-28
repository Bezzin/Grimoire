import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import Stripe from "stripe"

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured")
  }
  return new Stripe(key, {
    apiVersion: "2024-12-18.acacia",
  })
}

const PRICE_IDS: Record<string, string> = {
  STARTER_MONTHLY: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID ?? "",
  STARTER_ANNUAL: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID ?? "",
  PRO_MONTHLY: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? "",
  PRO_ANNUAL: process.env.STRIPE_PRO_ANNUAL_PRICE_ID ?? "",
  TEAM_MONTHLY: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID ?? "",
  TEAM_ANNUAL: process.env.STRIPE_TEAM_ANNUAL_PRICE_ID ?? "",
}

export const billingRouter = createTRPCRouter({
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        priceKey: z.string(),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const stripe = getStripe()

      const membership = await ctx.prisma.organizationMember.findFirst({
        where: {
          userId: ctx.session.user.id,
          role: { in: ["OWNER", "ADMIN"] },
        },
        include: { organization: true },
      })

      if (!membership) {
        throw new Error("Not authorized to manage billing")
      }

      const org = membership.organization
      let customerId = org.stripeCustomerId

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: ctx.session.user.email ?? undefined,
          metadata: {
            organizationId: org.id,
          },
        })
        customerId = customer.id

        await ctx.prisma.organization.update({
          where: { id: org.id },
          data: { stripeCustomerId: customerId },
        })
      }

      const priceId = PRICE_IDS[input.priceKey]
      if (!priceId) {
        throw new Error("Invalid price key")
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        metadata: {
          organizationId: org.id,
        },
      })

      return { url: session.url }
    }),

  createPortalSession: protectedProcedure
    .input(
      z.object({
        returnUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const stripe = getStripe()

      const membership = await ctx.prisma.organizationMember.findFirst({
        where: {
          userId: ctx.session.user.id,
          role: { in: ["OWNER", "ADMIN"] },
        },
        include: { organization: true },
      })

      if (!membership?.organization.stripeCustomerId) {
        throw new Error("No billing account found")
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: membership.organization.stripeCustomerId,
        return_url: input.returnUrl,
      })

      return { url: session.url }
    }),

  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const membership = await ctx.prisma.organizationMember.findFirst({
      where: { userId: ctx.session.user.id },
      include: { organization: true },
    })

    if (!membership) {
      return { plan: "FREE" as const, expiresAt: null }
    }

    return {
      plan: membership.organization.plan,
      expiresAt: membership.organization.planExpiresAt,
    }
  }),
})
