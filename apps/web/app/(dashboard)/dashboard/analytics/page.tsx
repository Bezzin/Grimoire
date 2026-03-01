"use client"

import { useState, useMemo } from "react"
import { trpc } from "@/lib/trpc/client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import {
  Eye,
  Heart,
  MousePointerClick,
  TrendingUp,
  Lock,
  FileText,
  Share2,
} from "lucide-react"
import { PlatformBreakdown } from "@/components/dashboard/analytics/platform-breakdown"

type TimeSeriesMetric = "impressions" | "engagements" | "clicks" | "shares"

const METRIC_OPTIONS: { label: string; value: TimeSeriesMetric }[] = [
  { label: "Impressions", value: "impressions" },
  { label: "Engagements", value: "engagements" },
  { label: "Clicks", value: "clicks" },
  { label: "Shares", value: "shares" },
]

const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  compactDisplay: "short",
})

const tooltipFormatter = new Intl.NumberFormat("en-US")

function formatDateTick(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatYAxis(value: number): string {
  return compactFormatter.format(value)
}

function ChartSkeleton() {
  return (
    <div className="flex h-[350px] w-full items-center justify-center">
      <div className="h-full w-full animate-pulse rounded bg-muted" />
    </div>
  )
}

function ChartEmpty() {
  return (
    <div className="flex h-[350px] w-full items-center justify-center">
      <p className="text-sm text-muted-foreground">
        No analytics data for this period
      </p>
    </div>
  )
}

type DatePreset = "7d" | "30d" | "90d"

const PRESETS: { label: string; value: DatePreset; days: number }[] = [
  { label: "7 Days", value: "7d", days: 7 },
  { label: "30 Days", value: "30d", days: 30 },
  { label: "90 Days", value: "90d", days: 90 },
]

function makeDateRange(days: number): { start: Date; end: Date } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  return { start, end }
}

const numberFormatter = new Intl.NumberFormat("en-US")

function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function KpiSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-5 w-5 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  )
}

function SecondaryStatSkeleton() {
  return <div className="h-5 w-36 animate-pulse rounded bg-muted" />
}

export default function AnalyticsPage() {
  const [activePreset, setActivePreset] = useState<DatePreset>("30d")
  const [dateRange, setDateRange] = useState(() => makeDateRange(30))
  const [selectedMetric, setSelectedMetric] =
    useState<TimeSeriesMetric>("impressions")

  function handlePresetChange(preset: DatePreset, days: number) {
    setActivePreset(preset)
    setDateRange(makeDateRange(days))
  }

  const queryInput = useMemo(
    () => ({
      start: dateRange.start.toISOString(),
      end: dateRange.end.toISOString(),
    }),
    [dateRange.start, dateRange.end],
  )

  const { data, isLoading, error } = trpc.analytics.overview.useQuery(queryInput)

  const timeSeriesInput = useMemo(
    () => ({
      start: dateRange.start.toISOString(),
      end: dateRange.end.toISOString(),
      metric: selectedMetric,
    }),
    [dateRange.start, dateRange.end, selectedMetric],
  )

  const {
    data: timeSeriesData,
    isLoading: isTimeSeriesLoading,
  } = trpc.analytics.timeSeries.useQuery(timeSeriesInput)

  const {
    data: platformData,
    isLoading: isPlatformLoading,
  } = trpc.analytics.platformBreakdown.useQuery(queryInput)

  const isForbidden =
    error?.data?.code === "FORBIDDEN" ||
    error?.message?.includes("Analytics requires a Starter plan")

  if (isForbidden) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-semibold">Analytics Unavailable</h1>
        <p className="text-muted-foreground max-w-md">
          Analytics requires a Starter plan or higher. Upgrade your plan to
          unlock detailed insights about your content performance.
        </p>
        <Button>Upgrade Plan</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Analytics</h1>

        <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
          {PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => handlePresetChange(preset.value, preset.days)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                activePreset === preset.value
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Impressions
                </CardTitle>
                <Eye className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatNumber(data?.impressions ?? 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Engagements
                </CardTitle>
                <Heart className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatNumber(data?.engagements ?? 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Clicks
                </CardTitle>
                <MousePointerClick className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatNumber(data?.clicks ?? 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Engagement Rate
                </CardTitle>
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatPercentage(data?.engagementRate ?? 0)}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Secondary Stats */}
      <div className="flex items-center gap-6">
        {isLoading ? (
          <>
            <SecondaryStatSkeleton />
            <SecondaryStatSkeleton />
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>
                Published Posts:{" "}
                <span className="font-semibold text-foreground">
                  {formatNumber(data?.publishedPosts ?? 0)}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Share2 className="h-4 w-4" />
              <span>
                Shares:{" "}
                <span className="font-semibold text-foreground">
                  {formatNumber(data?.shares ?? 0)}
                </span>
              </span>
            </div>
          </>
        )}
      </div>

      {/* Time Series Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Performance Over Time
          </CardTitle>
          <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
            {METRIC_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedMetric(option.value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  selectedMetric === option.value
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {isTimeSeriesLoading ? (
            <ChartSkeleton />
          ) : !timeSeriesData?.length ? (
            <ChartEmpty />
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={timeSeriesData}>
                <defs>
                  <linearGradient
                    id="chartGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  opacity={0.2}
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateTick}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={formatYAxis}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip
                  formatter={(value: number | undefined) => [
                    tooltipFormatter.format(value ?? 0),
                    selectedMetric.charAt(0).toUpperCase() +
                      selectedMetric.slice(1),
                  ]}
                  labelFormatter={(label) => formatDateTick(String(label))}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--border))",
                    backgroundColor: "hsl(var(--popover))",
                    color: "hsl(var(--popover-foreground))",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#chartGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Platform Breakdown */}
      <PlatformBreakdown
        data={platformData ?? []}
        isLoading={isPlatformLoading}
      />
    </div>
  )
}
