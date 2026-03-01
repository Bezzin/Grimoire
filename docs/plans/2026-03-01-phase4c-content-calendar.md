# Phase 4C: Content Calendar — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a content calendar page with month and week views, platform-colored post pills, click interactions, and drag-and-drop rescheduling using the existing `scheduledPost.getByDateRange` query.

**Architecture:** A single `"use client"` page replaces the calendar placeholder. It fetches posts for the visible date range via tRPC, renders them in a CSS Grid calendar (month or week view), supports drag-and-drop via HTML5 Drag API to reschedule, and opens a side panel for post details on click.

**Tech Stack:** React (state management), CSS Grid (calendar layout), HTML5 Drag API (reschedule), tRPC (data fetching), existing UI components (Card, Badge, Button, Dialog)

---

### Task 1: Extract Shared Platform Colors Constant

**Files:**
- Create: `apps/web/lib/platform-colors.ts`
- Modify: `apps/web/app/(dashboard)/dashboard/queue/page.tsx` (import from shared)
- Modify: `apps/web/components/dashboard/create/schedule-modal.tsx` (import from shared)

**Step 1: Create shared platform colors**

Create `apps/web/lib/platform-colors.ts`:

```typescript
export const PLATFORM_COLORS: Record<string, string> = {
  INSTAGRAM: "bg-gradient-to-br from-purple-500 to-pink-500",
  FACEBOOK: "bg-blue-600",
  TWITTER: "bg-black",
  LINKEDIN: "bg-blue-700",
  TIKTOK: "bg-black",
  THREADS: "bg-black",
  YOUTUBE: "bg-red-600",
  PINTEREST: "bg-red-500",
}

export const PLATFORM_DOT_COLORS: Record<string, string> = {
  INSTAGRAM: "bg-pink-500",
  FACEBOOK: "bg-blue-600",
  TWITTER: "bg-gray-900",
  LINKEDIN: "bg-blue-700",
  TIKTOK: "bg-gray-900",
  THREADS: "bg-gray-900",
  YOUTUBE: "bg-red-600",
  PINTEREST: "bg-red-500",
}
```

**Step 2: Update queue page and schedule modal to import from shared**

Remove the local `PLATFORM_COLORS` constant from both files and import from `@/lib/platform-colors`.

**Step 3: Commit**

```bash
git add apps/web/lib/platform-colors.ts apps/web/app/(dashboard)/dashboard/queue/page.tsx apps/web/components/dashboard/create/schedule-modal.tsx
git commit -m "refactor: extract shared platform colors constant"
```

---

### Task 2: Calendar Page — Month View

**Files:**
- Modify: `apps/web/app/(dashboard)/dashboard/calendar/page.tsx` (replace placeholder)

**Step 1: Build the month view calendar**

Replace the placeholder with a full client component. Structure:

```
+---------------------------------------------+
| < Previous  |  March 2026  |  Today | Next > |  [Month] [Week]
+---------------------------------------------+
| Mon | Tue | Wed | Thu | Fri | Sat | Sun     |
|-----|-----|-----|-----|-----|-----|---------|
|     |     |  1  |  2  |  3  |  4  |  5      |
|     |     | [IG] | [TW]|     |     |         |
|  6  |  7  |  8  |  9  | 10  | 11  |  12     |
| ... | ... | ... | ... | ... | ... |  ...    |
+---------------------------------------------+
```

Key implementation details:
- State: `currentDate` (Date), `viewMode` ("month" | "week")
- Compute visible date range for current month (include padding days from prev/next month to fill grid)
- Fetch: `trpc.scheduledPost.getByDateRange.useQuery({ start, end })` where start/end are the first/last visible days
- Each day cell: show date number, up to 3 platform-colored pills, "+N more" if overflow
- Today highlighted with a ring/accent color
- Click on a day cell → set selectedDate (for side panel)
- Click on a post pill → set selectedPost (for side panel)
- Click on empty day → navigate to `/dashboard/create` with date pre-filled (future enhancement, just log for now)

Platform pills: small colored dots/tags showing platform initial + truncated text (max 20 chars).

Navigation: Previous/Next buttons shift currentDate by 1 month. "Today" resets to now.

**Step 2: Commit**

```bash
git add apps/web/app/(dashboard)/dashboard/calendar/page.tsx
git commit -m "feat: build content calendar month view with post pills"
```

---

### Task 3: Calendar Page — Week View

**Files:**
- Modify: `apps/web/app/(dashboard)/dashboard/calendar/page.tsx`

**Step 1: Add week view**

Add a week view mode to the calendar. When `viewMode === "week"`:

```
+---------------------------------------------------+
| < Previous  |  Mar 2 - 8, 2026  |  Today | Next > |  [Month] [Week]
+---------------------------------------------------+
|      | Mon 2 | Tue 3 | Wed 4 | Thu 5 | Fri 6 | Sat 7 | Sun 8 |
| 6am  |       |       |       |       |       |       |       |
| 7am  |       | [Post]|       |       |       |       |       |
| 8am  |       |       |       |       |       |       |       |
| ...  |       |       |       |       |       |       |       |
| 11pm |       |       |       |       |       |       |       |
+---------------------------------------------------+
```

- 7 columns (one per day of the week)
- Row headers: hours from 6am to 11pm (18 rows)
- Posts appear as blocks at their scheduled hour
- Each block shows platform color + truncated text
- Navigation: Previous/Next shifts by 1 week
- Same click interactions as month view

The week view shares the same data fetching — just adjust the date range to the visible week.

**Step 2: Commit**

```bash
git add apps/web/app/(dashboard)/dashboard/calendar/page.tsx
git commit -m "feat: add week view to content calendar"
```

---

### Task 4: Post Detail Side Panel

**Files:**
- Create: `apps/web/components/dashboard/calendar/post-detail-panel.tsx`
- Modify: `apps/web/app/(dashboard)/dashboard/calendar/page.tsx` (render panel)

**Step 1: Create the post detail panel**

A slide-out panel (or right-side panel) that shows when a post is clicked:

```typescript
interface PostDetailPanelProps {
  post: {
    id: string
    scheduledFor: string
    status: string
    platformPostUrl?: string | null
    errorMessage?: string | null
    contentItem: { id: string; title?: string | null; body: string; type: string }
    socialAccount: { platform: string; displayName?: string | null }
  }
  onClose: () => void
  onReschedule: (id: string, newDate: string) => void
  onCancel: (id: string) => void
}
```

Shows:
- Platform icon + account name
- Post status badge
- Scheduled date/time
- Content preview (full body, scrollable)
- Actions based on status:
  - QUEUED: Reschedule (datetime input), Cancel
  - PUBLISHED: View live post link
  - FAILED: Error message, Retry button

Use a Dialog or a panel that overlays from the right side.

**Step 2: Wire into calendar page**

```typescript
const [selectedPost, setSelectedPost] = useState<Post | null>(null)
```

Render `<PostDetailPanel>` when `selectedPost` is set.

**Step 3: Commit**

```bash
git add apps/web/components/dashboard/calendar/post-detail-panel.tsx apps/web/app/(dashboard)/dashboard/calendar/page.tsx
git commit -m "feat: add post detail side panel to calendar"
```

---

### Task 5: Drag-and-Drop Rescheduling

**Files:**
- Modify: `apps/web/app/(dashboard)/dashboard/calendar/page.tsx`

**Step 1: Add HTML5 drag-and-drop**

On post pills:
- `draggable={true}`
- `onDragStart` — store the post ID in dataTransfer

On day cells (month view) and hour slots (week view):
- `onDragOver` — `e.preventDefault()` to allow drop
- `onDrop` — read post ID from dataTransfer, compute new scheduledFor date, call `trpc.scheduledPost.reschedule.useMutation()`

Visual feedback:
- Dragging post: reduced opacity on source
- Drag over valid target: highlight with border/background change
- After drop: optimistic update (move pill immediately, revert if mutation fails)

For month view: dropping on a day sets the time to the same hour as the original.
For week view: dropping on an hour slot sets both date and hour.

**Step 2: Add reschedule mutation**

```typescript
const rescheduleMutation = trpc.scheduledPost.reschedule.useMutation({
  onSuccess: () => refetch(),
})
```

**Step 3: Commit**

```bash
git add apps/web/app/(dashboard)/dashboard/calendar/page.tsx
git commit -m "feat: add drag-and-drop rescheduling to calendar"
```

---

### Task 6: Build Verification

**Step 1: Run TypeScript check**

```bash
npx tsc --noEmit --project apps/web/tsconfig.json
```

**Step 2: Fix all errors**

**Step 3: Commit fixes if needed**

```bash
git add -A
git commit -m "fix: resolve Phase 4C type errors for clean build"
```
