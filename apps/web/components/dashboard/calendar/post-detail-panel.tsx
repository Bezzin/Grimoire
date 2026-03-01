"use client"

import { useState } from "react"
import {
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  ExternalLink,
  RotateCcw,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SOCIAL_PLATFORMS } from "@grimoire/shared"
import type { SocialPlatformKey } from "@grimoire/shared"
import { PLATFORM_COLORS } from "@/lib/platform-colors"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc/client"

interface PostDetailPanelProps {
  post: {
    id: string
    scheduledFor: string | Date
    status: string
    platformPostUrl?: string | null
    errorMessage?: string | null
    contentItem: {
      id: string
      title?: string | null
      body: string | null
      type: string
    }
    socialAccount: {
      platform: string
      displayName?: string | null
    }
  }
  onClose: () => void
  onUpdated: () => void
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string
    variant: "default" | "secondary" | "destructive" | "outline"
    icon: React.ReactNode
  }
> = {
  QUEUED: {
    label: "Queued",
    variant: "secondary",
    icon: <Clock className="h-3 w-3" />,
  },
  PROCESSING: {
    label: "Processing",
    variant: "default",
    icon: <Clock className="h-3 w-3 animate-spin" />,
  },
  PUBLISHED: {
    label: "Published",
    variant: "default",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  FAILED: {
    label: "Failed",
    variant: "destructive",
    icon: <XCircle className="h-3 w-3" />,
  },
  CANCELLED: {
    label: "Cancelled",
    variant: "outline",
    icon: <Ban className="h-3 w-3" />,
  },
}

export function PostDetailPanel({
  post,
  onClose,
  onUpdated,
}: PostDetailPanelProps) {
  const [rescheduleDate, setRescheduleDate] = useState("")
  const [showReschedule, setShowReschedule] = useState(false)

  const platformConfig =
    SOCIAL_PLATFORMS[post.socialAccount.platform as SocialPlatformKey]
  const scheduledDate = new Date(post.scheduledFor)

  const cancelMutation = trpc.scheduledPost.cancel.useMutation({
    onSuccess: () => {
      onUpdated()
      onClose()
    },
  })
  const retryMutation = trpc.scheduledPost.retry.useMutation({
    onSuccess: () => {
      onUpdated()
      onClose()
    },
  })
  const rescheduleMutation = trpc.scheduledPost.reschedule.useMutation({
    onSuccess: () => {
      onUpdated()
      onClose()
    },
  })

  const status = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.QUEUED

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-96 flex-col border-l bg-background shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="font-semibold">Post Details</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Platform & status */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full text-white text-sm font-bold",
              PLATFORM_COLORS[post.socialAccount.platform] ?? "bg-gray-500",
            )}
          >
            {platformConfig?.name?.charAt(0) ?? "?"}
          </div>
          <div>
            <p className="font-medium">{platformConfig?.name}</p>
            <p className="text-sm text-muted-foreground">
              {post.socialAccount.displayName ?? "Unknown account"}
            </p>
          </div>
          <Badge variant={status.variant} className="ml-auto gap-1">
            {status.icon}
            {status.label}
          </Badge>
        </div>

        {/* Schedule time */}
        <div className="rounded-lg border p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Scheduled for
          </p>
          <p className="text-sm font-medium">
            {scheduledDate.toLocaleDateString("en-GB", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <p className="text-sm text-muted-foreground">
            {scheduledDate.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        {/* Content preview */}
        <div className="rounded-lg border p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Content
          </p>
          {post.contentItem.title && (
            <p className="text-sm font-medium mb-1">
              {post.contentItem.title}
            </p>
          )}
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {post.contentItem.body || "No content"}
          </p>
          <Badge variant="outline" className="mt-2 text-[10px]">
            {post.contentItem.type.replace(/_/g, " ")}
          </Badge>
        </div>

        {/* Error message */}
        {post.errorMessage && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3">
            <p className="text-xs font-medium text-destructive mb-1">Error</p>
            <p className="text-sm text-destructive">{post.errorMessage}</p>
          </div>
        )}

        {/* Reschedule form */}
        {showReschedule && post.status === "QUEUED" && (
          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Reschedule to
            </p>
            <input
              type="datetime-local"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  if (rescheduleDate) {
                    rescheduleMutation.mutate({
                      id: post.id,
                      scheduledFor: new Date(rescheduleDate).toISOString(),
                    })
                  }
                }}
                disabled={!rescheduleDate || rescheduleMutation.isPending}
              >
                Confirm
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowReschedule(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t p-4 space-y-2">
        {post.status === "QUEUED" && (
          <>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setShowReschedule(!showReschedule)}
            >
              <Calendar className="h-4 w-4" />
              Reschedule
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2 text-destructive hover:text-destructive"
              onClick={() => cancelMutation.mutate({ id: post.id })}
              disabled={cancelMutation.isPending}
            >
              <Ban className="h-4 w-4" />
              Cancel Post
            </Button>
          </>
        )}
        {post.status === "PUBLISHED" && post.platformPostUrl && (
          <Button variant="outline" className="w-full gap-2" asChild>
            <a
              href={post.platformPostUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
              View Live Post
            </a>
          </Button>
        )}
        {post.status === "FAILED" && (
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => retryMutation.mutate({ id: post.id })}
            disabled={retryMutation.isPending}
          >
            <RotateCcw className="h-4 w-4" />
            Retry
          </Button>
        )}
      </div>
    </div>
  )
}
