# Grimoire Phase 1: Foundation — Design Document

**Date:** 2026-02-28
**Status:** Approved
**Scope:** Project scaffolding, database, auth, dashboard layout, organization management, Stripe billing

---

## 1. Overview

Phase 1 establishes the foundational infrastructure for Grimoire, an AI Marketing Copilot SaaS targeting solopreneurs and small teams at $29-39/month. This phase delivers: a working Turborepo monorepo, PostgreSQL database with full schema, authentication, dashboard shell with responsive sidebar navigation, organization management, and Stripe subscription billing.

## 2. Architecture

### Monorepo (Turborepo + pnpm)

```
grimoire/
├── apps/
│   └── web/                          # Next.js 14+ (App Router)
│       ├── app/
│       │   ├── (auth)/               # Login, signup, forgot-password
│       │   ├── (dashboard)/          # Authenticated app pages
│       │   │   ├── dashboard/        # Overview/home
│       │   │   ├── accounts/         # Connected social accounts (shell)
│       │   │   └── settings/         # User/org settings, billing
│       │   ├── (marketing)/          # Public pages
│       │   │   └── page.tsx          # Landing page
│       │   ├── api/
│       │   │   ├── trpc/             # tRPC handler
│       │   │   └── webhooks/         # Stripe webhooks
│       │   └── layout.tsx
│       ├── components/
│       │   ├── ui/                   # shadcn/ui components
│       │   ├── dashboard/            # Dashboard components
│       │   └── shared/               # Layout components (sidebar, header)
│       ├── lib/
│       │   ├── auth.ts               # NextAuth config
│       │   ├── stripe.ts             # Stripe config
│       │   └── utils.ts              # Helpers
│       └── styles/globals.css
│
├── packages/
│   ├── db/                           # Prisma schema & client
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Full schema from spec
│   │   │   └── migrations/
│   │   └── index.ts
│   │
│   ├── api/                          # tRPC routers
│   │   ├── routers/
│   │   │   ├── billing.ts            # Stripe subscription management
│   │   │   └── user.ts               # User/org management
│   │   ├── trpc.ts                   # tRPC init & context
│   │   └── root.ts                   # Root router
│   │
│   └── shared/                       # Shared types, constants, utils
│       ├── types/
│       ├── constants/
│       └── utils/
│
├── turbo.json
├── package.json                      # pnpm workspaces
├── docker-compose.yml                # Local Postgres + Redis
├── .env.example
└── tsconfig.json                     # Base TypeScript config
```

### Technology Stack (Phase 1)

| Layer | Choice |
|-------|--------|
| Runtime | Node.js 20+ |
| Package Manager | pnpm 9+ |
| Monorepo | Turborepo |
| Frontend | Next.js 14+ (App Router), TypeScript strict |
| Styling | Tailwind CSS 3.4+, shadcn/ui, next-themes (dark mode) |
| API | tRPC v11 |
| Database | PostgreSQL 16 via Supabase |
| ORM | Prisma 5+ |
| Auth | NextAuth.js v5 (Auth.js) |
| Payments | Stripe (subscriptions, customer portal) |
| Validation | Zod |

## 3. Database Schema

Uses the exact Prisma schema from PROJECT_SPEC.md section 2.3, covering:
- **Auth & Users:** User, Account, Session models (NextAuth compatible)
- **Organizations & Teams:** Organization, OrganizationMember with role-based access (OWNER, ADMIN, MEMBER, VIEWER)
- **Social Accounts:** SocialAccount with platform enum (8 platforms)
- **Brand Voice:** BrandProfile with tone keywords, avoid lists, RAG namespace
- **Content:** ContentItem with type/status enums, platform variants
- **Scheduling:** ScheduledPost with BullMQ job references
- **Analytics:** AnalyticsEvent with platform-specific metrics
- **Enums:** Plan (FREE/STARTER/PRO/TEAM), OrgRole, SocialPlatform, ContentType, ContentStatus, PostStatus

## 4. Authentication

### Auth.js v5 Configuration
- **Providers:** Email/password (Credentials) + Google OAuth
- **Session strategy:** JWT (stateless, no DB session lookups)
- **Callbacks:** On first login, auto-create personal Organization for user
- **Pages:** Custom UI for login, signup, forgot-password using shadcn/ui

### Auth Flow
1. User signs up with email/password or Google
2. Email verification sent (via Resend in later phase; skipped for now)
3. On first login, create Organization with user as OWNER
4. Redirect to /dashboard

## 5. Dashboard Layout

### Sidebar Navigation
- Collapsible sidebar (icon-only on mobile)
- Navigation items: Dashboard, Create (disabled), Calendar (disabled), Queue (disabled), Analytics (disabled), Brand (disabled), Accounts, Settings
- Disabled items show "Coming Soon" tooltip (Phase 2-4 features)
- User avatar + org name at bottom
- Dark/light mode toggle

### Dashboard Home (`/dashboard`)
- Welcome card with user name and quick action buttons
- "Connected Accounts" status card (empty state guiding to /accounts)
- "Getting Started" checklist (connect account, set brand voice, create first post)

### Design Principles
- Clean, Notion/Linear-inspired UI
- Dark mode from day one (next-themes)
- Mobile-first responsive
- Skeleton loading states
- Empty states that guide users to action

## 6. Organization Management

### Auto-creation
- On first authenticated session, check if user has any OrganizationMember records
- If none, create Organization with name = "{User's Name}'s Workspace", auto-slug
- Add user as OWNER

### Settings Page (`/settings`)
- **Profile tab:** Name, email, avatar
- **Organization tab:** Name, slug, invite members (UI only, invite logic in later phase)
- **Billing tab:** Current plan display, upgrade/downgrade via Stripe Customer Portal redirect

## 7. Stripe Integration

### Products & Prices
- 4 plans: Free, Starter ($29/mo), Pro ($39/mo), Team ($79/mo)
- Annual billing variants (2 months free)
- Created via Stripe Dashboard or seed script

### Implementation
- **Checkout:** Stripe Checkout Sessions for upgrades
- **Portal:** Stripe Customer Portal for plan management, cancellation, payment method updates
- **Webhooks:** Handle `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- **Sync:** Update Organization.plan and Organization.planExpiresAt on webhook events

### Billing tRPC Router
- `billing.createCheckoutSession` — Creates Stripe Checkout for plan upgrade
- `billing.createPortalSession` — Opens Stripe Customer Portal
- `billing.getSubscription` — Returns current plan details

## 8. Pages Built

| Route | Description |
|-------|-------------|
| `/` | Marketing landing page |
| `/login` | Email/password + Google login |
| `/signup` | Registration form |
| `/forgot-password` | Password reset (UI only, email in later phase) |
| `/dashboard` | Overview with welcome card, getting started checklist |
| `/dashboard/accounts` | Connected accounts list (empty state) |
| `/dashboard/settings` | Profile, organization, and billing tabs |

## 9. What Phase 1 Does NOT Include

- AI content generation (Phase 2)
- Content creation workspace/editor (Phase 2)
- Brand voice configuration (Phase 2)
- Social platform OAuth connections (Phase 3)
- Visual scheduling calendar (Phase 3)
- BullMQ workers (Phase 3)
- Analytics dashboard (Phase 4)
- Review/approval queue (Phase 4)
- Notification system (Phase 4)

## 10. Environment Variables (Phase 1)

```env
# Database
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Payments
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Redis (for BullMQ, set up now but used in Phase 3)
REDIS_URL=redis://localhost:6379
```
