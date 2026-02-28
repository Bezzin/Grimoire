# Phase 2: AI Core — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the AI content generation engine — model routing, prompt templates, brand voice RAG, content creation workspace, platform adaptation, moderation, and rate limiting.

**Architecture:** New `packages/ai/` package wraps Vercel AI SDK + OpenRouter for multi-model streaming. Pinecone handles brand voice RAG. Novel editor provides the content workspace. Two new tRPC routers (`content`, `brand`) expose all AI functionality. Two new dashboard routes (`/dashboard/create`, `/dashboard/brand`) deliver the UI.

**Tech Stack:** Vercel AI SDK (`ai`, `@ai-sdk/openai`), OpenRouter, Pinecone (`@pinecone-database/pinecone`), Novel editor, OpenAI Moderation API (`openai`), Prisma, tRPC, Next.js App Router, Tailwind CSS.

**Design Doc:** `docs/plans/2026-02-28-phase2-ai-core-design.md`

---

## Task 1: Install Phase 2 Dependencies

**Files:**
- Modify: `packages/ai/package.json` (create new package)
- Create: `packages/ai/tsconfig.json`
- Create: `packages/ai/index.ts`
- Modify: `apps/web/package.json`
- Modify: `.env`

**Step 1: Create the `packages/ai/` package**

```bash
mkdir -p packages/ai
```

Create `packages/ai/package.json`:

```json
{
  "name": "@grimoire/ai",
  "version": "0.0.0",
  "private": true,
  "main": "./index.ts",
  "types": "./index.ts",
  "dependencies": {
    "@ai-sdk/openai": "^1.0.0",
    "ai": "^4.0.0",
    "@pinecone-database/pinecone": "^4.0.0",
    "openai": "^4.70.0",
    "@grimoire/db": "workspace:*",
    "@grimoire/shared": "workspace:*",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/node": "^22.0.0"
  }
}
```

Create `packages/ai/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "."
  },
  "include": ["./**/*.ts"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

Create `packages/ai/index.ts`:

```typescript
// Phase 2: AI Core package — barrel exports
// Individual modules will be exported as they are built
export {}
```

**Step 2: Add Phase 2 deps to `apps/web/`**

Run:

```bash
cd apps/web && pnpm add novel ai @grimoire/ai@workspace:*
```

**Step 3: Install all workspace dependencies**

Run:

```bash
cd /c/Users/Nathaniel/Documents/Grimoire && pnpm install
```

**Step 4: Add Phase 2 env vars to `.env`**

Append to `.env`:

```env
# Phase 2: AI Core
OPENROUTER_API_KEY=
PINECONE_API_KEY=
PINECONE_INDEX=grimoire
OPENAI_API_KEY=
```

**Step 5: Verify workspace resolves**

Run:

```bash
pnpm -r list --depth 0 | grep grimoire
```

Expected: All 4 packages listed (`@grimoire/ai`, `@grimoire/api`, `@grimoire/db`, `@grimoire/shared`).

**Step 6: Commit**

```bash
git add packages/ai/ apps/web/package.json pnpm-lock.yaml .env
git commit -m "feat: scaffold packages/ai and install Phase 2 dependencies"
```

---

## Task 2: AI Client + Model Router

**Files:**
- Create: `packages/ai/client.ts`
- Create: `packages/ai/router.ts`
- Modify: `packages/ai/index.ts`

**Step 1: Create OpenRouter client via Vercel AI SDK**

Create `packages/ai/client.ts`:

```typescript
import { createOpenAI } from "@ai-sdk/openai"

export function getOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured")
  }
  return createOpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
  })
}
```

**Step 2: Create model router**

Create `packages/ai/router.ts`:

```typescript
import { getOpenRouterClient } from "./client"

export type ModelTier = "fast" | "standard" | "creative"

const TIER_MODELS: Record<ModelTier, string> = {
  fast: "openai/gpt-4o-mini",
  standard: "openai/gpt-4o",
  creative: "anthropic/claude-sonnet-4",
}

const FALLBACK_ORDER: ModelTier[] = ["creative", "standard", "fast"]

export interface RouterOptions {
  tier: ModelTier
  preferQuality?: boolean
}

function upgradeTier(tier: ModelTier): ModelTier {
  if (tier === "fast") return "standard"
  if (tier === "standard") return "creative"
  return "creative"
}

export function getModel(options: RouterOptions) {
  const effectiveTier = options.preferQuality
    ? upgradeTier(options.tier)
    : options.tier
  const modelId = TIER_MODELS[effectiveTier]
  const client = getOpenRouterClient()
  return client(modelId)
}

export function getFallbackModels(tier: ModelTier) {
  const startIndex = FALLBACK_ORDER.indexOf(tier)
  const tiers = FALLBACK_ORDER.slice(startIndex)
  const client = getOpenRouterClient()
  return tiers.map((t) => ({
    tier: t,
    modelId: TIER_MODELS[t],
    model: client(TIER_MODELS[t]),
  }))
}

export function getModelId(tier: ModelTier, preferQuality?: boolean): string {
  const effectiveTier = preferQuality ? upgradeTier(tier) : tier
  return TIER_MODELS[effectiveTier]
}
```

**Step 3: Update barrel exports**

Update `packages/ai/index.ts`:

```typescript
export { getOpenRouterClient } from "./client"
export { getModel, getFallbackModels, getModelId } from "./router"
export type { ModelTier, RouterOptions } from "./router"
```

**Step 4: Verify it compiles**

Run:

```bash
cd /c/Users/Nathaniel/Documents/Grimoire && pnpm exec tsc --noEmit -p packages/ai/tsconfig.json
```

Expected: No errors.

**Step 5: Commit**

```bash
git add packages/ai/
git commit -m "feat: add AI client (OpenRouter via Vercel AI SDK) and model router"
```

---

## Task 3: Prompt Template System

**Files:**
- Create: `packages/shared/constants/templates.ts`
- Modify: `packages/shared/constants/index.ts`
- Create: `packages/shared/constants/platforms.ts`

**Step 1: Create platform definitions**

Create `packages/shared/constants/platforms.ts`:

```typescript
export const SOCIAL_PLATFORMS = {
  INSTAGRAM: { name: "Instagram", charLimit: 2200, key: "instagram" },
  FACEBOOK: { name: "Facebook", charLimit: 63206, key: "facebook" },
  LINKEDIN: { name: "LinkedIn", charLimit: 3000, key: "linkedin" },
  TWITTER: { name: "Twitter/X", charLimit: 280, key: "twitter" },
  TIKTOK: { name: "TikTok", charLimit: 2200, key: "tiktok" },
  THREADS: { name: "Threads", charLimit: 500, key: "threads" },
  YOUTUBE: { name: "YouTube", charLimit: 5000, key: "youtube" },
  PINTEREST: { name: "Pinterest", charLimit: 500, key: "pinterest" },
} as const

export type SocialPlatformKey = keyof typeof SOCIAL_PLATFORMS
```

**Step 2: Create 10 launch templates**

Create `packages/shared/constants/templates.ts`:

```typescript
import { z } from "zod"
import type { SocialPlatformKey } from "./platforms"

export type TemplateCategory = "social" | "thread" | "blog" | "email" | "ads"
export type TemplateTier = "fast" | "standard" | "creative"

export interface PromptTemplate {
  id: string
  name: string
  category: TemplateCategory
  description: string
  icon: string
  tier: TemplateTier
  inputSchema: z.ZodObject<Record<string, z.ZodTypeAny>>
  systemPrompt: string
  platforms: SocialPlatformKey[]
}

const briefAndTone = {
  brief: z.string().min(10).max(2000).describe("What is this about?"),
  toneOverride: z.string().max(100).optional().describe("Override tone (optional)"),
}

export const TEMPLATES: PromptTemplate[] = [
  {
    id: "social:product-launch",
    name: "Product Launch Announcement",
    category: "social",
    description: "Announce a new product, feature, or update to your audience.",
    icon: "Rocket",
    tier: "standard",
    inputSchema: z.object({
      ...briefAndTone,
      productName: z.string().min(1).max(200).describe("Product or feature name"),
      keyBenefits: z.string().min(1).max(500).describe("Key benefits (comma-separated)"),
    }),
    systemPrompt: `You are a marketing copywriter. Write a compelling product launch announcement for social media.

{{brandContext}}

Product: {{productName}}
Key Benefits: {{keyBenefits}}
Brief: {{brief}}
{{toneOverride}}

Write an engaging social media post that creates excitement and drives interest. Include a clear call-to-action. Do NOT use hashtags — they will be added separately.`,
    platforms: ["INSTAGRAM", "FACEBOOK", "LINKEDIN", "TWITTER"],
  },
  {
    id: "social:testimonial-highlight",
    name: "Testimonial Highlight",
    category: "social",
    description: "Turn a customer testimonial into an engaging social post.",
    icon: "Quote",
    tier: "standard",
    inputSchema: z.object({
      ...briefAndTone,
      testimonial: z.string().min(10).max(1000).describe("Customer testimonial text"),
      customerName: z.string().max(100).optional().describe("Customer name (optional)"),
    }),
    systemPrompt: `You are a marketing copywriter. Transform this customer testimonial into an engaging social media post.

{{brandContext}}

Testimonial: "{{testimonial}}"
Customer: {{customerName}}
Brief: {{brief}}
{{toneOverride}}

Create a post that highlights the testimonial naturally — don't just paste it. Add context and a call-to-action. Do NOT use hashtags.`,
    platforms: ["INSTAGRAM", "FACEBOOK", "LINKEDIN", "TWITTER"],
  },
  {
    id: "social:educational-tip",
    name: "Tip / Educational Post",
    category: "social",
    description: "Share an educational tip or insight with your audience.",
    icon: "Lightbulb",
    tier: "standard",
    inputSchema: z.object({
      ...briefAndTone,
      topic: z.string().min(1).max(300).describe("Topic or tip to share"),
    }),
    systemPrompt: `You are a marketing copywriter. Write an educational social media post that provides genuine value.

{{brandContext}}

Topic: {{topic}}
Brief: {{brief}}
{{toneOverride}}

Write a post that teaches something useful. Use a hook to grab attention, then deliver the insight clearly. End with a question or call-to-action to drive engagement. Do NOT use hashtags.`,
    platforms: ["INSTAGRAM", "FACEBOOK", "LINKEDIN", "TWITTER", "THREADS"],
  },
  {
    id: "social:engagement-question",
    name: "Engagement Question",
    category: "social",
    description: "Spark conversation with your audience using a thought-provoking question.",
    icon: "MessageCircleQuestion",
    tier: "fast",
    inputSchema: z.object({
      ...briefAndTone,
      topic: z.string().min(1).max(300).describe("Topic to ask about"),
    }),
    systemPrompt: `You are a marketing copywriter. Write a social media post designed to spark engagement and conversation.

{{brandContext}}

Topic: {{topic}}
Brief: {{brief}}
{{toneOverride}}

Write a short, punchy post with a thought-provoking or relatable question. Keep it casual and inviting. End with a clear question that's easy to answer. Do NOT use hashtags.`,
    platforms: ["INSTAGRAM", "FACEBOOK", "TWITTER", "THREADS"],
  },
  {
    id: "thread:how-to",
    name: "How-To Thread",
    category: "thread",
    description: "Create a step-by-step tutorial thread or carousel.",
    icon: "ListOrdered",
    tier: "creative",
    inputSchema: z.object({
      ...briefAndTone,
      topic: z.string().min(1).max(300).describe("What to teach"),
      steps: z.string().min(1).max(500).optional().describe("Key steps to cover (optional)"),
    }),
    systemPrompt: `You are a marketing copywriter. Write a multi-post thread that teaches something step by step.

{{brandContext}}

Topic: {{topic}}
Key Steps: {{steps}}
Brief: {{brief}}
{{toneOverride}}

Structure as a thread with 5-8 posts. First post is the hook. Each subsequent post is one step. Final post is a recap + CTA. Separate each post with "---". Keep each post under 280 characters for Twitter compatibility. Do NOT use hashtags.`,
    platforms: ["TWITTER", "THREADS", "LINKEDIN"],
  },
  {
    id: "thread:listicle-carousel",
    name: "Listicle / Carousel",
    category: "thread",
    description: "Create a carousel or listicle of tips, ideas, or examples.",
    icon: "LayoutList",
    tier: "standard",
    inputSchema: z.object({
      ...briefAndTone,
      topic: z.string().min(1).max(300).describe("Listicle topic"),
      itemCount: z.coerce.number().min(3).max(15).default(7).describe("Number of items"),
    }),
    systemPrompt: `You are a marketing copywriter. Create a listicle-style carousel.

{{brandContext}}

Topic: {{topic}}
Number of items: {{itemCount}}
Brief: {{brief}}
{{toneOverride}}

Create a carousel with slides separated by "---". Slide 1 is the title/hook. Each subsequent slide is one item with a short explanation. Final slide is a CTA. Keep each slide concise (under 100 words). Do NOT use hashtags.`,
    platforms: ["INSTAGRAM", "LINKEDIN", "TIKTOK"],
  },
  {
    id: "blog:outline",
    name: "Blog Outline Generator",
    category: "blog",
    description: "Generate a structured blog post outline with sections and talking points.",
    icon: "FileText",
    tier: "standard",
    inputSchema: z.object({
      ...briefAndTone,
      title: z.string().min(1).max(300).describe("Blog post title or topic"),
      audience: z.string().max(200).optional().describe("Target audience (optional)"),
    }),
    systemPrompt: `You are a content strategist. Create a detailed blog post outline.

{{brandContext}}

Title/Topic: {{title}}
Target Audience: {{audience}}
Brief: {{brief}}
{{toneOverride}}

Create a structured outline with:
- Suggested title (H1)
- Introduction hook
- 4-6 main sections (H2) with 2-3 talking points each
- Conclusion with CTA
- Suggested meta description (under 160 chars)

Use markdown formatting.`,
    platforms: [],
  },
  {
    id: "blog:full-draft",
    name: "Full Blog Draft",
    category: "blog",
    description: "Generate a complete blog post draft from a topic or outline.",
    icon: "BookOpen",
    tier: "creative",
    inputSchema: z.object({
      ...briefAndTone,
      title: z.string().min(1).max(300).describe("Blog post title"),
      outline: z.string().max(2000).optional().describe("Outline to follow (optional)"),
      wordCount: z.coerce.number().min(300).max(3000).default(800).describe("Target word count"),
    }),
    systemPrompt: `You are a content writer. Write a complete blog post draft.

{{brandContext}}

Title: {{title}}
Outline: {{outline}}
Target word count: {{wordCount}}
Brief: {{brief}}
{{toneOverride}}

Write a well-structured blog post with:
- Engaging introduction with a hook
- Clear sections with H2 headings
- Practical examples or insights
- Strong conclusion with CTA
- Suggested meta description

Use markdown formatting. Aim for {{wordCount}} words.`,
    platforms: [],
  },
  {
    id: "email:welcome-sequence",
    name: "Welcome Sequence",
    category: "email",
    description: "Create a welcome email for new subscribers or customers.",
    icon: "MailPlus",
    tier: "creative",
    inputSchema: z.object({
      ...briefAndTone,
      businessName: z.string().min(1).max(200).describe("Your business name"),
      offer: z.string().max(500).optional().describe("Special offer for new subscribers (optional)"),
    }),
    systemPrompt: `You are an email marketing copywriter. Write a welcome email for new subscribers.

{{brandContext}}

Business: {{businessName}}
Special Offer: {{offer}}
Brief: {{brief}}
{{toneOverride}}

Write a warm, engaging welcome email with:
- Subject line
- Preview text (under 90 chars)
- Greeting
- Body (introduce the brand, set expectations, deliver value)
- CTA button text
- P.S. line

Use markdown formatting. Mark the subject line with "Subject:" and preview with "Preview:".`,
    platforms: [],
  },
  {
    id: "email:product-update",
    name: "Product Update",
    category: "email",
    description: "Announce a product update or new feature via email.",
    icon: "Mail",
    tier: "standard",
    inputSchema: z.object({
      ...briefAndTone,
      updateTitle: z.string().min(1).max(300).describe("Update title"),
      changes: z.string().min(1).max(1000).describe("Key changes or features"),
    }),
    systemPrompt: `You are an email marketing copywriter. Write a product update email.

{{brandContext}}

Update: {{updateTitle}}
Changes: {{changes}}
Brief: {{brief}}
{{toneOverride}}

Write a clear, exciting product update email with:
- Subject line
- Preview text (under 90 chars)
- Headline
- Body (explain what changed and why it matters)
- Feature highlights (bullet points)
- CTA button text

Use markdown formatting. Mark the subject line with "Subject:" and preview with "Preview:".`,
    platforms: [],
  },
]

export function getTemplateById(id: string): PromptTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id)
}

export function getTemplatesByCategory(category: TemplateCategory): PromptTemplate[] {
  return TEMPLATES.filter((t) => t.category === category)
}
```

**Step 3: Update shared constants barrel**

Modify `packages/shared/constants/index.ts`:

```typescript
export { PLANS, type PlanKey } from "./plans"
export { SOCIAL_PLATFORMS, type SocialPlatformKey } from "./platforms"
export {
  TEMPLATES,
  getTemplateById,
  getTemplatesByCategory,
  type PromptTemplate,
  type TemplateCategory,
  type TemplateTier,
} from "./templates"
```

**Step 4: Verify it compiles**

Run:

```bash
cd /c/Users/Nathaniel/Documents/Grimoire && pnpm exec tsc --noEmit -p packages/shared/tsconfig.json 2>&1 | head -20
```

Expected: No errors. (If `packages/shared` has no tsconfig, run from root: `pnpm exec tsc --noEmit`)

**Step 5: Commit**

```bash
git add packages/shared/
git commit -m "feat: add 10 prompt templates and platform definitions"
```

---

## Task 4: Database Migration — Rate Limiting Fields

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

**Step 1: Add rate limiting fields to Organization**

Add these two fields to the `Organization` model in `packages/db/prisma/schema.prisma`, after the `updatedAt` field (line 65):

```prisma
  aiGenerationsUsed    Int       @default(0)
  aiGenerationsResetAt DateTime  @default(now())
```

**Step 2: Push schema changes**

Run:

```bash
cd /c/Users/Nathaniel/Documents/Grimoire/packages/db && pnpm db:push
```

Expected: "Your database is now in sync with your Prisma schema."

**Step 3: Regenerate Prisma client**

Run:

```bash
cd /c/Users/Nathaniel/Documents/Grimoire/packages/db && pnpm db:generate
```

Expected: "✔ Generated Prisma Client"

**Step 4: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "feat: add aiGenerationsUsed and aiGenerationsResetAt to Organization"
```

---

## Task 5: Rate Limiting Middleware

**Files:**
- Create: `packages/api/middleware/rateLimit.ts`
- Modify: `packages/api/trpc.ts`

**Step 1: Create rate limit middleware**

Create `packages/api/middleware/rateLimit.ts`:

```typescript
import { TRPCError } from "@trpc/server"
import { PLANS } from "@grimoire/shared"
import type { PrismaClient } from "@prisma/client"

interface RateLimitContext {
  prisma: PrismaClient
  session: {
    user: {
      id: string
    }
  }
}

export async function checkAiRateLimit(ctx: RateLimitContext) {
  const membership = await ctx.prisma.organizationMember.findFirst({
    where: { userId: ctx.session.user.id },
    include: { organization: true },
  })

  if (!membership) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "No organization found",
    })
  }

  const org = membership.organization
  const planConfig = PLANS[org.plan]
  const limit = planConfig.aiGenerationsPerMonth

  // -1 means unlimited
  if (limit === -1) {
    return { organization: org, remaining: Infinity }
  }

  // Reset counter if past reset date
  const now = new Date()
  if (now > org.aiGenerationsResetAt) {
    const nextReset = new Date(now)
    nextReset.setMonth(nextReset.getMonth() + 1)

    const updated = await ctx.prisma.organization.update({
      where: { id: org.id },
      data: {
        aiGenerationsUsed: 0,
        aiGenerationsResetAt: nextReset,
      },
    })

    return { organization: updated, remaining: limit }
  }

  if (org.aiGenerationsUsed >= limit) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `You've reached your monthly limit of ${limit} AI generations. Upgrade to Pro for unlimited.`,
    })
  }

  return { organization: org, remaining: limit - org.aiGenerationsUsed }
}

export async function incrementAiUsage(
  prisma: PrismaClient,
  organizationId: string
) {
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      aiGenerationsUsed: { increment: 1 },
    },
  })
}
```

**Step 2: Add `orgProtectedProcedure` to `packages/api/trpc.ts`**

Add after the existing `protectedProcedure` (line 58):

```typescript
export const orgProtectedProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const membership = await ctx.prisma.organizationMember.findFirst({
    where: { userId: ctx.session.user.id },
    include: { organization: true },
  })

  if (!membership) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "No organization found. Please set up your workspace first.",
    })
  }

  return next({
    ctx: {
      ...ctx,
      organization: membership.organization,
      membership,
    },
  })
})
```

**Step 3: Export new procedure from `packages/api/index.ts`**

Add `orgProtectedProcedure` to the exports:

```typescript
export {
  createTRPCContext,
  createCallerFactory,
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  orgProtectedProcedure,
} from "./trpc"
```

**Step 4: Verify it compiles**

Run:

```bash
cd /c/Users/Nathaniel/Documents/Grimoire && pnpm exec tsc --noEmit -p packages/api/tsconfig.json 2>&1 | head -20
```

Expected: No errors. (If packages/api has no tsconfig, verify from root.)

**Step 5: Commit**

```bash
git add packages/api/
git commit -m "feat: add rate limiting middleware and org-scoped procedure"
```

---

## Task 6: Pinecone Vector Store + RAG Pipeline

**Files:**
- Create: `packages/ai/rag/vectorStore.ts`
- Create: `packages/ai/rag/ingest.ts`
- Create: `packages/ai/rag/retrieve.ts`
- Modify: `packages/ai/index.ts`

**Step 1: Create Pinecone client abstraction**

Create `packages/ai/rag/vectorStore.ts`:

```typescript
import { Pinecone } from "@pinecone-database/pinecone"

let pineconeClient: Pinecone | null = null

export function getPinecone(): Pinecone {
  if (!pineconeClient) {
    const apiKey = process.env.PINECONE_API_KEY
    if (!apiKey) {
      throw new Error("PINECONE_API_KEY is not configured")
    }
    pineconeClient = new Pinecone({ apiKey })
  }
  return pineconeClient
}

export function getIndex() {
  const indexName = process.env.PINECONE_INDEX ?? "grimoire"
  return getPinecone().index(indexName)
}

export function getNamespace(orgId: string, profileId: string): string {
  return `org:${orgId}:brand:${profileId}`
}
```

**Step 2: Create ingestion pipeline**

Create `packages/ai/rag/ingest.ts`:

```typescript
import { getIndex, getNamespace } from "./vectorStore"
import { getOpenRouterClient } from "../client"
import { embed } from "ai"

const CHUNK_SIZE = 500
const CHUNK_OVERLAP = 50

export function chunkText(text: string): string[] {
  const words = text.split(/\s+/)
  const chunks: string[] = []

  for (let i = 0; i < words.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
    const chunk = words.slice(i, i + CHUNK_SIZE).join(" ")
    if (chunk.trim().length > 0) {
      chunks.push(chunk.trim())
    }
  }

  return chunks
}

export async function ingestBrandExamples(params: {
  orgId: string
  profileId: string
  examples: string[]
  source?: string
}) {
  const { orgId, profileId, examples, source = "manual" } = params
  const namespace = getNamespace(orgId, profileId)
  const index = getIndex()
  const ns = index.namespace(namespace)

  // Delete existing vectors in this namespace first
  try {
    await ns.deleteAll()
  } catch {
    // Namespace may not exist yet — that's fine
  }

  // Chunk all examples
  const allChunks: string[] = []
  for (const example of examples) {
    const chunks = chunkText(example)
    allChunks.push(...chunks)
  }

  if (allChunks.length === 0) return { chunksUpserted: 0 }

  // Generate embeddings
  const client = getOpenRouterClient()
  const embeddingModel = client.textEmbeddingModel("openai/text-embedding-3-small")

  const vectors: Array<{
    id: string
    values: number[]
    metadata: Record<string, string>
  }> = []

  // Process in batches of 10
  for (let i = 0; i < allChunks.length; i += 10) {
    const batch = allChunks.slice(i, i + 10)
    const results = await Promise.all(
      batch.map((chunk) =>
        embed({ model: embeddingModel, value: chunk })
      )
    )

    for (let j = 0; j < batch.length; j++) {
      vectors.push({
        id: `${profileId}-${i + j}`,
        values: Array.from(results[j].embedding),
        metadata: {
          text: batch[j],
          source,
          contentType: "brand-example",
          createdAt: new Date().toISOString(),
        },
      })
    }
  }

  // Upsert in batches of 100 (Pinecone limit)
  for (let i = 0; i < vectors.length; i += 100) {
    await ns.upsert(vectors.slice(i, i + 100))
  }

  return { chunksUpserted: vectors.length }
}
```

**Step 3: Create retrieval pipeline**

Create `packages/ai/rag/retrieve.ts`:

```typescript
import { getIndex, getNamespace } from "./vectorStore"
import { getOpenRouterClient } from "../client"
import { embed } from "ai"

export interface BrandContext {
  toneKeywords: string[]
  avoidKeywords: string[]
  retrievedChunks: string[]
}

export function formatBrandContext(context: BrandContext): string {
  const parts: string[] = ["Brand Voice Context:"]

  if (context.toneKeywords.length > 0) {
    parts.push(`- Tone: ${context.toneKeywords.join(", ")}`)
  }

  if (context.avoidKeywords.length > 0) {
    parts.push(`- Avoid: ${context.avoidKeywords.join(", ")}`)
  }

  if (context.retrievedChunks.length > 0) {
    parts.push("- Style Examples:")
    for (const chunk of context.retrievedChunks) {
      parts.push(`  "${chunk.slice(0, 300)}"`)
    }
  }

  return parts.join("\n")
}

export async function retrieveBrandContext(params: {
  orgId: string
  profileId: string
  query: string
  toneKeywords: string[]
  avoidKeywords: string[]
  topK?: number
}): Promise<BrandContext> {
  const {
    orgId,
    profileId,
    query,
    toneKeywords,
    avoidKeywords,
    topK = 5,
  } = params

  const baseContext: BrandContext = {
    toneKeywords,
    avoidKeywords,
    retrievedChunks: [],
  }

  try {
    const client = getOpenRouterClient()
    const embeddingModel = client.textEmbeddingModel("openai/text-embedding-3-small")
    const { embedding } = await embed({ model: embeddingModel, value: query })

    const namespace = getNamespace(orgId, profileId)
    const index = getIndex()
    const ns = index.namespace(namespace)

    const results = await ns.query({
      vector: Array.from(embedding),
      topK,
      includeMetadata: true,
    })

    const chunks = results.matches
      .filter((m) => (m.score ?? 0) > 0.5)
      .map((m) => (m.metadata?.text as string) ?? "")
      .filter(Boolean)

    return { ...baseContext, retrievedChunks: chunks }
  } catch (error) {
    // Fallback: return tone/avoid only (no RAG)
    console.error("RAG retrieval failed, using fallback:", error)
    return baseContext
  }
}
```

**Step 4: Update barrel exports**

Update `packages/ai/index.ts`:

```typescript
export { getOpenRouterClient } from "./client"
export { getModel, getFallbackModels, getModelId } from "./router"
export type { ModelTier, RouterOptions } from "./router"

export { getPinecone, getIndex, getNamespace } from "./rag/vectorStore"
export { chunkText, ingestBrandExamples } from "./rag/ingest"
export { retrieveBrandContext, formatBrandContext } from "./rag/retrieve"
export type { BrandContext } from "./rag/retrieve"
```

**Step 5: Verify it compiles**

Run:

```bash
cd /c/Users/Nathaniel/Documents/Grimoire && pnpm exec tsc --noEmit -p packages/ai/tsconfig.json 2>&1 | head -20
```

Expected: No errors.

**Step 6: Commit**

```bash
git add packages/ai/
git commit -m "feat: add Pinecone RAG pipeline (ingest + retrieve + vector store)"
```

---

## Task 7: Moderation + Brand Guardrails

**Files:**
- Create: `packages/ai/safety/moderation.ts`
- Create: `packages/ai/safety/guardrails.ts`
- Modify: `packages/ai/index.ts`

**Step 1: Create OpenAI Moderation wrapper**

Create `packages/ai/safety/moderation.ts`:

```typescript
import OpenAI from "openai"

let openaiClient: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured")
    }
    openaiClient = new OpenAI({ apiKey })
  }
  return openaiClient
}

export interface ModerationResult {
  flagged: boolean
  categories: string[]
  message?: string
}

export async function moderateContent(text: string): Promise<ModerationResult> {
  try {
    const openai = getOpenAI()
    const response = await openai.moderations.create({ input: text })
    const result = response.results[0]

    if (!result.flagged) {
      return { flagged: false, categories: [] }
    }

    const flaggedCategories = Object.entries(result.categories)
      .filter(([, flagged]) => flagged)
      .map(([category]) => category)

    return {
      flagged: true,
      categories: flaggedCategories,
      message: `Content flagged for: ${flaggedCategories.join(", ")}. Please regenerate or edit.`,
    }
  } catch (error) {
    // If moderation API is unavailable, log and allow (fail open)
    console.error("Moderation API error:", error)
    return { flagged: false, categories: [] }
  }
}
```

**Step 2: Create brand guardrails**

Create `packages/ai/safety/guardrails.ts`:

```typescript
export interface GuardrailResult {
  passed: boolean
  violations: string[]
}

export function checkBrandGuardrails(
  content: string,
  avoidKeywords: string[]
): GuardrailResult {
  if (avoidKeywords.length === 0) {
    return { passed: true, violations: [] }
  }

  const lowerContent = content.toLowerCase()
  const violations = avoidKeywords.filter((keyword) =>
    lowerContent.includes(keyword.toLowerCase())
  )

  return {
    passed: violations.length === 0,
    violations,
  }
}
```

**Step 3: Update barrel exports**

Add to `packages/ai/index.ts`:

```typescript
export { moderateContent } from "./safety/moderation"
export type { ModerationResult } from "./safety/moderation"
export { checkBrandGuardrails } from "./safety/guardrails"
export type { GuardrailResult } from "./safety/guardrails"
```

**Step 4: Verify it compiles**

Run:

```bash
cd /c/Users/Nathaniel/Documents/Grimoire && pnpm exec tsc --noEmit -p packages/ai/tsconfig.json 2>&1 | head -20
```

**Step 5: Commit**

```bash
git add packages/ai/
git commit -m "feat: add content moderation (OpenAI) and brand guardrails"
```

---

## Task 8: Brand tRPC Router

**Files:**
- Create: `packages/api/routers/brand.ts`
- Modify: `packages/api/root.ts`
- Modify: `packages/api/index.ts` (if needed)

**Step 1: Create brand router**

Create `packages/api/routers/brand.ts`:

```typescript
import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, orgProtectedProcedure } from "../trpc"
import {
  ingestBrandExamples,
  retrieveBrandContext,
  formatBrandContext,
  getModel,
} from "@grimoire/ai"
import { streamText } from "ai"
import { PLANS } from "@grimoire/shared"

export const brandRouter = createTRPCRouter({
  create: orgProtectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        toneKeywords: z.array(z.string()).min(1).max(10),
        avoidKeywords: z.array(z.string()).max(50).default([]),
        exampleContent: z.array(z.string()).max(20).default([]),
        isDefault: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // If setting as default, unset other defaults
      if (input.isDefault) {
        await ctx.prisma.brandProfile.updateMany({
          where: { organizationId: ctx.organization.id, isDefault: true },
          data: { isDefault: false },
        })
      }

      const profile = await ctx.prisma.brandProfile.create({
        data: {
          name: input.name,
          description: input.description,
          toneKeywords: input.toneKeywords,
          avoidKeywords: input.avoidKeywords,
          exampleContent: input.exampleContent,
          isDefault: input.isDefault,
          organizationId: ctx.organization.id,
          vectorNamespace: `org:${ctx.organization.id}:brand:`,
        },
      })

      // Update vectorNamespace with actual ID
      const updated = await ctx.prisma.brandProfile.update({
        where: { id: profile.id },
        data: {
          vectorNamespace: `org:${ctx.organization.id}:brand:${profile.id}`,
        },
      })

      // Ingest examples if plan supports RAG and examples exist
      const planConfig = PLANS[ctx.organization.plan]
      if (planConfig.brandVoiceRag && input.exampleContent.length > 0) {
        try {
          await ingestBrandExamples({
            orgId: ctx.organization.id,
            profileId: profile.id,
            examples: input.exampleContent,
          })
        } catch (error) {
          console.error("Failed to ingest brand examples:", error)
          // Non-fatal — profile still created
        }
      }

      return updated
    }),

  update: orgProtectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        toneKeywords: z.array(z.string()).min(1).max(10).optional(),
        avoidKeywords: z.array(z.string()).max(50).optional(),
        exampleContent: z.array(z.string()).max(20).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.brandProfile.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
      })

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Brand profile not found" })
      }

      const { id, ...updateData } = input
      const updated = await ctx.prisma.brandProfile.update({
        where: { id },
        data: updateData,
      })

      // Re-ingest if examples changed and plan supports RAG
      if (input.exampleContent) {
        const planConfig = PLANS[ctx.organization.plan]
        if (planConfig.brandVoiceRag && input.exampleContent.length > 0) {
          try {
            await ingestBrandExamples({
              orgId: ctx.organization.id,
              profileId: id,
              examples: input.exampleContent,
            })
          } catch (error) {
            console.error("Failed to re-ingest brand examples:", error)
          }
        }
      }

      return updated
    }),

  list: orgProtectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.brandProfile.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    })
  }),

  getById: orgProtectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const profile = await ctx.prisma.brandProfile.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
      })

      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Brand profile not found" })
      }

      return profile
    }),

  setDefault: orgProtectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify profile belongs to org
      const profile = await ctx.prisma.brandProfile.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
      })

      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Brand profile not found" })
      }

      // Unset all defaults for this org
      await ctx.prisma.brandProfile.updateMany({
        where: { organizationId: ctx.organization.id, isDefault: true },
        data: { isDefault: false },
      })

      // Set this one as default
      return ctx.prisma.brandProfile.update({
        where: { id: input.id },
        data: { isDefault: true },
      })
    }),

  delete: orgProtectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.prisma.brandProfile.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
      })

      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Brand profile not found" })
      }

      return ctx.prisma.brandProfile.delete({
        where: { id: input.id },
      })
    }),

  testVoice: orgProtectedProcedure
    .input(
      z.object({
        profileId: z.string(),
        sampleTopic: z.string().min(1).max(300).default("our latest product update"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.prisma.brandProfile.findFirst({
        where: { id: input.profileId, organizationId: ctx.organization.id },
      })

      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Brand profile not found" })
      }

      // Retrieve brand context
      const planConfig = PLANS[ctx.organization.plan]
      let brandContextStr = ""

      if (planConfig.brandVoiceRag) {
        const brandContext = await retrieveBrandContext({
          orgId: ctx.organization.id,
          profileId: profile.id,
          query: input.sampleTopic,
          toneKeywords: profile.toneKeywords,
          avoidKeywords: profile.avoidKeywords,
        })
        brandContextStr = formatBrandContext(brandContext)
      } else {
        brandContextStr = `Brand Voice Context:\n- Tone: ${profile.toneKeywords.join(", ")}\n- Avoid: ${profile.avoidKeywords.join(", ")}`
      }

      const model = getModel({ tier: "fast" })
      const result = await streamText({
        model,
        system: `You are a marketing copywriter. Write a short sample social media post to demonstrate brand voice.\n\n${brandContextStr}`,
        prompt: `Write a short social media post about: ${input.sampleTopic}`,
      })

      // Consume stream and return text
      let text = ""
      for await (const chunk of result.textStream) {
        text += chunk
      }

      return { text, model: "openai/gpt-4o-mini" }
    }),

  ingestExamples: orgProtectedProcedure
    .input(z.object({ profileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const planConfig = PLANS[ctx.organization.plan]
      if (!planConfig.brandVoiceRag) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Brand Voice RAG requires Pro or Team plan.",
        })
      }

      const profile = await ctx.prisma.brandProfile.findFirst({
        where: { id: input.profileId, organizationId: ctx.organization.id },
      })

      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Brand profile not found" })
      }

      if (profile.exampleContent.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No examples to ingest. Add examples first.",
        })
      }

      const result = await ingestBrandExamples({
        orgId: ctx.organization.id,
        profileId: profile.id,
        examples: profile.exampleContent,
      })

      return result
    }),
})
```

**Step 2: Register brand router in `packages/api/root.ts`**

```typescript
import { createTRPCRouter } from "./trpc"
import { userRouter } from "./routers/user"
import { billingRouter } from "./routers/billing"
import { brandRouter } from "./routers/brand"

export const appRouter = createTRPCRouter({
  user: userRouter,
  billing: billingRouter,
  brand: brandRouter,
})

export type AppRouter = typeof appRouter
```

**Step 3: Add `@grimoire/ai` dependency to `packages/api/package.json`**

Add to dependencies:

```json
"@grimoire/ai": "workspace:*"
```

**Step 4: Run pnpm install and verify**

```bash
cd /c/Users/Nathaniel/Documents/Grimoire && pnpm install
```

**Step 5: Commit**

```bash
git add packages/api/ pnpm-lock.yaml
git commit -m "feat: add brand tRPC router with CRUD, voice test, and RAG ingest"
```

---

## Task 9: Content tRPC Router + Streaming API Route

**Files:**
- Create: `packages/api/routers/content.ts`
- Create: `apps/web/app/api/ai/generate/route.ts`
- Modify: `packages/api/root.ts`

**Step 1: Create content router**

Create `packages/api/routers/content.ts`:

```typescript
import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, orgProtectedProcedure } from "../trpc"
import {
  getModelId,
  retrieveBrandContext,
  formatBrandContext,
  moderateContent,
  checkBrandGuardrails,
} from "@grimoire/ai"
import { checkAiRateLimit, incrementAiUsage } from "../middleware/rateLimit"
import { PLANS, getTemplateById, SOCIAL_PLATFORMS } from "@grimoire/shared"
import type { SocialPlatformKey } from "@grimoire/shared"

export const contentRouter = createTRPCRouter({
  list: orgProtectedProcedure
    .input(
      z.object({
        status: z.enum(["DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED", "FAILED", "ARCHIVED"]).optional(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.prisma.contentItem.findMany({
        where: {
          organizationId: ctx.organization.id,
          ...(input.status ? { status: input.status } : {}),
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: { brandProfile: { select: { id: true, name: true } } },
      })

      let nextCursor: string | undefined
      if (items.length > input.limit) {
        const nextItem = items.pop()
        nextCursor = nextItem?.id
      }

      return { items, nextCursor }
    }),

  getById: orgProtectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const item = await ctx.prisma.contentItem.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
        include: { brandProfile: true },
      })

      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Content item not found" })
      }

      return item
    }),

  generate: orgProtectedProcedure
    .input(
      z.object({
        templateId: z.string(),
        inputs: z.record(z.string()),
        brandProfileId: z.string().optional(),
        preferQuality: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Rate limit check
      await checkAiRateLimit(ctx)

      // Validate template
      const template = getTemplateById(input.templateId)
      if (!template) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid template ID" })
      }

      // Validate inputs against template schema
      const parsed = template.inputSchema.safeParse(input.inputs)
      if (!parsed.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid inputs: ${parsed.error.message}`,
        })
      }

      // Get brand context
      let brandContextStr = ""
      let brandProfileId = input.brandProfileId

      if (brandProfileId) {
        const profile = await ctx.prisma.brandProfile.findFirst({
          where: { id: brandProfileId, organizationId: ctx.organization.id },
        })

        if (profile) {
          const planConfig = PLANS[ctx.organization.plan]
          if (planConfig.brandVoiceRag) {
            const brandContext = await retrieveBrandContext({
              orgId: ctx.organization.id,
              profileId: profile.id,
              query: parsed.data.brief ?? parsed.data.topic ?? "",
              toneKeywords: profile.toneKeywords,
              avoidKeywords: profile.avoidKeywords,
            })
            brandContextStr = formatBrandContext(brandContext)
          } else {
            brandContextStr = `Brand Voice Context:\n- Tone: ${profile.toneKeywords.join(", ")}\n- Avoid: ${profile.avoidKeywords.join(", ")}`
          }
        }
      } else {
        // Try default profile
        const defaultProfile = await ctx.prisma.brandProfile.findFirst({
          where: { organizationId: ctx.organization.id, isDefault: true },
        })
        if (defaultProfile) {
          brandProfileId = defaultProfile.id
          brandContextStr = `Brand Voice Context:\n- Tone: ${defaultProfile.toneKeywords.join(", ")}\n- Avoid: ${defaultProfile.avoidKeywords.join(", ")}`
        }
      }

      // Build system prompt
      let systemPrompt = template.systemPrompt
        .replace("{{brandContext}}", brandContextStr)

      // Replace all template placeholders
      for (const [key, value] of Object.entries(parsed.data)) {
        systemPrompt = systemPrompt.replace(
          new RegExp(`\\{\\{${key}\\}\\}`, "g"),
          String(value ?? "")
        )
      }

      // Clean up any remaining unreplaced placeholders
      systemPrompt = systemPrompt.replace(/\{\{[^}]+\}\}/g, "")

      const modelId = getModelId(template.tier, input.preferQuality)

      // Create a DRAFT content item to store the result
      const contentItem = await ctx.prisma.contentItem.create({
        data: {
          type: template.category === "blog" ? "BLOG_DRAFT"
            : template.category === "email" ? "EMAIL_COPY"
            : template.category === "thread" ? "THREAD"
            : "SOCIAL_POST",
          status: "DRAFT",
          body: "",
          aiModel: modelId,
          aiPromptTemplate: template.id,
          organizationId: ctx.organization.id,
          brandProfileId: brandProfileId ?? null,
          createdById: ctx.session.user.id,
        },
      })

      // Increment usage
      await incrementAiUsage(ctx.prisma, ctx.organization.id)

      return {
        contentItemId: contentItem.id,
        systemPrompt,
        modelId,
        templateId: template.id,
      }
    }),

  update: orgProtectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().max(300).optional(),
        body: z.string().optional(),
        bodyHtml: z.string().optional(),
        hashtags: z.array(z.string()).optional(),
        mediaUrls: z.array(z.string().url()).optional(),
        platformVariants: z.record(z.string()).optional(),
        status: z.enum(["DRAFT", "IN_REVIEW", "APPROVED", "ARCHIVED"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.contentItem.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
      })

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Content item not found" })
      }

      const { id, ...updateData } = input
      return ctx.prisma.contentItem.update({
        where: { id },
        data: updateData,
      })
    }),

  delete: orgProtectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.contentItem.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
      })

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Content item not found" })
      }

      return ctx.prisma.contentItem.delete({ where: { id: input.id } })
    }),

  adaptPlatforms: orgProtectedProcedure
    .input(
      z.object({
        contentItemId: z.string(),
        platforms: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await checkAiRateLimit(ctx)

      const item = await ctx.prisma.contentItem.findFirst({
        where: { id: input.contentItemId, organizationId: ctx.organization.id },
      })

      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Content item not found" })
      }

      await incrementAiUsage(ctx.prisma, ctx.organization.id)

      return {
        contentItemId: item.id,
        body: item.body,
        platforms: input.platforms,
      }
    }),

  moderate: orgProtectedProcedure
    .input(z.object({ contentItemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.contentItem.findFirst({
        where: { id: input.contentItemId, organizationId: ctx.organization.id },
        include: { brandProfile: true },
      })

      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Content item not found" })
      }

      const moderationResult = await moderateContent(item.body)

      let guardrailResult = { passed: true, violations: [] as string[] }
      if (item.brandProfile) {
        guardrailResult = checkBrandGuardrails(
          item.body,
          item.brandProfile.avoidKeywords
        )
      }

      return {
        moderation: moderationResult,
        guardrails: guardrailResult,
        safe: !moderationResult.flagged && guardrailResult.passed,
      }
    }),

  getUsage: orgProtectedProcedure.query(async ({ ctx }) => {
    const planConfig = PLANS[ctx.organization.plan]
    const limit = planConfig.aiGenerationsPerMonth
    return {
      used: ctx.organization.aiGenerationsUsed,
      limit: limit === -1 ? null : limit,
      unlimited: limit === -1,
      resetAt: ctx.organization.aiGenerationsResetAt,
    }
  }),
})
```

**Step 2: Register content router in `packages/api/root.ts`**

```typescript
import { createTRPCRouter } from "./trpc"
import { userRouter } from "./routers/user"
import { billingRouter } from "./routers/billing"
import { brandRouter } from "./routers/brand"
import { contentRouter } from "./routers/content"

export const appRouter = createTRPCRouter({
  user: userRouter,
  billing: billingRouter,
  brand: brandRouter,
  content: contentRouter,
})

export type AppRouter = typeof appRouter
```

**Step 3: Create streaming API route**

Create `apps/web/app/api/ai/generate/route.ts`:

```typescript
import { streamText } from "ai"
import { auth } from "@/lib/auth"
import { getModel } from "@grimoire/ai"
import type { ModelTier } from "@grimoire/ai"

export const maxDuration = 60

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = await req.json()
  const { systemPrompt, modelId, tier } = body as {
    systemPrompt: string
    modelId: string
    tier: ModelTier
  }

  if (!systemPrompt || !tier) {
    return new Response("Missing systemPrompt or tier", { status: 400 })
  }

  const model = getModel({ tier })

  const result = streamText({
    model,
    system: systemPrompt,
    prompt: "Generate the content now.",
  })

  return result.toDataStreamResponse()
}
```

Create `apps/web/app/api/ai/adapt/route.ts`:

```typescript
import { streamText } from "ai"
import { auth } from "@/lib/auth"
import { getModel } from "@grimoire/ai"
import { SOCIAL_PLATFORMS } from "@grimoire/shared"
import type { SocialPlatformKey } from "@grimoire/shared"

export const maxDuration = 60

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = await req.json()
  const { content, platform } = body as {
    content: string
    platform: SocialPlatformKey
  }

  if (!content || !platform) {
    return new Response("Missing content or platform", { status: 400 })
  }

  const platformConfig = SOCIAL_PLATFORMS[platform]
  if (!platformConfig) {
    return new Response("Invalid platform", { status: 400 })
  }

  const model = getModel({ tier: "fast" })

  const result = streamText({
    model,
    system: `You are a social media expert. Adapt the following content for ${platformConfig.name}.
Rules:
- Character limit: ${platformConfig.charLimit} characters
- Match the platform's tone and conventions
- Keep the core message intact
- Add appropriate formatting for the platform
- Do NOT add hashtags (they will be added separately)`,
    prompt: `Adapt this content for ${platformConfig.name}:\n\n${content}`,
  })

  return result.toDataStreamResponse()
}
```

**Step 4: Commit**

```bash
git add packages/api/ apps/web/app/api/ai/
git commit -m "feat: add content tRPC router and streaming AI API routes"
```

---

## Task 10: Enable Create + Brand Sidebar Nav Items

**Files:**
- Modify: `apps/web/components/shared/sidebar.tsx`

**Step 1: Enable Create and Brand nav items**

In `apps/web/components/shared/sidebar.tsx`, update the `navItems` array (lines 31-39). Change `disabled: true` to `disabled: false` and `phase: 2` to `phase: null` for "Create" and "Brand":

```typescript
const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, disabled: false, phase: null },
  { title: "Create", href: "/dashboard/create", icon: PenSquare, disabled: false, phase: null },
  { title: "Calendar", href: "/dashboard/calendar", icon: Calendar, disabled: true, phase: 3 },
  { title: "Queue", href: "/dashboard/queue", icon: ListChecks, disabled: true, phase: 3 },
  { title: "Analytics", href: "/dashboard/analytics", icon: BarChart3, disabled: true, phase: 4 },
  { title: "Brand", href: "/dashboard/brand", icon: Palette, disabled: false, phase: null },
  { title: "Accounts", href: "/dashboard/accounts", icon: Users, disabled: false, phase: null },
  { title: "Settings", href: "/dashboard/settings", icon: Settings, disabled: false, phase: null },
] as const
```

**Step 2: Verify the app builds**

```bash
cd /c/Users/Nathaniel/Documents/Grimoire && pnpm --filter @grimoire/web build 2>&1 | tail -10
```

Expected: Build completes. "Create" and "Brand" nav items should now be clickable (they'll 404 until the pages are built in Tasks 11-12).

**Step 3: Commit**

```bash
git add apps/web/components/shared/sidebar.tsx
git commit -m "feat: enable Create and Brand sidebar nav items"
```

---

## Task 11: Brand Voice Page — `/dashboard/brand`

**Files:**
- Create: `apps/web/app/(dashboard)/brand/page.tsx`
- Create: `apps/web/components/dashboard/brand/brand-page-client.tsx`
- Create: `apps/web/components/dashboard/brand/brand-profile-card.tsx`
- Create: `apps/web/components/dashboard/brand/brand-wizard.tsx`

**Step 1: Create server page**

Create `apps/web/app/(dashboard)/brand/page.tsx`:

```tsx
import { BrandPageClient } from "@/components/dashboard/brand/brand-page-client"

export default function BrandPage() {
  return <BrandPageClient />
}
```

**Step 2: Create brand page client component**

Create `apps/web/components/dashboard/brand/brand-page-client.tsx`:

```tsx
"use client"

import { useState } from "react"
import { Palette, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { trpc } from "@/lib/trpc/client"
import { BrandProfileCard } from "./brand-profile-card"
import { BrandWizard } from "./brand-wizard"

export function BrandPageClient() {
  const [showWizard, setShowWizard] = useState(false)
  const { data: profiles, isLoading, refetch } = trpc.brand.list.useQuery()

  if (showWizard) {
    return (
      <BrandWizard
        onComplete={() => {
          setShowWizard(false)
          refetch()
        }}
        onCancel={() => setShowWizard(false)}
      />
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Brand Voice</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Define how your brand sounds across all content
          </p>
        </div>
        <Button
          onClick={() => setShowWizard(true)}
          className="gap-2 grimoire-gradient text-white shadow-glow-sm hover:shadow-glow-md"
        >
          <Plus className="h-4 w-4" />
          New Profile
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-xl border border-border/50 bg-muted/20"
            />
          ))}
        </div>
      ) : !profiles || profiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/60 py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Palette className="h-7 w-7 text-primary" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold">No brand profiles yet</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Create your first brand voice profile to ensure consistent, on-brand content.
            </p>
          </div>
          <Button
            onClick={() => setShowWizard(true)}
            className="gap-2 grimoire-gradient text-white shadow-glow-sm"
          >
            <Plus className="h-4 w-4" />
            Create Your First Profile
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {profiles.map((profile) => (
            <BrandProfileCard
              key={profile.id}
              profile={profile}
              onUpdate={refetch}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 3: Create brand profile card**

Create `apps/web/components/dashboard/brand/brand-profile-card.tsx`:

```tsx
"use client"

import { useState } from "react"
import { Star, Trash2, MoreHorizontal, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { trpc } from "@/lib/trpc/client"

interface BrandProfileCardProps {
  profile: {
    id: string
    name: string
    description: string | null
    toneKeywords: string[]
    avoidKeywords: string[]
    exampleContent: string[]
    isDefault: boolean
  }
  onUpdate: () => void
}

export function BrandProfileCard({ profile, onUpdate }: BrandProfileCardProps) {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  const setDefault = trpc.brand.setDefault.useMutation({
    onSuccess: onUpdate,
  })

  const deleteProfile = trpc.brand.delete.useMutation({
    onSuccess: onUpdate,
  })

  const testVoice = trpc.brand.testVoice.useMutation({
    onSuccess: (data) => {
      setTestResult(data.text)
      setTesting(false)
    },
    onError: () => setTesting(false),
  })

  return (
    <Card className="border-border/50 shadow-soft transition-shadow hover:shadow-elevated">
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold">{profile.name}</h3>
          {profile.isDefault && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              <Star className="h-3 w-3 fill-current" />
              Default
            </span>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!profile.isDefault && (
              <DropdownMenuItem onClick={() => setDefault.mutate({ id: profile.id })}>
                <Star className="mr-2 h-4 w-4" />
                Set as Default
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => deleteProfile.mutate({ id: profile.id })}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-3">
        {profile.description && (
          <p className="text-sm text-muted-foreground">{profile.description}</p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {profile.toneKeywords.map((keyword) => (
            <span
              key={keyword}
              className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
            >
              {keyword}
            </span>
          ))}
        </div>
        {profile.avoidKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.avoidKeywords.slice(0, 5).map((keyword) => (
              <span
                key={keyword}
                className="rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
              >
                {keyword}
              </span>
            ))}
            {profile.avoidKeywords.length > 5 && (
              <span className="text-xs text-muted-foreground">
                +{profile.avoidKeywords.length - 5} more
              </span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            {profile.exampleContent.length} example{profile.exampleContent.length !== 1 ? "s" : ""}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            disabled={testing || testVoice.isPending}
            onClick={() => {
              setTesting(true)
              setTestResult(null)
              testVoice.mutate({ profileId: profile.id })
            }}
          >
            <Sparkles className="h-3 w-3" />
            Test Voice
          </Button>
        </div>
        {testResult && (
          <div className="rounded-lg bg-muted/30 p-3 text-sm">{testResult}</div>
        )}
      </CardContent>
    </Card>
  )
}
```

**Step 4: Create brand wizard**

Create `apps/web/components/dashboard/brand/brand-wizard.tsx`:

```tsx
"use client"

import { useState } from "react"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { trpc } from "@/lib/trpc/client"

const TONE_OPTIONS = [
  "professional", "casual", "witty", "authoritative", "friendly",
  "bold", "minimal", "playful", "inspiring", "edgy",
]

interface BrandWizardProps {
  onComplete: () => void
  onCancel: () => void
}

export function BrandWizard({ onComplete, onCancel }: BrandWizardProps) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState("")
  const [toneKeywords, setToneKeywords] = useState<string[]>([])
  const [examples, setExamples] = useState<string[]>([""])
  const [avoidKeywords, setAvoidKeywords] = useState("")

  const createProfile = trpc.brand.create.useMutation({
    onSuccess: onComplete,
  })

  const steps = ["Name", "Tone", "Examples", "Avoid", "Review"]

  function handleToggleTone(tone: string) {
    setToneKeywords((prev) =>
      prev.includes(tone)
        ? prev.filter((t) => t !== tone)
        : prev.length < 5
          ? [...prev, tone]
          : prev
    )
  }

  function handleAddExample() {
    setExamples((prev) => [...prev, ""])
  }

  function handleUpdateExample(index: number, value: string) {
    setExamples((prev) => prev.map((e, i) => (i === index ? value : e)))
  }

  function handleRemoveExample(index: number) {
    setExamples((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit() {
    const filteredExamples = examples.filter((e) => e.trim().length > 0)
    const avoidList = avoidKeywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)

    createProfile.mutate({
      name,
      toneKeywords,
      avoidKeywords: avoidList,
      exampleContent: filteredExamples,
      isDefault: true,
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Brand Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Step {step + 1} of {steps.length}: {steps[step]}
          </p>
        </div>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1.5">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= step ? "grimoire-gradient" : "bg-muted/30"
            }`}
          />
        ))}
      </div>

      <Card className="border-border/50 shadow-soft">
        <CardContent className="pt-6">
          {step === 0 && (
            <div className="space-y-4">
              <Label htmlFor="profileName" className="text-sm font-medium">
                Profile Name
              </Label>
              <Input
                id="profileName"
                placeholder='e.g., "Primary Voice", "Casual Voice"'
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-lg border-border/60 bg-muted/30 focus:bg-background"
              />
              <p className="text-xs text-muted-foreground">
                Give your brand voice a name to identify it later.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <Label className="text-sm font-medium">
                Select 3-5 Tone Keywords
              </Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {TONE_OPTIONS.map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => handleToggleTone(tone)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                      toneKeywords.includes(tone)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    {tone}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {toneKeywords.length}/5 selected
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Label className="text-sm font-medium">
                Paste Example Content
              </Label>
              <p className="text-xs text-muted-foreground">
                Add 3-10 posts or pieces of content that represent your brand voice.
              </p>
              {examples.map((example, i) => (
                <div key={i} className="flex gap-2">
                  <textarea
                    value={example}
                    onChange={(e) => handleUpdateExample(i, e.target.value)}
                    placeholder={`Example ${i + 1}...`}
                    rows={3}
                    className="flex-1 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {examples.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground"
                      onClick={() => handleRemoveExample(i)}
                    >
                      &times;
                    </Button>
                  )}
                </div>
              ))}
              {examples.length < 10 && (
                <Button variant="outline" size="sm" onClick={handleAddExample}>
                  + Add Example
                </Button>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <Label htmlFor="avoidKeywords" className="text-sm font-medium">
                Words & Phrases to Avoid
              </Label>
              <textarea
                id="avoidKeywords"
                value={avoidKeywords}
                onChange={(e) => setAvoidKeywords(e.target.value)}
                placeholder="synergy, disrupt, leverage, game-changer..."
                rows={4}
                className="w-full rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated. These words will be flagged if they appear in generated content.
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Review Your Profile</h3>
              <div className="space-y-3 rounded-lg bg-muted/20 p-4">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Name</span>
                  <p className="text-sm font-medium">{name}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Tone</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {toneKeywords.map((t) => (
                      <span key={t} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium capitalize text-primary">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Examples</span>
                  <p className="text-sm">{examples.filter((e) => e.trim()).length} examples added</p>
                </div>
                {avoidKeywords && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Avoid</span>
                    <p className="text-sm">{avoidKeywords}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        {step < steps.length - 1 ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={
              (step === 0 && name.trim().length === 0) ||
              (step === 1 && toneKeywords.length < 3)
            }
            className="gap-2 grimoire-gradient text-white shadow-glow-sm"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={createProfile.isPending}
            className="gap-2 grimoire-gradient text-white shadow-glow-sm"
          >
            <Check className="h-4 w-4" />
            {createProfile.isPending ? "Creating..." : "Create Profile"}
          </Button>
        )}
      </div>
    </div>
  )
}
```

**Step 5: Verify build**

```bash
cd /c/Users/Nathaniel/Documents/Grimoire && pnpm --filter @grimoire/web build 2>&1 | tail -10
```

Expected: Build passes with the new `/brand` route.

**Step 6: Commit**

```bash
git add apps/web/app/\(dashboard\)/brand/ apps/web/components/dashboard/brand/
git commit -m "feat: add brand voice page with wizard and profile cards"
```

---

## Task 12: Content Creation Page — `/dashboard/create`

**Files:**
- Create: `apps/web/app/(dashboard)/create/page.tsx`
- Create: `apps/web/components/dashboard/create/create-page-client.tsx`
- Create: `apps/web/components/dashboard/create/template-picker.tsx`
- Create: `apps/web/components/dashboard/create/generation-panel.tsx`
- Create: `apps/web/components/dashboard/create/platform-previews.tsx`
- Create: `apps/web/components/dashboard/create/content-editor.tsx`

**Step 1: Create server page**

Create `apps/web/app/(dashboard)/create/page.tsx`:

```tsx
import { CreatePageClient } from "@/components/dashboard/create/create-page-client"

export default function CreatePage() {
  return <CreatePageClient />
}
```

**Step 2: Create template picker (left panel)**

Create `apps/web/components/dashboard/create/template-picker.tsx`:

```tsx
"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { TEMPLATES, type TemplateCategory, type PromptTemplate } from "@grimoire/shared"
import { cn } from "@/lib/utils"
import * as LucideIcons from "lucide-react"

const CATEGORIES: { key: TemplateCategory | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "social", label: "Social" },
  { key: "thread", label: "Thread" },
  { key: "blog", label: "Blog" },
  { key: "email", label: "Email" },
]

interface TemplatePickerProps {
  selected: PromptTemplate | null
  onSelect: (template: PromptTemplate) => void
}

export function TemplatePicker({ selected, onSelect }: TemplatePickerProps) {
  const [category, setCategory] = useState<TemplateCategory | "all">("all")
  const [search, setSearch] = useState("")

  const filtered = TEMPLATES.filter((t) => {
    if (category !== "all" && t.category !== category) return false
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="flex h-full flex-col border-r border-border/50">
      <div className="border-b border-border/50 p-3">
        <h2 className="mb-2 text-sm font-semibold">Templates</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 border-b border-border/50 px-3 py-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            className={cn(
              "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
              category === cat.key
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Template list */}
      <div className="flex-1 overflow-y-auto p-2">
        {filtered.map((template) => {
          const IconComponent = (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[template.icon]
          return (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                selected?.id === template.id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted/30"
              )}
            >
              {IconComponent && (
                <IconComponent className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">{template.name}</p>
                <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground line-clamp-2">
                  {template.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

**Step 3: Create generation panel**

Create `apps/web/components/dashboard/create/generation-panel.tsx`:

```tsx
"use client"

import { useState } from "react"
import { Sparkles, ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { trpc } from "@/lib/trpc/client"
import type { PromptTemplate } from "@grimoire/shared"

interface GenerationPanelProps {
  template: PromptTemplate
  onGenerated: (data: { contentItemId: string; systemPrompt: string; modelId: string }) => void
}

export function GenerationPanel({ template, onGenerated }: GenerationPanelProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [inputs, setInputs] = useState<Record<string, string>>({})

  const { data: profiles } = trpc.brand.list.useQuery()
  const { data: usage } = trpc.content.getUsage.useQuery()
  const generate = trpc.content.generate.useMutation({
    onSuccess: (data) => onGenerated(data),
  })

  const inputFields = Object.entries(template.inputSchema.shape).map(
    ([key, schema]) => ({
      key,
      label: (schema as { description?: string }).description ?? key,
    })
  )

  function handleGenerate() {
    generate.mutate({
      templateId: template.id,
      inputs,
      brandProfileId: profiles?.[0]?.id,
    })
  }

  return (
    <div className="border-b border-border/50">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          {template.name}
        </span>
        {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>

      {!collapsed && (
        <div className="space-y-3 px-4 pb-4">
          {inputFields.map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs font-medium">{label}</Label>
              {key === "brief" || key === "outline" || key === "testimonial" || key === "changes" ? (
                <textarea
                  value={inputs[key] ?? ""}
                  onChange={(e) =>
                    setInputs((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  rows={3}
                  className="w-full rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder={label}
                />
              ) : (
                <Input
                  value={inputs[key] ?? ""}
                  onChange={(e) =>
                    setInputs((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="h-9 text-sm"
                  placeholder={label}
                />
              )}
            </div>
          ))}

          <div className="flex items-center justify-between pt-2">
            {usage && !usage.unlimited && (
              <span className="text-[11px] text-muted-foreground">
                {usage.used} / {usage.limit} generations used
              </span>
            )}
            <Button
              onClick={handleGenerate}
              disabled={generate.isPending}
              className="gap-2 grimoire-gradient text-white shadow-glow-sm"
              size="sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {generate.isPending ? "Generating..." : "Generate"}
            </Button>
          </div>

          {generate.error && (
            <p className="text-xs text-destructive">{generate.error.message}</p>
          )}
        </div>
      )}
    </div>
  )
}
```

**Step 4: Create content editor (center panel)**

Create `apps/web/components/dashboard/create/content-editor.tsx`:

```tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { useCompletion } from "ai/react"
import { Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { trpc } from "@/lib/trpc/client"

interface ContentEditorProps {
  contentItemId: string | null
  generationData: {
    systemPrompt: string
    modelId: string
    tier: string
  } | null
}

export function ContentEditor({ contentItemId, generationData }: ContentEditorProps) {
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)

  const updateContent = trpc.content.update.useMutation({
    onSuccess: () => setSaving(false),
  })

  const { completion, isLoading: isStreaming, complete } = useCompletion({
    api: "/api/ai/generate",
    onFinish: (_, completion) => {
      setContent(completion)
    },
  })

  useEffect(() => {
    if (generationData && contentItemId) {
      complete("", {
        body: {
          systemPrompt: generationData.systemPrompt,
          modelId: generationData.modelId,
          tier: generationData.tier,
        },
      })
    }
  }, [generationData, contentItemId, complete])

  const displayContent = isStreaming ? completion : content

  const handleSave = useCallback(() => {
    if (!contentItemId || !content) return
    setSaving(true)
    updateContent.mutate({
      id: contentItemId,
      body: content,
    })
  }, [contentItemId, content, updateContent])

  if (!contentItemId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/30">
          <span className="text-2xl">✨</span>
        </div>
        <div>
          <h3 className="font-semibold">Select a template to begin</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Choose a template from the left panel, fill in the details, and generate your content.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-2">
        <div className="flex items-center gap-2">
          {isStreaming && (
            <span className="flex items-center gap-1.5 text-xs text-primary">
              <Loader2 className="h-3 w-3 animate-spin" />
              Generating...
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={saving || isStreaming || !content}
          className="gap-1.5"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "Saving..." : "Save Draft"}
        </Button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto p-4">
        <textarea
          value={displayContent}
          onChange={(e) => setContent(e.target.value)}
          disabled={isStreaming}
          placeholder="Your generated content will appear here..."
          className="h-full w-full resize-none bg-transparent text-sm leading-relaxed focus:outline-none"
        />
      </div>
    </div>
  )
}
```

**Step 5: Create platform previews (right panel)**

Create `apps/web/components/dashboard/create/platform-previews.tsx`:

```tsx
"use client"

import { useState } from "react"
import { useCompletion } from "ai/react"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { SOCIAL_PLATFORMS, type SocialPlatformKey } from "@grimoire/shared"
import { cn } from "@/lib/utils"

interface PlatformPreviewsProps {
  content: string
  contentItemId: string | null
}

const AVAILABLE_PLATFORMS: SocialPlatformKey[] = [
  "INSTAGRAM", "FACEBOOK", "LINKEDIN", "TWITTER", "TIKTOK", "THREADS", "YOUTUBE", "PINTEREST"
]

export function PlatformPreviews({ content, contentItemId }: PlatformPreviewsProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<SocialPlatformKey>>(new Set())
  const [variants, setVariants] = useState<Record<string, string>>({})
  const [adaptingPlatform, setAdaptingPlatform] = useState<string | null>(null)

  const { complete } = useCompletion({
    api: "/api/ai/adapt",
    onFinish: (_, completion) => {
      if (adaptingPlatform) {
        setVariants((prev) => ({ ...prev, [adaptingPlatform]: completion }))
        setAdaptingPlatform(null)
      }
    },
  })

  function handleTogglePlatform(platform: SocialPlatformKey) {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev)
      if (next.has(platform)) {
        next.delete(platform)
      } else {
        next.add(platform)
      }
      return next
    })
  }

  async function handleAdaptAll() {
    for (const platform of selectedPlatforms) {
      setAdaptingPlatform(platform)
      await complete("", {
        body: { content, platform },
      })
    }
  }

  return (
    <div className="flex h-full flex-col border-l border-border/50">
      <div className="border-b border-border/50 p-3">
        <h2 className="mb-2 text-sm font-semibold">Platforms</h2>
        <div className="flex flex-wrap gap-1.5">
          {AVAILABLE_PLATFORMS.map((platform) => {
            const config = SOCIAL_PLATFORMS[platform]
            return (
              <button
                key={platform}
                onClick={() => handleTogglePlatform(platform)}
                className={cn(
                  "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                  selectedPlatforms.has(platform)
                    ? "bg-primary/10 text-primary"
                    : "bg-muted/20 text-muted-foreground hover:text-foreground"
                )}
              >
                {config.name}
              </button>
            )
          })}
        </div>

        {selectedPlatforms.size > 0 && content && (
          <Button
            onClick={handleAdaptAll}
            disabled={!!adaptingPlatform}
            size="sm"
            className="mt-2 w-full gap-1.5 text-xs"
            variant="outline"
          >
            <Sparkles className="h-3 w-3" />
            {adaptingPlatform ? "Adapting..." : "Adapt for Selected"}
          </Button>
        )}
      </div>

      {/* Preview cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {Array.from(selectedPlatforms).map((platform) => {
          const config = SOCIAL_PLATFORMS[platform]
          const variant = variants[platform]
          return (
            <Card key={platform} className="border-border/50">
              <CardHeader className="pb-2 pt-3 px-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{config.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {(variant ?? content ?? "").length} / {config.charLimit}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {variant ?? (content ? content.slice(0, config.charLimit) : "Generate content first...")}
                </p>
              </CardContent>
            </Card>
          )
        })}

        {selectedPlatforms.size === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <p className="text-xs text-muted-foreground">
              Select platforms to preview adapted content
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 6: Create the main create page client**

Create `apps/web/components/dashboard/create/create-page-client.tsx`:

```tsx
"use client"

import { useState } from "react"
import type { PromptTemplate } from "@grimoire/shared"
import { TemplatePicker } from "./template-picker"
import { GenerationPanel } from "./generation-panel"
import { ContentEditor } from "./content-editor"
import { PlatformPreviews } from "./platform-previews"

export function CreatePageClient() {
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null)
  const [contentItemId, setContentItemId] = useState<string | null>(null)
  const [generationData, setGenerationData] = useState<{
    systemPrompt: string
    modelId: string
    tier: string
  } | null>(null)
  const [currentContent, setCurrentContent] = useState("")

  function handleGenerated(data: { contentItemId: string; systemPrompt: string; modelId: string }) {
    setContentItemId(data.contentItemId)
    setGenerationData({
      systemPrompt: data.systemPrompt,
      modelId: data.modelId,
      tier: selectedTemplate?.tier ?? "standard",
    })
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] -mx-6 -my-8">
      {/* Left: Template Picker */}
      <div className="w-[280px] shrink-0">
        <TemplatePicker
          selected={selectedTemplate}
          onSelect={setSelectedTemplate}
        />
      </div>

      {/* Center: Editor */}
      <div className="flex flex-1 flex-col">
        {selectedTemplate && (
          <GenerationPanel
            template={selectedTemplate}
            onGenerated={handleGenerated}
          />
        )}
        <ContentEditor
          contentItemId={contentItemId}
          generationData={generationData}
        />
      </div>

      {/* Right: Platform Previews */}
      <div className="w-[320px] shrink-0">
        <PlatformPreviews
          content={currentContent}
          contentItemId={contentItemId}
        />
      </div>
    </div>
  )
}
```

**Step 7: Verify build**

```bash
cd /c/Users/Nathaniel/Documents/Grimoire && pnpm --filter @grimoire/web build 2>&1 | tail -10
```

Expected: Build passes with the new `/create` route.

**Step 8: Commit**

```bash
git add apps/web/app/\(dashboard\)/create/ apps/web/components/dashboard/create/
git commit -m "feat: add content creation page with 3-panel layout"
```

---

## Task 13: Wire Up Dependencies + Verify Full Build

This task ensures everything is properly wired together.

**Files:**
- Modify: `packages/api/package.json` (if not already done in Task 8)
- Modify: `apps/web/package.json` (if not already done in Task 1)

**Step 1: Verify all workspace dependencies resolve**

```bash
cd /c/Users/Nathaniel/Documents/Grimoire && pnpm install
```

**Step 2: Verify the full app builds**

```bash
cd /c/Users/Nathaniel/Documents/Grimoire && pnpm --filter @grimoire/web build 2>&1 | tail -20
```

Expected: Build succeeds. New routes `/brand` and `/create` appear in the page listing.

**Step 3: Verify the dev server starts**

```bash
cd /c/Users/Nathaniel/Documents/Grimoire && pnpm --filter @grimoire/web dev &
sleep 10
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

Expected: 200 or 307.

**Step 4: Commit if any fixes were needed**

```bash
git add -A
git status
# Only commit if there are changes
git diff --cached --quiet || git commit -m "fix: wire up remaining Phase 2 dependencies"
```

---

## Task 14: Manual Integration Test Checklist

This task validates Phase 2 works end-to-end. No code to write — just verification steps.

**Step 1: Test Brand Voice page**

1. Navigate to `http://localhost:3000/dashboard/brand`
2. Verify the empty state renders with "Create Your First Profile" button
3. Click "New Profile" → wizard should appear
4. Fill step 1 (name: "Test Voice")
5. Fill step 2 (select 3 tones: "professional", "friendly", "bold")
6. Fill step 3 (paste 1 example: "We help small businesses grow with simple tools.")
7. Fill step 4 (avoid: "synergy, leverage")
8. Step 5: Review and submit
9. Verify profile card appears in the list

**Step 2: Test Content Creation page**

1. Navigate to `http://localhost:3000/dashboard/create`
2. Verify 3-panel layout renders
3. Select "Product Launch Announcement" template
4. Fill in template inputs
5. Click "Generate" (requires `OPENROUTER_API_KEY` to be set in `.env`)
6. Verify AI content streams into the editor
7. Select platforms (Instagram, Twitter)
8. Click "Adapt for Selected"
9. Verify platform variants appear in right panel
10. Click "Save Draft"

**Step 3: Test sidebar navigation**

1. Verify "Create" and "Brand" nav items are clickable (not locked)
2. Verify "Calendar", "Queue", "Analytics" are still locked

**Step 4: Commit final state**

```bash
git add -A
git diff --cached --quiet || git commit -m "chore: Phase 2 integration verification"
```

---

## Summary

| Task | What | Files Created | Files Modified |
|------|------|---------------|----------------|
| 1 | Install deps, scaffold `packages/ai/` | 3 | 2 |
| 2 | AI client + model router | 2 | 1 |
| 3 | Prompt templates + platforms | 2 | 1 |
| 4 | DB migration (rate limit fields) | 0 | 1 |
| 5 | Rate limiting middleware | 1 | 2 |
| 6 | Pinecone RAG pipeline | 3 | 1 |
| 7 | Moderation + guardrails | 2 | 1 |
| 8 | Brand tRPC router | 1 | 2 |
| 9 | Content tRPC router + streaming routes | 3 | 1 |
| 10 | Enable sidebar nav items | 0 | 1 |
| 11 | Brand voice page (wizard + cards) | 4 | 0 |
| 12 | Content creation page (3-panel) | 6 | 0 |
| 13 | Wire up + verify build | 0 | ~2 |
| 14 | Manual integration test | 0 | 0 |

**Total:** ~27 new files, ~13 modified files, 14 tasks.
