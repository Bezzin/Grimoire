"use client"

import { useMemo, useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PLATFORM_DOT_COLORS } from "@/lib/platform-colors"
import { SOCIAL_PLATFORMS } from "@grimoire/shared"
import type { SocialPlatformKey } from "@grimoire/shared"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type CalendarViewMode = "month" | "week"

export interface CalendarPost {
  id: string
  scheduledFor: Date | string
  status: string
  platformPostUrl?: string | null
  errorMessage?: string | null
  contentItem: {
    id: string
    title: string | null
    body: string | null
    type: string
  }
  socialAccount: {
    platform: string
    displayName: string | null
  }
}

/* ------------------------------------------------------------------ */
/*  Date helpers                                                       */
/* ------------------------------------------------------------------ */

/** Returns the Monday on or before the 1st of the month for `date`. */
function getFirstDayOfGrid(date: Date): Date {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  // getDay() returns 0=Sun ... 6=Sat. We want Monday=0.
  const dayOfWeek = firstOfMonth.getDay()
  // Shift so Monday=0: (dayOfWeek + 6) % 7
  const offset = (dayOfWeek + 6) % 7
  const monday = new Date(year, month, 1 - offset)
  monday.setHours(0, 0, 0, 0)
  return monday
}

/** Returns the Sunday on or after the last day of the month for `date`. */
function getLastDayOfGrid(date: Date): Date {
  const year = date.getFullYear()
  const month = date.getMonth()
  const lastOfMonth = new Date(year, month + 1, 0)
  const dayOfWeek = lastOfMonth.getDay()
  // Days until Sunday: if already Sunday (0), offset is 0; otherwise 7 - dayOfWeek
  const offset = dayOfWeek === 0 ? 0 : 7 - dayOfWeek
  const result = new Date(lastOfMonth)
  result.setDate(lastOfMonth.getDate() + offset)
  result.setHours(23, 59, 59, 999)
  return result
}

/** Returns an array of Date objects for each day in [start, end]. */
function getDaysInGrid(start: Date, end: Date): Date[] {
  const days: Date[] = []
  const current = new Date(start)
  current.setHours(0, 0, 0, 0)

  const endNorm = new Date(end)
  endNorm.setHours(0, 0, 0, 0)

  while (current <= endNorm) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return days
}

/** Formats a Date to YYYY-MM-DD for grouping. */
function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** Groups posts by their YYYY-MM-DD date key. */
function groupPostsByDate(
  posts: CalendarPost[],
): Record<string, CalendarPost[]> {
  const groups: Record<string, CalendarPost[]> = {}
  for (const post of posts) {
    const dateObj =
      typeof post.scheduledFor === "string"
        ? new Date(post.scheduledFor)
        : post.scheduledFor
    const key = formatDateKey(dateObj)
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key] = [...groups[key], post]
  }
  return groups
}

/** Checks if two dates are the same calendar day. */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Returns the month name and year string, e.g. "March 2026". */
function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MAX_PILLS = 3

/* ------------------------------------------------------------------ */
/*  Status styling                                                     */
/* ------------------------------------------------------------------ */

function getStatusClasses(status: string): string {
  switch (status) {
    case "PUBLISHED":
      return "ring-1 ring-green-500/40"
    case "FAILED":
      return "ring-1 ring-red-500/40"
    case "CANCELLED":
      return "opacity-50 line-through"
    default:
      return ""
  }
}

/* ------------------------------------------------------------------ */
/*  Post Pill component                                                */
/* ------------------------------------------------------------------ */

function PostPill({
  post,
  onClick,
}: {
  post: CalendarPost
  onClick: (post: CalendarPost) => void
}) {
  const platform = post.socialAccount.platform as SocialPlatformKey
  const platformConfig = SOCIAL_PLATFORMS[platform]
  const platformInitial = platformConfig?.name?.charAt(0) ?? "?"
  const label = post.contentItem.body?.slice(0, 15) || "Untitled"
  const bgColor = PLATFORM_DOT_COLORS[platform] ?? "bg-gray-500"

  return (
    <button
      type="button"
      onClick={() => onClick(post)}
      className={cn(
        "flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-white truncate cursor-pointer text-left",
        bgColor,
        getStatusClasses(post.status),
      )}
      title={`${platformConfig?.name ?? platform}: ${post.contentItem.body?.slice(0, 60) || post.contentItem.title || "Untitled"}`}
    >
      <span className="font-semibold shrink-0">{platformInitial}</span>
      <span className="truncate">{label}</span>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Calendar Page                                                      */
/* ------------------------------------------------------------------ */

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date())
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month")
  const [selectedPost, setSelectedPost] = useState<CalendarPost | null>(null)

  // Suppress unused warning — selectedPost will be used by Task 4 (detail panel)
  void selectedPost

  /* ---- Grid bounds ---- */
  const startOfGrid = useMemo(() => getFirstDayOfGrid(currentDate), [currentDate])
  const endOfGrid = useMemo(() => getLastDayOfGrid(currentDate), [currentDate])

  /* ---- Data fetching ---- */
  const { data: posts, isLoading } = trpc.scheduledPost.getByDateRange.useQuery(
    {
      start: startOfGrid.toISOString(),
      end: endOfGrid.toISOString(),
    },
  )

  /* ---- Derived data ---- */
  const days = useMemo(
    () => getDaysInGrid(startOfGrid, endOfGrid),
    [startOfGrid, endOfGrid],
  )

  const postsByDate = useMemo(
    () => groupPostsByDate((posts as CalendarPost[] | undefined) ?? []),
    [posts],
  )

  const today = useMemo(() => new Date(), [])

  /* ---- Navigation handlers ---- */
  function goToPreviousMonth() {
    setCurrentDate((prev) => {
      const next = new Date(prev)
      next.setMonth(next.getMonth() - 1)
      return next
    })
  }

  function goToNextMonth() {
    setCurrentDate((prev) => {
      const next = new Date(prev)
      next.setMonth(next.getMonth() + 1)
      return next
    })
  }

  function goToToday() {
    setCurrentDate(new Date())
  }

  function handlePostClick(post: CalendarPost) {
    setSelectedPost(post)
  }

  /* ---- Render ---- */
  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPreviousMonth}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextMonth}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h1 className="ml-4 text-xl font-semibold">
            {formatMonthYear(currentDate)}
          </h1>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
          <button
            type="button"
            onClick={() => setViewMode("month")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              viewMode === "month"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => setViewMode("week")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              viewMode === "week"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Week
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading calendar...
        </div>
      )}

      {/* Month grid */}
      {!isLoading && viewMode === "month" && (
        <div className="flex-1">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {DAY_HEADERS.map((day) => (
              <div
                key={day}
                className="py-2 text-center text-xs font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 border-l border-border">
            {days.map((day) => {
              const key = formatDateKey(day)
              const dayPosts = postsByDate[key] ?? []
              const isCurrentMonth = day.getMonth() === currentDate.getMonth()
              const isToday = isSameDay(day, today)
              const visiblePosts = dayPosts.slice(0, MAX_PILLS)
              const overflowCount = dayPosts.length - MAX_PILLS

              return (
                <div
                  key={key}
                  className={cn(
                    "min-h-[100px] border-b border-r border-border p-1.5",
                    !isCurrentMonth && "bg-muted/30",
                  )}
                >
                  {/* Day number */}
                  <div className="mb-1 flex items-start justify-end">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                        isToday
                          ? "bg-primary text-primary-foreground font-semibold"
                          : !isCurrentMonth
                            ? "text-muted-foreground/50"
                            : "text-foreground",
                      )}
                    >
                      {day.getDate()}
                    </span>
                  </div>

                  {/* Post pills */}
                  <div className="flex flex-col gap-0.5">
                    {visiblePosts.map((post) => (
                      <PostPill
                        key={post.id}
                        post={post}
                        onClick={handlePostClick}
                      />
                    ))}
                    {overflowCount > 0 && (
                      <span className="px-1.5 text-[10px] text-muted-foreground">
                        +{overflowCount} more
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Week view placeholder — implemented in Task 3 */}
      {!isLoading && viewMode === "week" && (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          Week view coming soon.
        </div>
      )}
    </div>
  )
}
