# Phase 4B: Content Scheduling & Publishing — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add content scheduling, a publishing pipeline (cron + BullMQ), platform publish adapters, and a queue management page so users can schedule posts to connected social accounts and monitor publish status.

**Architecture:** After generating content, users select connected social accounts and a date/time via a platform selector modal. Each selection creates a `ScheduledPost` (already modelled). A cron route `/api/cron/publish` runs every minute, finds due posts, and enqueues them into BullMQ (Redis). A BullMQ worker calls platform-specific publish adapters. The queue page shows Queued/Published/Failed tabs with actions.

**Tech Stack:** BullMQ + ioredis (job queue), Next.js API routes (cron), tRPC (scheduledPost router), React (platform selector modal, queue page)

---

### Task 1: Install BullMQ + ioredis

**Files:**
- Modify: `packages/api/package.json` (add bullmq, ioredis)

**Step 1: Install dependencies**

```bash
cd packages/api && pnpm add bullmq ioredis
```

**Step 2: Create Redis connection helper**

Create `packages/api/lib/redis.ts`:

```typescript
import IORedis from "ioredis"

let connection: IORedis | null = null

export function getRedisConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null,
    })
  }
  return connection
}
```

**Step 3: Commit**

```bash
git add packages/api/package.json packages/api/lib/redis.ts pnpm-lock.yaml
git commit -m "feat: install BullMQ and ioredis for publishing queue"
```

---

### Task 2: scheduledPost tRPC Router

**Files:**
- Create: `packages/api/routers/scheduledPost.ts`
- Modify: `packages/api/root.ts` (register router)

**Step 1: Create the router**

Create `packages/api/routers/scheduledPost.ts` with these procedures:

- `create` (MEMBER+ via roleProtectedProcedure) — input: `{ contentItemId, posts: Array<{ socialAccountId, scheduledFor }> }`. Validate plan has scheduling. Validate each socialAccountId belongs to the org. Create one ScheduledPost per entry. Update ContentItem status to SCHEDULED.
- `list` (VIEWER+ via orgProtectedProcedure) — paginated list with status filter and platform filter. Include contentItem (title, body truncated to 100 chars, type) and socialAccount (platform, displayName). Order by scheduledFor desc.
- `cancel` (MEMBER+ via roleProtectedProcedure) — set status to CANCELLED. Only if current status is QUEUED.
- `reschedule` (MEMBER+ via roleProtectedProcedure) — update scheduledFor. Only if current status is QUEUED.
- `retry` (MEMBER+ via roleProtectedProcedure) — reset status to QUEUED, clear errorMessage, increment retryCount. Only if current status is FAILED.
- `getByContentItem` (VIEWER+ via orgProtectedProcedure) — list all scheduled posts for a content item.
- `getByDateRange` (VIEWER+ via orgProtectedProcedure) — input: `{ start: Date, end: Date }`. Returns posts within range (for calendar view in Phase 4C).

Plan gating: Check `PLANS[org.plan].scheduling === true` in `create`. Throw FORBIDDEN if false.

**Step 2: Register in root.ts**

Add `import { scheduledPostRouter } from "./routers/scheduledPost"` and `scheduledPost: scheduledPostRouter` to the app router.

**Step 3: Commit**

```bash
git add packages/api/routers/scheduledPost.ts packages/api/root.ts
git commit -m "feat: add scheduledPost tRPC router with CRUD and plan gating"
```

---

### Task 3: Platform Publish Adapters (Stubs)

**Files:**
- Create: `packages/api/lib/publishers/index.ts`
- Create: `packages/api/lib/publishers/types.ts`
- Create: `packages/api/lib/publishers/instagram.ts`
- Create: `packages/api/lib/publishers/facebook.ts`
- Create: `packages/api/lib/publishers/twitter.ts`
- Create: `packages/api/lib/publishers/linkedin.ts`
- Create: `packages/api/lib/publishers/tiktok.ts`
- Create: `packages/api/lib/publishers/youtube.ts`
- Create: `packages/api/lib/publishers/pinterest.ts`
- Create: `packages/api/lib/publishers/threads.ts`

**Step 1: Define the publisher interface**

Create `packages/api/lib/publishers/types.ts`:

```typescript
export interface PublishInput {
  text: string
  mediaUrls: string[]
  hashtags: string[]
  accessToken: string
  refreshToken?: string | null
  platformPostId?: string | null
}

export interface PublishResult {
  success: boolean
  platformPostId?: string
  platformPostUrl?: string
  error?: string
  newAccessToken?: string  // If token was refreshed
  newRefreshToken?: string
  newTokenExpiresAt?: Date
}

export interface PlatformPublisher {
  publish(input: PublishInput): Promise<PublishResult>
}
```

**Step 2: Create stub adapters**

Each adapter file exports a class implementing `PlatformPublisher`. For now, all return a stub success response with a TODO comment for real API integration:

```typescript
import type { PlatformPublisher, PublishInput, PublishResult } from "./types"

export class InstagramPublisher implements PlatformPublisher {
  async publish(input: PublishInput): Promise<PublishResult> {
    // TODO: Implement Instagram Graph API publishing
    // 1. Upload media via /me/media
    // 2. Create container
    // 3. Publish container via /me/media_publish
    console.log(`[Instagram] Publishing: ${input.text.slice(0, 50)}...`)
    return {
      success: true,
      platformPostId: `ig_stub_${Date.now()}`,
      platformPostUrl: `https://instagram.com/p/stub`,
    }
  }
}
```

Same pattern for all 8 platforms with platform-specific TODO comments.

**Step 3: Create index.ts barrel export**

```typescript
import type { PlatformPublisher } from "./types"
import { InstagramPublisher } from "./instagram"
import { FacebookPublisher } from "./facebook"
import { TwitterPublisher } from "./twitter"
import { LinkedInPublisher } from "./linkedin"
import { TikTokPublisher } from "./tiktok"
import { YouTubePublisher } from "./youtube"
import { PinterestPublisher } from "./pinterest"
import { ThreadsPublisher } from "./threads"

const publishers: Record<string, PlatformPublisher> = {
  INSTAGRAM: new InstagramPublisher(),
  FACEBOOK: new FacebookPublisher(),
  TWITTER: new TwitterPublisher(),
  LINKEDIN: new LinkedInPublisher(),
  TIKTOK: new TikTokPublisher(),
  YOUTUBE: new YouTubePublisher(),
  PINTEREST: new PinterestPublisher(),
  THREADS: new ThreadsPublisher(),
}

export function getPublisher(platform: string): PlatformPublisher {
  const publisher = publishers[platform]
  if (!publisher) {
    throw new Error(`No publisher for platform: ${platform}`)
  }
  return publisher
}

export type { PlatformPublisher, PublishInput, PublishResult } from "./types"
```

**Step 4: Commit**

```bash
git add packages/api/lib/publishers/
git commit -m "feat: add platform publish adapter stubs for all 8 social platforms"
```

---

### Task 4: BullMQ Worker + Publish Job Processor

**Files:**
- Create: `packages/api/lib/publish-worker.ts`

**Step 1: Create the publish worker**

Create `packages/api/lib/publish-worker.ts`:

```typescript
import { Worker, Queue } from "bullmq"
import { getRedisConnection } from "./redis"
import { getPublisher } from "./publishers"
import { prisma } from "@grimoire/db"

export const PUBLISH_QUEUE_NAME = "publish-posts"

export function getPublishQueue() {
  return new Queue(PUBLISH_QUEUE_NAME, {
    connection: getRedisConnection(),
  })
}

interface PublishJobData {
  scheduledPostId: string
}

export function startPublishWorker() {
  const worker = new Worker<PublishJobData>(
    PUBLISH_QUEUE_NAME,
    async (job) => {
      const { scheduledPostId } = job.data

      const scheduledPost = await prisma.scheduledPost.findUnique({
        where: { id: scheduledPostId },
        include: {
          contentItem: true,
          socialAccount: true,
        },
      })

      if (!scheduledPost) {
        throw new Error(`ScheduledPost ${scheduledPostId} not found`)
      }

      if (scheduledPost.status !== "QUEUED" && scheduledPost.status !== "PROCESSING") {
        return // Already handled (cancelled, published, etc.)
      }

      // Mark as processing
      await prisma.scheduledPost.update({
        where: { id: scheduledPostId },
        data: { status: "PROCESSING" },
      })

      const publisher = getPublisher(scheduledPost.socialAccount.platform)

      const result = await publisher.publish({
        text: scheduledPost.contentItem.body,
        mediaUrls: scheduledPost.contentItem.mediaUrls,
        hashtags: scheduledPost.contentItem.hashtags,
        accessToken: scheduledPost.socialAccount.accessToken,
        refreshToken: scheduledPost.socialAccount.refreshToken,
      })

      if (result.success) {
        await prisma.scheduledPost.update({
          where: { id: scheduledPostId },
          data: {
            status: "PUBLISHED",
            publishedAt: new Date(),
            platformPostId: result.platformPostId ?? null,
            platformPostUrl: result.platformPostUrl ?? null,
          },
        })

        // Update token if refreshed
        if (result.newAccessToken) {
          await prisma.socialAccount.update({
            where: { id: scheduledPost.socialAccountId },
            data: {
              accessToken: result.newAccessToken,
              refreshToken: result.newRefreshToken ?? scheduledPost.socialAccount.refreshToken,
              tokenExpiresAt: result.newTokenExpiresAt ?? scheduledPost.socialAccount.tokenExpiresAt,
            },
          })
        }
      } else {
        const newRetryCount = scheduledPost.retryCount + 1
        if (newRetryCount >= 3) {
          await prisma.scheduledPost.update({
            where: { id: scheduledPostId },
            data: {
              status: "FAILED",
              errorMessage: result.error ?? "Publishing failed after 3 attempts",
              retryCount: newRetryCount,
            },
          })
        } else {
          // Re-queue for retry with exponential backoff
          await prisma.scheduledPost.update({
            where: { id: scheduledPostId },
            data: {
              status: "QUEUED",
              errorMessage: result.error,
              retryCount: newRetryCount,
            },
          })
        }
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 5,
    }
  )

  worker.on("failed", (job, err) => {
    console.error(`Publish job ${job?.id} failed:`, err)
  })

  return worker
}
```

**Step 2: Commit**

```bash
git add packages/api/lib/publish-worker.ts
git commit -m "feat: add BullMQ publish worker with retry logic"
```

---

### Task 5: Cron Route — `/api/cron/publish`

**Files:**
- Create: `apps/web/app/api/cron/publish/route.ts`

**Step 1: Create the cron route**

```typescript
import { NextResponse } from "next/server"
import { prisma } from "@grimoire/db"

export async function GET(req: Request) {
  // Authenticate cron calls
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  const now = new Date()

  // Find all due posts
  const duePosts = await prisma.scheduledPost.findMany({
    where: {
      status: "QUEUED",
      scheduledFor: { lte: now },
    },
    take: 100, // Process in batches
    orderBy: { scheduledFor: "asc" },
  })

  if (duePosts.length === 0) {
    return NextResponse.json({ enqueued: 0 })
  }

  // Dynamic import to avoid loading BullMQ in cold starts unless needed
  const { getPublishQueue } = await import("@grimoire/api/lib/publish-worker")
  const queue = getPublishQueue()

  let enqueued = 0
  for (const post of duePosts) {
    try {
      const job = await queue.add(`publish-${post.id}`, {
        scheduledPostId: post.id,
      }, {
        attempts: 1, // We handle retries in the worker
        removeOnComplete: true,
        removeOnFail: false,
      })

      await prisma.scheduledPost.update({
        where: { id: post.id },
        data: { bullJobId: job.id },
      })

      enqueued++
    } catch (err) {
      console.error(`Failed to enqueue post ${post.id}:`, err)
    }
  }

  return NextResponse.json({ enqueued, total: duePosts.length })
}
```

Note: The import path `@grimoire/api/lib/publish-worker` needs to work. Check how the `@grimoire/api` package exports are set up. The implementer may need to use a relative import or add an export to the api package. Alternatively, move the worker/queue to a shared location or inline the queue creation.

**Step 2: Commit**

```bash
git add apps/web/app/api/cron/publish/route.ts
git commit -m "feat: add cron route for publishing due scheduled posts"
```

---

### Task 6: Platform Selector Modal

**Files:**
- Create: `apps/web/components/dashboard/create/schedule-modal.tsx`

**Step 1: Create the schedule modal**

This modal is opened when the user clicks "Schedule" or "Publish Now" in the content editor toolbar.

Props:
```typescript
interface ScheduleModalProps {
  open: boolean
  onClose: () => void
  contentItemId: string
  mode: "schedule" | "publish-now"
}
```

UI:
1. Fetch connected social accounts via `trpc.socialAccount.list.useQuery()`
2. Multi-select checkboxes for each connected account (platform icon + display name + username)
3. If mode is "schedule": show date/time picker (use native `<input type="datetime-local" />`)
4. If mode is "publish-now": scheduledFor defaults to `new Date()` (immediate)
5. "Confirm" button calls `trpc.scheduledPost.create.useMutation()` with selected accounts and time
6. Show success state with count of posts created
7. Empty state if no social accounts connected (link to /dashboard/accounts)

Use Dialog component from shadcn/ui (already installed in Phase 4A).

**Step 2: Commit**

```bash
git add apps/web/components/dashboard/create/schedule-modal.tsx
git commit -m "feat: add platform selector modal for scheduling and publishing"
```

---

### Task 7: Wire Schedule/Publish Buttons into Content Editor

**Files:**
- Modify: `apps/web/components/dashboard/create/content-editor.tsx`

**Step 1: Add Schedule and Publish Now buttons to toolbar**

In the toolbar section (after Save Draft button), add:
- "Publish Now" button (Send icon) — opens ScheduleModal in "publish-now" mode
- "Schedule" button (Clock icon) — opens ScheduleModal in "schedule" mode

Both buttons should be:
- Disabled while generating content
- Disabled if no content (text empty or no mediaUrl)
- Only shown if the user's plan has scheduling enabled

Check plan gating: fetch content.getUsage or add plan info to context. Simplest: pass a `hasScheduling` prop from the create page client. The create page client already has access to plan data.

**Step 2: Add ScheduleModal state and rendering**

```typescript
const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
const [scheduleMode, setScheduleMode] = useState<"schedule" | "publish-now">("schedule")
```

Render `<ScheduleModal>` at the bottom of the component.

**Step 3: Update ContentEditorProps to accept hasScheduling**

```typescript
interface ContentEditorProps {
  contentItemId: string | null
  generationData: { ... } | null
  hasScheduling?: boolean
}
```

**Step 4: Commit**

```bash
git add apps/web/components/dashboard/create/content-editor.tsx
git commit -m "feat: add Schedule and Publish Now buttons to content editor toolbar"
```

---

### Task 8: Queue Page UI

**Files:**
- Modify: `apps/web/app/(dashboard)/dashboard/queue/page.tsx` (replace placeholder)

**Step 1: Build the queue page**

Replace the placeholder with a full queue management page:

**Top bar:**
- Three tabs: Queued | Published | Failed (with counts)
- Bulk actions: "Cancel All" (queued tab), "Retry All" (failed tab)

**List:**
- Each row: platform icon, post preview (body truncated to 80 chars), scheduled time (relative + absolute), status badge
- Queued rows: Cancel button, Reschedule button (opens inline datetime picker)
- Published rows: "View Post" external link (using platformPostUrl)
- Failed rows: Retry button, error message expandable

**Empty states:**
- No queued posts: "No posts scheduled. Create content and schedule it."
- No published posts: "No posts published yet."
- No failed posts: "No failed posts. Looking good!"

**Data fetching:**
- `trpc.scheduledPost.list.useQuery({ status: activeTab, limit: 20 })`
- Cursor-based pagination with "Load More" button

**Mutations:**
- `trpc.scheduledPost.cancel.useMutation()`
- `trpc.scheduledPost.retry.useMutation()`
- `trpc.scheduledPost.reschedule.useMutation()`

This should be a "use client" component. Use the existing Badge, Button, Card components.

**Step 2: Commit**

```bash
git add apps/web/app/(dashboard)/dashboard/queue/page.tsx
git commit -m "feat: build queue management page with tabs and post actions"
```

---

### Task 9: Pass hasScheduling Prop Through Create Page

**Files:**
- Modify: `apps/web/components/dashboard/create/create-page-client.tsx`

**Step 1: Check user's plan and pass hasScheduling**

In the create page client, fetch the org's plan info (likely already available through content.getUsage or user.getOrganization). Pass `hasScheduling` to ContentEditor:

```typescript
// Add query for org plan
const { data: orgData } = trpc.user.getOrganization.useQuery()
const planConfig = orgData?.plan ? PLANS[orgData.plan as PlanKey] : null
const hasScheduling = planConfig?.scheduling ?? false

// Pass to ContentEditor
<ContentEditor
  contentItemId={contentItemId}
  generationData={generationData}
  hasScheduling={hasScheduling}
/>
```

Import PLANS and PlanKey from @grimoire/shared.

**Step 2: Commit**

```bash
git add apps/web/components/dashboard/create/create-page-client.tsx
git commit -m "feat: pass scheduling plan gate to content editor"
```

---

### Task 10: Build Verification

**Step 1: Run Prisma generate**

```bash
cd packages/db && npx prisma generate
```

**Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

**Step 3: Fix all errors**

Expected issues:
- BullMQ/ioredis type imports
- Import paths for publisher modules
- Missing exports from @grimoire/api
- ScheduleModal prop types
- Queue page client component issues

**Step 4: Commit fixes**

```bash
git add -A
git commit -m "fix: resolve Phase 4B type errors for clean build"
```
