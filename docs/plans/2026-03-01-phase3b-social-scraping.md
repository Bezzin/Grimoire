# Phase 3B: Social OAuth + Auto Brand Profile Scraping — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add social account OAuth connect/disconnect for all 8 platforms, with automatic brand profile generation by scraping connected accounts' recent posts via AI analysis.

**Architecture:** Each platform gets an OAuth connect flow via dedicated API routes (not NextAuth providers — those are for login). Connected account tokens are stored in `SocialAccount`. On connect, a background scraping pipeline fetches recent posts, normalizes them, sends them to the LLM for voice analysis, and creates an auto-generated `BrandProfile`. Platform API adapters are normalized behind a common interface.

**Tech Stack:** Next.js API routes (OAuth flows), tRPC (CRUD), Vercel AI SDK (scrape analysis), Prisma, Tailwind CSS.

**Design Doc:** `docs/plans/2026-03-01-phase3-media-templates-design.md`

---

### Task 1: Platform OAuth Config Constants

**Files:**
- Create: `packages/shared/constants/social-oauth.ts`
- Modify: `packages/shared/constants/index.ts`

**Step 1: Create social OAuth config**

Create `packages/shared/constants/social-oauth.ts`:

```typescript
export const SOCIAL_OAUTH_CONFIG = {
  INSTAGRAM: {
    name: "Instagram",
    icon: "Instagram",
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    scopes: ["instagram_basic", "instagram_content_publish", "pages_show_list"],
    envClientId: "META_CLIENT_ID",
    envClientSecret: "META_CLIENT_SECRET",
  },
  FACEBOOK: {
    name: "Facebook",
    icon: "Facebook",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    scopes: ["pages_show_list", "pages_read_engagement", "pages_manage_posts"],
    envClientId: "META_CLIENT_ID",
    envClientSecret: "META_CLIENT_SECRET",
  },
  LINKEDIN: {
    name: "LinkedIn",
    icon: "Linkedin",
    color: "text-blue-600",
    bgColor: "bg-blue-600/10",
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: ["openid", "profile", "w_member_social"],
    envClientId: "LINKEDIN_CLIENT_ID",
    envClientSecret: "LINKEDIN_CLIENT_SECRET",
  },
  TWITTER: {
    name: "X (Twitter)",
    icon: "Twitter",
    color: "text-foreground",
    bgColor: "bg-foreground/10",
    authUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scopes: ["tweet.read", "tweet.write", "users.read"],
    envClientId: "TWITTER_CLIENT_ID",
    envClientSecret: "TWITTER_CLIENT_SECRET",
  },
  TIKTOK: {
    name: "TikTok",
    icon: "Music",
    color: "text-foreground",
    bgColor: "bg-foreground/10",
    authUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    scopes: ["user.info.basic", "video.list"],
    envClientId: "TIKTOK_CLIENT_KEY",
    envClientSecret: "TIKTOK_CLIENT_SECRET",
  },
  THREADS: {
    name: "Threads",
    icon: "AtSign",
    color: "text-foreground",
    bgColor: "bg-foreground/10",
    authUrl: "https://threads.net/oauth/authorize",
    tokenUrl: "https://graph.threads.net/oauth/access_token",
    scopes: ["threads_basic", "threads_content_publish"],
    envClientId: "META_CLIENT_ID",
    envClientSecret: "META_CLIENT_SECRET",
  },
  YOUTUBE: {
    name: "YouTube",
    icon: "Youtube",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/youtube.readonly"],
    envClientId: "GOOGLE_CLIENT_ID",
    envClientSecret: "GOOGLE_CLIENT_SECRET",
  },
  PINTEREST: {
    name: "Pinterest",
    icon: "MapPin",
    color: "text-red-600",
    bgColor: "bg-red-600/10",
    authUrl: "https://www.pinterest.com/oauth/",
    tokenUrl: "https://api.pinterest.com/v5/oauth/token",
    scopes: ["boards:read", "pins:read"],
    envClientId: "PINTEREST_APP_ID",
    envClientSecret: "PINTEREST_APP_SECRET",
  },
} as const

export type SocialOAuthPlatform = keyof typeof SOCIAL_OAUTH_CONFIG
```

**Step 2: Export from shared index**

Add to `packages/shared/constants/index.ts`:
```typescript
export * from "./social-oauth"
```

**Step 3: Add env vars to `.env`**

Append to `.env` (gitignored):
```
# Phase 3B: Social OAuth
META_CLIENT_ID=
META_CLIENT_SECRET=
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
PINTEREST_APP_ID=
PINTEREST_APP_SECRET=
```

**Step 4: Commit**

```bash
git add packages/shared/constants/social-oauth.ts packages/shared/constants/index.ts
git commit -m "feat: add social OAuth platform config constants"
```

---

### Task 2: Social Account tRPC Router

**Files:**
- Create: `packages/api/routers/socialAccount.ts`
- Modify: `packages/api/root.ts`

**Step 1: Create social account router**

Create `packages/api/routers/socialAccount.ts`:

```typescript
import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, orgProtectedProcedure } from "../trpc"
import { PLANS } from "@grimoire/shared"
import type { PlanKey } from "@grimoire/shared"

const platformEnum = z.enum([
  "INSTAGRAM", "FACEBOOK", "LINKEDIN", "TWITTER",
  "TIKTOK", "THREADS", "YOUTUBE", "PINTEREST",
])

export const socialAccountRouter = createTRPCRouter({
  list: orgProtectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.socialAccount.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        platform: true,
        platformUsername: true,
        displayName: true,
        avatarUrl: true,
        isActive: true,
        tokenExpiresAt: true,
        createdAt: true,
      },
    })
  }),

  connect: orgProtectedProcedure
    .input(
      z.object({
        platform: platformEnum,
        platformUserId: z.string(),
        platformUsername: z.string().optional(),
        displayName: z.string().optional(),
        avatarUrl: z.string().url().optional(),
        accessToken: z.string(),
        refreshToken: z.string().optional(),
        tokenExpiresAt: z.date().optional(),
        scopes: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check plan limit
      const planConfig = PLANS[ctx.organization.plan as PlanKey]
      const currentCount = await ctx.prisma.socialAccount.count({
        where: { organizationId: ctx.organization.id },
      })
      if (currentCount >= planConfig.socialAccounts) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `You've reached your limit of ${planConfig.socialAccounts} social accounts. Upgrade to connect more.`,
        })
      }

      // Upsert — reconnecting an existing account
      return ctx.prisma.socialAccount.upsert({
        where: {
          platform_platformUserId_organizationId: {
            platform: input.platform,
            platformUserId: input.platformUserId,
            organizationId: ctx.organization.id,
          },
        },
        update: {
          platformUsername: input.platformUsername,
          displayName: input.displayName,
          avatarUrl: input.avatarUrl,
          accessToken: input.accessToken,
          refreshToken: input.refreshToken,
          tokenExpiresAt: input.tokenExpiresAt,
          scopes: input.scopes,
          isActive: true,
        },
        create: {
          platform: input.platform,
          platformUserId: input.platformUserId,
          platformUsername: input.platformUsername,
          displayName: input.displayName,
          avatarUrl: input.avatarUrl,
          accessToken: input.accessToken,
          refreshToken: input.refreshToken,
          tokenExpiresAt: input.tokenExpiresAt,
          scopes: input.scopes,
          organizationId: ctx.organization.id,
        },
      })
    }),

  disconnect: orgProtectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.prisma.socialAccount.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
      })
      if (!account) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Account not found" })
      }
      return ctx.prisma.socialAccount.delete({ where: { id: input.id } })
    }),

  getUsage: orgProtectedProcedure.query(async ({ ctx }) => {
    const planConfig = PLANS[ctx.organization.plan as PlanKey]
    const count = await ctx.prisma.socialAccount.count({
      where: { organizationId: ctx.organization.id },
    })
    return {
      used: count,
      limit: planConfig.socialAccounts,
    }
  }),
})
```

**Step 2: Register in root router**

Add to `packages/api/root.ts`:
```typescript
import { socialAccountRouter } from "./routers/socialAccount"
```
And add `socialAccount: socialAccountRouter` to the createTRPCRouter call.

**Step 3: Commit**

```bash
git add packages/api/routers/socialAccount.ts packages/api/root.ts
git commit -m "feat: add social account tRPC router with connect/disconnect/list"
```

---

### Task 3: OAuth Connect API Routes

**Files:**
- Create: `apps/web/app/api/social/[platform]/connect/route.ts`
- Create: `apps/web/app/api/social/[platform]/callback/route.ts`
- Create: `apps/web/lib/social/oauth.ts`

**Step 1: Create OAuth utility helpers**

Create `apps/web/lib/social/oauth.ts`:

```typescript
import { SOCIAL_OAUTH_CONFIG } from "@grimoire/shared"
import type { SocialOAuthPlatform } from "@grimoire/shared"

export function getOAuthConfig(platform: SocialOAuthPlatform) {
  const config = SOCIAL_OAUTH_CONFIG[platform]
  const clientId = process.env[config.envClientId]
  const clientSecret = process.env[config.envClientSecret]
  return { ...config, clientId: clientId ?? "", clientSecret: clientSecret ?? "" }
}

export function buildAuthUrl(platform: SocialOAuthPlatform, state: string): string {
  const config = getOAuthConfig(platform)
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/social/${platform.toLowerCase()}/callback`
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: config.scopes.join(" "),
    state,
  })
  // Twitter uses PKCE
  if (platform === "TWITTER") {
    params.set("code_challenge", "challenge")
    params.set("code_challenge_method", "plain")
  }
  return `${config.authUrl}?${params.toString()}`
}

export async function exchangeCodeForTokens(
  platform: SocialOAuthPlatform,
  code: string
): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }> {
  const config = getOAuthConfig(platform)
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/social/${platform.toLowerCase()}/callback`

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  })

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token exchange failed for ${platform}: ${text}`)
  }

  const data = await res.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  }
}

export async function fetchPlatformProfile(
  platform: SocialOAuthPlatform,
  accessToken: string
): Promise<{ id: string; username?: string; displayName?: string; avatarUrl?: string }> {
  const handlers: Record<string, () => Promise<{ id: string; username?: string; displayName?: string; avatarUrl?: string }>> = {
    INSTAGRAM: async () => {
      const res = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,username&access_token=${accessToken}`)
      const data = await res.json()
      return { id: data.id, username: data.username }
    },
    FACEBOOK: async () => {
      const res = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name,picture&access_token=${accessToken}`)
      const data = await res.json()
      return { id: data.id, displayName: data.name, avatarUrl: data.picture?.data?.url }
    },
    LINKEDIN: async () => {
      const res = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      return { id: data.sub, displayName: data.name, avatarUrl: data.picture }
    },
    TWITTER: async () => {
      const res = await fetch("https://api.twitter.com/2/users/me?user.fields=profile_image_url,username", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      return { id: data.data.id, username: data.data.username, displayName: data.data.name, avatarUrl: data.data.profile_image_url }
    },
    TIKTOK: async () => {
      const res = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      return { id: data.data.user.open_id, displayName: data.data.user.display_name, avatarUrl: data.data.user.avatar_url }
    },
    THREADS: async () => {
      const res = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username&access_token=${accessToken}`)
      const data = await res.json()
      return { id: data.id, username: data.username }
    },
    YOUTUBE: async () => {
      const res = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      const channel = data.items?.[0]
      return { id: channel?.id, displayName: channel?.snippet?.title, avatarUrl: channel?.snippet?.thumbnails?.default?.url }
    },
    PINTEREST: async () => {
      const res = await fetch("https://api.pinterest.com/v5/user_account", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      return { id: data.username, username: data.username, avatarUrl: data.profile_image }
    },
  }

  const handler = handlers[platform]
  if (!handler) throw new Error(`Unsupported platform: ${platform}`)
  return handler()
}
```

**Step 2: Create connect route (initiates OAuth)**

Create `apps/web/app/api/social/[platform]/connect/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { buildAuthUrl } from "@/lib/social/oauth"
import { SOCIAL_OAUTH_CONFIG } from "@grimoire/shared"
import type { SocialOAuthPlatform } from "@grimoire/shared"

export async function GET(
  _req: Request,
  { params }: { params: { platform: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const platform = params.platform.toUpperCase() as SocialOAuthPlatform
  if (!(platform in SOCIAL_OAUTH_CONFIG)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 })
  }

  const state = Buffer.from(
    JSON.stringify({ userId: session.user.id, platform, ts: Date.now() })
  ).toString("base64url")

  const url = buildAuthUrl(platform, state)
  return NextResponse.redirect(url)
}
```

**Step 3: Create callback route (handles OAuth redirect)**

Create `apps/web/app/api/social/[platform]/callback/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@grimoire/db"
import { exchangeCodeForTokens, fetchPlatformProfile } from "@/lib/social/oauth"
import { SOCIAL_OAUTH_CONFIG } from "@grimoire/shared"
import type { SocialOAuthPlatform } from "@grimoire/shared"

export async function GET(
  req: Request,
  { params }: { params: { platform: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const stateParam = url.searchParams.get("state")
  const error = url.searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/dashboard/accounts?error=${error ?? "no_code"}`, req.url)
    )
  }

  const platform = params.platform.toUpperCase() as SocialOAuthPlatform
  if (!(platform in SOCIAL_OAUTH_CONFIG)) {
    return NextResponse.redirect(new URL("/dashboard/accounts?error=invalid_platform", req.url))
  }

  try {
    // Get user's org
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      include: { organization: true },
    })
    if (!membership) {
      return NextResponse.redirect(new URL("/dashboard/accounts?error=no_org", req.url))
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(platform, code)

    // Fetch platform profile
    const profile = await fetchPlatformProfile(platform, tokens.accessToken)

    // Upsert social account
    await prisma.socialAccount.upsert({
      where: {
        platform_platformUserId_organizationId: {
          platform,
          platformUserId: profile.id,
          organizationId: membership.organizationId,
        },
      },
      update: {
        platformUsername: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresIn
          ? new Date(Date.now() + tokens.expiresIn * 1000)
          : null,
        isActive: true,
      },
      create: {
        platform,
        platformUserId: profile.id,
        platformUsername: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresIn
          ? new Date(Date.now() + tokens.expiresIn * 1000)
          : null,
        scopes: SOCIAL_OAUTH_CONFIG[platform].scopes,
        organizationId: membership.organizationId,
      },
    })

    // Redirect with success — scraping will be triggered client-side
    return NextResponse.redirect(
      new URL(`/dashboard/accounts?connected=${platform.toLowerCase()}`, req.url)
    )
  } catch (err) {
    console.error(`OAuth callback error for ${platform}:`, err)
    return NextResponse.redirect(
      new URL(`/dashboard/accounts?error=connect_failed`, req.url)
    )
  }
}
```

**Step 4: Commit**

```bash
git add apps/web/lib/social/oauth.ts apps/web/app/api/social/
git commit -m "feat: add social OAuth connect and callback API routes for all 8 platforms"
```

---

### Task 4: Platform Scraping Adapters

**Files:**
- Create: `packages/ai/scraping/adapters.ts`
- Create: `packages/ai/scraping/analyzer.ts`
- Modify: `packages/ai/index.ts`

**Step 1: Create platform scraping adapters**

Create `packages/ai/scraping/adapters.ts`:

```typescript
export interface ScrapedPost {
  text: string
  mediaUrls: string[]
  platform: string
  postedAt: Date | null
  engagement: { likes: number; comments: number; shares: number }
}

type ScrapeAdapter = (accessToken: string, limit: number) => Promise<ScrapedPost[]>

const instagramAdapter: ScrapeAdapter = async (accessToken, limit) => {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/me/media?fields=caption,timestamp,like_count,comments_count,media_url&limit=${limit}&access_token=${accessToken}`
  )
  const data = await res.json()
  return (data.data ?? []).map((post: Record<string, unknown>) => ({
    text: (post.caption as string) ?? "",
    mediaUrls: post.media_url ? [post.media_url as string] : [],
    platform: "INSTAGRAM",
    postedAt: post.timestamp ? new Date(post.timestamp as string) : null,
    engagement: { likes: (post.like_count as number) ?? 0, comments: (post.comments_count as number) ?? 0, shares: 0 },
  }))
}

const facebookAdapter: ScrapeAdapter = async (accessToken, limit) => {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/me/posts?fields=message,created_time,shares&limit=${limit}&access_token=${accessToken}`
  )
  const data = await res.json()
  return (data.data ?? []).map((post: Record<string, unknown>) => ({
    text: (post.message as string) ?? "",
    mediaUrls: [],
    platform: "FACEBOOK",
    postedAt: post.created_time ? new Date(post.created_time as string) : null,
    engagement: { likes: 0, comments: 0, shares: ((post.shares as Record<string, number>)?.count) ?? 0 },
  }))
}

const twitterAdapter: ScrapeAdapter = async (accessToken, limit) => {
  const res = await fetch(
    `https://api.twitter.com/2/users/me/tweets?max_results=${Math.min(limit, 100)}&tweet.fields=created_at,public_metrics`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const data = await res.json()
  return (data.data ?? []).map((tweet: Record<string, unknown>) => {
    const metrics = tweet.public_metrics as Record<string, number> | undefined
    return {
      text: (tweet.text as string) ?? "",
      mediaUrls: [],
      platform: "TWITTER",
      postedAt: tweet.created_at ? new Date(tweet.created_at as string) : null,
      engagement: { likes: metrics?.like_count ?? 0, comments: metrics?.reply_count ?? 0, shares: metrics?.retweet_count ?? 0 },
    }
  })
}

const linkedinAdapter: ScrapeAdapter = async (accessToken, limit) => {
  // LinkedIn UGC API requires specific permissions; return empty for now if API unavailable
  return []
}

const tiktokAdapter: ScrapeAdapter = async (accessToken, limit) => {
  const res = await fetch(
    `https://open.tiktokapis.com/v2/video/list/?fields=title,create_time,like_count,comment_count,share_count`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ max_count: Math.min(limit, 20) }),
    }
  )
  const data = await res.json()
  return (data.data?.videos ?? []).map((video: Record<string, unknown>) => ({
    text: (video.title as string) ?? "",
    mediaUrls: [],
    platform: "TIKTOK",
    postedAt: video.create_time ? new Date((video.create_time as number) * 1000) : null,
    engagement: { likes: (video.like_count as number) ?? 0, comments: (video.comment_count as number) ?? 0, shares: (video.share_count as number) ?? 0 },
  }))
}

const threadsAdapter: ScrapeAdapter = async (accessToken, limit) => {
  const res = await fetch(
    `https://graph.threads.net/v1.0/me/threads?fields=text,timestamp&limit=${limit}&access_token=${accessToken}`
  )
  const data = await res.json()
  return (data.data ?? []).map((post: Record<string, unknown>) => ({
    text: (post.text as string) ?? "",
    mediaUrls: [],
    platform: "THREADS",
    postedAt: post.timestamp ? new Date(post.timestamp as string) : null,
    engagement: { likes: 0, comments: 0, shares: 0 },
  }))
}

const youtubeAdapter: ScrapeAdapter = async (accessToken, limit) => {
  // Get channel's uploads playlist
  const channelRes = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const channelData = await channelRes.json()
  const uploadsId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
  if (!uploadsId) return []

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=${Math.min(limit, 50)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const data = await res.json()
  return (data.items ?? []).map((item: Record<string, unknown>) => {
    const snippet = item.snippet as Record<string, unknown>
    return {
      text: `${snippet.title ?? ""}\n${snippet.description ?? ""}`,
      mediaUrls: [],
      platform: "YOUTUBE",
      postedAt: snippet.publishedAt ? new Date(snippet.publishedAt as string) : null,
      engagement: { likes: 0, comments: 0, shares: 0 },
    }
  })
}

const pinterestAdapter: ScrapeAdapter = async (accessToken, limit) => {
  const res = await fetch(
    `https://api.pinterest.com/v5/pins?page_size=${Math.min(limit, 25)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const data = await res.json()
  return (data.items ?? []).map((pin: Record<string, unknown>) => ({
    text: (pin.description as string) ?? (pin.title as string) ?? "",
    mediaUrls: [],
    platform: "PINTEREST",
    postedAt: pin.created_at ? new Date(pin.created_at as string) : null,
    engagement: { likes: 0, comments: 0, shares: 0 },
  }))
}

export const SCRAPE_ADAPTERS: Record<string, ScrapeAdapter> = {
  INSTAGRAM: instagramAdapter,
  FACEBOOK: facebookAdapter,
  TWITTER: twitterAdapter,
  LINKEDIN: linkedinAdapter,
  TIKTOK: tiktokAdapter,
  THREADS: threadsAdapter,
  YOUTUBE: youtubeAdapter,
  PINTEREST: pinterestAdapter,
}

export async function scrapePosts(
  platform: string,
  accessToken: string,
  limit = 50
): Promise<ScrapedPost[]> {
  const adapter = SCRAPE_ADAPTERS[platform]
  if (!adapter) return []
  try {
    return await adapter(accessToken, limit)
  } catch (error) {
    console.error(`Scraping failed for ${platform}:`, error)
    return []
  }
}
```

**Step 2: Create voice analyzer**

Create `packages/ai/scraping/analyzer.ts`:

```typescript
import { generateText } from "ai"
import { getModel } from "../router"
import type { ScrapedPost } from "./adapters"

export interface VoiceAnalysis {
  toneKeywords: string[]
  avoidKeywords: string[]
  styleGuide: string
  exampleContent: string[]
}

export async function analyzeVoice(
  posts: ScrapedPost[],
  platformName: string
): Promise<VoiceAnalysis> {
  const postTexts = posts
    .filter((p) => p.text.trim().length > 10)
    .slice(0, 50)
    .map((p, i) => `[Post ${i + 1}]: ${p.text.slice(0, 500)}`)
    .join("\n\n")

  if (postTexts.length === 0) {
    return {
      toneKeywords: ["professional"],
      avoidKeywords: [],
      styleGuide: "No content available to analyze.",
      exampleContent: [],
    }
  }

  const model = getModel({ tier: "fast" })
  const { text } = await generateText({
    model,
    system: `You are a brand voice analyst. Analyze the following social media posts and extract the brand's writing style. Return ONLY valid JSON with this exact structure:
{
  "toneKeywords": ["keyword1", "keyword2", ...],
  "avoidKeywords": ["word1", "word2", ...],
  "styleGuide": "A 2-3 sentence description of the writing style, common patterns, and voice characteristics."
}

Rules:
- toneKeywords: 5-10 adjectives describing the tone (e.g., "witty", "professional", "casual")
- avoidKeywords: Words or phrases the brand never uses, or tones to avoid
- styleGuide: Describe post length patterns, emoji usage, hashtag patterns, formatting habits`,
    prompt: `Analyze these ${platformName} posts and extract the brand voice:\n\n${postTexts}`,
  })

  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    const parsed = JSON.parse(cleaned) as {
      toneKeywords?: string[]
      avoidKeywords?: string[]
      styleGuide?: string
    }
    return {
      toneKeywords: parsed.toneKeywords ?? ["professional"],
      avoidKeywords: parsed.avoidKeywords ?? [],
      styleGuide: parsed.styleGuide ?? "",
      exampleContent: posts
        .filter((p) => p.text.trim().length > 20)
        .slice(0, 10)
        .map((p) => p.text),
    }
  } catch {
    return {
      toneKeywords: ["professional"],
      avoidKeywords: [],
      styleGuide: "Failed to parse voice analysis.",
      exampleContent: posts.filter((p) => p.text.trim().length > 20).slice(0, 10).map((p) => p.text),
    }
  }
}
```

**Step 3: Export from AI package**

Add to `packages/ai/index.ts`:
```typescript
export { scrapePosts } from "./scraping/adapters"
export type { ScrapedPost } from "./scraping/adapters"
export { analyzeVoice } from "./scraping/analyzer"
export type { VoiceAnalysis } from "./scraping/analyzer"
```

**Step 4: Commit**

```bash
git add packages/ai/scraping/ packages/ai/index.ts
git commit -m "feat: add platform scraping adapters and voice analysis pipeline"
```

---

### Task 5: Scrape Trigger tRPC Procedure

**Files:**
- Modify: `packages/api/routers/socialAccount.ts`

**Step 1: Add scrapeAndGenerateProfile procedure**

Add to the `socialAccountRouter` in `packages/api/routers/socialAccount.ts`:

```typescript
import { scrapePosts, analyzeVoice } from "@grimoire/ai"
import { SOCIAL_OAUTH_CONFIG } from "@grimoire/shared"
import type { SocialOAuthPlatform } from "@grimoire/shared"
```

Add this procedure to the router:

```typescript
  scrapeAndGenerateProfile: orgProtectedProcedure
    .input(z.object({ accountId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.prisma.socialAccount.findFirst({
        where: { id: input.accountId, organizationId: ctx.organization.id },
      })
      if (!account) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Account not found" })
      }
      if (!account.isActive) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Account is inactive" })
      }

      // Scrape posts
      const posts = await scrapePosts(account.platform, account.accessToken, 50)
      if (posts.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No posts found to analyze. The account may be private or have no content.",
        })
      }

      // Analyze voice
      const platformName = SOCIAL_OAUTH_CONFIG[account.platform as SocialOAuthPlatform]?.name ?? account.platform
      const analysis = await analyzeVoice(posts, platformName)

      // Create brand profile
      const profile = await ctx.prisma.brandProfile.create({
        data: {
          name: `${platformName} Voice — Auto-generated`,
          description: `Automatically generated from ${posts.length} ${platformName} posts.`,
          toneKeywords: analysis.toneKeywords,
          avoidKeywords: analysis.avoidKeywords,
          styleGuide: analysis.styleGuide,
          exampleContent: analysis.exampleContent,
          organizationId: ctx.organization.id,
          vectorNamespace: "",
        },
      })

      // Update vectorNamespace
      await ctx.prisma.brandProfile.update({
        where: { id: profile.id },
        data: { vectorNamespace: `org:${ctx.organization.id}:brand:${profile.id}` },
      })

      // Count as 1 AI generation
      await ctx.prisma.organization.update({
        where: { id: ctx.organization.id },
        data: { aiGenerationsUsed: { increment: 1 } },
      })

      return { profileId: profile.id, postsAnalyzed: posts.length, toneKeywords: analysis.toneKeywords }
    }),
```

**Step 2: Commit**

```bash
git add packages/api/routers/socialAccount.ts
git commit -m "feat: add scrapeAndGenerateProfile procedure for auto brand voice extraction"
```

---

### Task 6: Connected Accounts Page UI

**Files:**
- Create: `apps/web/components/dashboard/accounts/accounts-page-client.tsx`
- Create: `apps/web/components/dashboard/accounts/platform-card.tsx`
- Modify: `apps/web/app/(dashboard)/dashboard/accounts/page.tsx`
- Delete or replace: `apps/web/components/dashboard/accounts-empty.tsx`

**Step 1: Create platform card component**

Create `apps/web/components/dashboard/accounts/platform-card.tsx`:

```tsx
"use client"

import { useState } from "react"
import * as LucideIcons from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SOCIAL_OAUTH_CONFIG } from "@grimoire/shared"
import type { SocialOAuthPlatform } from "@grimoire/shared"
import { trpc } from "@/lib/trpc/client"

interface ConnectedAccount {
  id: string
  platform: string
  platformUsername: string | null
  displayName: string | null
  avatarUrl: string | null
  isActive: boolean
  tokenExpiresAt: Date | null
}

interface PlatformCardProps {
  platform: SocialOAuthPlatform
  account?: ConnectedAccount
  onDisconnect: () => void
}

export function PlatformCard({ platform, account, onDisconnect }: PlatformCardProps) {
  const config = SOCIAL_OAUTH_CONFIG[platform]
  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[config.icon]
  const [scraping, setScraping] = useState(false)

  const scrape = trpc.socialAccount.scrapeAndGenerateProfile.useMutation({
    onSettled: () => setScraping(false),
  })

  const disconnect = trpc.socialAccount.disconnect.useMutation({
    onSuccess: onDisconnect,
  })

  function handleConnect() {
    window.location.href = `/api/social/${platform.toLowerCase()}/connect`
  }

  function handleScrape() {
    if (!account) return
    setScraping(true)
    scrape.mutate({ accountId: account.id })
  }

  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${config.bgColor}`}>
            {IconComponent && <IconComponent className={`h-5 w-5 ${config.color}`} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{config.name}</p>
            {account ? (
              <div className="flex items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full ${account.isActive ? "bg-emerald-500" : "bg-amber-500"}`} />
                <span className="truncate text-xs text-muted-foreground">
                  @{account.platformUsername ?? account.displayName ?? "connected"}
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Not connected</span>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          {account ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={handleScrape}
                disabled={scraping || scrape.isPending}
              >
                {scraping ? "Analyzing..." : "Analyze Voice"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-destructive"
                onClick={() => disconnect.mutate({ id: account.id })}
                disabled={disconnect.isPending}
              >
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              className="flex-1 text-xs grimoire-gradient text-white"
              onClick={handleConnect}
            >
              Connect
            </Button>
          )}
        </div>

        {scrape.isSuccess && (
          <p className="mt-2 text-xs text-emerald-600">
            Brand profile created from {scrape.data.postsAnalyzed} posts!
          </p>
        )}
        {scrape.isError && (
          <p className="mt-2 text-xs text-destructive">
            {scrape.error.message}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
```

**Step 2: Create accounts page client**

Create `apps/web/components/dashboard/accounts/accounts-page-client.tsx`:

```tsx
"use client"

import { trpc } from "@/lib/trpc/client"
import { PlatformCard } from "./platform-card"
import { SOCIAL_OAUTH_CONFIG } from "@grimoire/shared"
import type { SocialOAuthPlatform } from "@grimoire/shared"

const ALL_PLATFORMS = Object.keys(SOCIAL_OAUTH_CONFIG) as SocialOAuthPlatform[]

export function AccountsPageClient() {
  const { data: accounts, refetch } = trpc.socialAccount.list.useQuery()
  const { data: usage } = trpc.socialAccount.getUsage.useQuery()

  const accountByPlatform = new Map(
    (accounts ?? []).map((a) => [a.platform, a])
  )

  return (
    <div className="space-y-6">
      {usage && (
        <p className="text-xs text-muted-foreground">
          {usage.used} / {usage.limit} accounts connected
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ALL_PLATFORMS.map((platform) => (
          <PlatformCard
            key={platform}
            platform={platform}
            account={accountByPlatform.get(platform) as Parameters<typeof PlatformCard>[0]["account"]}
            onDisconnect={() => refetch()}
          />
        ))}
      </div>
    </div>
  )
}
```

**Step 3: Update accounts page**

Replace `apps/web/app/(dashboard)/dashboard/accounts/page.tsx`:

```tsx
import { AccountsPageClient } from "@/components/dashboard/accounts/accounts-page-client"

export default function AccountsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Connected Accounts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your social media accounts to analyze your brand voice
        </p>
      </div>
      <AccountsPageClient />
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add apps/web/components/dashboard/accounts/ apps/web/app/(dashboard)/dashboard/accounts/page.tsx
git commit -m "feat: add connected accounts page with OAuth connect and voice analysis UI"
```

---

### Task 7: Wire Up + Verify Full Build

**Step 1: Run TypeScript check**

```bash
cd /c/Users/Nathaniel/Documents/Grimoire && npx tsc --noEmit --project apps/web/tsconfig.json 2>&1 | head -30
```

**Step 2: Fix any type errors**

Expected issues to check:
- SocialOAuthPlatform export from shared package
- generateText import in AI package
- Dynamic route params typing in Next.js 14

**Step 3: Commit fixes if needed**

```bash
git add -A && git commit -m "fix: resolve Phase 3B build issues"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Platform OAuth config constants | 2 files |
| 2 | Social account tRPC router | 2 files |
| 3 | OAuth connect/callback API routes + helpers | 3 files |
| 4 | Platform scraping adapters + voice analyzer | 3 files |
| 5 | Scrape trigger tRPC procedure | 1 file |
| 6 | Connected accounts page UI | 3 files |
| 7 | Wire up + verify build | 0 files |

**Total:** ~10 new files, ~4 modified files, 7 tasks.
