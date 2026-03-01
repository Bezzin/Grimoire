# Phase 4D: Analytics Dashboard — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an analytics dashboard showing post performance metrics (impressions, engagements, clicks), platform breakdowns, and time-series charts using the existing `AnalyticsEvent` model with a new analytics tRPC router.

**Architecture:** A new `analytics` tRPC router provides aggregated queries over `AnalyticsEvent` data (overview stats, time-series, platform breakdown, top posts). The client page renders KPI cards, a time-series area chart (using Recharts), a platform-by-platform breakdown, and a top posts table. Plan-gated to Starter+.

**Tech Stack:** Recharts (charting), tRPC (data fetching), Prisma raw aggregations, existing UI components (Card, Badge, Tabs, Select), Tailwind CSS

---

### Task 1: Install Recharts

**Files:**
- Modify: `apps/web/package.json`

**Step 1: Install recharts**

```bash
cd apps/web && pnpm add recharts
```

**Step 2: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore: install recharts for analytics charts"
```

---

### Task 2: Analytics tRPC Router

**Files:**
- Create: `packages/api/routers/analytics.ts`
- Modify: `packages/api/root.ts` (register analytics router)

**Step 1: Create the analytics router**

Create `packages/api/routers/analytics.ts` with 4 queries, all using `orgProtectedProcedure`:

```typescript
import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, orgProtectedProcedure } from "../trpc"
import { PLANS } from "@grimoire/shared"
import type { PlanKey } from "@grimoire/shared"

export const analyticsRouter = createTRPCRouter({
  // 1. Overview: aggregate totals for a date range
  overview: orgProtectedProcedure
    .input(
      z.object({
        start: z.string().datetime(),
        end: z.string().datetime(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const planConfig = PLANS[ctx.organization.plan as PlanKey]
      if (!planConfig.analytics) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Analytics requires a Starter plan or higher.",
        })
      }

      const events = await ctx.prisma.analyticsEvent.groupBy({
        by: ["metricType"],
        where: {
          organizationId: ctx.organization.id,
          recordedAt: {
            gte: new Date(input.start),
            lte: new Date(input.end),
          },
        },
        _sum: { value: true },
      })

      // Also get total published posts in the period
      const publishedCount = await ctx.prisma.scheduledPost.count({
        where: {
          organizationId: ctx.organization.id,
          status: "PUBLISHED",
          publishedAt: {
            gte: new Date(input.start),
            lte: new Date(input.end),
          },
        },
      })

      const metrics: Record<string, number> = {}
      for (const event of events) {
        metrics[event.metricType] = event._sum.value ?? 0
      }

      return {
        impressions: metrics["impressions"] ?? 0,
        engagements: metrics["engagements"] ?? 0,
        clicks: metrics["clicks"] ?? 0,
        shares: metrics["shares"] ?? 0,
        publishedPosts: publishedCount,
        engagementRate:
          (metrics["impressions"] ?? 0) > 0
            ? ((metrics["engagements"] ?? 0) / (metrics["impressions"] ?? 1)) * 100
            : 0,
      }
    }),

  // 2. Time series: daily aggregated metrics for charting
  timeSeries: orgProtectedProcedure
    .input(
      z.object({
        start: z.string().datetime(),
        end: z.string().datetime(),
        metric: z.enum(["impressions", "engagements", "clicks", "shares"]).default("impressions"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const planConfig = PLANS[ctx.organization.plan as PlanKey]
      if (!planConfig.analytics) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Analytics requires a Starter plan or higher.",
        })
      }

      // Use raw query for daily grouping
      const results = await ctx.prisma.$queryRaw<
        Array<{ date: string; total: number }>
      >`
        SELECT
          DATE("recordedAt") as date,
          SUM(value) as total
        FROM "AnalyticsEvent"
        WHERE "organizationId" = ${ctx.organization.id}
          AND "metricType" = ${input.metric}
          AND "recordedAt" >= ${new Date(input.start)}
          AND "recordedAt" <= ${new Date(input.end)}
        GROUP BY DATE("recordedAt")
        ORDER BY date ASC
      `

      return results.map((r) => ({
        date: String(r.date),
        value: Number(r.total),
      }))
    }),

  // 3. Platform breakdown: totals per platform
  platformBreakdown: orgProtectedProcedure
    .input(
      z.object({
        start: z.string().datetime(),
        end: z.string().datetime(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const planConfig = PLANS[ctx.organization.plan as PlanKey]
      if (!planConfig.analytics) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Analytics requires a Starter plan or higher.",
        })
      }

      const results = await ctx.prisma.analyticsEvent.groupBy({
        by: ["platform", "metricType"],
        where: {
          organizationId: ctx.organization.id,
          recordedAt: {
            gte: new Date(input.start),
            lte: new Date(input.end),
          },
        },
        _sum: { value: true },
      })

      // Group by platform
      const platforms: Record<string, Record<string, number>> = {}
      for (const row of results) {
        if (!platforms[row.platform]) {
          platforms[row.platform] = {}
        }
        platforms[row.platform][row.metricType] = row._sum.value ?? 0
      }

      return Object.entries(platforms).map(([platform, metrics]) => ({
        platform,
        impressions: metrics["impressions"] ?? 0,
        engagements: metrics["engagements"] ?? 0,
        clicks: metrics["clicks"] ?? 0,
        shares: metrics["shares"] ?? 0,
      }))
    }),

  // 4. Top posts: best performing published posts
  topPosts: orgProtectedProcedure
    .input(
      z.object({
        start: z.string().datetime(),
        end: z.string().datetime(),
        sortBy: z.enum(["impressions", "engagements", "clicks"]).default("engagements"),
        limit: z.number().min(1).max(20).default(5),
      }),
    )
    .query(async ({ ctx, input }) => {
      const planConfig = PLANS[ctx.organization.plan as PlanKey]
      if (!planConfig.analytics) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Analytics requires a Starter plan or higher.",
        })
      }

      // Get analytics events grouped by platformPostId
      const results = await ctx.prisma.$queryRaw<
        Array<{ platformPostId: string; total: number }>
      >`
        SELECT
          "platformPostId",
          SUM(value) as total
        FROM "AnalyticsEvent"
        WHERE "organizationId" = ${ctx.organization.id}
          AND "metricType" = ${input.sortBy}
          AND "platformPostId" IS NOT NULL
          AND "recordedAt" >= ${new Date(input.start)}
          AND "recordedAt" <= ${new Date(input.end)}
        GROUP BY "platformPostId"
        ORDER BY total DESC
        LIMIT ${input.limit}
      `

      if (results.length === 0) return []

      // Fetch the associated scheduled posts
      const postIds = results.map((r) => r.platformPostId)
      const posts = await ctx.prisma.scheduledPost.findMany({
        where: {
          organizationId: ctx.organization.id,
          platformPostId: { in: postIds },
        },
        include: {
          contentItem: {
            select: { id: true, title: true, body: true, type: true },
          },
          socialAccount: {
            select: { platform: true, displayName: true },
          },
        },
      })

      // Merge metrics with post data
      return results.map((r) => {
        const post = posts.find((p) => p.platformPostId === r.platformPostId)
        return {
          platformPostId: r.platformPostId,
          metricValue: Number(r.total),
          post: post
            ? {
                id: post.id,
                platform: post.socialAccount.platform,
                accountName: post.socialAccount.displayName,
                title: post.contentItem.title,
                body: post.contentItem.body.slice(0, 100),
                publishedAt: post.publishedAt?.toISOString() ?? null,
                platformPostUrl: post.platformPostUrl,
              }
            : null,
        }
      })
    }),
})
```

**Step 2: Register in root router**

In `packages/api/root.ts`, add:
```typescript
import { analyticsRouter } from "./routers/analytics"
```

And add `analytics: analyticsRouter` to the `createTRPCRouter({...})` call.

**Step 3: Commit**

```bash
git add packages/api/routers/analytics.ts packages/api/root.ts
git commit -m "feat: add analytics tRPC router with overview, timeSeries, platformBreakdown, topPosts"
```

---

### Task 3: Analytics Dashboard Page — KPI Cards & Date Range Picker

**Files:**
- Modify: `apps/web/app/(dashboard)/dashboard/analytics/page.tsx` (replace placeholder)

**Step 1: Build the analytics dashboard**

Replace the placeholder with a full `"use client"` page. Structure:

```
+----------------------------------------------------------+
| Analytics                     [7D] [30D] [90D] [Custom]  |
+----------------------------------------------------------+
| +----------+ +----------+ +----------+ +----------+      |
| |Impressions| |Engagements| |  Clicks  | |Eng. Rate|     |
| | 12,345   | | 1,234    | |   567    | | 10.0%   |      |
| +----------+ +----------+ +----------+ +----------+      |
|                                                          |
| Published Posts: 42                                      |
+----------------------------------------------------------+
```

Key implementation details:
- State: `dateRange` with `start`/`end` Dates, `activePreset` ("7d" | "30d" | "90d" | "custom")
- Preset buttons: 7D = last 7 days, 30D = last 30 days, 90D = last 90 days
- Fetch: `trpc.analytics.overview.useQuery({ start, end })`
- 4 KPI cards using the Card component: Impressions, Engagements, Clicks, Engagement Rate
- A 5th "Published Posts" stat below
- Plan gating: if query returns FORBIDDEN, show upgrade prompt instead
- Format numbers with `Intl.NumberFormat` (e.g., 12,345)
- Format percentages to 1 decimal (e.g., 10.0%)

**Step 2: Commit**

```bash
git add apps/web/app/(dashboard)/dashboard/analytics/page.tsx
git commit -m "feat: build analytics dashboard with KPI cards and date range picker"
```

---

### Task 4: Time Series Chart

**Files:**
- Modify: `apps/web/app/(dashboard)/dashboard/analytics/page.tsx`

**Step 1: Add time series chart section**

Below the KPI cards, add:

```
+----------------------------------------------------------+
| Performance Over Time         [Impressions v]             |
| +------------------------------------------------------+ |
| |                    📈 Area Chart                      | |
| |  (Recharts AreaChart with gradient fill)              | |
| |  X-axis: dates, Y-axis: metric values                | |
| +------------------------------------------------------+ |
+----------------------------------------------------------+
```

- Metric selector: dropdown to switch between impressions, engagements, clicks, shares
- State: `selectedMetric` ("impressions" | "engagements" | "clicks" | "shares")
- Fetch: `trpc.analytics.timeSeries.useQuery({ start, end, metric: selectedMetric })`
- Use Recharts `AreaChart` with:
  - `ResponsiveContainer` (width="100%" height={350})
  - Gradient fill from primary color to transparent
  - `XAxis` with date labels (formatted short: "Mar 1")
  - `YAxis` with number formatting
  - `Tooltip` with formatted values
  - `CartesianGrid` with dashed strokeDasharray
- If no data: show empty state "No analytics data for this period"

**Step 2: Commit**

```bash
git add apps/web/app/(dashboard)/dashboard/analytics/page.tsx
git commit -m "feat: add time series area chart to analytics dashboard"
```

---

### Task 5: Platform Breakdown Section

**Files:**
- Create: `apps/web/components/dashboard/analytics/platform-breakdown.tsx`
- Modify: `apps/web/app/(dashboard)/dashboard/analytics/page.tsx` (render component)

**Step 1: Create the platform breakdown component**

```typescript
interface PlatformBreakdownProps {
  data: Array<{
    platform: string
    impressions: number
    engagements: number
    clicks: number
    shares: number
  }>
  isLoading: boolean
}
```

Renders:
- A Card with title "Platform Performance"
- A table/grid showing each platform with:
  - Platform color dot (from `@/lib/platform-colors`) + platform name
  - Impressions column
  - Engagements column
  - Clicks column
- Sorted by impressions descending
- If no data: "No platform data available"
- Also include a simple horizontal bar for each platform's impression share (percentage of total)

**Step 2: Wire into analytics page**

Import and render below the time series chart, passing `platformBreakdown.data` as props.

**Step 3: Commit**

```bash
git add apps/web/components/dashboard/analytics/platform-breakdown.tsx apps/web/app/(dashboard)/dashboard/analytics/page.tsx
git commit -m "feat: add platform breakdown section to analytics dashboard"
```

---

### Task 6: Top Posts Table

**Files:**
- Create: `apps/web/components/dashboard/analytics/top-posts-table.tsx`
- Modify: `apps/web/app/(dashboard)/dashboard/analytics/page.tsx` (render component)

**Step 1: Create the top posts component**

```typescript
interface TopPostsTableProps {
  data: Array<{
    platformPostId: string
    metricValue: number
    post: {
      id: string
      platform: string
      accountName: string | null
      title: string | null
      body: string
      publishedAt: string | null
      platformPostUrl: string | null
    } | null
  }>
  sortBy: string
  isLoading: boolean
}
```

Renders:
- A Card with title "Top Performing Posts"
- Sort selector: Engagements, Impressions, Clicks (controls which metric is shown as the ranking value)
- Table rows showing:
  - Platform color badge + account name
  - Post title or body truncated to 60 chars
  - The metric value (formatted with Intl.NumberFormat)
  - Published date (formatted relative or short date)
  - "View" link if platformPostUrl exists (opens in new tab)
- If no data: "No published posts with analytics data yet"

**Step 2: Wire into analytics page**

Import and render below the platform breakdown. Add `topPostsSortBy` state and pass to the query.

**Step 3: Commit**

```bash
git add apps/web/components/dashboard/analytics/top-posts-table.tsx apps/web/app/(dashboard)/dashboard/analytics/page.tsx
git commit -m "feat: add top posts table to analytics dashboard"
```

---

### Task 7: Build Verification

**Step 1: Run TypeScript check**

```bash
npx tsc --noEmit --project apps/web/tsconfig.json
```

**Step 2: Fix all errors**

**Step 3: Commit fixes if needed**

```bash
git add -A
git commit -m "fix: resolve Phase 4D type errors for clean build"
```
