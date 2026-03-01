"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ExternalLink } from "lucide-react"
import { PLATFORM_DOT_COLORS } from "@/lib/platform-colors"

type SortOption = "impressions" | "engagements" | "clicks"

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: "Engagements", value: "engagements" },
  { label: "Impressions", value: "impressions" },
  { label: "Clicks", value: "clicks" },
]

const metricFormatter = new Intl.NumberFormat("en-US")

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + "..."
}

function capitalizePlatform(platform: string): string {
  return platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase()
}

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
  onSortChange: (sort: SortOption) => void
  isLoading: boolean
}

function RowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-4 last:border-b-0">
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex items-center gap-4">
        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}

export function TopPostsTable({
  data,
  sortBy,
  onSortChange,
  isLoading,
}: TopPostsTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">
          Top Performing Posts
        </CardTitle>
        <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onSortChange(option.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                sortBy === option.value
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
        {isLoading ? (
          <div>
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No published posts with analytics data yet
            </p>
          </div>
        ) : (
          <div>
            {data.map((item) => {
              const platform = item.post?.platform ?? "UNKNOWN"
              const dotColor =
                PLATFORM_DOT_COLORS[platform] ?? "bg-gray-400"
              const accountName = item.post?.accountName
              const displayTitle = item.post?.title
                ? item.post.title
                : item.post?.body
                  ? truncateText(item.post.body, 60)
                  : "Untitled post"

              return (
                <div
                  key={item.platformPostId}
                  className="flex items-center justify-between gap-4 border-b py-4 last:border-b-0"
                >
                  <div className="flex flex-1 flex-col gap-1.5 overflow-hidden">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span
                        className={cn(
                          "inline-block h-2.5 w-2.5 shrink-0 rounded-full",
                          dotColor,
                        )}
                      />
                      <span>
                        {capitalizePlatform(platform)}
                        {accountName ? ` \u00B7 ${accountName}` : ""}
                      </span>
                    </div>
                    <p className="truncate text-sm font-medium">
                      {displayTitle}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-4">
                    <span className="text-sm font-semibold tabular-nums">
                      {metricFormatter.format(item.metricValue)}
                    </span>

                    {item.post?.publishedAt ? (
                      <span className="text-xs text-muted-foreground">
                        {formatShortDate(item.post.publishedAt)}
                      </span>
                    ) : null}

                    {item.post?.platformPostUrl ? (
                      <a
                        href={item.post.platformPostUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        View
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
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
