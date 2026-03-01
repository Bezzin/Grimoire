"use client"

import { useState } from "react"
import { Clock, Send, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { trpc } from "@/lib/trpc/client"
import { SOCIAL_PLATFORMS } from "@grimoire/shared"
import type { SocialPlatformKey } from "@grimoire/shared"
import { cn } from "@/lib/utils"

interface ScheduleModalProps {
  open: boolean
  onClose: () => void
  contentItemId: string
  mode: "schedule" | "publish-now"
}

const PLATFORM_COLORS: Record<string, string> = {
  INSTAGRAM: "bg-gradient-to-br from-purple-500 to-pink-500",
  FACEBOOK: "bg-blue-600",
  TWITTER: "bg-black",
  LINKEDIN: "bg-blue-700",
  TIKTOK: "bg-black",
  THREADS: "bg-black",
  YOUTUBE: "bg-red-600",
  PINTEREST: "bg-red-500",
}

export function ScheduleModal({ open, onClose, contentItemId, mode }: ScheduleModalProps) {
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set())
  const [scheduledFor, setScheduledFor] = useState("")
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [createdCount, setCreatedCount] = useState(0)

  const { data: accounts, isLoading } = trpc.socialAccount.list.useQuery()

  const createPosts = trpc.scheduledPost.create.useMutation({
    onSuccess: (data) => {
      setCreatedCount(data.count)
      setStatus("success")
      setTimeout(() => {
        onClose()
        setStatus("idle")
        setSelectedAccounts(new Set())
        setScheduledFor("")
      }, 2000)
    },
    onError: (err) => {
      setErrorMessage(err.message)
      setStatus("error")
    },
  })

  function toggleAccount(accountId: string) {
    setSelectedAccounts(prev => {
      const next = new Set(prev)
      if (next.has(accountId)) {
        next.delete(accountId)
      } else {
        next.add(accountId)
      }
      return next
    })
  }

  function handleSubmit() {
    if (selectedAccounts.size === 0) return

    const dateStr = mode === "publish-now"
      ? new Date().toISOString()
      : new Date(scheduledFor).toISOString()

    setStatus("submitting")
    createPosts.mutate({
      contentItemId,
      posts: Array.from(selectedAccounts).map(socialAccountId => ({
        socialAccountId,
        scheduledFor: dateStr,
      })),
    })
  }

  const activeAccounts = accounts?.filter(a => a.isActive) ?? []

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "schedule" ? (
              <><Clock className="h-5 w-5" /> Schedule Post</>
            ) : (
              <><Send className="h-5 w-5" /> Publish Now</>
            )}
          </DialogTitle>
        </DialogHeader>

        {status === "success" ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="font-medium">
              {createdCount} post{createdCount !== 1 ? "s" : ""} {mode === "schedule" ? "scheduled" : "queued for publishing"}!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Account selection */}
            <div>
              <p className="mb-2 text-sm font-medium">Select accounts</p>
              {isLoading ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading accounts...
                </div>
              ) : activeAccounts.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center">
                  <p className="text-sm text-muted-foreground">No social accounts connected.</p>
                  <a href="/dashboard/accounts" className="text-sm text-primary hover:underline">
                    Connect an account
                  </a>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {activeAccounts.map(account => {
                    const platformConfig = SOCIAL_PLATFORMS[account.platform as SocialPlatformKey]
                    const isSelected = selectedAccounts.has(account.id)
                    return (
                      <button
                        key={account.id}
                        onClick={() => toggleAccount(account.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                          isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                        )}
                      >
                        <div className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full text-white text-xs font-bold",
                          PLATFORM_COLORS[account.platform] ?? "bg-gray-500"
                        )}>
                          {platformConfig?.name?.charAt(0) ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {account.displayName ?? account.platformUsername ?? "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">{platformConfig?.name}</p>
                        </div>
                        <div className={cn(
                          "h-5 w-5 rounded-full border-2 transition-colors",
                          isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                        )} />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Date/time picker (schedule mode only) */}
            {mode === "schedule" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">Schedule for</label>
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            )}

            {/* Error */}
            {status === "error" && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={status === "submitting"}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  selectedAccounts.size === 0 ||
                  (mode === "schedule" && !scheduledFor) ||
                  status === "submitting"
                }
              >
                {status === "submitting" ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                ) : mode === "schedule" ? (
                  <><Clock className="mr-2 h-4 w-4" /> Schedule {selectedAccounts.size > 0 ? `(${selectedAccounts.size})` : ""}</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" /> Publish {selectedAccounts.size > 0 ? `(${selectedAccounts.size})` : ""}</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
