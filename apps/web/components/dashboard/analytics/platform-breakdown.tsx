"use client"

import { useMemo } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { PLATFORM_DOT_COLORS } from "@/lib/platform-colors"

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

const numberFormatter = new Intl.NumberFormat("en-US")

function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

function capitalizePlatform(platform: string): string {
  const lower = platform.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function getDotColor(platform: string): string {
  return PLATFORM_DOT_COLORS[platform.toUpperCase()] ?? "bg-gray-400"
}

function SkeletonRows() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="grid grid-cols-4 gap-4">
            <div className="h-5 w-24 animate-pulse rounded bg-muted" />
            <div className="h-5 w-16 animate-pulse rounded bg-muted" />
            <div className="h-5 w-16 animate-pulse rounded bg-muted" />
            <div className="h-5 w-16 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-2 w-full animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

export function PlatformBreakdown({ data, isLoading }: PlatformBreakdownProps) {
  const sortedData = useMemo(() => {
    if (!data) return []
    return [...data].sort((a, b) => b.impressions - a.impressions)
  }, [data])

  const maxImpressions = useMemo(() => {
    if (!sortedData.length) return 0
    return sortedData[0].impressions
  }, [sortedData])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Platform Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <SkeletonRows />
        ) : !sortedData.length ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No platform data available
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {/* Column Headers */}
            <div className="grid grid-cols-4 gap-4 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span>Platform</span>
              <span className="text-right">Impressions</span>
              <span className="text-right">Engagements</span>
              <span className="text-right">Clicks</span>
            </div>

            {/* Rows */}
            {sortedData.map((row) => {
              const barWidth =
                maxImpressions > 0
                  ? (row.impressions / maxImpressions) * 100
                  : 0

              return (
                <div key={row.platform} className="flex flex-col gap-1.5 py-2">
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${getDotColor(row.platform)}`}
                      />
                      <span className="font-medium">
                        {capitalizePlatform(row.platform)}
                      </span>
                    </div>
                    <span className="text-right tabular-nums">
                      {formatNumber(row.impressions)}
                    </span>
                    <span className="text-right tabular-nums">
                      {formatNumber(row.engagements)}
                    </span>
                    <span className="text-right tabular-nums">
                      {formatNumber(row.clicks)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${getDotColor(row.platform)} transition-all duration-500`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
