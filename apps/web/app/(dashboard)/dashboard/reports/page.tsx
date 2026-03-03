"use client"

import { useState } from "react"
import Link from "next/link"
import { trpc } from "@/lib/trpc/client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Plus,
  Loader2,
  Trash2,
  ExternalLink,
  Lock,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; className: string }
> = {
  PENDING: {
    label: "Pending",
    icon: Clock,
    className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  GENERATING: {
    label: "Generating",
    icon: Loader2,
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  COMPLETED: {
    label: "Completed",
    icon: CheckCircle2,
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  FAILED: {
    label: "Failed",
    icon: AlertCircle,
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function ReportRowSkeleton() {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-4 last:border-0">
      <div className="flex flex-col gap-2">
        <div className="h-5 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-6 w-20 animate-pulse rounded bg-muted" />
    </div>
  )
}

export default function ReportsPage() {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const utils = trpc.useUtils()

  const { data, isLoading, error } = trpc.report.list.useQuery({ limit: 20 })

  const deleteMutation = trpc.report.delete.useMutation({
    onSuccess: () => {
      utils.report.list.invalidate()
      setDeletingId(null)
    },
  })

  const isForbidden =
    error?.data?.code === "FORBIDDEN" ||
    error?.message?.includes("Reports require a Starter plan")

  if (isForbidden) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-semibold">Reports Unavailable</h1>
        <p className="max-w-md text-muted-foreground">
          Automated reports require a Starter plan or higher. Upgrade your plan to
          generate client-ready reports.
        </p>
        <Button>Upgrade Plan</Button>
      </div>
    )
  }

  const reports = data?.reports ?? []

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <Link href="/dashboard/reports/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </Link>
      </div>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Your Reports</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <>
              <ReportRowSkeleton />
              <ReportRowSkeleton />
              <ReportRowSkeleton />
            </>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <FileText className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No reports yet. Generate your first report to get started.
              </p>
              <Link href="/dashboard/reports/new">
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-3 w-3" />
                  Generate Report
                </Button>
              </Link>
            </div>
          ) : (
            reports.map((report) => {
              const statusInfo = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.PENDING
              const StatusIcon = statusInfo.icon

              return (
                <div
                  key={report.id}
                  className="flex items-center justify-between border-b border-border px-4 py-4 last:border-0"
                >
                  <div className="flex flex-col gap-1">
                    <Link
                      href={`/dashboard/reports/${report.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {report.title}
                    </Link>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        {formatDate(report.dateRangeStart)} — {formatDate(report.dateRangeEnd)}
                      </span>
                      <span>
                        {report.platforms.length} platform{report.platforms.length !== 1 ? "s" : ""}
                      </span>
                      {report.shares.length > 0 && (
                        <span className="flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          {report.shares.length} share link{report.shares.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge
                      variant="secondary"
                      className={cn("flex items-center gap-1 text-xs", statusInfo.className)}
                    >
                      <StatusIcon
                        className={cn(
                          "h-3 w-3",
                          report.status === "GENERATING" && "animate-spin",
                        )}
                      />
                      {statusInfo.label}
                    </Badge>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        setDeletingId(report.id)
                        deleteMutation.mutate({ id: report.id })
                      }}
                      disabled={deletingId === report.id}
                    >
                      {deletingId === report.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
