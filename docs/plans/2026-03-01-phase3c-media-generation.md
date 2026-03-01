# Phase 3C: Image & Video Generation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add image generation (Gemini 3.1 Flash via OpenRouter) and async video generation (Seedance 1.5 Pro via Replicate) to the content creation pipeline, with brand context injection, plan-gated access, and new media-aware UI.

**Architecture:** Extends the existing text generation flow with two new content types (IMAGE, VIDEO). Image generation calls OpenRouter's `/chat/completions` with `modalities: ["image", "text"]` and receives base64 images which are uploaded to UploadThing. Video generation is async — creates a Replicate prediction, polls for completion via a status API route, then uploads the result to UploadThing. Both count toward aiGenerationsPerMonth (video costs 3x credits). The frontend ContentEditor switches between text/image/video display based on content type.

**Tech Stack:** OpenRouter API (Gemini 3.1 Flash Image), Replicate Node.js SDK (Seedance 1.5 Pro), UploadThing (output storage), Vercel AI SDK (text streaming unchanged), tRPC (mutations), Prisma (schema), React (UI)

---

### Task 1: Install Replicate SDK + Add Env Vars

**Files:**
- Modify: `packages/ai/package.json`
- Modify: `.env` (add `REPLICATE_API_TOKEN=`)

**Step 1: Install replicate in packages/ai**

```bash
cd packages/ai && pnpm add replicate
```

**Step 2: Add REPLICATE_API_TOKEN to .env**

Add a blank placeholder line to `.env`:
```
REPLICATE_API_TOKEN=
```

**Step 3: Commit**

```bash
git add packages/ai/package.json pnpm-lock.yaml
git commit -m "feat: install replicate SDK for video generation"
```

---

### Task 2: Schema — Add IMAGE + VIDEO ContentTypes and generationJobId

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

**Step 1: Add IMAGE and VIDEO to ContentType enum**

In `schema.prisma`, add to the `ContentType` enum:
```prisma
enum ContentType {
  SOCIAL_POST
  BLOG_OUTLINE
  BLOG_DRAFT
  EMAIL_COPY
  AD_COPY
  THREAD
  CAROUSEL
  VIDEO_SCRIPT
  IMAGE
  VIDEO
}
```

**Step 2: Add generationJobId to ContentItem model**

Add an optional field to `ContentItem` for tracking async Replicate prediction IDs:
```prisma
model ContentItem {
  // ... existing fields ...
  generationJobId  String?     // Replicate prediction ID for async video generation
}
```

**Step 3: Add videoGeneration boolean to plans config**

Modify `packages/shared/constants/plans.ts` — add `videoGeneration` to each plan:

```typescript
FREE: { ..., videoGeneration: false },
STARTER: { ..., videoGeneration: true },
PRO: { ..., videoGeneration: true },
TEAM: { ..., videoGeneration: true },
```

**Step 4: Run Prisma db push and generate**

```bash
cd packages/db && npx prisma db push && npx prisma generate
```

**Step 5: Commit**

```bash
git add packages/db/prisma/schema.prisma packages/shared/constants/plans.ts
git commit -m "feat: add IMAGE/VIDEO content types and videoGeneration plan gate"
```

---

### Task 3: Add Image + Video Built-in Templates

**Files:**
- Modify: `packages/shared/constants/templates.ts`

**Step 1: Extend TemplateCategory and TemplateTier**

```typescript
export type TemplateCategory = "social" | "thread" | "blog" | "email" | "ads" | "image" | "video"
export type TemplateTier = "fast" | "standard" | "creative" | "image" | "video"
```

**Step 2: Add 4 image templates to TEMPLATES array**

```typescript
// Image templates — use tier: "image"
{
  id: "image:social-graphic",
  name: "Social Media Graphic",
  category: "image",
  description: "Generate a branded social media graphic from a brief.",
  icon: "ImagePlus",
  tier: "image",
  inputSchema: z.object({
    brief: z.string().min(10).max(2000).describe("Describe the image you want"),
    style: z.string().max(200).optional().describe("Visual style (e.g., minimalist, vibrant, corporate)"),
    aspectRatio: z.enum(["1:1", "16:9", "9:16", "3:2"]).default("1:1").describe("Aspect ratio"),
  }),
  systemPrompt: `Generate a professional social media graphic based on this brief.

{{brandContext}}

Brief: {{brief}}
Style: {{style}}
Aspect Ratio: {{aspectRatio}}

Create a visually striking, brand-aligned image. Use clean composition, readable text if any, and bold colors.`,
  platforms: ["INSTAGRAM", "FACEBOOK", "LINKEDIN", "TWITTER"],
},
{
  id: "image:product-showcase",
  name: "Product Showcase",
  category: "image",
  description: "Generate a branded product photo with styled background.",
  icon: "Package",
  tier: "image",
  inputSchema: z.object({
    brief: z.string().min(10).max(2000).describe("Product description and context"),
    productName: z.string().min(1).max(200).describe("Product name"),
    style: z.string().max(200).optional().describe("Visual style (e.g., studio, lifestyle, flat-lay)"),
  }),
  systemPrompt: `Generate a professional product showcase image.

{{brandContext}}

Product: {{productName}}
Brief: {{brief}}
Style: {{style}}

Create a high-quality product image with clean styling and professional presentation.`,
  platforms: ["INSTAGRAM", "FACEBOOK"],
},
{
  id: "image:quote-card",
  name: "Quote Card",
  category: "image",
  description: "Turn a quote or testimonial into a visual card.",
  icon: "Quote",
  tier: "image",
  inputSchema: z.object({
    brief: z.string().min(5).max(500).describe("The quote text"),
    attribution: z.string().max(200).optional().describe("Who said it"),
    style: z.string().max(200).optional().describe("Visual style"),
  }),
  systemPrompt: `Generate a beautiful quote card image.

{{brandContext}}

Quote: "{{brief}}"
Attribution: {{attribution}}
Style: {{style}}

Design an elegant, readable quote card with typography as the focal point. Keep it clean and shareable.`,
  platforms: ["INSTAGRAM", "FACEBOOK", "TWITTER", "LINKEDIN"],
},
{
  id: "image:story-cover",
  name: "Story / Reel Cover",
  category: "image",
  description: "Generate an Instagram/TikTok story or reel cover image.",
  icon: "Smartphone",
  tier: "image",
  inputSchema: z.object({
    brief: z.string().min(10).max(2000).describe("What the story/reel is about"),
    headline: z.string().max(100).optional().describe("Headline text for the cover"),
  }),
  systemPrompt: `Generate a vertical story/reel cover image (9:16 aspect ratio).

{{brandContext}}

Brief: {{brief}}
Headline: {{headline}}

Design an eye-catching vertical cover image that grabs attention in a story or reel thumbnail. Use bold visuals and minimal text.`,
  platforms: ["INSTAGRAM", "TIKTOK"],
},
```

**Step 3: Add 4 video templates**

```typescript
// Video templates — use tier: "video"
{
  id: "video:product-demo",
  name: "Product Demo Clip",
  category: "video",
  description: "Short product showcase video (5-10s).",
  icon: "Play",
  tier: "video",
  inputSchema: z.object({
    brief: z.string().min(10).max(2000).describe("Describe the product demo scene"),
    productName: z.string().min(1).max(200).describe("Product name"),
    duration: z.enum(["5", "10"]).default("5").describe("Duration in seconds"),
  }),
  systemPrompt: `Create a short product demo video.

{{brandContext}}

Product: {{productName}}
Brief: {{brief}}
Duration: {{duration}} seconds

Generate a professional, cinematic product showcase that highlights the product's key features.`,
  platforms: [],
},
{
  id: "video:social-reel",
  name: "Social Reel",
  category: "video",
  description: "Vertical reel for Instagram/TikTok.",
  icon: "Film",
  tier: "video",
  inputSchema: z.object({
    brief: z.string().min(10).max(2000).describe("What the reel should show"),
    style: z.string().max(200).optional().describe("Visual style (e.g., dynamic, calm, energetic)"),
  }),
  systemPrompt: `Create a short vertical social media reel.

{{brandContext}}

Brief: {{brief}}
Style: {{style}}

Generate a visually engaging vertical video for social media. Make it eye-catching within the first second.`,
  platforms: ["INSTAGRAM", "TIKTOK"],
},
{
  id: "video:explainer-clip",
  name: "Explainer Clip",
  category: "video",
  description: "Brief explainer animation (5-10s).",
  icon: "Clapperboard",
  tier: "video",
  inputSchema: z.object({
    brief: z.string().min(10).max(2000).describe("What concept to explain visually"),
    duration: z.enum(["5", "10"]).default("5").describe("Duration in seconds"),
  }),
  systemPrompt: `Create a short explainer clip.

{{brandContext}}

Brief: {{brief}}
Duration: {{duration}} seconds

Generate a clear, visually informative animation that explains the concept simply and engagingly.`,
  platforms: [],
},
{
  id: "video:brand-intro",
  name: "Brand Intro / Outro",
  category: "video",
  description: "Brand intro or outro bumper (3-5s).",
  icon: "Tv",
  tier: "video",
  inputSchema: z.object({
    brief: z.string().min(10).max(2000).describe("Brand elements and mood to feature"),
    type: z.enum(["intro", "outro"]).default("intro").describe("Intro or outro"),
  }),
  systemPrompt: `Create a brand {{type}} bumper video.

{{brandContext}}

Brief: {{brief}}
Type: {{type}}

Generate a polished, cinematic brand bumper that feels professional and memorable. Keep it 3-5 seconds.`,
  platforms: [],
},
```

**Step 4: Commit**

```bash
git add packages/shared/constants/templates.ts
git commit -m "feat: add 4 image and 4 video built-in templates"
```

---

### Task 4: Image Generation API Route + AI Helper

**Files:**
- Create: `packages/ai/generation/image.ts`
- Create: `apps/web/app/api/ai/generate-image/route.ts`
- Modify: `packages/ai/index.ts` (export new function)

**Step 1: Create image generation helper in packages/ai**

Create `packages/ai/generation/image.ts`:

```typescript
import { getOpenRouterClient } from "../client"

export interface ImageGenerationOptions {
  prompt: string
  aspectRatio?: "1:1" | "16:9" | "9:16" | "3:2"
}

export interface ImageGenerationResult {
  base64Data: string  // base64 image data (without data URL prefix)
  mimeType: string
}

export async function generateImage(
  options: ImageGenerationOptions
): Promise<ImageGenerationResult> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured")

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-image-preview",
      messages: [
        { role: "user", content: options.prompt },
      ],
      modalities: ["image", "text"],
      image_config: {
        aspect_ratio: options.aspectRatio ?? "1:1",
      },
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Image generation failed: ${response.status} ${errorBody}`)
  }

  const data = await response.json() as {
    choices: Array<{
      message: {
        content?: string
        images?: Array<{
          type: string
          image_url: { url: string }
        }>
      }
    }>
  }

  const images = data.choices?.[0]?.message?.images
  if (!images || images.length === 0) {
    throw new Error("No image generated")
  }

  // Image comes as data:image/png;base64,... URL
  const dataUrl = images[0].image_url.url
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/)
  if (!match) throw new Error("Invalid image data format")

  return {
    base64Data: match[2],
    mimeType: match[1],
  }
}
```

**Step 2: Create API route**

Create `apps/web/app/api/ai/generate-image/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { generateImage } from "@grimoire/ai"

export const maxDuration = 60

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = await req.json() as {
    systemPrompt: string
    aspectRatio?: "1:1" | "16:9" | "9:16" | "3:2"
  }

  if (!body.systemPrompt) {
    return new Response("Missing systemPrompt", { status: 400 })
  }

  const result = await generateImage({
    prompt: body.systemPrompt,
    aspectRatio: body.aspectRatio,
  })

  return NextResponse.json({
    base64Data: result.base64Data,
    mimeType: result.mimeType,
  })
}
```

**Step 3: Export from packages/ai/index.ts**

Add:
```typescript
export { generateImage } from "./generation/image"
export type { ImageGenerationOptions, ImageGenerationResult } from "./generation/image"
```

**Step 4: Commit**

```bash
git add packages/ai/generation/image.ts apps/web/app/api/ai/generate-image/route.ts packages/ai/index.ts
git commit -m "feat: add image generation via OpenRouter Gemini 3.1 Flash"
```

---

### Task 5: Video Generation API Routes + AI Helper

**Files:**
- Create: `packages/ai/generation/video.ts`
- Create: `apps/web/app/api/ai/generate-video/route.ts`
- Create: `apps/web/app/api/ai/video-status/route.ts`
- Modify: `packages/ai/index.ts` (export new functions)

**Step 1: Create video generation helper**

Create `packages/ai/generation/video.ts`:

```typescript
import Replicate from "replicate"

function getReplicateClient(): Replicate {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) throw new Error("REPLICATE_API_TOKEN is not configured")
  return new Replicate({ auth: token })
}

export interface VideoGenerationOptions {
  prompt: string
  duration?: number  // 5 or 10 seconds
  aspectRatio?: "16:9" | "9:16" | "1:1"
}

export interface VideoGenerationJob {
  predictionId: string
  status: string
}

export async function startVideoGeneration(
  options: VideoGenerationOptions
): Promise<VideoGenerationJob> {
  const replicate = getReplicateClient()

  const prediction = await replicate.predictions.create({
    model: "bytedance/seedance-1.5-pro",
    input: {
      prompt: options.prompt,
      duration: options.duration ?? 5,
      aspect_ratio: options.aspectRatio ?? "16:9",
    },
  })

  return {
    predictionId: prediction.id,
    status: prediction.status,
  }
}

export interface VideoStatusResult {
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled"
  outputUrl: string | null
  error: string | null
  progress: number | null
}

export async function getVideoStatus(
  predictionId: string
): Promise<VideoStatusResult> {
  const replicate = getReplicateClient()
  const prediction = await replicate.predictions.get(predictionId)

  let outputUrl: string | null = null
  if (prediction.status === "succeeded" && prediction.output) {
    // Output is typically a URL string or array of URLs
    outputUrl = Array.isArray(prediction.output)
      ? prediction.output[0]
      : typeof prediction.output === "string"
        ? prediction.output
        : null
  }

  // Parse progress from logs if available
  let progress: number | null = null
  if (prediction.logs) {
    const progressMatch = prediction.logs.match(/(\d+)%/)
    if (progressMatch) {
      progress = parseInt(progressMatch[1], 10)
    }
  }

  return {
    status: prediction.status as VideoStatusResult["status"],
    outputUrl,
    error: prediction.error ? String(prediction.error) : null,
    progress,
  }
}
```

**Step 2: Create generate-video API route**

Create `apps/web/app/api/ai/generate-video/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { startVideoGeneration } from "@grimoire/ai"

export const maxDuration = 30

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = await req.json() as {
    systemPrompt: string
    duration?: number
    aspectRatio?: "16:9" | "9:16" | "1:1"
  }

  if (!body.systemPrompt) {
    return new Response("Missing systemPrompt", { status: 400 })
  }

  const job = await startVideoGeneration({
    prompt: body.systemPrompt,
    duration: body.duration,
    aspectRatio: body.aspectRatio,
  })

  return NextResponse.json(job)
}
```

**Step 3: Create video-status API route**

Create `apps/web/app/api/ai/video-status/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getVideoStatus } from "@grimoire/ai"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const url = new URL(req.url)
  const predictionId = url.searchParams.get("id")

  if (!predictionId) {
    return new Response("Missing prediction ID", { status: 400 })
  }

  const status = await getVideoStatus(predictionId)
  return NextResponse.json(status)
}
```

**Step 4: Export from packages/ai/index.ts**

Add:
```typescript
export { startVideoGeneration, getVideoStatus } from "./generation/video"
export type { VideoGenerationOptions, VideoGenerationJob, VideoStatusResult } from "./generation/video"
```

**Step 5: Commit**

```bash
git add packages/ai/generation/video.ts apps/web/app/api/ai/generate-video/route.ts apps/web/app/api/ai/video-status/route.ts packages/ai/index.ts
git commit -m "feat: add video generation via Replicate Seedance 1.5 Pro with polling"
```

---

### Task 6: Extend Content Router for Image + Video Generation

**Files:**
- Modify: `packages/api/routers/content.ts`
- Modify: `packages/api/middleware/rateLimit.ts`

**Step 1: Add incrementAiUsage overload for video (3x cost)**

In `packages/api/middleware/rateLimit.ts`, add a `credits` parameter to `incrementAiUsage`:

```typescript
export async function incrementAiUsage(
  prisma: PrismaClient,
  organizationId: string,
  credits: number = 1
) {
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      aiGenerationsUsed: { increment: credits },
    },
  })
}
```

**Step 2: Add generateImage and generateVideo mutations to content router**

Add to `content.ts` after the existing `generate` mutation:

```typescript
generateImage: orgProtectedProcedure
  .input(
    z.object({
      templateId: z.string(),
      inputs: z.record(z.string()),
      brandProfileId: z.string().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    await checkAiRateLimit(ctx)

    const template = getTemplateById(input.templateId)
    if (!template) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid template ID" })
    }

    // Build system prompt (same as text generate)
    let brandContextStr = ""
    let brandProfileId = input.brandProfileId
    if (brandProfileId) {
      const profile = await ctx.prisma.brandProfile.findFirst({
        where: { id: brandProfileId, organizationId: ctx.organization.id },
      })
      if (profile) {
        brandContextStr = `Brand Voice Context:\n- Tone: ${profile.toneKeywords.join(", ")}\n- Avoid: ${profile.avoidKeywords.join(", ")}`
      }
    }

    let systemPrompt = template.systemPrompt.replace("{{brandContext}}", brandContextStr)
    for (const [key, value] of Object.entries(input.inputs)) {
      systemPrompt = systemPrompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(value ?? ""))
    }
    systemPrompt = systemPrompt.replace(/\{\{[^}]+\}\}/g, "")

    const contentItem = await ctx.prisma.contentItem.create({
      data: {
        type: "IMAGE",
        status: "DRAFT",
        body: "",
        aiModel: "google/gemini-3.1-flash-image-preview",
        aiPromptTemplate: template.id,
        organizationId: ctx.organization.id,
        brandProfileId: brandProfileId ?? null,
        createdById: ctx.session.user.id,
      },
    })

    await incrementAiUsage(ctx.prisma, ctx.organization.id)

    return {
      contentItemId: contentItem.id,
      systemPrompt,
      aspectRatio: (input.inputs.aspectRatio as string) ?? "1:1",
    }
  }),

generateVideo: orgProtectedProcedure
  .input(
    z.object({
      templateId: z.string(),
      inputs: z.record(z.string()),
      brandProfileId: z.string().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    // Check video plan gate
    const planConfig = PLANS[ctx.organization.plan as PlanKey]
    if (!planConfig.videoGeneration) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Video generation requires a Starter plan or higher. Upgrade to create videos.",
      })
    }

    await checkAiRateLimit(ctx)

    const template = getTemplateById(input.templateId)
    if (!template) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid template ID" })
    }

    // Build system prompt
    let brandContextStr = ""
    let brandProfileId = input.brandProfileId
    if (brandProfileId) {
      const profile = await ctx.prisma.brandProfile.findFirst({
        where: { id: brandProfileId, organizationId: ctx.organization.id },
      })
      if (profile) {
        brandContextStr = `Brand Voice Context:\n- Tone: ${profile.toneKeywords.join(", ")}\n- Avoid: ${profile.avoidKeywords.join(", ")}`
      }
    }

    let systemPrompt = template.systemPrompt.replace("{{brandContext}}", brandContextStr)
    for (const [key, value] of Object.entries(input.inputs)) {
      systemPrompt = systemPrompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(value ?? ""))
    }
    systemPrompt = systemPrompt.replace(/\{\{[^}]+\}\}/g, "")

    const contentItem = await ctx.prisma.contentItem.create({
      data: {
        type: "VIDEO",
        status: "DRAFT",
        body: "",
        aiModel: "bytedance/seedance-1.5-pro",
        aiPromptTemplate: template.id,
        organizationId: ctx.organization.id,
        brandProfileId: brandProfileId ?? null,
        createdById: ctx.session.user.id,
      },
    })

    // Video costs 3x credits
    await incrementAiUsage(ctx.prisma, ctx.organization.id, 3)

    return {
      contentItemId: contentItem.id,
      systemPrompt,
      duration: input.inputs.duration ? parseInt(input.inputs.duration, 10) : 5,
      aspectRatio: (input.inputs.aspectRatio as string) ?? "16:9",
    }
  }),

saveMediaUrl: orgProtectedProcedure
  .input(
    z.object({
      contentItemId: z.string(),
      mediaUrl: z.string().url(),
      generationJobId: z.string().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const item = await ctx.prisma.contentItem.findFirst({
      where: { id: input.contentItemId, organizationId: ctx.organization.id },
    })
    if (!item) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Content item not found" })
    }

    return ctx.prisma.contentItem.update({
      where: { id: input.contentItemId },
      data: {
        mediaUrls: [input.mediaUrl],
        ...(input.generationJobId ? { generationJobId: input.generationJobId } : {}),
      },
    })
  }),
```

**Step 3: Commit**

```bash
git add packages/api/routers/content.ts packages/api/middleware/rateLimit.ts
git commit -m "feat: add generateImage, generateVideo, and saveMediaUrl mutations"
```

---

### Task 7: UploadThing — Add Generated Media Upload Endpoint

**Files:**
- Modify: `apps/web/app/api/uploadthing/core.ts`
- Create: `apps/web/lib/upload-media.ts`

**Step 1: Add generatedMedia endpoint to UploadThing file router**

In `apps/web/app/api/uploadthing/core.ts`, add a new endpoint:

```typescript
generatedMedia: f({
  image: { maxFileSize: "16MB", maxFileCount: 1 },
  video: { maxFileSize: "256MB", maxFileCount: 1 },
})
  .middleware(async () => {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")
    return { userId: session.user.id }
  })
  .onUploadComplete(async ({ file }) => {
    return { url: file.ufsUrl, name: file.name, size: file.size }
  }),
```

**Step 2: Create upload-media helper**

Create `apps/web/lib/upload-media.ts` — a helper to programmatically upload base64 image data or fetch video URLs and upload them via UploadThing:

```typescript
export async function uploadBase64Image(
  base64Data: string,
  mimeType: string,
  filename: string
): Promise<string> {
  // Convert base64 to blob
  const byteCharacters = atob(base64Data)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: mimeType })
  const file = new File([blob], filename, { type: mimeType })

  // Upload via UploadThing's client-side upload
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch("/api/uploadthing", {
    method: "POST",
    body: JSON.stringify({
      files: [{ name: filename, size: file.size, type: mimeType }],
      input: {},
      routeConfig: "generatedMedia",
    }),
    headers: { "Content-Type": "application/json" },
  })

  if (!response.ok) throw new Error("Upload failed")
  const data = await response.json()
  return data[0]?.url ?? ""
}
```

Note: The exact UploadThing client-side upload mechanism may need adjustment based on their SDK. An alternative simpler approach is to use the `useUploadThing` hook from `@uploadthing/react` directly in the component — which may be cleaner. The implementer should use the `useUploadThing` hook pattern if the raw fetch approach doesn't work.

**Step 3: Commit**

```bash
git add apps/web/app/api/uploadthing/core.ts apps/web/lib/upload-media.ts
git commit -m "feat: add generatedMedia UploadThing endpoint and upload helper"
```

---

### Task 8: Frontend — Media-Aware Content Editor

**Files:**
- Modify: `apps/web/components/dashboard/create/content-editor.tsx`

**Step 1: Extend ContentEditor to handle text, image, and video modes**

The ContentEditor currently only handles streaming text. Extend it to detect the content type from generationData and render accordingly:

- **Text mode** (unchanged): textarea + streaming via `useCompletion`
- **Image mode**: calls `/api/ai/generate-image`, shows loading spinner, then displays the generated image with "Save" and "Regenerate" buttons. On save, uploads base64 to UploadThing and calls `content.saveMediaUrl`.
- **Video mode**: calls `/api/ai/generate-video` to start the prediction, then polls `/api/ai/video-status?id=...` every 3 seconds, shows progress bar, and on completion fetches the video URL and calls `content.saveMediaUrl`.

Add to the `ContentEditorProps` interface:
```typescript
interface ContentEditorProps {
  contentItemId: string | null
  generationData: {
    systemPrompt: string
    modelId: string
    tier: string
    contentType?: "text" | "image" | "video"
    aspectRatio?: string
    duration?: number
  } | null
}
```

Image display: `<img>` tag with the generated image (base64 data URL initially, then UploadThing URL after save).

Video display: `<video controls>` tag with the Replicate output URL, then UploadThing URL after save.

Progress indicator for video: A progress bar component showing percentage (from logs parsing) or an indeterminate loading animation.

Key state additions:
- `mediaUrl: string | null` — the generated/uploaded media URL
- `videoJobId: string | null` — Replicate prediction ID for polling
- `videoProgress: number | null` — 0-100 progress
- `isGeneratingImage: boolean`
- `isGeneratingVideo: boolean`

**Step 2: Commit**

```bash
git add apps/web/components/dashboard/create/content-editor.tsx
git commit -m "feat: extend ContentEditor with image preview and video polling UI"
```

---

### Task 9: Frontend — Wire Up Create Page for Image + Video Flow

**Files:**
- Modify: `apps/web/components/dashboard/create/create-page-client.tsx`
- Modify: `apps/web/components/dashboard/create/generation-panel.tsx`
- Modify: `apps/web/components/dashboard/create/template-picker.tsx`

**Step 1: Update TemplatePicker to show Image and Video categories**

Add "Image" and "Video" to the category tabs in `template-picker.tsx`.

**Step 2: Update GenerationPanel to call the correct mutation**

Based on `template.tier`:
- `"image"` → call `content.generateImage` instead of `content.generate`
- `"video"` → call `content.generateVideo` instead of `content.generate`
- everything else → existing `content.generate` (text)

Pass the returned data (including `aspectRatio`, `duration`, `contentType`) to `onGenerated`.

**Step 3: Update CreatePageClient to pass contentType through generationData**

The `handleGenerated` function should detect the content type from the template tier and include it in `generationData`:

```typescript
function handleGenerated(data: {
  contentItemId: string
  systemPrompt: string
  modelId?: string
  aspectRatio?: string
  duration?: number
}) {
  const tier = selectedTemplate?.tier ?? customTemplate?.tier ?? "standard"
  const contentType = tier === "image" ? "image" : tier === "video" ? "video" : "text"

  setContentItemId(data.contentItemId)
  setGenerationData({
    systemPrompt: data.systemPrompt,
    modelId: data.modelId ?? "",
    tier,
    contentType,
    aspectRatio: data.aspectRatio,
    duration: data.duration,
  })
}
```

**Step 4: Commit**

```bash
git add apps/web/components/dashboard/create/create-page-client.tsx apps/web/components/dashboard/create/generation-panel.tsx apps/web/components/dashboard/create/template-picker.tsx
git commit -m "feat: wire up image and video generation in create page flow"
```

---

### Task 10: Build Verification + Fix Type Errors

**Files:**
- Various (fix whatever tsc reports)

**Step 1: Run TypeScript check**

```bash
npx tsc --noEmit --project apps/web/tsconfig.json
```

**Step 2: Fix all reported errors**

Common expected issues:
- `videoGeneration` property missing from plan type (may need explicit typing)
- `TemplateTier` union type mismatches in components that cast to `"fast" | "standard" | "creative"` — need to include `"image" | "video"`
- Replicate SDK types (import resolution)
- `generationJobId` field on ContentItem (after Prisma generate)
- UploadThing `video` file type configuration

**Step 3: Run Prisma generate to ensure types are in sync**

```bash
cd packages/db && npx prisma generate
```

**Step 4: Re-run TypeScript check until clean**

```bash
npx tsc --noEmit --project apps/web/tsconfig.json
```

**Step 5: Commit fixes**

```bash
git add -A
git commit -m "fix: resolve Phase 3C type errors for clean build"
```
