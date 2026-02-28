import { TRPCError } from "@trpc/server"
import { PLANS, type PlanKey } from "@grimoire/shared"
import type { PrismaClient } from "@grimoire/db"

interface RateLimitContext {
  prisma: PrismaClient
  session: {
    user: {
      id: string
    }
  }
}

export async function checkAiRateLimit(ctx: RateLimitContext) {
  const membership = await ctx.prisma.organizationMember.findFirst({
    where: { userId: ctx.session.user.id },
    include: { organization: true },
  })

  if (!membership) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "No organization found",
    })
  }

  const org = membership.organization
  const planConfig = PLANS[org.plan as PlanKey]
  const limit = planConfig.aiGenerationsPerMonth

  // -1 means unlimited
  if (limit === -1) {
    return { organization: org, remaining: Infinity }
  }

  // Reset counter if past reset date
  const now = new Date()
  if (now > org.aiGenerationsResetAt) {
    const nextReset = new Date(now)
    nextReset.setMonth(nextReset.getMonth() + 1)

    const updated = await ctx.prisma.organization.update({
      where: { id: org.id },
      data: {
        aiGenerationsUsed: 0,
        aiGenerationsResetAt: nextReset,
      },
    })

    return { organization: updated, remaining: limit }
  }

  if (org.aiGenerationsUsed >= limit) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `You've reached your monthly limit of ${limit} AI generations. Upgrade to Pro for unlimited.`,
    })
  }

  return { organization: org, remaining: limit - org.aiGenerationsUsed }
}

export async function incrementAiUsage(
  prisma: PrismaClient,
  organizationId: string
) {
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      aiGenerationsUsed: { increment: 1 },
    },
  })
}
