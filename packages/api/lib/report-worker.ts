import { Worker, Queue } from "bullmq"
import { getRedisConnection } from "./redis"
import { prisma } from "@grimoire/db"
import { generateExecutiveSummary } from "@grimoire/ai"
import type { Prisma } from "@grimoire/db"

export const REPORT_QUEUE_NAME = "generate-reports"

export function getReportQueue() {
  return new Queue(REPORT_QUEUE_NAME, {
    connection: getRedisConnection(),
  })
}

interface ReportJobData {
  reportId: string
  organizationId: string
}

function getComparisonDates(
  start: Date,
  end: Date,
  comparePeriod: string,
): { compStart: Date; compEnd: Date } {
  const diffMs = end.getTime() - start.getTime()

  switch (comparePeriod) {
    case "PREVIOUS_PERIOD": {
      const compEnd = new Date(start.getTime() - 1)
      const compStart = new Date(compEnd.getTime() - diffMs)
      return { compStart, compEnd }
    }
    case "PREVIOUS_WEEK": {
      const compStart = new Date(start)
      compStart.setDate(compStart.getDate() - 7)
      const compEnd = new Date(end)
      compEnd.setDate(compEnd.getDate() - 7)
      return { compStart, compEnd }
    }
    case "PREVIOUS_MONTH": {
      const compStart = new Date(start)
      compStart.setMonth(compStart.getMonth() - 1)
      const compEnd = new Date(end)
      compEnd.setMonth(compEnd.getMonth() - 1)
      return { compStart, compEnd }
    }
    case "PREVIOUS_YEAR": {
      const compStart = new Date(start)
      compStart.setFullYear(compStart.getFullYear() - 1)
      const compEnd = new Date(end)
      compEnd.setFullYear(compEnd.getFullYear() - 1)
      return { compStart, compEnd }
    }
    default:
      throw new Error(`Unknown compare period: ${comparePeriod}`)
  }
}

async function fetchOverview(
  organizationId: string,
  startDate: Date,
  endDate: Date,
  platforms: string[],
) {
  const events = await prisma.analyticsEvent.groupBy({
    by: ["metricType"],
    where: {
      organizationId,
      recordedAt: { gte: startDate, lte: endDate },
      ...(platforms.length > 0 ? { platform: { in: platforms as any } } : {}),
    },
    _sum: { value: true },
  })

  const publishedPosts = await prisma.scheduledPost.count({
    where: {
      organizationId,
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

  return {
    impressions,
    engagements,
    clicks,
    shares,
    publishedPosts,
    engagementRate: impressions > 0 ? engagements / impressions : 0,
  }
}

async function fetchPlatformBreakdown(
  organizationId: string,
  startDate: Date,
  endDate: Date,
  platforms: string[],
) {
  const events = await prisma.analyticsEvent.groupBy({
    by: ["platform", "metricType"],
    where: {
      organizationId,
      recordedAt: { gte: startDate, lte: endDate },
      ...(platforms.length > 0 ? { platform: { in: platforms as any } } : {}),
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
      platformMap[key] = { platform: key, impressions: 0, engagements: 0, clicks: 0, shares: 0 }
    }
    const entry = platformMap[key]
    const mt = event.metricType as keyof Omit<typeof entry, "platform">
    if (mt in entry) {
      entry[mt] = event._sum.value ?? 0
    }
  }

  return Object.values(platformMap)
}

async function fetchTopPosts(
  organizationId: string,
  startDate: Date,
  endDate: Date,
) {
  const rows = await prisma.$queryRaw<
    Array<{ platformPostId: string; total: number }>
  >(
    Prisma.sql`
      SELECT
        "platformPostId",
        COALESCE(SUM("value"), 0)::float AS "total"
      FROM "AnalyticsEvent"
      WHERE "organizationId" = ${organizationId}
        AND "metricType" = 'engagements'
        AND "platformPostId" IS NOT NULL
        AND "recordedAt" >= ${startDate}
        AND "recordedAt" <= ${endDate}
      GROUP BY "platformPostId"
      ORDER BY "total" DESC
      LIMIT 5
    `,
  )

  if (rows.length === 0) return []

  const postIdList = rows.map((r) => r.platformPostId)
  const scheduledPosts = await prisma.scheduledPost.findMany({
    where: {
      organizationId,
      platformPostId: { in: postIdList },
    },
    include: {
      contentItem: { select: { title: true, body: true } },
      socialAccount: { select: { platform: true } },
    },
  })

  const postMap = new Map(scheduledPosts.map((p) => [p.platformPostId, p]))

  return rows.map((row) => {
    const sp = postMap.get(row.platformPostId)
    return {
      platformPostId: row.platformPostId,
      total: row.total,
      title: sp?.contentItem?.title ?? null,
      platform: sp?.socialAccount?.platform ?? null,
    }
  })
}

export function startReportWorker() {
  const worker = new Worker<ReportJobData>(
    REPORT_QUEUE_NAME,
    async (job) => {
      const { reportId, organizationId } = job.data

      const report = await prisma.report.findUnique({
        where: { id: reportId },
      })

      if (!report) {
        throw new Error(`Report ${reportId} not found`)
      }

      if (report.status !== "PENDING") {
        return
      }

      // Mark as generating
      await prisma.report.update({
        where: { id: reportId },
        data: { status: "GENERATING" },
      })

      try {
        const startDate = report.dateRangeStart
        const endDate = report.dateRangeEnd

        // Fetch current period data
        const [overview, platformBreakdown, topPosts] = await Promise.all([
          fetchOverview(organizationId, startDate, endDate, report.platforms),
          fetchPlatformBreakdown(organizationId, startDate, endDate, report.platforms),
          fetchTopPosts(organizationId, startDate, endDate),
        ])

        // Fetch comparison period data if requested
        let previousOverview = null
        if (report.comparePeriod) {
          const { compStart, compEnd } = getComparisonDates(
            startDate,
            endDate,
            report.comparePeriod,
          )
          previousOverview = await fetchOverview(
            organizationId,
            compStart,
            compEnd,
            report.platforms,
          )
        }

        // Generate AI executive summary
        const executiveSummary = await generateExecutiveSummary({
          dateRangeStart: startDate.toISOString(),
          dateRangeEnd: endDate.toISOString(),
          overview,
          previousOverview,
          platformBreakdown,
          topPosts,
          screenshotNotes: report.screenshotNotes as Record<string, string> | null,
        })

        // Save completed report
        await prisma.report.update({
          where: { id: reportId },
          data: {
            status: "COMPLETED",
            overviewData: overview as any,
            platformData: platformBreakdown as any,
            topPostsData: topPosts as any,
            executiveSummary,
          },
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error"
        await prisma.report.update({
          where: { id: reportId },
          data: {
            status: "FAILED",
            errorMessage: message,
          },
        })
        throw err
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 3,
    },
  )

  worker.on("failed", (job, err) => {
    console.error(`Report job ${job?.id} failed:`, err)
  })

  return worker
}
