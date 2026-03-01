import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { Prisma } from "@grimoire/db"
import { createTRPCRouter, orgProtectedProcedure } from "../trpc"
import { PLANS } from "@grimoire/shared"
import type { PlanKey } from "@grimoire/shared"

const metricEnum = z.enum(["impressions", "engagements", "clicks", "shares"])

const dateRangeInput = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
})

function assertAnalyticsEnabled(plan: string): void {
  const planConfig = PLANS[plan as PlanKey]
  if (!planConfig.analytics) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Analytics requires a Starter plan or higher.",
    })
  }
}

export const analyticsRouter = createTRPCRouter({
  overview: orgProtectedProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      assertAnalyticsEnabled(ctx.organization.plan)

      const startDate = new Date(input.start)
      const endDate = new Date(input.end)

      const events = await ctx.prisma.analyticsEvent.groupBy({
        by: ["metricType"],
        where: {
          organizationId: ctx.organization.id,
          recordedAt: { gte: startDate, lte: endDate },
        },
        _sum: { value: true },
      })

      const publishedPosts = await ctx.prisma.scheduledPost.count({
        where: {
          organizationId: ctx.organization.id,
          status: "PUBLISHED",
          publishedAt: { gte: startDate, lte: endDate },
        },
      })

      const metricMap: Record<string, number> = {}
      for (const event of events) {
        metricMap[event.metricType] = event._sum.value ?? 0
      }

      const impressions = metricMap["impressions"] ?? 0
      const engagements = metricMap["engagements"] ?? 0
      const clicks = metricMap["clicks"] ?? 0
      const shares = metricMap["shares"] ?? 0
      const engagementRate = impressions > 0 ? engagements / impressions : 0

      return {
        impressions,
        engagements,
        clicks,
        shares,
        publishedPosts,
        engagementRate,
      }
    }),

  timeSeries: orgProtectedProcedure
    .input(dateRangeInput.extend({ metric: metricEnum }))
    .query(async ({ ctx, input }) => {
      assertAnalyticsEnabled(ctx.organization.plan)

      const startDate = new Date(input.start)
      const endDate = new Date(input.end)

      const rows = await ctx.prisma.$queryRaw<
        Array<{ date: string; value: number }>
      >(
        Prisma.sql`
          SELECT
            CAST(DATE("recordedAt") AS TEXT) AS "date",
            COALESCE(SUM("value"), 0)::float AS "value"
          FROM "AnalyticsEvent"
          WHERE "organizationId" = ${ctx.organization.id}
            AND "metricType" = ${input.metric}
            AND "recordedAt" >= ${startDate}
            AND "recordedAt" <= ${endDate}
          GROUP BY DATE("recordedAt")
          ORDER BY DATE("recordedAt") ASC
        `,
      )

      return rows
    }),

  platformBreakdown: orgProtectedProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      assertAnalyticsEnabled(ctx.organization.plan)

      const startDate = new Date(input.start)
      const endDate = new Date(input.end)

      const events = await ctx.prisma.analyticsEvent.groupBy({
        by: ["platform", "metricType"],
        where: {
          organizationId: ctx.organization.id,
          recordedAt: { gte: startDate, lte: endDate },
        },
        _sum: { value: true },
      })

      const platformMap: Record<
        string,
        { platform: string; impressions: number; engagements: number; clicks: number; shares: number }
      > = {}

      for (const event of events) {
        const key = event.platform
        if (!platformMap[key]) {
          platformMap[key] = {
            platform: key,
            impressions: 0,
            engagements: 0,
            clicks: 0,
            shares: 0,
          }
        }
        const entry = platformMap[key]
        const metricType = event.metricType as keyof Omit<typeof entry, "platform">
        if (metricType in entry) {
          entry[metricType] = event._sum.value ?? 0
        }
      }

      return Object.values(platformMap)
    }),

  topPosts: orgProtectedProcedure
    .input(
      dateRangeInput.extend({
        sortBy: z.enum(["impressions", "engagements", "clicks"]),
        limit: z.number().min(1).max(20).default(5),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertAnalyticsEnabled(ctx.organization.plan)

      const startDate = new Date(input.start)
      const endDate = new Date(input.end)

      const topPostIds = await ctx.prisma.$queryRaw<
        Array<{ platformPostId: string; total: number }>
      >(
        Prisma.sql`
          SELECT
            "platformPostId",
            COALESCE(SUM("value"), 0)::float AS "total"
          FROM "AnalyticsEvent"
          WHERE "organizationId" = ${ctx.organization.id}
            AND "metricType" = ${input.sortBy}
            AND "platformPostId" IS NOT NULL
            AND "recordedAt" >= ${startDate}
            AND "recordedAt" <= ${endDate}
          GROUP BY "platformPostId"
          ORDER BY "total" DESC
          LIMIT ${input.limit}
        `,
      )

      if (topPostIds.length === 0) {
        return []
      }

      const postIdList = topPostIds.map((r) => r.platformPostId)

      const scheduledPosts = await ctx.prisma.scheduledPost.findMany({
        where: {
          organizationId: ctx.organization.id,
          platformPostId: { in: postIdList },
        },
        include: {
          contentItem: true,
          socialAccount: {
            select: {
              id: true,
              platform: true,
              displayName: true,
              platformUsername: true,
              avatarUrl: true,
            },
          },
        },
      })

      const postMap = new Map(
        scheduledPosts.map((p) => [p.platformPostId, p]),
      )

      return topPostIds.map((row) => ({
        platformPostId: row.platformPostId,
        total: row.total,
        scheduledPost: postMap.get(row.platformPostId) ?? null,
      }))
    }),
})
