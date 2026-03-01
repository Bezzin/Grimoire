"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SOCIAL_PLATFORMS } from "@grimoire/shared"
import type { SocialPlatformKey } from "@grimoire/shared"
import { cn } from "@/lib/utils"
import { PLATFORM_COLORS } from "@/lib/platform-colors"
import {
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  ExternalLink,
  Loader2,
  Calendar,
  RotateCcw,
} from "lucide-react"

type TabStatus = "QUEUED" | "PUBLISHED" | "FAILED"

const TABS: { label: string; value: TabStatus; icon: React.ReactNode }[] = [
  { label: "Queued", value: "QUEUED", icon: <Clock className="h-4 w-4" /> },
  {
    label: "Published",
    value: "PUBLISHED",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  { label: "Failed", value: "FAILED", icon: <XCircle className="h-4 w-4" /> },
]

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const absDiff = Math.abs(diffMs)
  const isPast = diffMs < 0

  if (absDiff < 60000) return isPast ? "just now" : "in a moment"
  if (absDiff < 3600000) {
    const mins = Math.floor(absDiff / 60000)
    return isPast ? `${mins}m ago` : `in ${mins}m`
  }
  if (absDiff < 86400000) {
    const hours = Math.floor(absDiff / 3600000)
    return isPast ? `${hours}h ago` : `in ${hours}h`
  }
  const days = Math.floor(absDiff / 86400000)
  return isPast ? `${days}d ago` : `in ${days}d`
}

export default function QueuePage() {
  const [activeTab, setActiveTab] = useState<TabStatus>("QUEUED")
  const [rescheduleId, setRescheduleId] = useState<string | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState("")

  const { data, isLoading, refetch } = trpc.scheduledPost.list.useQuery({
    status: activeTab,
    limit: 50,
  })

  const cancelMutation = trpc.scheduledPost.cancel.useMutation({
    onSuccess: () => refetch(),
  })
  const retryMutation = trpc.scheduledPost.retry.useMutation({
    onSuccess: () => refetch(),
  })
  const rescheduleMutation = trpc.scheduledPost.reschedule.useMutation({
    onSuccess: () => {
      setRescheduleId(null)
      setRescheduleDate("")
      refetch()
    },
  })

  const posts = data?.items ?? []

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Publishing Queue</h1>
        <p className="text-sm text-muted-foreground">
          Manage your scheduled, published, and failed posts.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted/50 p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab === tab.value
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Post list */}
      {isLoading ? (
        <div className="flex items-center gap-2 py-12 justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading...
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          {activeTab === "QUEUED" && (
            <>
              <Clock className="h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">No posts scheduled.</p>
              <p className="text-sm text-muted-foreground">
                Create content and schedule it to get started.
              </p>
            </>
          )}
          {activeTab === "PUBLISHED" && (
            <>
              <CheckCircle2 className="h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">No posts published yet.</p>
            </>
          )}
          {activeTab === "FAILED" && (
            <>
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="text-muted-foreground">
                No failed posts. Looking good!
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const platformConfig =
              SOCIAL_PLATFORMS[
                post.socialAccount.platform as SocialPlatformKey
              ]
            const previewText =
              post.contentItem.body?.slice(0, 80) ||
              post.contentItem.title ||
              "Untitled"
            const scheduledDate = new Date(post.scheduledFor)

            return (
              <Card key={post.id} className="border-border/50">
                <CardContent className="flex items-center gap-4 p-4">
                  {/* Platform icon */}
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold",
                      PLATFORM_COLORS[post.socialAccount.platform] ??
                        "bg-gray-500",
                    )}
                  >
                    {platformConfig?.name?.charAt(0) ?? "?"}
                  </div>

                  {/* Content preview */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {previewText}
                      </span>
                      {post.contentItem.type !== "SOCIAL_POST" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] shrink-0"
                        >
                          {post.contentItem.type.replace("_", " ")}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {platformConfig?.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        &middot;
                      </span>
                      <span
                        className="text-xs text-muted-foreground"
                        title={scheduledDate.toLocaleString()}
                      >
                        {formatRelativeTime(scheduledDate)}
                      </span>
                      {post.socialAccount.displayName && (
                        <>
                          <span className="text-xs text-muted-foreground">
                            &middot;
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {post.socialAccount.displayName}
                          </span>
                        </>
                      )}
                    </div>
                    {post.errorMessage && activeTab === "FAILED" && (
                      <p className="mt-1 text-xs text-destructive">
                        {post.errorMessage}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {activeTab === "QUEUED" && (
                      <>
                        {rescheduleId === post.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="datetime-local"
                              value={rescheduleDate}
                              onChange={(e) => setRescheduleDate(e.target.value)}
                              className="rounded border border-input bg-background px-2 py-1 text-xs"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (rescheduleDate) {
                                  rescheduleMutation.mutate({
                                    id: post.id,
                                    scheduledFor: new Date(
                                      rescheduleDate,
                                    ).toISOString(),
                                  })
                                }
                              }}
                              disabled={!rescheduleDate}
                              className="text-xs h-7"
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setRescheduleId(null)}
                              className="text-xs h-7"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRescheduleId(post.id)}
                              className="gap-1 text-xs"
                            >
                              <Calendar className="h-3 w-3" />
                              Reschedule
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                cancelMutation.mutate({ id: post.id })
                              }
                              disabled={cancelMutation.isPending}
                              className="gap-1 text-xs text-destructive hover:text-destructive"
                            >
                              <Ban className="h-3 w-3" />
                              Cancel
                            </Button>
                          </>
                        )}
                      </>
                    )}
                    {activeTab === "PUBLISHED" && post.platformPostUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="gap-1 text-xs"
                      >
                        <a
                          href={post.platformPostUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View Post
                        </a>
                      </Button>
                    )}
                    {activeTab === "FAILED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          retryMutation.mutate({ id: post.id })
                        }
                        disabled={retryMutation.isPending}
                        className="gap-1 text-xs"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Retry
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
