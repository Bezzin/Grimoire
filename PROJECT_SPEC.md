# {PROJECT_NAME} — AI Marketing Copilot

## Product Specification v1.0

> **Replace `{PROJECT_NAME}` throughout this document with your chosen name before starting development.**

---

## 1. Product Vision

**One-liner:** An affordable, all-in-one AI marketing copilot for solopreneurs and small teams — replacing 3–5 separate subscriptions with a single $29–39/month tool.

**Tagline:** "Your Marketing Wingman"

**Core thesis:** The AI marketing tools market ($8.5B) has a massive pricing gap between free/basic tools (ChatGPT at $20/mo, Buffer at $6/channel) and enterprise platforms (Jasper at $250+/mo, HubSpot at $800+/mo). Solopreneurs and small teams are forced to cobble together 3–5 separate tools costing $100–300/month total. {PROJECT_NAME} fills this gap with end-to-end marketing workflow in a single product.

**Target users:**
- Solo founders and indie hackers managing their own marketing
- Small teams (1–5 people) without a dedicated marketer
- Freelance marketers managing multiple client accounts
- Local businesses (restaurants, trades, clinics) needing simple marketing

**Key differentiators:**
1. **Transparent flat-rate pricing** — No credits, no tokens, no surprises. One price, unlimited within generous fair-use limits.
2. **End-to-end workflow** — Research → Create → Review → Schedule → Publish → Analyze → Optimize — all in one tool.
3. **Quality over quantity** — Superior prompt engineering, deep brand voice RAG, curated templates that produce content with genuine personality, not generic AI slop.

---

## 2. Technical Architecture

### 2.1 Stack Overview

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 14+ (App Router), TypeScript, Tailwind CSS | SSR/SSG for SEO, React ecosystem, Vercel-optimized |
| **UI Components** | shadcn/ui + Radix primitives | Accessible, customizable, no vendor lock-in |
| **API Layer** | tRPC | End-to-end type safety with TypeScript |
| **Database** | PostgreSQL via Supabase | Serverless, built-in auth option, real-time subscriptions, generous free tier |
| **ORM** | Prisma | Type-safe queries, migrations, introspection |
| **Job Queue** | Redis + BullMQ | Battle-tested for social scheduling (used by Buffer, FeedHive, Postiz) |
| **AI Orchestration** | LangChain.js | Prompt management, RAG pipelines, chain composition |
| **Multi-Model Routing** | OpenRouter | Automatic failover, single API key for GPT-4o, Claude, Gemini, Llama |
| **Vector Database** | Pinecone (prod) / Chroma (dev) | Brand voice RAG storage and retrieval |
| **Auth** | NextAuth.js (Auth.js v5) | OAuth 2.0 for social platforms + email/password |
| **Payments** | Stripe | Subscriptions, usage metering, customer portal |
| **File Storage** | Supabase Storage or AWS S3 | Media uploads, brand assets, generated images |
| **Hosting** | Vercel (frontend) + Railway or Fly.io (workers) | Edge functions + long-running job workers |
| **Monitoring** | Sentry (errors) + PostHog (analytics) | Full observability stack |
| **Email** | Resend | Transactional emails, onboarding sequences |

### 2.2 Project Structure

```
{project-name}/
├── apps/
│   └── web/                          # Next.js application
│       ├── app/                      # App Router pages
│       │   ├── (auth)/               # Auth pages (login, signup, forgot-password)
│       │   ├── (dashboard)/          # Authenticated app pages
│       │   │   ├── dashboard/        # Overview/home
│       │   │   ├── create/           # Content creation workspace
│       │   │   ├── calendar/         # Visual scheduling calendar
│       │   │   ├── queue/            # Review & approval queue
│       │   │   ├── analytics/        # Unified analytics dashboard
│       │   │   ├── brand/            # Brand voice configuration
│       │   │   ├── accounts/         # Connected social accounts
│       │   │   └── settings/         # User/org settings, billing
│       │   ├── (marketing)/          # Public marketing pages
│       │   │   ├── page.tsx          # Landing page
│       │   │   ├── pricing/          # Pricing page
│       │   │   ├── blog/             # SEO blog
│       │   │   └── changelog/        # Product updates
│       │   ├── api/                  # API routes
│       │   │   ├── trpc/             # tRPC handler
│       │   │   ├── webhooks/         # Stripe, social platform webhooks
│       │   │   └── cron/             # Vercel cron triggers
│       │   └── layout.tsx
│       ├── components/               # React components
│       │   ├── ui/                   # shadcn/ui base components
│       │   ├── dashboard/            # Dashboard-specific components
│       │   ├── editor/               # Content editor components
│       │   ├── calendar/             # Calendar components
│       │   └── shared/               # Shared/layout components
│       ├── lib/                      # Utilities & config
│       │   ├── auth.ts               # NextAuth config
│       │   ├── stripe.ts             # Stripe config
│       │   ├── posthog.ts            # Analytics
│       │   └── utils.ts              # Helpers
│       └── styles/
│           └── globals.css
│
├── packages/
│   ├── db/                           # Prisma schema & client
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── index.ts                  # Exported Prisma client
│   │
│   ├── api/                          # tRPC routers
│   │   ├── routers/
│   │   │   ├── content.ts            # Content CRUD & generation
│   │   │   ├── schedule.ts           # Scheduling operations
│   │   │   ├── social.ts             # Social account management
│   │   │   ├── analytics.ts          # Analytics queries
│   │   │   ├── brand.ts              # Brand voice management
│   │   │   ├── billing.ts            # Stripe subscription management
│   │   │   └── user.ts               # User/org management
│   │   ├── trpc.ts                   # tRPC init & context
│   │   └── root.ts                   # Root router
│   │
│   ├── ai/                           # AI orchestration layer
│   │   ├── models/
│   │   │   ├── router.ts             # Multi-model routing logic
│   │   │   └── config.ts             # Model configs & pricing
│   │   ├── prompts/
│   │   │   ├── templates/            # 50+ marketing prompt templates
│   │   │   │   ├── social/           # Social post templates by platform
│   │   │   │   ├── blog/             # Blog outline & draft templates
│   │   │   │   ├── email/            # Email copy templates
│   │   │   │   └── ad/               # Ad variant templates
│   │   │   └── system/               # System prompts for different modes
│   │   ├── rag/
│   │   │   ├── ingest.ts             # Document ingestion pipeline
│   │   │   ├── retrieve.ts           # Context retrieval for brand voice
│   │   │   └── vectorStore.ts        # Pinecone/Chroma abstraction
│   │   ├── chains/
│   │   │   ├── generate.ts           # Content generation chain
│   │   │   ├── rewrite.ts            # Content rewriting/repurposing
│   │   │   ├── analyze.ts            # Content analysis chain
│   │   │   └── suggest.ts            # Content suggestions chain
│   │   └── safety/
│   │       ├── moderation.ts         # OpenAI Moderation API integration
│   │       └── guardrails.ts         # Brand-specific content filters
│   │
│   ├── scheduler/                    # Publishing scheduler (BullMQ workers)
│   │   ├── queues/
│   │   │   ├── publish.ts            # Publish queue definition
│   │   │   └── analytics.ts          # Analytics sync queue
│   │   ├── workers/
│   │   │   ├── publishWorker.ts      # Handles scheduled publishing
│   │   │   └── analyticsWorker.ts    # Fetches engagement metrics
│   │   └── providers/                # Social platform API abstractions
│   │       ├── base.ts               # Base provider interface
│   │       ├── instagram.ts
│   │       ├── facebook.ts
│   │       ├── linkedin.ts
│   │       ├── twitter.ts
│   │       ├── tiktok.ts
│   │       └── late.ts               # LATE unified API (MVP accelerator)
│   │
│   └── shared/                       # Shared types, constants, utils
│       ├── types/
│       ├── constants/
│       └── utils/
│
├── turbo.json                        # Turborepo config
├── package.json                      # Root package.json (workspaces)
├── .env.example
├── docker-compose.yml                # Local dev (Postgres + Redis)
└── README.md
```

### 2.3 Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============ AUTH & USERS ============

model User {
  id              String    @id @default(cuid())
  email           String    @unique
  name            String?
  image           String?
  emailVerified   DateTime?
  hashedPassword  String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  accounts        Account[]
  sessions        Session[]
  organizations   OrganizationMember[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ============ ORGANIZATIONS & TEAMS ============

model Organization {
  id               String   @id @default(cuid())
  name             String
  slug             String   @unique
  stripeCustomerId String?  @unique
  plan             Plan     @default(FREE)
  planExpiresAt    DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  // Relations
  members          OrganizationMember[]
  socialAccounts   SocialAccount[]
  brandProfiles    BrandProfile[]
  contentItems     ContentItem[]
  scheduledPosts   ScheduledPost[]
  analyticsEvents  AnalyticsEvent[]
}

model OrganizationMember {
  id             String   @id @default(cuid())
  role           OrgRole  @default(MEMBER)
  userId         String
  organizationId String
  createdAt      DateTime @default(now())

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([userId, organizationId])
}

enum Plan {
  FREE
  STARTER
  PRO
  TEAM
}

enum OrgRole {
  OWNER
  ADMIN
  MEMBER
  VIEWER
}

// ============ SOCIAL ACCOUNTS ============

model SocialAccount {
  id               String         @id @default(cuid())
  platform         SocialPlatform
  platformUserId   String
  platformUsername String?
  displayName      String?
  avatarUrl        String?
  accessToken      String         @db.Text
  refreshToken     String?        @db.Text
  tokenExpiresAt   DateTime?
  scopes           String[]
  isActive         Boolean        @default(true)
  organizationId   String
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  organization   Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  scheduledPosts ScheduledPost[]
  analyticsEvents AnalyticsEvent[]

  @@unique([platform, platformUserId, organizationId])
}

enum SocialPlatform {
  INSTAGRAM
  FACEBOOK
  LINKEDIN
  TWITTER
  TIKTOK
  THREADS
  YOUTUBE
  PINTEREST
}

// ============ BRAND VOICE ============

model BrandProfile {
  id              String   @id @default(cuid())
  name            String   @default("Default")
  description     String?
  toneKeywords    String[] // e.g., ["professional", "witty", "approachable"]
  avoidKeywords   String[] // e.g., ["synergy", "leverage", "disruption"]
  styleGuide      String?  @db.Text
  exampleContent  String[] @db.Text // Array of example posts/content
  vectorNamespace String?  // Pinecone namespace for RAG
  isDefault       Boolean  @default(false)
  organizationId  String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  organization Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  contentItems ContentItem[]
}

// ============ CONTENT ============

model ContentItem {
  id               String        @id @default(cuid())
  type             ContentType
  status           ContentStatus @default(DRAFT)
  title            String?
  body             String        @db.Text
  bodyHtml         String?       @db.Text
  mediaUrls        String[]
  hashtags         String[]
  aiModel          String?       // Which model generated this
  aiPromptTemplate String?       // Which template was used
  aiTokensUsed     Int?
  platformVariants Json?         // Platform-specific versions { instagram: "...", twitter: "...", etc. }
  metadata         Json?         // Flexible metadata store
  organizationId   String
  brandProfileId   String?
  createdById      String?       // User who created/requested
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  organization   Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  brandProfile   BrandProfile?   @relation(fields: [brandProfileId], references: [id])
  scheduledPosts ScheduledPost[]

  @@index([organizationId, status])
  @@index([organizationId, createdAt])
}

enum ContentType {
  SOCIAL_POST
  BLOG_OUTLINE
  BLOG_DRAFT
  EMAIL_COPY
  AD_COPY
  THREAD
  CAROUSEL
  VIDEO_SCRIPT
}

enum ContentStatus {
  DRAFT
  IN_REVIEW
  APPROVED
  SCHEDULED
  PUBLISHED
  FAILED
  ARCHIVED
}

// ============ SCHEDULING ============

model ScheduledPost {
  id              String         @id @default(cuid())
  scheduledFor    DateTime
  publishedAt     DateTime?
  status          PostStatus     @default(QUEUED)
  errorMessage    String?
  platformPostId  String?        // ID returned by the platform after publishing
  platformPostUrl String?        // URL of the published post
  contentItemId   String
  socialAccountId String
  organizationId  String
  bullJobId       String?        // BullMQ job reference
  retryCount      Int            @default(0)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  contentItem    ContentItem     @relation(fields: [contentItemId], references: [id], onDelete: Cascade)
  socialAccount  SocialAccount   @relation(fields: [socialAccountId], references: [id], onDelete: Cascade)
  organization   Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([status, scheduledFor])
  @@index([organizationId, scheduledFor])
}

enum PostStatus {
  QUEUED
  PROCESSING
  PUBLISHED
  FAILED
  CANCELLED
}

// ============ ANALYTICS ============

model AnalyticsEvent {
  id              String         @id @default(cuid())
  platform        SocialPlatform
  metricType      String         // impressions, reach, likes, comments, shares, clicks, saves
  value           Float
  recordedAt      DateTime
  socialAccountId String
  organizationId  String
  platformPostId  String?        // Link to specific post
  metadata        Json?
  createdAt       DateTime       @default(now())

  socialAccount  SocialAccount   @relation(fields: [socialAccountId], references: [id], onDelete: Cascade)
  organization   Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId, platform, recordedAt])
  @@index([socialAccountId, metricType, recordedAt])
}
```

### 2.4 AI Model Routing Strategy

```typescript
// packages/ai/models/config.ts

export const MODEL_CONFIG = {
  // HIGH VOLUME / LOW COST — simple tasks
  fast: {
    model: "openai/gpt-4o-mini",
    maxTokens: 1024,
    temperature: 0.7,
    costPer1MInput: 0.15,  // USD
    costPer1MOutput: 0.60,
    useCases: [
      "hashtag-generation",
      "title-suggestions",
      "basic-rewrites",
      "content-categorization",
      "emoji-suggestions",
      "platform-adaptation"  // Adapting content for different platforms
    ]
  },

  // BALANCED — most content generation
  standard: {
    model: "openai/gpt-4o",
    maxTokens: 4096,
    temperature: 0.8,
    costPer1MInput: 2.50,
    costPer1MOutput: 10.00,
    useCases: [
      "social-post-generation",
      "email-copy",
      "ad-variants",
      "content-repurposing",
      "carousel-scripts"
    ]
  },

  // PREMIUM — nuanced creative work
  creative: {
    model: "anthropic/claude-sonnet-4",
    maxTokens: 4096,
    temperature: 0.9,
    costPer1MInput: 3.00,
    costPer1MOutput: 15.00,
    useCases: [
      "brand-voice-content",
      "long-form-blog-drafts",
      "strategy-suggestions",
      "tone-matching",
      "creative-campaigns"
    ]
  }
} as const;

// Route based on task type, with fallback logic
export function selectModel(taskType: string, preferQuality: boolean = false): ModelConfig {
  if (preferQuality) return MODEL_CONFIG.creative;

  for (const [tier, config] of Object.entries(MODEL_CONFIG)) {
    if (config.useCases.includes(taskType)) return config;
  }

  return MODEL_CONFIG.standard; // Default fallback
}
```

### 2.5 Social Platform API Constraints

| Platform | API | Rate Limits | Auth | Key Gotchas |
|----------|-----|-------------|------|-------------|
| **Instagram** | Meta Graph API | 200 × users calls/hr, 100 posts/24hr per account | OAuth 2.0, App Review required | Images must be hosted at public URL before posting. No direct DM API for non-partners. Reels have separate endpoint. |
| **Facebook** | Meta Graph API | 200 × users calls/hr | OAuth 2.0, App Review required | Page tokens never expire (if long-lived). Stories have 24hr TTL. |
| **LinkedIn** | LinkedIn Marketing API | 100 calls/day (basic), higher with partner | OAuth 2.0, **Partner Program approval required** | Must apply for Marketing Developer Platform access. Posts support articles, images, videos. |
| **X (Twitter)** | X API v2 | Basic: $200/mo, 50K writes/mo, 15K reads/mo | OAuth 2.0 | Most expensive API. Free tier only 1,500 writes/mo. Rate limits per-app AND per-user. |
| **TikTok** | Content Posting API | ~15 videos/24hr | OAuth 2.0, App Review | Video uploads require chunked upload. Must use TikTok's "share" intent on mobile. Creator disclosure required. |
| **Threads** | Threads API (Meta) | Same as Instagram limits | OAuth 2.0 via Meta | Relatively new API. Limited compared to Instagram. |

**MVP Accelerator:** Consider [LATE (getlate.dev)](https://getlate.dev) — unified API that publishes to 10+ networks via single API call. Useful for MVP, replace with direct integrations later for deeper control.

---

## 3. MVP Feature Specification

### 3.1 Authentication & Onboarding

**Sign up / Login:**
- Email + password (with email verification)
- Google OAuth
- Create organization on first login (personal workspace)

**Onboarding Flow (4 steps):**
1. "What do you do?" — Select business type (SaaS, ecommerce, agency, local business, creator, other)
2. "Connect your accounts" — OAuth connect at least 1 social platform
3. "Set your brand voice" — Quick questionnaire (tone words, paste example content, upload style guide)
4. "Create your first post" — Guided AI content generation with review & optional schedule

### 3.2 Dashboard (Home)

- **Welcome card** with quick actions: Create Post, View Calendar, Check Analytics
- **Upcoming scheduled posts** — Next 5 posts with platform icons, thumbnail, time
- **Recent performance** — Mini charts showing last 7 days: impressions, engagement rate, best post
- **AI suggestions** — "Based on your analytics, here's what to post next" (post-MVP: engagement prediction)
- **Connected accounts status** — Health check on OAuth tokens

### 3.3 Content Creation Workspace

This is the core of the product. A unified editor where users create content with AI assistance.

**Layout:**
- Left sidebar: Template picker (50+ categorized templates)
- Center: Content editor with AI generation panel
- Right sidebar: Platform previews (live mockup of how post looks on each platform)

**AI Generation Flow:**
1. User selects template OR writes a brief/prompt
2. System retrieves brand voice context from vector DB (RAG)
3. AI generates content using appropriate model tier
4. User reviews in editor — can regenerate, edit, or tweak with AI
5. Platform adaptation: AI creates variants optimized for each selected platform (character limits, hashtag styles, etc.)
6. User approves → moves to scheduling or immediate publish

**Template Categories (50+ total):**
- **Social Posts:** Product launch, testimonial, behind-the-scenes, tip/educational, question/engagement, holiday/seasonal, milestone, UGC reshare, poll, story prompt
- **Threads/Carousels:** How-to thread, listicle carousel, story arc, myth-busting, before/after
- **Blog:** Outline generator, intro paragraph, full draft, SEO meta description
- **Email:** Welcome sequence, product update, newsletter section, re-engagement, promotion
- **Ads:** Facebook ad copy, Google ad headlines, Instagram ad, A/B variants

**Content Editor Features:**
- Rich text editor (Tiptap or Plate)
- Media upload & library (images, videos, GIFs)
- AI inline assist: highlight text → rewrite, expand, shorten, change tone
- Hashtag suggestions (AI-generated, relevant to content)
- Character count per platform with warnings
- Platform-specific formatting toggles (e.g., line breaks for Instagram)

### 3.4 Visual Scheduling Calendar

- **Monthly/weekly/daily views** with drag-and-drop
- Color-coded by platform (Instagram = gradient pink, Facebook = blue, etc.)
- Click to create post at specific date/time
- **Best time suggestions** — Based on analytics data, suggest optimal posting times per platform
- Timezone-aware scheduling
- Bulk scheduling from CSV import (post-MVP)

### 3.5 Review & Approval Queue

This directly addresses the market gap of AI draft → human review → publish workflow.

- **Kanban board:** Draft → In Review → Approved → Scheduled → Published
- Each card shows: content preview, target platforms, scheduled time, who created it
- **Quick actions:** Approve, Request Changes (with comment), Edit, Delete
- **One-click approve & schedule** — Approve + pick time slot in single action
- Notification system for pending reviews (email + in-app)

### 3.6 Brand Voice Configuration

- **Quick Setup:** Select 3-5 tone words from a curated list (professional, casual, witty, authoritative, friendly, bold, minimal, etc.)
- **Example Content:** Paste 5-10 examples of content that represents their voice
- **Style Guide Upload:** Upload PDF/doc of brand guidelines (parsed and ingested into vector DB)
- **Avoid List:** Words, phrases, or topics to never use
- **Brand Assets:** Upload logos, color codes (for future visual generation)
- **Test & Preview:** Generate sample content and iterate on voice settings

**Technical implementation:** On save, all brand content is chunked, embedded, and stored in Pinecone vector namespace scoped to the organization. During generation, top-k relevant chunks are retrieved and injected into the system prompt.

### 3.7 Social Account Management

- Connect/disconnect social accounts via OAuth
- Per-account health status (token validity, rate limit usage)
- Account permissions display
- Multi-account support per platform (e.g., managing 3 Instagram accounts)

### 3.8 Unified Analytics Dashboard

- **Overview metrics:** Total impressions, reach, engagement rate, follower growth — across all platforms
- **Per-platform breakdown** with platform-native metrics
- **Post performance table:** Sortable by impressions, likes, comments, shares, click-through
- **Time-series charts:** Engagement over time, posting frequency vs performance
- **Best performing content:** Surface top posts with AI analysis of why they worked
- Date range selector (7d, 30d, 90d, custom)
- Export to CSV

### 3.9 Settings & Billing

- **Profile:** Name, email, avatar
- **Organization:** Name, slug, team members (invite by email), role management
- **Billing:** Current plan, usage stats, upgrade/downgrade, payment method, invoices
- **Integrations:** Future webhook/API settings
- **Notifications:** Email preferences

---

## 4. Pricing Architecture

| Plan | Price | Target | Limits |
|------|-------|--------|--------|
| **Free** | $0/mo | Trial/hobby | 1 social account, 10 AI generations/mo, no scheduling |
| **Starter** | $29/mo | Solopreneurs | 5 social accounts, 200 AI generations/mo, scheduling, basic analytics |
| **Pro** | $39/mo | Power users | 15 social accounts, unlimited AI generations, full analytics, brand voice RAG, priority support |
| **Team** | $79/mo | Small teams | Everything in Pro + 5 team seats, approval workflows, team analytics, priority queue |

**Principles:**
- No credit systems. No token counting. Flat monthly rate.
- "AI generations" = distinct content creation requests (not individual API calls — one "generation" may involve multiple model calls behind the scenes).
- Annual billing = 2 months free.
- 14-day free trial of Pro plan for new signups (no credit card required).
- One-click cancellation. No dark patterns.

---

## 5. API & External Services

### Environment Variables Required

```env
# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# AI
OPENROUTER_API_KEY=          # Multi-model routing
OPENAI_API_KEY=              # For moderation API (free)
PINECONE_API_KEY=            # Vector DB
PINECONE_ENVIRONMENT=
PINECONE_INDEX=

# Social Platform OAuth
META_APP_ID=                 # Facebook + Instagram
META_APP_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=

# OR use LATE unified API for MVP
LATE_API_KEY=

# Payments
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Monitoring
SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=

# Email
RESEND_API_KEY=

# Storage
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 6. Development Phases

### Phase 1: Foundation (Weeks 1–3)
- [ ] Project scaffolding (Turborepo monorepo, all packages)
- [ ] Database schema & Prisma setup
- [ ] Auth flow (NextAuth with email + Google)
- [ ] Basic dashboard layout with sidebar nav
- [ ] Organization creation & settings
- [ ] Stripe integration (subscription creation, webhook handling, customer portal)

### Phase 2: AI Core (Weeks 3–5)
- [ ] OpenRouter integration with model routing
- [ ] Prompt template system (10 initial templates)
- [ ] Content editor with AI generation
- [ ] Brand voice setup flow (tone words + example content)
- [ ] Pinecone RAG pipeline (ingest brand content, retrieve during generation)
- [ ] Content moderation (OpenAI Moderation API)
- [ ] Platform-specific content adaptation (character limits, formatting)

### Phase 3: Social Integration (Weeks 5–7)
- [ ] OAuth flows for each platform (or LATE integration)
- [ ] Social account management UI
- [ ] Publishing providers (abstraction layer per platform)
- [ ] BullMQ scheduler setup (Redis queues, workers)
- [ ] Visual calendar with drag-and-drop scheduling
- [ ] Retry logic & error handling for failed publishes

### Phase 4: Analytics & Review (Weeks 7–9)
- [ ] Analytics data fetching workers (periodic sync from platform APIs)
- [ ] Unified analytics dashboard
- [ ] Post performance tracking
- [ ] Review & approval queue (Kanban board)
- [ ] Notification system (in-app + email)

### Phase 5: Polish & Launch (Weeks 9–12)
- [ ] Expand to 50+ prompt templates
- [ ] Landing page & marketing site
- [ ] Onboarding flow refinement
- [ ] SEO blog setup
- [ ] Mobile-responsive polish
- [ ] Error handling & edge case coverage
- [ ] Rate limit handling per platform
- [ ] Load testing
- [ ] Beta launch to waitlist

### Post-Launch Roadmap
- Engagement prediction scoring
- Content recycling (resurface high performers)
- Autopilot mode (weekly batch generation)
- AI image generation (DALL·E / Stable Diffusion)
- Chrome extension
- Short-form video creation
- GEO/AEO optimization tracking
- Compliance guardrails for regulated industries
- API access for power users

---

## 7. Design Principles

- **Clean & focused** — Notion/Linear-inspired UI. White space, clear hierarchy, no clutter.
- **Speed is a feature** — Optimistic UI updates, streaming AI responses, skeleton loading states.
- **Mobile-first responsive** — Many solopreneurs manage marketing from their phone.
- **Dark mode from day one** — Not an afterthought.
- **Keyboard shortcuts** — Power users should be able to fly through workflows.
- **Empty states tell a story** — Every empty state guides the user toward their first action.
- **AI is a copilot, not autopilot** — Always show the human what AI generated. Always allow editing. Never publish without explicit approval (unless Autopilot mode is enabled post-MVP).

---

## 8. Competitive Positioning Summary

| What competitors do | What {PROJECT_NAME} does differently |
|---------------------|--------------------------------------|
| Credit-based pricing creates anxiety | Flat-rate pricing, no surprises |
| Content generation OR scheduling (separate tools) | End-to-end in one tool |
| Generic AI output ("sea of sameness") | Deep brand voice RAG for authentic content |
| No review workflow | Built-in AI draft → review → approve → publish pipeline |
| Enterprise pricing ($250+/mo) | $29–39/mo for solopreneurs & small teams |
| Per-seat pricing punishes small teams | Generous seat inclusion at Team tier |
| Complex onboarding | 4-step onboarding, value in under 5 minutes |

---

*This specification is a living document. Update as development progresses and market conditions evolve.*
