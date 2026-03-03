"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { trpc } from "@/lib/trpc/client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Loader2,
  Share2,
  Copy,
  Check,
  Eye,
  Heart,
  MousePointerClick,
  TrendingUp,
  FileText,
  Clock,
  AlertCircle,
  RefreshCw,
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

function ReportSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      <div className="h-40 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded bg-muted" />
        ))}
      </div>
      <div className="h-60 animate-pulse rounded bg-muted" />
    </div>
  )
}

export default function ReportViewPage() {
  const params = useParams()
  const reportId = params.id as string

  const [copied, setCopied] = useState(false)
  const [shareExpiry, setShareExpiry] = useState("30")

  const { data: report, isLoading, refetch } = trpc.report.get.useQuery({ id: reportId })
  const utils = trpc.useUtils()

  const shareMutation = trpc.report.share.useMutation({
    onSuccess: () => {
      utils.report.get.invalidate({ id: reportId })
    },
  })

  if (isLoading) return <ReportSkeleton />

  if (!report) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">Report not found.</p>
        <Link href="/dashboard/reports">
          <Button variant="outline">Back to Reports</Button>
        </Link>
      </div>
    )
  }

  // Pending/Generating state
  if (report.status === "PENDING" || report.status === "GENERATING") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <h2 className="text-xl font-semibold">Generating your report...</h2>
        <p className="text-sm text-muted-foreground">
          This usually takes under a minute. The AI is analyzing your data
          and writing an executive summary.
        </p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Check Status
        </Button>
      </div>
    )
  }

  // Failed state
  if (report.status === "FAILED") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <h2 className="text-xl font-semibold">Report Generation Failed</h2>
        <p className="text-sm text-muted-foreground">
          {report.errorMessage ?? "An unexpected error occurred."}
        </p>
        <Link href="/dashboard/reports">
          <Button variant="outline">Back to Reports</Button>
        </Link>
      </div>
    )
  }

  const overview = report.overviewData as OverviewData | null
  const platforms = (report.platformData as PlatformData[] | null) ?? []
  const topPosts = (report.topPostsData as TopPostData[] | null) ?? []

  const existingShareToken = report.shares?.[0]?.token

  function handleShare() {
    shareMutation.mutate({
      reportId,
      expiresInDays: parseInt(shareExpiry, 10),
    })
  }

  function copyShareLink(token: string) {
    const url = `${window.location.origin}/share/report/${token}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/reports">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{report.title}</h1>
            <p className="text-sm text-muted-foreground">
              {formatDate(report.dateRangeStart)} — {formatDate(report.dateRangeEnd)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {existingShareToken ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyShareLink(existingShareToken)}
            >
              {copied ? (
                <Check className="mr-2 h-4 w-4 text-green-600" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copied ? "Copied!" : "Copy Share Link"}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Select value={shareExpiry} onValueChange={setShareExpiry}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Expires in 7d</SelectItem>
                  <SelectItem value="30">Expires in 30d</SelectItem>
                  <SelectItem value="90">Expires in 90d</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleShare}
                disabled={shareMutation.isPending}
              >
                {shareMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Share2 className="mr-2 h-4 w-4" />
                )}
                Share
              </Button>
            </div>
          )}
        </div>
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
              {report.executiveSummary.split("\n\n").map((paragraph, i) => (
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
              {/* Header row */}
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
              Attached Screenshots
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {report.screenshotUrls.map((url, i) => {
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
    </div>
  )
}
