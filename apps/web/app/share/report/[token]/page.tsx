"use client"

import { useParams } from "next/navigation"
import { trpc } from "@/lib/trpc/client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  Loader2,
  Eye,
  Heart,
  MousePointerClick,
  TrendingUp,
  FileText,
  Share2,
  AlertCircle,
  Sparkles,
  ImageIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PLATFORM_DOT_COLORS } from "@/lib/platform-colors"

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(n))
}

function formatPercentage(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

interface OverviewData {
  impressions: number
  engagements: number
  clicks: number
  shares: number
  publishedPosts: number
  engagementRate: number
}

interface PlatformData {
  platform: string
  impressions: number
  engagements: number
  clicks: number
  shares: number
}

interface TopPostData {
  platformPostId: string
  total: number
  title?: string | null
  platform?: string | null
}

export default function SharedReportPage() {
  const params = useParams()
  const token = params.token as string

  const { data: report, isLoading, error } = trpc.report.getByShareToken.useQuery({ token })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Report Not Available</h2>
        <p className="text-sm text-muted-foreground">
          {error?.message ?? "This share link may have expired or been removed."}
        </p>
      </div>
    )
  }

  const overview = report.overviewData as OverviewData | null
  const platforms = (report.platformData as PlatformData[] | null) ?? []
  const topPosts = (report.topPostsData as TopPostData[] | null) ?? []

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6 py-10">
      {/* Branding header */}
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded grimoire-gradient">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          Powered by Grimoire
        </span>
      </div>

      {/* Report Header */}
      <div>
        <h1 className="text-3xl font-bold">{report.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatDate(report.dateRangeStart)} — {formatDate(report.dateRangeEnd)}
        </p>
      </div>

      {/* Executive Summary */}
      {report.executiveSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <FileText className="h-4 w-4" />
              Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {report.executiveSummary.split("\n\n").map((paragraph: string, i: number) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      {overview && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Impressions
              </CardTitle>
              <Eye className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatNumber(overview.impressions)}</p>
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
              <p className="text-2xl font-bold">{formatNumber(overview.engagements)}</p>
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
              <p className="text-2xl font-bold">{formatNumber(overview.clicks)}</p>
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
                {formatPercentage(overview.engagementRate)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Secondary Stats */}
      {overview && (
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>
              Published Posts:{" "}
              <span className="font-semibold text-foreground">
                {formatNumber(overview.publishedPosts)}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Share2 className="h-4 w-4" />
            <span>
              Shares:{" "}
              <span className="font-semibold text-foreground">
                {formatNumber(overview.shares)}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Platform Breakdown */}
      {platforms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Platform Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="grid grid-cols-5 gap-4 px-2 py-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Platform
                </span>
                <span className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Impressions
                </span>
                <span className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Engagements
                </span>
                <span className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Clicks
                </span>
                <span className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Shares
                </span>
              </div>

              {platforms
                .sort((a, b) => b.impressions - a.impressions)
                .map((p) => {
                  const dotColor =
                    PLATFORM_DOT_COLORS[p.platform as keyof typeof PLATFORM_DOT_COLORS] ??
                    "bg-gray-400"
                  return (
                    <div
                      key={p.platform}
                      className="grid grid-cols-5 gap-4 rounded-md px-2 py-2 hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dotColor)} />
                        <span className="text-sm font-medium">{p.platform}</span>
                      </div>
                      <span className="text-right text-sm tabular-nums">
                        {formatNumber(p.impressions)}
                      </span>
                      <span className="text-right text-sm tabular-nums">
                        {formatNumber(p.engagements)}
                      </span>
                      <span className="text-right text-sm tabular-nums">
                        {formatNumber(p.clicks)}
                      </span>
                      <span className="text-right text-sm tabular-nums">
                        {formatNumber(p.shares)}
                      </span>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Posts */}
      {topPosts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Top Performing Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="grid grid-cols-4 gap-4 px-2 py-1.5">
                <span className="col-span-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Post
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Platform
                </span>
                <span className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Engagements
                </span>
              </div>

              {topPosts.map((post) => {
                const dotColor = post.platform
                  ? PLATFORM_DOT_COLORS[post.platform as keyof typeof PLATFORM_DOT_COLORS] ??
                    "bg-gray-400"
                  : "bg-gray-400"
                return (
                  <div
                    key={post.platformPostId}
                    className="grid grid-cols-4 gap-4 rounded-md px-2 py-2 hover:bg-muted/50"
                  >
                    <span className="col-span-2 truncate text-sm">
                      {post.title ?? post.platformPostId}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dotColor)} />
                      <span className="text-sm">{post.platform ?? "—"}</span>
                    </div>
                    <span className="text-right text-sm font-medium tabular-nums">
                      {formatNumber(post.total)}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Screenshots */}
      {report.screenshotUrls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <ImageIcon className="h-4 w-4" />
              Attached Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {report.screenshotUrls.map((url: string, i: number) => {
                const notes = report.screenshotNotes as Record<string, string> | null
                const note = notes?.[url]
                return (
                  <div key={i} className="space-y-2">
                    <img
                      src={url}
                      alt={`Screenshot ${i + 1}`}
                      className="rounded-lg border border-border object-contain"
                    />
                    {note && (
                      <p className="text-xs text-muted-foreground">{note}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <div className="flex h-5 w-5 items-center justify-center rounded grimoire-gradient">
          <Sparkles className="h-3 w-3 text-white" />
        </div>
        <span>Generated with Grimoire</span>
      </div>
    </div>
  )
}
