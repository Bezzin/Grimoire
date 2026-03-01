# Phase 3A: Brand Assets + Custom Templates — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add brand asset uploads (UploadThing) and user-created custom templates with a guided builder wizard.

**Architecture:** UploadThing handles file uploads with presigned URLs and CDN delivery. A new `BrandAsset` model stores asset metadata linked to brand profiles. A new `CustomTemplate` model stores user-created templates with JSON input field definitions and auto-generated system prompts. Both features are plan-gated.

**Tech Stack:** UploadThing (`uploadthing`, `@uploadthing/react`), Prisma, tRPC, Next.js App Router, Tailwind CSS.

**Design Doc:** `docs/plans/2026-03-01-phase3-media-templates-design.md`

---

### Task 1: Install UploadThing Dependencies

**Files:**
- Modify: `apps/web/package.json`
- Modify: `.env`

**Step 1: Install UploadThing packages**

```bash
cd /c/Users/Nathaniel/Documents/Grimoire/apps/web && pnpm add uploadthing @uploadthing/react
```

**Step 2: Add UploadThing env var**

Append to `.env`:
```
# Phase 3A: File Uploads
UPLOADTHING_TOKEN=
```

**Step 3: Install workspace deps**

```bash
cd /c/Users/Nathaniel/Documents/Grimoire && pnpm install
```

**Step 4: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml .env
git commit -m "feat: install UploadThing dependencies"
```

---

### Task 2: Database Migration — BrandAsset + CustomTemplate Models

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

**Step 1: Add AssetType enum and BrandAsset model**

Add after the BrandProfile model (after line 159):

```prisma
enum AssetType {
  LOGO
  FONT
  COLOR_PALETTE
  GUIDELINE_PDF
  PRODUCT_PHOTO
  STYLE_REFERENCE
}

model BrandAsset {
  id             String    @id @default(cuid())
  type           AssetType
  name           String
  url            String
  fileSize       Int
  mimeType       String
  metadata       Json?
  brandProfileId String
  organizationId String
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  brandProfile BrandProfile @relation(fields: [brandProfileId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([brandProfileId])
  @@index([organizationId])
}
```

**Step 2: Add BrandAsset relation to BrandProfile**

Add to the BrandProfile model (after the contentItems relation):
```prisma
  assets       BrandAsset[]
```

**Step 3: Add BrandAsset relation to Organization**

Add to the Organization model (after analyticsEvents relation):
```prisma
  brandAssets     BrandAsset[]
```

**Step 4: Add CustomTemplate model**

Add after the BrandAsset model:

```prisma
model CustomTemplate {
  id             String   @id @default(cuid())
  name           String
  description    String?
  category       String
  icon           String   @default("FileText")
  tier           String   @default("standard")
  inputFields    Json
  systemPrompt   String   @db.Text
  platforms      String[]
  isPublished    Boolean  @default(true)
  usageCount     Int      @default(0)
  organizationId String
  createdById    String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
}
```

**Step 5: Add CustomTemplate relation to Organization**

Add to Organization model:
```prisma
  customTemplates CustomTemplate[]
```

**Step 6: Push schema changes**

```bash
cd /c/Users/Nathaniel/Documents/Grimoire/packages/db && pnpm db:push
```

Expected: "Your database is now in sync with your Prisma schema."

**Step 7: Regenerate Prisma client**

```bash
cd /c/Users/Nathaniel/Documents/Grimoire/packages/db && pnpm db:generate
```

**Step 8: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "feat: add BrandAsset and CustomTemplate models"
```

---

### Task 3: Update Plan Config with Asset + Template Limits

**Files:**
- Modify: `packages/shared/constants/plans.ts`

**Step 1: Add brandAssets and customTemplates limits to each plan**

Replace the full content of `packages/shared/constants/plans.ts`:

```typescript
export const PLANS = {
  FREE: {
    name: "Free",
    price: 0,
    socialAccounts: 1,
    aiGenerationsPerMonth: 10,
    scheduling: false,
    analytics: false,
    brandVoiceRag: false,
    teamSeats: 1,
    brandAssets: 5,
    customTemplates: 3,
  },
  STARTER: {
    name: "Starter",
    price: 2900,
    priceAnnual: 24167,
    socialAccounts: 5,
    aiGenerationsPerMonth: 200,
    scheduling: true,
    analytics: true,
    brandVoiceRag: false,
    teamSeats: 1,
    brandAssets: 50,
    customTemplates: 20,
  },
  PRO: {
    name: "Pro",
    price: 3900,
    priceAnnual: 32500,
    socialAccounts: 15,
    aiGenerationsPerMonth: -1,
    scheduling: true,
    analytics: true,
    brandVoiceRag: true,
    teamSeats: 1,
    brandAssets: -1,
    customTemplates: -1,
  },
  TEAM: {
    name: "Team",
    price: 7900,
    priceAnnual: 65833,
    socialAccounts: 15,
    aiGenerationsPerMonth: -1,
    scheduling: true,
    analytics: true,
    brandVoiceRag: true,
    teamSeats: 5,
    brandAssets: -1,
    customTemplates: -1,
  },
} as const

export type PlanKey = keyof typeof PLANS
```

(-1 means unlimited)

**Step 2: Commit**

```bash
git add packages/shared/constants/plans.ts
git commit -m "feat: add brandAssets and customTemplates limits to plan config"
```

---

### Task 4: UploadThing Core Config + API Route

**Files:**
- Create: `apps/web/lib/uploadthing.ts`
- Create: `apps/web/app/api/uploadthing/core.ts`
- Create: `apps/web/app/api/uploadthing/route.ts`

**Step 1: Create UploadThing core config**

Create `apps/web/lib/uploadthing.ts`:

```typescript
import {
  generateUploadButton,
  generateUploadDropzone,
} from "@uploadthing/react"

import type { OurFileRouter } from "@/app/api/uploadthing/core"

export const UploadButton = generateUploadButton<OurFileRouter>()
export const UploadDropzone = generateUploadDropzone<OurFileRouter>()
```

**Step 2: Create the file router**

Create `apps/web/app/api/uploadthing/core.ts`:

```typescript
import { createUploadthing, type FileRouter } from "uploadthing/server"
import { auth } from "@/lib/auth"

const f = createUploadthing()

export const ourFileRouter = {
  brandAsset: f({
    image: { maxFileSize: "10MB", maxFileCount: 10 },
    pdf: { maxFileSize: "20MB", maxFileCount: 5 },
    blob: { maxFileSize: "5MB", maxFileCount: 5 },
  })
    .middleware(async () => {
      const session = await auth()
      if (!session?.user?.id) throw new Error("Unauthorized")
      return { userId: session.user.id }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.ufsUrl, name: file.name, size: file.size }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
```

**Step 3: Create the API route handler**

Create `apps/web/app/api/uploadthing/route.ts`:

```typescript
import { createRouteHandler } from "uploadthing/server"
import { ourFileRouter } from "./core"

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
})
```

**Step 4: Commit**

```bash
git add apps/web/lib/uploadthing.ts apps/web/app/api/uploadthing/
git commit -m "feat: add UploadThing core config and API route"
```

---

### Task 5: Brand Asset tRPC Router

**Files:**
- Create: `packages/api/routers/brandAsset.ts`
- Modify: `packages/api/root.ts`

**Step 1: Create brand asset router**

Create `packages/api/routers/brandAsset.ts`:

```typescript
import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, orgProtectedProcedure } from "../trpc"
import { PLANS } from "@grimoire/shared"
import type { PlanKey } from "@grimoire/shared"

const assetTypeEnum = z.enum([
  "LOGO",
  "FONT",
  "COLOR_PALETTE",
  "GUIDELINE_PDF",
  "PRODUCT_PHOTO",
  "STYLE_REFERENCE",
])

export const brandAssetRouter = createTRPCRouter({
  create: orgProtectedProcedure
    .input(
      z.object({
        brandProfileId: z.string(),
        type: assetTypeEnum,
        name: z.string().min(1).max(200),
        url: z.string().url(),
        fileSize: z.number().int().positive(),
        mimeType: z.string(),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify brand profile belongs to org
      const profile = await ctx.prisma.brandProfile.findFirst({
        where: { id: input.brandProfileId, organizationId: ctx.organization.id },
      })
      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Brand profile not found" })
      }

      // Check plan limit
      const planConfig = PLANS[ctx.organization.plan as PlanKey]
      if (planConfig.brandAssets !== -1) {
        const currentCount = await ctx.prisma.brandAsset.count({
          where: { organizationId: ctx.organization.id },
        })
        if (currentCount >= planConfig.brandAssets) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `You've reached your limit of ${planConfig.brandAssets} brand assets. Upgrade to upload more.`,
          })
        }
      }

      return ctx.prisma.brandAsset.create({
        data: {
          type: input.type,
          name: input.name,
          url: input.url,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          metadata: input.metadata ?? undefined,
          brandProfileId: input.brandProfileId,
          organizationId: ctx.organization.id,
        },
      })
    }),

  listByProfile: orgProtectedProcedure
    .input(z.object({ brandProfileId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.brandAsset.findMany({
        where: {
          brandProfileId: input.brandProfileId,
          organizationId: ctx.organization.id,
        },
        orderBy: { createdAt: "desc" },
      })
    }),

  delete: orgProtectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const asset = await ctx.prisma.brandAsset.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
      })

      if (!asset) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Asset not found" })
      }

      return ctx.prisma.brandAsset.delete({ where: { id: input.id } })
    }),

  getUsage: orgProtectedProcedure.query(async ({ ctx }) => {
    const planConfig = PLANS[ctx.organization.plan as PlanKey]
    const count = await ctx.prisma.brandAsset.count({
      where: { organizationId: ctx.organization.id },
    })
    return {
      used: count,
      limit: planConfig.brandAssets === -1 ? null : planConfig.brandAssets,
      unlimited: planConfig.brandAssets === -1,
    }
  }),
})
```

**Step 2: Register in root router**

Add to `packages/api/root.ts`:

```typescript
import { brandAssetRouter } from "./routers/brandAsset"
```

And add `brandAsset: brandAssetRouter` to the `createTRPCRouter` call.

**Step 3: Commit**

```bash
git add packages/api/routers/brandAsset.ts packages/api/root.ts
git commit -m "feat: add brand asset tRPC router with CRUD and plan limits"
```

---

### Task 6: Custom Template tRPC Router

**Files:**
- Create: `packages/api/routers/customTemplate.ts`
- Modify: `packages/api/root.ts`

**Step 1: Create custom template router**

Create `packages/api/routers/customTemplate.ts`:

```typescript
import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, orgProtectedProcedure } from "../trpc"
import { PLANS } from "@grimoire/shared"
import type { PlanKey } from "@grimoire/shared"

const inputFieldSchema = z.object({
  key: z.string().min(1).max(50).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/),
  label: z.string().min(1).max(100),
  type: z.enum(["text", "textarea", "number", "select"]),
  required: z.boolean().default(true),
  placeholder: z.string().max(200).optional(),
  options: z.array(z.string()).optional(),
})

export const customTemplateRouter = createTRPCRouter({
  create: orgProtectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        category: z.enum(["social", "thread", "blog", "email", "ads", "image", "video"]),
        icon: z.string().max(50).default("FileText"),
        tier: z.enum(["fast", "standard", "creative"]).default("standard"),
        inputFields: z.array(inputFieldSchema).min(1).max(10),
        systemPrompt: z.string().min(10).max(5000),
        platforms: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check plan limit
      const planConfig = PLANS[ctx.organization.plan as PlanKey]
      if (planConfig.customTemplates !== -1) {
        const currentCount = await ctx.prisma.customTemplate.count({
          where: { organizationId: ctx.organization.id },
        })
        if (currentCount >= planConfig.customTemplates) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `You've reached your limit of ${planConfig.customTemplates} custom templates. Upgrade to create more.`,
          })
        }
      }

      return ctx.prisma.customTemplate.create({
        data: {
          name: input.name,
          description: input.description,
          category: input.category,
          icon: input.icon,
          tier: input.tier,
          inputFields: input.inputFields,
          systemPrompt: input.systemPrompt,
          platforms: input.platforms,
          organizationId: ctx.organization.id,
          createdById: ctx.session.user.id,
        },
      })
    }),

  update: orgProtectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        category: z.enum(["social", "thread", "blog", "email", "ads", "image", "video"]).optional(),
        icon: z.string().max(50).optional(),
        tier: z.enum(["fast", "standard", "creative"]).optional(),
        inputFields: z.array(inputFieldSchema).min(1).max(10).optional(),
        systemPrompt: z.string().min(10).max(5000).optional(),
        platforms: z.array(z.string()).optional(),
        isPublished: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.customTemplate.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
      })
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" })
      }

      const { id, ...updateData } = input
      return ctx.prisma.customTemplate.update({
        where: { id },
        data: updateData,
      })
    }),

  list: orgProtectedProcedure
    .input(
      z.object({
        category: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.customTemplate.findMany({
        where: {
          organizationId: ctx.organization.id,
          isPublished: true,
          ...(input?.category ? { category: input.category } : {}),
        },
        orderBy: { createdAt: "desc" },
      })
    }),

  getById: orgProtectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const template = await ctx.prisma.customTemplate.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
      })
      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" })
      }
      return template
    }),

  delete: orgProtectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.customTemplate.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
      })
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" })
      }
      return ctx.prisma.customTemplate.delete({ where: { id: input.id } })
    }),

  incrementUsage: orgProtectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.customTemplate.update({
        where: { id: input.id },
        data: { usageCount: { increment: 1 } },
      })
    }),
})
```

**Step 2: Register in root router**

Add to `packages/api/root.ts`:

```typescript
import { customTemplateRouter } from "./routers/customTemplate"
```

And add `customTemplate: customTemplateRouter` to the `createTRPCRouter` call.

The full root.ts should now be:

```typescript
import { createTRPCRouter } from "./trpc"
import { userRouter } from "./routers/user"
import { billingRouter } from "./routers/billing"
import { brandRouter } from "./routers/brand"
import { contentRouter } from "./routers/content"
import { brandAssetRouter } from "./routers/brandAsset"
import { customTemplateRouter } from "./routers/customTemplate"

export const appRouter = createTRPCRouter({
  user: userRouter,
  billing: billingRouter,
  brand: brandRouter,
  content: contentRouter,
  brandAsset: brandAssetRouter,
  customTemplate: customTemplateRouter,
})

export type AppRouter = typeof appRouter
```

**Step 3: Commit**

```bash
git add packages/api/routers/customTemplate.ts packages/api/root.ts
git commit -m "feat: add custom template tRPC router with CRUD and plan limits"
```

---

### Task 7: Brand Asset Upload UI

**Files:**
- Create: `apps/web/components/dashboard/brand/brand-assets-panel.tsx`
- Modify: `apps/web/components/dashboard/brand/brand-profile-card.tsx`

**Step 1: Create brand assets panel component**

Create `apps/web/components/dashboard/brand/brand-assets-panel.tsx`:

```tsx
"use client"

import { useState } from "react"
import { Upload, Trash2, FileImage, FileText, Type, Palette, Package, Image } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { trpc } from "@/lib/trpc/client"
import { UploadDropzone } from "@/lib/uploadthing"

const ASSET_TYPE_MAP: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  LOGO: { label: "Logo", icon: Image },
  FONT: { label: "Font", icon: Type },
  COLOR_PALETTE: { label: "Color Palette", icon: Palette },
  GUIDELINE_PDF: { label: "Guidelines", icon: FileText },
  PRODUCT_PHOTO: { label: "Product Photo", icon: Package },
  STYLE_REFERENCE: { label: "Style Ref", icon: FileImage },
}

const ASSET_TYPES = ["LOGO", "FONT", "COLOR_PALETTE", "GUIDELINE_PDF", "PRODUCT_PHOTO", "STYLE_REFERENCE"] as const

interface BrandAssetsPanelProps {
  profileId: string
  onClose: () => void
}

export function BrandAssetsPanel({ profileId, onClose }: BrandAssetsPanelProps) {
  const [selectedType, setSelectedType] = useState<typeof ASSET_TYPES[number]>("LOGO")

  const { data: assets, refetch } = trpc.brandAsset.listByProfile.useQuery({ brandProfileId: profileId })
  const { data: usage } = trpc.brandAsset.getUsage.useQuery()

  const createAsset = trpc.brandAsset.create.useMutation({
    onSuccess: () => refetch(),
  })

  const deleteAsset = trpc.brandAsset.delete.useMutation({
    onSuccess: () => refetch(),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Brand Assets</h2>
          {usage && !usage.unlimited && (
            <p className="text-xs text-muted-foreground">
              {usage.used} / {usage.limit} assets used
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Back to Profile
        </Button>
      </div>

      {/* Asset type selector */}
      <div className="flex flex-wrap gap-2">
        {ASSET_TYPES.map((type) => {
          const config = ASSET_TYPE_MAP[type]
          const IconComp = config.icon
          return (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedType === type
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              <IconComp className="h-3.5 w-3.5" />
              {config.label}
            </button>
          )
        })}
      </div>

      {/* Upload area */}
      <UploadDropzone
        endpoint="brandAsset"
        onClientUploadComplete={(res) => {
          if (res) {
            for (const file of res) {
              createAsset.mutate({
                brandProfileId: profileId,
                type: selectedType,
                name: file.name,
                url: file.ufsUrl,
                fileSize: file.size,
                mimeType: file.type,
              })
            }
          }
        }}
        onUploadError={(error: Error) => {
          console.error("Upload error:", error)
        }}
        className="border-dashed border-border/60 bg-muted/10 ut-button:grimoire-gradient ut-button:text-white ut-button:shadow-glow-sm ut-label:text-muted-foreground"
      />

      {/* Asset grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {assets?.map((asset) => {
          const config = ASSET_TYPE_MAP[asset.type]
          const IconComp = config?.icon ?? FileImage
          const isImage = asset.mimeType.startsWith("image/")
          return (
            <Card key={asset.id} className="border-border/50 shadow-soft">
              <CardContent className="p-3">
                {isImage ? (
                  <img
                    src={asset.url}
                    alt={asset.name}
                    className="mb-2 h-24 w-full rounded-md object-cover"
                  />
                ) : (
                  <div className="mb-2 flex h-24 items-center justify-center rounded-md bg-muted/20">
                    <IconComp className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{asset.name}</p>
                    <span className="text-[10px] text-muted-foreground">{config?.label}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteAsset.mutate({ id: asset.id })}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {(!assets || assets.length === 0) && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No assets uploaded yet. Select a type above and drop files to upload.
        </p>
      )}
    </div>
  )
}
```

**Step 2: Add "Assets" button to brand profile card**

Modify `apps/web/components/dashboard/brand/brand-profile-card.tsx`:

Add to the imports:
```tsx
import { Upload } from "lucide-react"
```

Add a new prop to the interface:
```tsx
  onViewAssets: (profileId: string) => void
```

Add an "Assets" button next to the "Test Voice" button in the card footer (inside the flex div with `justify-between pt-2`):
```tsx
<Button
  variant="outline"
  size="sm"
  className="gap-1.5 text-xs"
  onClick={() => onViewAssets(profile.id)}
>
  <Upload className="h-3 w-3" />
  Assets
</Button>
```

**Step 3: Update brand-page-client.tsx to handle assets panel**

Modify `apps/web/components/dashboard/brand/brand-page-client.tsx`:

Add state for asset panel:
```tsx
const [assetProfileId, setAssetProfileId] = useState<string | null>(null)
```

Import and render the BrandAssetsPanel when assetProfileId is set:
```tsx
import { BrandAssetsPanel } from "./brand-assets-panel"
```

Before the showWizard check, add:
```tsx
if (assetProfileId) {
  return (
    <BrandAssetsPanel
      profileId={assetProfileId}
      onClose={() => setAssetProfileId(null)}
    />
  )
}
```

Pass `onViewAssets` to BrandProfileCard:
```tsx
<BrandProfileCard
  key={profile.id}
  profile={profile}
  onUpdate={refetch}
  onViewAssets={setAssetProfileId}
/>
```

**Step 4: Commit**

```bash
git add apps/web/components/dashboard/brand/
git commit -m "feat: add brand asset upload UI with UploadThing dropzone"
```

---

### Task 8: Custom Template Wizard UI

**Files:**
- Create: `apps/web/components/dashboard/create/custom-template-wizard.tsx`

**Step 1: Create the wizard component**

Create `apps/web/components/dashboard/create/custom-template-wizard.tsx`:

```tsx
"use client"

import { useState } from "react"
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { trpc } from "@/lib/trpc/client"

const CATEGORY_OPTIONS = [
  { key: "social", label: "Social Post" },
  { key: "thread", label: "Thread / Carousel" },
  { key: "blog", label: "Blog" },
  { key: "email", label: "Email" },
  { key: "ads", label: "Ad Copy" },
] as const

const TIER_OPTIONS = [
  { key: "fast", label: "Fast", description: "Quick generation, good for simple content" },
  { key: "standard", label: "Standard", description: "Balanced quality and speed" },
  { key: "creative", label: "Creative", description: "Highest quality, best for long-form" },
] as const

interface InputField {
  key: string
  label: string
  type: "text" | "textarea" | "number" | "select"
  required: boolean
  placeholder: string
}

interface CustomTemplateWizardProps {
  onComplete: () => void
  onCancel: () => void
}

export function CustomTemplateWizard({ onComplete, onCancel }: CustomTemplateWizardProps) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<string>("social")
  const [tier, setTier] = useState<string>("standard")
  const [inputFields, setInputFields] = useState<InputField[]>([
    { key: "brief", label: "Brief", type: "textarea", required: true, placeholder: "Describe what you want..." },
  ])
  const [instructions, setInstructions] = useState("")

  const createTemplate = trpc.customTemplate.create.useMutation({
    onSuccess: onComplete,
  })

  const steps = ["Basics", "Inputs", "Instructions", "Review"]

  function addField() {
    const fieldNum = inputFields.length + 1
    setInputFields((prev) => [
      ...prev,
      { key: `field${fieldNum}`, label: `Field ${fieldNum}`, type: "text", required: false, placeholder: "" },
    ])
  }

  function updateField(index: number, updates: Partial<InputField>) {
    setInputFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...updates } : f))
    )
  }

  function removeField(index: number) {
    setInputFields((prev) => prev.filter((_, i) => i !== index))
  }

  function generateSystemPrompt(): string {
    const placeholders = inputFields.map((f) => `{{${f.key}}}`).join(", ")
    return `You are a marketing copywriter. ${instructions}\n\nUse the following inputs to create the content:\n${inputFields.map((f) => `- ${f.label}: {{${f.key}}}`).join("\n")}\n\n{{brandContext}}`
  }

  function handleSubmit() {
    createTemplate.mutate({
      name,
      description: description || undefined,
      category,
      tier: tier as "fast" | "standard" | "creative",
      inputFields,
      systemPrompt: generateSystemPrompt(),
      platforms: [],
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Custom Template</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Step {step + 1} of {steps.length}: {steps[step]}
          </p>
        </div>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
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
              <div className="space-y-2">
                <Label className="text-sm font-medium">Template Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder='e.g., "Weekly Newsletter", "Product Teaser"'
                  className="h-11 border-border/60 bg-muted/30 focus:bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Description (optional)</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of what this template creates"
                  className="h-11 border-border/60 bg-muted/30 focus:bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Category</Label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {CATEGORY_OPTIONS.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setCategory(cat.key)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        category === cat.key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">AI Model Tier</Label>
                <div className="grid grid-cols-3 gap-2">
                  {TIER_OPTIONS.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTier(t.key)}
                      className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                        tier === t.key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <p className="text-sm font-medium">{t.label}</p>
                      <p className="text-[10px]">{t.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <Label className="text-sm font-medium">Input Fields</Label>
              <p className="text-xs text-muted-foreground">
                Define what the user fills in when using this template. Each field becomes a &#123;&#123;placeholder&#125;&#125; in the prompt.
              </p>
              {inputFields.map((field, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-border/50 p-3">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={field.label}
                      onChange={(e) => {
                        const label = e.target.value
                        const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
                        updateField(i, { label, key: key || `field${i + 1}` })
                      }}
                      placeholder="Field label"
                      className="h-8 text-sm"
                    />
                    <div className="flex gap-2">
                      <select
                        value={field.type}
                        onChange={(e) => updateField(i, { type: e.target.value as InputField["type"] })}
                        className="h-8 rounded-md border border-border/60 bg-muted/30 px-2 text-xs"
                      >
                        <option value="text">Short text</option>
                        <option value="textarea">Long text</option>
                        <option value="number">Number</option>
                      </select>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateField(i, { required: e.target.checked })}
                          className="rounded"
                        />
                        Required
                      </label>
                    </div>
                  </div>
                  {inputFields.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeField(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              {inputFields.length < 10 && (
                <Button variant="outline" size="sm" onClick={addField} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add Field
                </Button>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Label className="text-sm font-medium">Instructions</Label>
              <p className="text-xs text-muted-foreground">
                Describe in plain English what the AI should do with the inputs. The system will build the prompt automatically.
              </p>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={6}
                placeholder="e.g., Write a compelling email newsletter intro that hooks the reader and summarizes the key points. Keep it under 150 words and use a conversational tone."
                className="w-full rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="rounded-lg bg-muted/20 p-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Generated prompt preview</p>
                <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{generateSystemPrompt()}</pre>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Review Your Template</h3>
              <div className="space-y-3 rounded-lg bg-muted/20 p-4">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Name</span>
                  <p className="text-sm font-medium">{name}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Category</span>
                  <p className="text-sm capitalize">{category}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Model Tier</span>
                  <p className="text-sm capitalize">{tier}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Input Fields</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {inputFields.map((f) => (
                      <span key={f.key} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {f.label}{f.required ? " *" : ""}
                      </span>
                    ))}
                  </div>
                </div>
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
              (step === 1 && inputFields.length === 0) ||
              (step === 2 && instructions.trim().length === 0)
            }
            className="gap-2 grimoire-gradient text-white shadow-glow-sm"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={createTemplate.isPending}
            className="gap-2 grimoire-gradient text-white shadow-glow-sm"
          >
            <Check className="h-4 w-4" />
            {createTemplate.isPending ? "Creating..." : "Create Template"}
          </Button>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add apps/web/components/dashboard/create/custom-template-wizard.tsx
git commit -m "feat: add custom template guided wizard"
```

---

### Task 9: Integrate Custom Templates into Create Page

**Files:**
- Modify: `apps/web/components/dashboard/create/template-picker.tsx`
- Modify: `apps/web/components/dashboard/create/create-page-client.tsx`
- Modify: `apps/web/components/dashboard/create/generation-panel.tsx`

**Step 1: Update template picker to show custom templates**

Modify `apps/web/components/dashboard/create/template-picker.tsx`:

Add a tRPC query for custom templates:
```tsx
import { trpc } from "@/lib/trpc/client"
```

Inside the component, add:
```tsx
const { data: customTemplates } = trpc.customTemplate.list.useQuery()
```

Add a "Custom" category to the CATEGORIES array:
```tsx
{ key: "custom", label: "Custom" },
```

After the built-in template list, render custom templates when category is "all" or "custom":
```tsx
{(category === "all" || category === "custom") && customTemplates?.map((ct) => (
  <button
    key={`custom:${ct.id}`}
    onClick={() => onSelectCustom(ct)}
    className={cn(
      "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
      "hover:bg-muted/30"
    )}
  >
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-medium leading-tight">{ct.name}</p>
        <span className="rounded bg-accent/20 px-1 py-0.5 text-[9px] font-semibold text-accent">Custom</span>
      </div>
      <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground line-clamp-2">
        {ct.description ?? ct.category}
      </p>
    </div>
  </button>
))}
```

Add a new prop `onSelectCustom` to the interface:
```tsx
onSelectCustom: (template: { id: string; name: string; category: string; tier: string; inputFields: unknown; systemPrompt: string }) => void
```

**Step 2: Update create page client to handle custom templates**

Add the custom template wizard import and a "New Template" button. Add state to toggle between the wizard and the main create view. When a custom template is selected, adapt its inputFields JSON into the same shape the generation panel expects.

**Step 3: Update generation panel to accept custom template data**

The generation panel currently reads `template.inputSchema.shape` which is a Zod schema. For custom templates, the input fields come as a JSON array. Add an alternate code path: if the template has `inputFields` (JSON array), render fields from that instead of `inputSchema.shape`.

**Step 4: Commit**

```bash
git add apps/web/components/dashboard/create/
git commit -m "feat: integrate custom templates into create page template picker"
```

---

### Task 10: Wire Up + Verify Full Build

**Step 1: Install deps**

```bash
cd /c/Users/Nathaniel/Documents/Grimoire && pnpm install
```

**Step 2: Build**

```bash
cd /c/Users/Nathaniel/Documents/Grimoire && pnpm --filter @grimoire/web build 2>&1 | tail -20
```

Expected: Build passes with new routes.

**Step 3: Commit any fixes**

```bash
git diff --cached --quiet || git commit -m "fix: resolve Phase 3A build issues"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Install UploadThing | 2 modified |
| 2 | DB migration (BrandAsset + CustomTemplate) | 1 modified |
| 3 | Update plan config | 1 modified |
| 4 | UploadThing core + API route | 3 created |
| 5 | Brand asset tRPC router | 1 created, 1 modified |
| 6 | Custom template tRPC router | 1 created, 1 modified |
| 7 | Brand asset upload UI | 1 created, 2 modified |
| 8 | Custom template wizard | 1 created |
| 9 | Integrate custom templates into create page | 3 modified |
| 10 | Wire up + verify build | 0 |

**Total:** ~7 new files, ~8 modified files, 10 tasks.
