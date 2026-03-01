# Phase 4: Client Workspaces, Scheduling, Analytics & Calendar — Design

**Date:** 2026-03-01
**Status:** Approved
**Scope:** Multi-client workspace switching, team collaboration with RBAC, content scheduling + publishing pipeline, analytics dashboard, and content calendar.

---

## Overview

Phase 4 closes the loop on Grimoire's core value proposition: generate content, schedule it, publish it to social platforms, and track performance — all within one tool. It also adds the multi-client workspace model that makes Grimoire usable for solo marketers and small agencies managing multiple clients.

**Sub-phases:**
- **4A** — Client workspaces + team collaboration + RBAC
- **4B** — Content scheduling + publishing pipeline (cron + BullMQ)
- **4C** — Content calendar (month/week views, drag-and-drop reschedule)
- **4D** — Analytics dashboard (daily metric sync, charts, top posts)

---

## Phase 4A: Client Workspaces + Team Collaboration

### Client Switcher

The sidebar header shows the current client workspace name. Clicking it reveals a dropdown listing all workspaces the user belongs to, plus an "Add New Client" button. Switching workspaces reloads all dashboard data scoped to the selected client.

```
+---------------------------+
|  Nike               [v]   |
|---------------------------|
|  Nike              check  |
|  Adidas                   |
|  Local Bakery Co          |
|  FitnessPro UK            |
|---------------------------|
|  + Add New Client         |
+---------------------------+
```

Each client workspace is a separate Organization in the database — its own social accounts, brand profiles, content, scheduled posts, and analytics. One user login, multiple isolated client environments.

### AGENCY Plan

| Feature             | FREE | STARTER | PRO  | TEAM | AGENCY |
|---------------------|------|---------|------|------|--------|
| Price/mo            | $0   | $29     | $39  | $79  | $149   |
| Price/mo (annual)   | $0   | ~$24    | ~$33 | ~$66 | ~$125  |
| Client workspaces   | 1    | 1       | 1    | 1    | 10     |
| Social accounts     | 1    | 5       | 15   | 15   | 25     |
| Team seats          | 1    | 1       | 1    | 5    | 3      |
| AI gens/mo          | 10   | 200     | -1   | -1   | -1     |
| Scheduling          | no   | yes     | yes  | yes  | yes    |
| Analytics           | no   | yes     | yes  | yes  | yes    |
| Brand voice RAG     | no   | no      | yes  | yes  | yes    |
| Video generation    | no   | yes     | yes  | yes  | yes    |

### Invitation Model

```prisma
model Invitation {
  id              String           @id @default(cuid())
  email           String
  role            OrganizationRole @default(MEMBER)
  token           String           @unique @default(cuid())
  expiresAt       DateTime
  status          InvitationStatus @default(PENDING)
  invitedBy       User             @relation(fields: [invitedById], references: [id])
  invitedById     String
  organization    Organization     @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  organizationId  String
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  @@index([email, organizationId])
  @@index([token])
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  EXPIRED
  REVOKED
}
```

### RBAC Enforcement

| Action                     | OWNER | ADMIN | MEMBER | VIEWER |
|----------------------------|-------|-------|--------|--------|
| Manage billing             | yes   | no    | no     | no     |
| Delete workspace           | yes   | no    | no     | no     |
| Manage members/invites     | yes   | yes   | no     | no     |
| Connect social accounts    | yes   | yes   | no     | no     |
| Create/edit content        | yes   | yes   | yes    | no     |
| Schedule/publish           | yes   | yes   | yes    | no     |
| View dashboard/analytics   | yes   | yes   | yes    | yes    |

New middleware: `roleProtectedProcedure(minimumRole)` wrapping `orgProtectedProcedure`.

### Team UI

- Settings > Organization tab: "Invite Member" button opens modal (email input + role selector dropdown)
- Members list: avatar, name, email, role badge, edit role dropdown, remove button
- Pending invites section: email, role, sent date, resend/revoke buttons

### Email Invitations (Resend)

- New env var: `RESEND_API_KEY`
- Send branded HTML email with invite link: `{NEXTAUTH_URL}/invite/{token}`
- Invite acceptance page: validates token, signs user in or creates account, adds to org
- Invites expire after 7 days

### New tRPC Routes

**invitation router:**
- `create` (ADMIN+) — validate email, check seat limits, create Invitation, send email
- `list` (ADMIN+) — list pending invitations for current org
- `revoke` (ADMIN+) — set status to REVOKED
- `accept` (public, token-based) — validate token + expiry, add user to org

**user router extensions:**
- `listOrganizations` — return all orgs the current user belongs to
- `createOrganization` — create new org (check workspace limit per plan)
- `switchOrganization` — validate membership, update session/cookie context

---

## Phase 4B: Content Scheduling & Publishing

### Scheduling Flow

After generating content in the ContentEditor, three action buttons:

1. **Save Draft** — existing behavior, saves ContentItem with status DRAFT
2. **Publish Now** — opens platform selector modal, publishes immediately
3. **Schedule** — opens platform selector modal with date/time picker

### Platform Selector Modal

- Multi-select checkboxes for each connected social account (shows platform icon + account name)
- Date/time picker (for Schedule; hidden for Publish Now, defaults to now)
- Per-platform preview showing character count, media attachments
- Creates one `ScheduledPost` per selected account

### Publishing Pipeline

```
Cron (/api/cron/publish, every 1 min)
  |
  v
Find ScheduledPosts WHERE scheduledFor <= now AND status = QUEUED
  |
  v
Enqueue each into BullMQ (Redis)
  |
  v
BullMQ Worker picks job
  |
  v
Platform Publish Adapter (Instagram, Twitter, Facebook, etc.)
  |
  +-- Success: status = PUBLISHED, store platformPostId + platformPostUrl
  |
  +-- Failure: retryCount++, retry up to 3x (exponential backoff)
              After 3 failures: status = FAILED, store errorMessage
```

### Platform Publish Adapters

One adapter per platform. Each handles:
- Character limit enforcement (truncation with "..." if needed)
- Media upload (images, videos) via platform API
- Hashtag formatting (appended or inline depending on platform)
- API call using stored OAuth `accessToken` from `SocialAccount`
- Token refresh if expired (using `refreshToken`)

Adapters: Instagram (Graph API), Facebook (Pages API), Twitter/X (v2 API), LinkedIn (Share API), TikTok (Content Posting API), YouTube (Data API), Pinterest (Pins API), Threads (Publishing API).

### Queue Page (`/dashboard/queue`)

- Tabs: Queued | Published | Failed
- Each row: platform icon, post preview (truncated), scheduled time, status badge
- Actions per row:
  - Queued: cancel, reschedule
  - Published: view live post (external link)
  - Failed: retry, view error details
- Bulk actions: cancel all, retry all failed

### New tRPC Router: `scheduledPost`

- `create` (MEMBER+) — create ScheduledPosts for selected platforms
- `list` (VIEWER+) — paginated list with status/platform filters
- `cancel` (MEMBER+) — set status to CANCELLED
- `reschedule` (MEMBER+) — update scheduledFor
- `retry` (MEMBER+) — reset status to QUEUED, clear error
- `getByContentItem` (VIEWER+) — list all posts for a content item

### Plan Gating

Scheduling requires STARTER+ (`plans.scheduling === true`).

---

## Phase 4C: Content Calendar

### Calendar Page (`/dashboard/calendar`)

**Top bar:**
- View toggle: Month / Week
- Navigation: < Previous | Today | Next >
- Current month/week label

**Month view (default):**
- 7-column CSS Grid (Mon-Sun headers)
- Each day cell shows platform-colored pills for scheduled posts
- Today highlighted
- Click day → side panel with full post list for that day
- Click post pill → side panel with post details + edit/cancel/reschedule

**Week view:**
- 7-column grid with hourly time slots (6am - 11pm)
- Posts appear as blocks at their scheduled time
- Same click interactions

**Drag-and-drop:**
- Drag a post pill to another day/time slot
- Calls `scheduledPost.reschedule` mutation on drop
- Uses HTML5 Drag API (no library dependency)

**Color coding:**
- Each platform gets its color from `SOCIAL_OAUTH_CONFIG[platform].color`
- Post pills show platform icon + truncated preview text

**Empty day click:**
- Navigates to create page with date pre-filled in schedule modal

### Data Source

`scheduledPost.getByDateRange({ start, end })` — returns ScheduledPosts + associated ContentItem data for the visible range. Includes both future (scheduled) and past (published/failed) posts.

### Plan Gating

Calendar requires STARTER+ (same as scheduling).

---

## Phase 4D: Analytics Dashboard

### Data Collection

Daily cron route (`/api/cron/sync-analytics`):
1. Find all ScheduledPosts with status = PUBLISHED
2. For each, call the platform's metrics API using the SocialAccount's accessToken
3. Upsert AnalyticsEvent records for each metric type

### Metric Types

```prisma
// Already in schema as free-form string, standardize to:
IMPRESSION, LIKE, COMMENT, SHARE, CLICK, REACH, FOLLOWER_GAIN
```

### Analytics Page (`/dashboard/analytics`)

**Top bar:**
- Time range picker: 7d / 30d / 90d / Custom (date range)
- Platform filter: All / Instagram / Twitter / Facebook / etc.

**Overview cards (row of 4):**
- Total Impressions (with % change vs previous period)
- Total Engagements (likes + comments + shares)
- Engagement Rate (engagements / impressions * 100)
- Top Post (thumbnail + platform icon)

**Engagement over time (line chart):**
- X-axis: days in selected range
- Y-axis: engagement count
- One line per platform (filterable)
- Library: Recharts (lightweight React charting)

**Top performing posts (list):**
- Top 5 posts by total engagement
- Shows: platform icon, post preview, impressions, likes, comments, shares
- Link to live post

**Platform breakdown (bar chart):**
- Horizontal bars comparing total engagement per platform
- Color-coded by platform

### Platform Metric Adapters

One per platform, each fetches:
- Instagram: Graph API `/media/{id}/insights` (impressions, reach, engagement, likes, comments)
- Facebook: Graph API `/post/{id}/insights` (impressions, reach, clicks, reactions)
- Twitter: v2 API `/tweets/{id}` with `tweet.fields=public_metrics`
- LinkedIn: Share Statistics API
- TikTok: Research API (impressions, likes, comments, shares)
- YouTube: Analytics API (views, likes, comments)
- Pinterest: Analytics API (impressions, clicks, saves)
- Threads: Insights API

### New tRPC Router: `analytics`

- `getOverview` (VIEWER+) — aggregate metrics for time range
- `getTimeSeries` (VIEWER+) — daily metrics for chart
- `getTopPosts` (VIEWER+) — top N posts by engagement
- `getPlatformBreakdown` (VIEWER+) — per-platform totals
- `syncNow` (ADMIN+) — manually trigger metric sync for current org

### New Dependencies

- `recharts` — React charting library
- `resend` — Email delivery for invitations (Phase 4A)

### Plan Gating

Analytics requires STARTER+ (`plans.analytics === true`).

---

## Phasing Order

1. **4A** — Client workspaces + team (foundation, everything depends on org switching + RBAC)
2. **4B** — Scheduling + publishing (core new capability)
3. **4C** — Calendar (visual layer on top of scheduling data)
4. **4D** — Analytics (needs published posts to have data)

---

## New Environment Variables

```
RESEND_API_KEY=           # Email delivery for team invitations
CRON_SECRET=              # Shared secret to authenticate cron route calls
```

---

## Infrastructure Requirements

- **BullMQ**: Uses the existing Redis instance (`REDIS_URL`) for job queuing
- **Cron**: Two cron routes — `/api/cron/publish` (every 1 min) and `/api/cron/sync-analytics` (daily)
- **Resend**: Email delivery for invitations (free tier: 100 emails/day)
