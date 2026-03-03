import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, orgProtectedProcedure, publicProcedure } from "../trpc"
import { PLANS } from "@grimoire/shared"
import type { PlanKey } from "@grimoire/shared"
import { getReportQueue } from "../lib/report-worker"

function assertAnalyticsEnabled(plan: string): void {
  const planConfig = PLANS[plan as PlanKey]
  if (!planConfig.analytics) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Reports require a Starter plan or higher.",
    })
  }
}

const comparePeriodEnum = z.enum([
  "PREVIOUS_PERIOD",
  "PREVIOUS_WEEK",
  "PREVIOUS_MONTH",
  "PREVIOUS_YEAR",
])

export const reportRouter = createTRPCRouter({
  generate: orgProtectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        dateRangeStart: z.string().datetime(),
        dateRangeEnd: z.string().datetime(),
        comparePeriod: comparePeriodEnum.optional(),
        platforms: z.array(z.string()).min(1),
        screenshotUrls: z.array(z.string().url()).optional(),
        screenshotNotes: z.record(z.string(), z.string()).optional(),
        templateId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertAnalyticsEnabled(ctx.organization.plan)

      const report = await ctx.prisma.report.create({
        data: {
          title: input.title,
          dateRangeStart: new Date(input.dateRangeStart),
          dateRangeEnd: new Date(input.dateRangeEnd),
          comparePeriod: input.comparePeriod ?? null,
          platforms: input.platforms,
          screenshotUrls: input.screenshotUrls ?? [],
          screenshotNotes: input.screenshotNotes ?? undefined,
          templateId: input.templateId ?? null,
          organizationId: ctx.organization.id,
          createdById: ctx.session.user.id,
          status: "PENDING",
        },
      })

      // Enqueue the report generation job
      const queue = getReportQueue()
      const job = await queue.add("generate-report", {
        reportId: report.id,
        organizationId: ctx.organization.id,
      })

      await ctx.prisma.report.update({
        where: { id: report.id },
        data: { bullJobId: job.id ?? null },
      })

      return { id: report.id }
    }),

  get: orgProtectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const report = await ctx.prisma.report.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organization.id,
        },
        include: {
          template: true,
          shares: true,
        },
      })

      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Report not found." })
      }

      return report
    }),

  list: orgProtectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertAnalyticsEnabled(ctx.organization.plan)

      const reports = await ctx.prisma.report.findMany({
        where: { organizationId: ctx.organization.id },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        select: {
          id: true,
          title: true,
          status: true,
          dateRangeStart: true,
          dateRangeEnd: true,
          platforms: true,
          createdAt: true,
          shares: { select: { id: true } },
        },
      })

      let nextCursor: string | undefined
      if (reports.length > input.limit) {
        const next = reports.pop()
        nextCursor = next?.id
      }

      return { reports, nextCursor }
    }),

  delete: orgProtectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const report = await ctx.prisma.report.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
      })

      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Report not found." })
      }

      await ctx.prisma.report.delete({ where: { id: input.id } })
      return { success: true }
    }),

  share: orgProtectedProcedure
    .input(
      z.object({
        reportId: z.string(),
        expiresInDays: z.number().min(1).max(90).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const report = await ctx.prisma.report.findFirst({
        where: {
          id: input.reportId,
          organizationId: ctx.organization.id,
          status: "COMPLETED",
        },
      })

      if (!report) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Report not found or not yet completed.",
        })
      }

      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
        : null

      const share = await ctx.prisma.reportShare.create({
        data: {
          reportId: input.reportId,
          expiresAt,
        },
      })

      return { token: share.token, expiresAt: share.expiresAt }
    }),

  getByShareToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const share = await ctx.prisma.reportShare.findUnique({
        where: { token: input.token },
        include: {
          report: {
            include: { template: true },
          },
        },
      })

      if (!share) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Share link not found." })
      }

      if (share.expiresAt && share.expiresAt < new Date()) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Share link has expired." })
      }

      return share.report
    }),

  // ---- Templates ----

  saveTemplate: orgProtectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        platforms: z.array(z.string()).min(1),
        comparePeriod: comparePeriodEnum.optional(),
        includeScreenshots: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertAnalyticsEnabled(ctx.organization.plan)

      const template = await ctx.prisma.reportTemplate.create({
        data: {
          name: input.name,
          platforms: input.platforms,
          comparePeriod: input.comparePeriod ?? null,
          includeScreenshots: input.includeScreenshots,
          organizationId: ctx.organization.id,
          createdById: ctx.session.user.id,
        },
      })

      return template
    }),

  listTemplates: orgProtectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.reportTemplate.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: { createdAt: "desc" },
    })
  }),

  deleteTemplate: orgProtectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.prisma.reportTemplate.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
      })

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found." })
      }

      await ctx.prisma.reportTemplate.delete({ where: { id: input.id } })
      return { success: true }
    }),
})
