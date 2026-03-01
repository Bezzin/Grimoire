"use client"

import { useMemo, useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PLATFORM_DOT_COLORS } from "@/lib/platform-colors"
import { SOCIAL_PLATFORMS } from "@grimoire/shared"
import type { SocialPlatformKey } from "@grimoire/shared"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { PostDetailPanel } from "@/components/dashboard/calendar/post-detail-panel"

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

/** Returns the Monday of the week containing `date`. */
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const dayOfWeek = d.getDay()
  // Shift so Monday=0: (dayOfWeek + 6) % 7
  const offset = (dayOfWeek + 6) % 7
  d.setDate(d.getDate() - offset)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Returns the Sunday of the week containing `date`. */
function getWeekEnd(date: Date): Date {
  const monday = getWeekStart(date)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return sunday
}

/** Formats a week range string, e.g. "Mar 2 - 8, 2026" or "Feb 28 - Mar 6, 2026". */
function formatWeekRange(date: Date): string {
  const start = getWeekStart(date)
  const end = getWeekEnd(date)
  const startMonth = start.toLocaleDateString("en-US", { month: "short" })
  const endMonth = end.toLocaleDateString("en-US", { month: "short" })
  const startDay = start.getDate()
  const endDay = end.getDate()
  const year = end.getFullYear()

  if (start.getMonth() === end.getMonth()) {
    return `${startMonth} ${startDay} - ${endDay}, ${year}`
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`
}

/** Groups posts by "YYYY-MM-DD|HH" key for week view. */
function groupPostsByDateAndHour(
  posts: CalendarPost[],
): Record<string, CalendarPost[]> {
  const groups: Record<string, CalendarPost[]> = {}
  for (const post of posts) {
    const dateObj =
      typeof post.scheduledFor === "string"
        ? new Date(post.scheduledFor)
        : post.scheduledFor
    const dateKey = formatDateKey(dateObj)
    const hour = String(dateObj.getHours()).padStart(2, "0")
    const key = `${dateKey}|${hour}`
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

/** Hours displayed in week view: 6 AM to 11 PM. */
const WEEK_HOURS = Array.from({ length: 18 }, (_, i) => i + 6)

/** Formats an hour number to display label, e.g. 6 -> "6 AM", 13 -> "1 PM". */
function formatHourLabel(hour: number): string {
  if (hour === 0) return "12 AM"
  if (hour < 12) return `${hour} AM`
  if (hour === 12) return "12 PM"
  return `${hour - 12} PM`
}

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
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("postId", post.id)
        e.dataTransfer.setData(
          "originalDate",
          typeof post.scheduledFor === "string"
            ? post.scheduledFor
            : post.scheduledFor.toISOString(),
        )
      }}
      onClick={() => onClick(post)}
      className={cn(
        "flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-white truncate cursor-grab text-left active:cursor-grabbing",
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
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)

  /* ---- Grid bounds ---- */
  const startOfGrid = useMemo(
    () =>
      viewMode === "week"
        ? getWeekStart(currentDate)
        : getFirstDayOfGrid(currentDate),
    [currentDate, viewMode],
  )
  const endOfGrid = useMemo(
    () =>
      viewMode === "week"
        ? getWeekEnd(currentDate)
        : getLastDayOfGrid(currentDate),
    [currentDate, viewMode],
  )

  /* ---- Data fetching ---- */
  const { data: posts, isLoading, refetch } = trpc.scheduledPost.getByDateRange.useQuery(
    {
      start: startOfGrid.toISOString(),
      end: endOfGrid.toISOString(),
    },
  )

  /* ---- Reschedule mutation (drag-and-drop) ---- */
  const rescheduleMutation = trpc.scheduledPost.reschedule.useMutation({
    onSuccess: () => refetch(),
  })

  /* ---- Derived data ---- */
  const days = useMemo(
    () => getDaysInGrid(startOfGrid, endOfGrid),
    [startOfGrid, endOfGrid],
  )

  const postsByDate = useMemo(
    () => groupPostsByDate((posts as CalendarPost[] | undefined) ?? []),
    [posts],
  )

  const postsByDateAndHour = useMemo(
    () => groupPostsByDateAndHour((posts as CalendarPost[] | undefined) ?? []),
    [posts],
  )

  const weekDays = useMemo(() => {
    if (viewMode !== "week") return []
    return getDaysInGrid(getWeekStart(currentDate), getWeekEnd(currentDate))
  }, [currentDate, viewMode])

  const today = useMemo(() => new Date(), [])

  /* ---- Navigation handlers ---- */
  function goToPrevious() {
    setCurrentDate((prev) => {
      const next = new Date(prev)
      if (viewMode === "week") {
        next.setDate(next.getDate() - 7)
      } else {
        next.setMonth(next.getMonth() - 1)
      }
      return next
    })
  }

  function goToNext() {
    setCurrentDate((prev) => {
      const next = new Date(prev)
      if (viewMode === "week") {
        next.setDate(next.getDate() + 7)
      } else {
        next.setMonth(next.getMonth() + 1)
      }
      return next
    })
  }

  function goToToday() {
    setCurrentDate(new Date())
  }

  const headingText =
    viewMode === "week"
      ? formatWeekRange(currentDate)
      : formatMonthYear(currentDate)

  function handlePostClick(post: CalendarPost) {
    setSelectedPost(post)
  }

  function handleDrop(e: React.DragEvent, targetDay: Date) {
    e.preventDefault()
    setDragOverDate(null)

    const postId = e.dataTransfer.getData("postId")
    const originalDate = e.dataTransfer.getData("originalDate")
    if (!postId) return

    // Keep the original time, just change the date
    const original = new Date(originalDate)
    const newDate = new Date(targetDay)
    newDate.setHours(original.getHours(), original.getMinutes(), 0, 0)

    rescheduleMutation.mutate({
      id: postId,
      scheduledFor: newDate.toISOString(),
    })
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
            onClick={goToPrevious}
            aria-label={viewMode === "week" ? "Previous week" : "Previous month"}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNext}
            aria-label={viewMode === "week" ? "Next week" : "Next month"}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h1 className="ml-4 text-xl font-semibold">
            {headingText}
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
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOverDate(key)
                  }}
                  onDragLeave={() => setDragOverDate(null)}
                  onDrop={(e) => handleDrop(e, day)}
                  className={cn(
                    "min-h-[100px] border-b border-r border-border p-1.5 transition-colors",
                    !isCurrentMonth && "bg-muted/30",
                    dragOverDate === key && "ring-2 ring-primary bg-primary/5",
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

      {/* Week view */}
      {!isLoading && viewMode === "week" && (
        <div className="flex-1 overflow-auto">
          {/* Column headers: time + 7 day columns */}
          <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-border sticky top-0 bg-background z-10">
            <div className="py-2 text-center text-xs font-medium text-muted-foreground border-r border-border" />
            {weekDays.map((day) => {
              const isWeekToday = isSameDay(day, today)
              const dayName = DAY_HEADERS[(day.getDay() + 6) % 7]
              return (
                <div
                  key={formatDateKey(day)}
                  className={cn(
                    "py-2 text-center text-xs font-medium border-r border-border",
                    isWeekToday
                      ? "text-primary font-semibold"
                      : "text-muted-foreground",
                  )}
                >
                  {dayName} {day.getDate()}
                </div>
              )
            })}
          </div>

          {/* Time rows */}
          <div className="grid grid-cols-[64px_repeat(7,1fr)] border-l border-border">
            {WEEK_HOURS.map((hour) => (
              <div key={hour} className="contents">
                {/* Time label */}
                <div className="flex items-start justify-end pr-2 pt-1 text-[11px] text-muted-foreground border-b border-r border-border h-16">
                  {formatHourLabel(hour)}
                </div>

                {/* Day cells for this hour */}
                {weekDays.map((day) => {
                  const dateKey = formatDateKey(day)
                  const hourKey = `${dateKey}|${String(hour).padStart(2, "0")}`
                  const cellPosts = postsByDateAndHour[hourKey] ?? []
                  const isWeekToday = isSameDay(day, today)

                  return (
                    <div
                      key={hourKey}
                      className={cn(
                        "border-b border-r border-border h-16 p-0.5 overflow-hidden",
                        isWeekToday && "bg-primary/5",
                      )}
                    >
                      <div className="flex flex-col gap-0.5">
                        {cellPosts.slice(0, 2).map((post) => {
                          const platform = post.socialAccount
                            .platform as SocialPlatformKey
                          const platformConfig = SOCIAL_PLATFORMS[platform]
                          const platformInitial =
                            platformConfig?.name?.charAt(0) ?? "?"
                          const label =
                            post.contentItem.body?.slice(0, 20) || "Untitled"
                          const bgColor =
                            PLATFORM_DOT_COLORS[platform] ?? "bg-gray-500"

                          return (
                            <button
                              key={post.id}
                              type="button"
                              onClick={() => handlePostClick(post)}
                              className={cn(
                                "flex w-full items-center gap-1 rounded px-1.5 py-1 text-[11px] text-white truncate cursor-pointer text-left",
                                bgColor,
                                getStatusClasses(post.status),
                              )}
                              title={`${platformConfig?.name ?? platform}: ${post.contentItem.body?.slice(0, 60) || post.contentItem.title || "Untitled"}`}
                            >
                              <span className="font-semibold shrink-0">
                                {platformInitial}
                              </span>
                              <span className="truncate">{label}</span>
                            </button>
                          )
                        })}
                        {cellPosts.length > 2 && (
                          <span className="px-1 text-[10px] text-muted-foreground">
                            +{cellPosts.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Post detail side panel */}
      {selectedPost && (
        <PostDetailPanel
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onUpdated={() => refetch()}
        />
      )}
    </div>
  )
}
