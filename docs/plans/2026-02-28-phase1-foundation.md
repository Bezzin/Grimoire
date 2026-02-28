# Grimoire Phase 1: Foundation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Scaffold Grimoire as a Turborepo monorepo with auth, dashboard shell, org management, and Stripe billing.

**Architecture:** Turborepo monorepo with apps/web (Next.js 14 App Router) and packages/ (db, api, shared). tRPC for type-safe API, Prisma for DB, NextAuth v5 for auth, Stripe for billing. Dark mode from day one via next-themes.

**Tech Stack:** Next.js 14+, TypeScript strict, Tailwind CSS, shadcn/ui, tRPC v11, Prisma 5, Auth.js v5, Stripe, Zod, pnpm, Turborepo

---

## Task 1: Initialize Turborepo Monorepo

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json`
- Create: `turbo.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `.npmrc`

**Step 1: Initialize root package.json**

```bash
cd C:/Users/Nathaniel/Documents/Grimoire
pnpm init
```

Then replace `package.json` with:

```json
{
  "name": "grimoire",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "db:generate": "turbo db:generate",
    "db:push": "turbo db:push",
    "db:migrate": "turbo db:migrate"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "typescript": "^5.6.0"
  },
  "packageManager": "pnpm@9.15.0",
  "engines": {
    "node": ">=20.0.0"
  }
}
```

**Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Step 3: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "db:generate": {
      "cache": false
    },
    "db:push": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    }
  }
}
```

**Step 4: Create root tsconfig.json**

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "exclude": ["node_modules"]
}
```

**Step 5: Create .gitignore**

```
node_modules/
.next/
dist/
.turbo/
.env
.env.local
.env.*.local
*.tsbuildinfo
.vercel
coverage/
```

**Step 6: Create .npmrc**

```
auto-install-peers=true
strict-peer-dependencies=false
```

**Step 7: Install turbo and typescript**

```bash
pnpm install
```

**Step 8: Commit**

```bash
git add -A
git commit -m "chore: initialize turborepo monorepo"
```

---

## Task 2: Scaffold packages/db (Prisma)

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/prisma/schema.prisma`
- Create: `packages/db/index.ts`

**Step 1: Create packages/db/package.json**

```json
{
  "name": "@grimoire/db",
  "version": "0.0.0",
  "private": true,
  "main": "./index.ts",
  "types": "./index.ts",
  "scripts": {
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^5.22.0"
  },
  "devDependencies": {
    "prisma": "^5.22.0",
    "typescript": "^5.6.0"
  }
}
```

**Step 2: Create packages/db/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["."]
}
```

**Step 3: Create packages/db/prisma/schema.prisma**

Use the EXACT schema from PROJECT_SPEC.md section 2.3. Copy it verbatim — all models, enums, relations, and indexes.

**Step 4: Create packages/db/index.ts**

```typescript
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export * from "@prisma/client"
```

**Step 5: Install dependencies**

```bash
cd packages/db && pnpm install
```

**Step 6: Commit**

```bash
git add packages/db
git commit -m "feat: add prisma schema with full database models"
```

---

## Task 3: Scaffold packages/shared

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/types/index.ts`
- Create: `packages/shared/constants/plans.ts`
- Create: `packages/shared/constants/index.ts`
- Create: `packages/shared/utils/index.ts`
- Create: `packages/shared/index.ts`

**Step 1: Create packages/shared/package.json**

```json
{
  "name": "@grimoire/shared",
  "version": "0.0.0",
  "private": true,
  "main": "./index.ts",
  "types": "./index.ts",
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

**Step 2: Create packages/shared/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["."]
}
```

**Step 3: Create packages/shared/constants/plans.ts**

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
  },
  STARTER: {
    name: "Starter",
    price: 2900, // cents
    priceAnnual: 24167, // cents/mo (2 months free)
    socialAccounts: 5,
    aiGenerationsPerMonth: 200,
    scheduling: true,
    analytics: true,
    brandVoiceRag: false,
    teamSeats: 1,
  },
  PRO: {
    name: "Pro",
    price: 3900,
    priceAnnual: 32500,
    socialAccounts: 15,
    aiGenerationsPerMonth: -1, // unlimited
    scheduling: true,
    analytics: true,
    brandVoiceRag: true,
    teamSeats: 1,
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
  },
} as const

export type PlanKey = keyof typeof PLANS
```

**Step 4: Create packages/shared/constants/index.ts**

```typescript
export { PLANS, type PlanKey } from "./plans"
```

**Step 5: Create packages/shared/types/index.ts**

```typescript
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    total: number
    page: number
    limit: number
  }
}

export type NavItem = {
  title: string
  href: string
  icon: string
  disabled?: boolean
  badge?: string
}
```

**Step 6: Create packages/shared/utils/index.ts**

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100)
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}
```

**Step 7: Create packages/shared/index.ts**

```typescript
export * from "./types"
export * from "./constants"
export * from "./utils"
```

**Step 8: Install dependencies**

```bash
cd packages/shared && pnpm install
```

**Step 9: Commit**

```bash
git add packages/shared
git commit -m "feat: add shared types, constants, and utilities"
```

---

## Task 4: Scaffold packages/api (tRPC)

**Files:**
- Create: `packages/api/package.json`
- Create: `packages/api/tsconfig.json`
- Create: `packages/api/trpc.ts`
- Create: `packages/api/root.ts`
- Create: `packages/api/routers/user.ts`
- Create: `packages/api/routers/billing.ts`
- Create: `packages/api/index.ts`

**Step 1: Create packages/api/package.json**

```json
{
  "name": "@grimoire/api",
  "version": "0.0.0",
  "private": true,
  "main": "./index.ts",
  "types": "./index.ts",
  "dependencies": {
    "@grimoire/db": "workspace:*",
    "@grimoire/shared": "workspace:*",
    "@trpc/server": "^11.0.0",
    "superjson": "^2.2.0",
    "zod": "^3.23.0",
    "stripe": "^17.0.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

**Step 2: Create packages/api/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["."]
}
```

**Step 3: Create packages/api/trpc.ts**

```typescript
import { initTRPC, TRPCError } from "@trpc/server"
import superjson from "superjson"
import { ZodError } from "zod"
import type { Session } from "next-auth"
import { prisma } from "@grimoire/db"

export interface CreateContextOptions {
  session: Session | null
}

export const createTRPCContext = (opts: CreateContextOptions) => {
  return {
    session: opts.session,
    prisma,
  }
}

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

export const createCallerFactory = t.createCallerFactory
export const createTRPCRouter = t.router

export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  })
})
```

**Step 4: Create packages/api/routers/user.ts**

```typescript
import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import { generateSlug } from "@grimoire/shared"

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    })
    return user
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: { name: input.name },
      })
    }),

  getOrganization: protectedProcedure.query(async ({ ctx }) => {
    const membership = await ctx.prisma.organizationMember.findFirst({
      where: { userId: ctx.session.user.id },
      include: {
        organization: {
          include: {
            members: {
              include: { user: true },
            },
          },
        },
      },
    })
    return membership?.organization ?? null
  }),

  updateOrganization: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.prisma.organizationMember.findFirst({
        where: {
          userId: ctx.session.user.id,
          role: { in: ["OWNER", "ADMIN"] },
        },
      })

      if (!membership) {
        throw new Error("Not authorized to update organization")
      }

      return ctx.prisma.organization.update({
        where: { id: membership.organizationId },
        data: {
          name: input.name,
          slug: generateSlug(input.name),
        },
      })
    }),

  ensureOrganization: protectedProcedure.mutation(async ({ ctx }) => {
    const existing = await ctx.prisma.organizationMember.findFirst({
      where: { userId: ctx.session.user.id },
    })

    if (existing) {
      return ctx.prisma.organization.findUnique({
        where: { id: existing.organizationId },
      })
    }

    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
    })

    const orgName = `${user?.name ?? "My"}'s Workspace`

    return ctx.prisma.organization.create({
      data: {
        name: orgName,
        slug: generateSlug(orgName) + "-" + Date.now().toString(36),
        members: {
          create: {
            userId: ctx.session.user.id,
            role: "OWNER",
          },
        },
      },
    })
  }),
})
```

**Step 5: Create packages/api/routers/billing.ts**

```typescript
import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

const PRICE_IDS: Record<string, string> = {
  STARTER_MONTHLY: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID ?? "",
  STARTER_ANNUAL: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID ?? "",
  PRO_MONTHLY: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? "",
  PRO_ANNUAL: process.env.STRIPE_PRO_ANNUAL_PRICE_ID ?? "",
  TEAM_MONTHLY: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID ?? "",
  TEAM_ANNUAL: process.env.STRIPE_TEAM_ANNUAL_PRICE_ID ?? "",
}

export const billingRouter = createTRPCRouter({
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        priceKey: z.string(),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.prisma.organizationMember.findFirst({
        where: {
          userId: ctx.session.user.id,
          role: { in: ["OWNER", "ADMIN"] },
        },
        include: { organization: true },
      })

      if (!membership) {
        throw new Error("Not authorized to manage billing")
      }

      const org = membership.organization
      let customerId = org.stripeCustomerId

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: ctx.session.user.email ?? undefined,
          metadata: {
            organizationId: org.id,
          },
        })
        customerId = customer.id

        await ctx.prisma.organization.update({
          where: { id: org.id },
          data: { stripeCustomerId: customerId },
        })
      }

      const priceId = PRICE_IDS[input.priceKey]
      if (!priceId) {
        throw new Error("Invalid price key")
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        metadata: {
          organizationId: org.id,
        },
      })

      return { url: session.url }
    }),

  createPortalSession: protectedProcedure
    .input(
      z.object({
        returnUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.prisma.organizationMember.findFirst({
        where: {
          userId: ctx.session.user.id,
          role: { in: ["OWNER", "ADMIN"] },
        },
        include: { organization: true },
      })

      if (!membership?.organization.stripeCustomerId) {
        throw new Error("No billing account found")
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: membership.organization.stripeCustomerId,
        return_url: input.returnUrl,
      })

      return { url: session.url }
    }),

  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const membership = await ctx.prisma.organizationMember.findFirst({
      where: { userId: ctx.session.user.id },
      include: { organization: true },
    })

    if (!membership) {
      return { plan: "FREE" as const, expiresAt: null }
    }

    return {
      plan: membership.organization.plan,
      expiresAt: membership.organization.planExpiresAt,
    }
  }),
})
```

**Step 6: Create packages/api/root.ts**

```typescript
import { createTRPCRouter } from "./trpc"
import { userRouter } from "./routers/user"
import { billingRouter } from "./routers/billing"

export const appRouter = createTRPCRouter({
  user: userRouter,
  billing: billingRouter,
})

export type AppRouter = typeof appRouter
```

**Step 7: Create packages/api/index.ts**

```typescript
export { appRouter, type AppRouter } from "./root"
export {
  createTRPCContext,
  createCallerFactory,
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "./trpc"
```

**Step 8: Install dependencies**

```bash
cd packages/api && pnpm install
```

**Step 9: Commit**

```bash
git add packages/api
git commit -m "feat: add tRPC API layer with user and billing routers"
```

---

## Task 5: Scaffold apps/web (Next.js)

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.js`
- Create: `apps/web/components.json` (shadcn)
- Create: `apps/web/styles/globals.css`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/(marketing)/page.tsx`
- Create: `apps/web/lib/utils.ts`

**Step 1: Create apps/web/package.json**

```json
{
  "name": "@grimoire/web",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@grimoire/api": "workspace:*",
    "@grimoire/db": "workspace:*",
    "@grimoire/shared": "workspace:*",
    "@trpc/client": "^11.0.0",
    "@trpc/react-query": "^11.0.0",
    "@trpc/server": "^11.0.0",
    "@tanstack/react-query": "^5.60.0",
    "next": "^14.2.0",
    "next-auth": "^5.0.0-beta.25",
    "next-themes": "^0.4.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "stripe": "^17.0.0",
    "superjson": "^2.2.0",
    "zod": "^3.23.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0",
    "class-variance-authority": "^0.7.0",
    "lucide-react": "^0.460.0",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-tooltip": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-avatar": "^1.1.0",
    "@radix-ui/react-dropdown-menu": "^2.1.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "bcryptjs": "^2.4.3"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/bcryptjs": "^2.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.6.0"
  }
}
```

**Step 2: Create apps/web/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "jsx": "preserve",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "noEmit": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 3: Create apps/web/next.config.ts**

```typescript
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@grimoire/api", "@grimoire/db", "@grimoire/shared"],
}

export default nextConfig
```

**Step 4: Create apps/web/tailwind.config.ts**

```typescript
import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          border: "hsl(var(--sidebar-border))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
```

**Step 5: Create apps/web/postcss.config.js**

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**Step 6: Create apps/web/components.json** (shadcn config)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

**Step 7: Create apps/web/styles/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    --secondary: 0 0% 96.1%;
    --secondary-foreground: 0 0% 9%;
    --muted: 0 0% 96.1%;
    --muted-foreground: 0 0% 45.1%;
    --accent: 0 0% 96.1%;
    --accent-foreground: 0 0% 9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 89.8%;
    --input: 0 0% 89.8%;
    --ring: 0 0% 3.9%;
    --radius: 0.5rem;
    --sidebar: 0 0% 98%;
    --sidebar-foreground: 0 0% 3.9%;
    --sidebar-border: 0 0% 89.8%;
    --sidebar-accent: 0 0% 96.1%;
    --sidebar-accent-foreground: 0 0% 9%;
  }

  .dark {
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%;
    --card: 0 0% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 0 0% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 0 0% 9%;
    --secondary: 0 0% 14.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 0 0% 14.9%;
    --muted-foreground: 0 0% 63.9%;
    --accent: 0 0% 14.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 14.9%;
    --input: 0 0% 14.9%;
    --ring: 0 0% 83.1%;
    --sidebar: 0 0% 5.9%;
    --sidebar-foreground: 0 0% 98%;
    --sidebar-border: 0 0% 14.9%;
    --sidebar-accent: 0 0% 14.9%;
    --sidebar-accent-foreground: 0 0% 98%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**Step 8: Create apps/web/lib/utils.ts**

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Step 9: Create apps/web/app/layout.tsx**

```tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "@/styles/globals.css"
import { ThemeProvider } from "@/components/shared/theme-provider"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "Grimoire — Your Marketing Wingman",
  description:
    "An affordable, all-in-one AI marketing copilot for solopreneurs and small teams.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

**Step 10: Create apps/web/components/shared/theme-provider.tsx**

```tsx
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

**Step 11: Create apps/web/app/(marketing)/page.tsx** (placeholder landing)

```tsx
export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">Grimoire</h1>
      <p className="mt-2 text-muted-foreground">Your Marketing Wingman</p>
    </div>
  )
}
```

**Step 12: Install deps and add tailwindcss-animate**

```bash
cd apps/web && pnpm install && pnpm add -D tailwindcss-animate
```

**Step 13: Commit**

```bash
git add apps/web
git commit -m "feat: scaffold Next.js app with Tailwind, shadcn/ui, and dark mode"
```

---

## Task 6: Docker Compose + Environment

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`

**Step 1: Create docker-compose.yml**

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: grimoire
      POSTGRES_PASSWORD: grimoire_dev
      POSTGRES_DB: grimoire
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

**Step 2: Create .env.example**

```env
# Database
DATABASE_URL=postgresql://grimoire:grimoire_dev@localhost:5432/grimoire

# Redis
REDIS_URL=redis://localhost:6379

# Auth
NEXTAUTH_SECRET=generate-a-secret-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_STARTER_MONTHLY_PRICE_ID=
STRIPE_STARTER_ANNUAL_PRICE_ID=
STRIPE_PRO_MONTHLY_PRICE_ID=
STRIPE_PRO_ANNUAL_PRICE_ID=
STRIPE_TEAM_MONTHLY_PRICE_ID=
STRIPE_TEAM_ANNUAL_PRICE_ID=
```

**Step 3: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "chore: add docker-compose for local Postgres and Redis"
```

---

## Task 7: NextAuth.js v5 Configuration

**Files:**
- Create: `apps/web/lib/auth.ts`
- Create: `apps/web/app/api/auth/[...nextauth]/route.ts`
- Create: `apps/web/lib/trpc/server.ts`
- Create: `apps/web/lib/trpc/client.ts`
- Create: `apps/web/lib/trpc/provider.tsx`

**Step 1: Create apps/web/lib/auth.ts**

```typescript
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@grimoire/db"
import bcrypt from "bcryptjs"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/dashboard",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        })

        if (!user?.hashedPassword) return null

        const isValid = await bcrypt.compare(
          parsed.data.password,
          user.hashedPassword
        )

        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})
```

**Step 2: Create apps/web/app/api/auth/[...nextauth]/route.ts**

```typescript
import { handlers } from "@/lib/auth"

export const { GET, POST } = handlers
```

**Step 3: Create apps/web/lib/trpc/server.ts**

```typescript
import "server-only"
import { createTRPCContext } from "@grimoire/api"
import { appRouter } from "@grimoire/api"
import { createCallerFactory } from "@grimoire/api"
import { auth } from "@/lib/auth"
import { cache } from "react"

const createContext = cache(async () => {
  const session = await auth()
  return createTRPCContext({ session })
})

const createCaller = createCallerFactory(appRouter)

export const api = async () => {
  const context = await createContext()
  return createCaller(context)
}
```

**Step 4: Create apps/web/lib/trpc/client.ts**

```typescript
import { createTRPCReact } from "@trpc/react-query"
import type { AppRouter } from "@grimoire/api"

export const trpc = createTRPCReact<AppRouter>()
```

**Step 5: Create apps/web/lib/trpc/provider.tsx**

```tsx
"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { httpBatchLink } from "@trpc/client"
import { useState } from "react"
import superjson from "superjson"
import { trpc } from "./client"

function getBaseUrl() {
  if (typeof window !== "undefined") return ""
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return `http://localhost:${process.env.PORT ?? 3000}`
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
        }),
      ],
    })
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}
```

**Step 6: Create apps/web/app/api/trpc/[trpc]/route.ts**

```typescript
import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { appRouter, createTRPCContext } from "@grimoire/api"
import { auth } from "@/lib/auth"

const handler = async (req: Request) => {
  const session = await auth()

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ session }),
  })
}

export { handler as GET, handler as POST }
```

**Step 7: Install @auth/prisma-adapter**

```bash
cd apps/web && pnpm add @auth/prisma-adapter
```

**Step 8: Commit**

```bash
git add apps/web/lib apps/web/app/api
git commit -m "feat: configure NextAuth v5 and tRPC client/server"
```

---

## Task 8: Auth Pages (Login, Signup, Forgot Password)

**Files:**
- Create: `apps/web/app/(auth)/login/page.tsx`
- Create: `apps/web/app/(auth)/signup/page.tsx`
- Create: `apps/web/app/(auth)/signup/actions.ts`
- Create: `apps/web/app/(auth)/forgot-password/page.tsx`
- Create: `apps/web/app/(auth)/layout.tsx`
- Create: `apps/web/components/ui/button.tsx` (shadcn)
- Create: `apps/web/components/ui/input.tsx` (shadcn)
- Create: `apps/web/components/ui/label.tsx` (shadcn)
- Create: `apps/web/components/ui/card.tsx` (shadcn)

**Step 1: Install shadcn/ui components**

```bash
cd apps/web && npx shadcn@latest add button input label card separator
```

If the CLI doesn't work, create these files manually following shadcn/ui source. The key components needed are Button, Input, Label, Card (CardHeader, CardTitle, CardDescription, CardContent, CardFooter), and Separator.

**Step 2: Create apps/web/app/(auth)/layout.tsx**

```tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
```

**Step 3: Create apps/web/app/(auth)/login/page.tsx**

Full login page with email/password form and Google OAuth button. Includes:
- Card layout with Grimoire branding
- Email + password fields with Zod validation
- "Sign in with Google" button
- Link to /signup and /forgot-password
- Error state display
- Loading state on submit
- Uses `signIn` from next-auth/react

**Step 4: Create apps/web/app/(auth)/signup/page.tsx**

Full signup page with:
- Name, email, password, confirm password fields
- Zod validation (min 8 chars, matching passwords)
- Server action to hash password and create user
- Auto sign-in after successful registration
- Link to /login

**Step 5: Create apps/web/app/(auth)/signup/actions.ts**

Server action:
```typescript
"use server"
import { prisma } from "@grimoire/db"
import bcrypt from "bcryptjs"
import { z } from "zod"

const signupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
})

export async function registerUser(formData: FormData) {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!parsed.success) {
    return { error: "Invalid input" }
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  })

  if (existing) {
    return { error: "Email already registered" }
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 12)

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      hashedPassword,
    },
  })

  return { success: true }
}
```

**Step 6: Create apps/web/app/(auth)/forgot-password/page.tsx**

Simple form with email field. Displays "If an account exists, we'll send a reset link" message on submit. Actual email sending deferred to later phase.

**Step 7: Commit**

```bash
git add apps/web/app/(auth) apps/web/components/ui
git commit -m "feat: add auth pages (login, signup, forgot-password)"
```

---

## Task 9: Dashboard Layout (Sidebar + Header)

**Files:**
- Create: `apps/web/app/(dashboard)/layout.tsx`
- Create: `apps/web/components/shared/sidebar.tsx`
- Create: `apps/web/components/shared/header.tsx`
- Create: `apps/web/components/shared/theme-toggle.tsx`
- Create: `apps/web/components/shared/user-menu.tsx`
- Create: `apps/web/components/ui/tooltip.tsx` (shadcn)
- Create: `apps/web/components/ui/avatar.tsx` (shadcn)
- Create: `apps/web/components/ui/dropdown-menu.tsx` (shadcn)

**Step 1: Install shadcn components**

```bash
cd apps/web && npx shadcn@latest add tooltip avatar dropdown-menu
```

**Step 2: Create apps/web/components/shared/theme-toggle.tsx**

```tsx
"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
```

**Step 3: Create apps/web/components/shared/sidebar.tsx**

Collapsible sidebar with:
- Grimoire logo/name at top
- Navigation items: Dashboard (Home icon), Create (PenSquare, disabled), Calendar (Calendar, disabled), Queue (ListChecks, disabled), Analytics (BarChart3, disabled), Brand (Palette, disabled), Accounts (Users, active), Settings (Settings, active)
- Disabled items show "Coming Soon" tooltip
- Collapse to icons on mobile (responsive)
- Active state highlighting based on current route
- User menu at bottom with avatar, name, org name

**Step 4: Create apps/web/components/shared/header.tsx**

Top header bar with:
- Page title (dynamic based on route)
- Theme toggle button
- Mobile sidebar trigger (hamburger menu)

**Step 5: Create apps/web/components/shared/user-menu.tsx**

Dropdown menu with:
- User avatar + name display
- "Settings" link
- "Sign out" action
- Plan badge (FREE/STARTER/PRO/TEAM)

**Step 6: Create apps/web/app/(dashboard)/layout.tsx**

```tsx
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Sidebar } from "@/components/shared/sidebar"
import { Header } from "@/components/shared/header"
import { TRPCProvider } from "@/lib/trpc/provider"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <TRPCProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar user={session.user} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </TRPCProvider>
  )
}
```

**Step 7: Commit**

```bash
git add apps/web/app/(dashboard) apps/web/components/shared
git commit -m "feat: add dashboard layout with sidebar, header, and theme toggle"
```

---

## Task 10: Dashboard Home Page

**Files:**
- Create: `apps/web/app/(dashboard)/dashboard/page.tsx`
- Create: `apps/web/components/dashboard/welcome-card.tsx`
- Create: `apps/web/components/dashboard/getting-started.tsx`
- Create: `apps/web/components/dashboard/accounts-status.tsx`

**Step 1: Create welcome card component**

Displays: "Welcome back, {name}" with quick action buttons (Create Post disabled, View Calendar disabled, Check Analytics disabled, Connect Account active). Clean card UI with gradient accent.

**Step 2: Create getting-started checklist**

Checklist with items:
- Connect your first social account (links to /dashboard/accounts)
- Set up your brand voice (disabled, Phase 2)
- Create your first post (disabled, Phase 2)
- Schedule your first post (disabled, Phase 3)

Each item shows check/unchecked state. Active items are clickable links.

**Step 3: Create accounts-status card**

Shows connected accounts count or empty state: "No accounts connected yet" with CTA button to /dashboard/accounts.

**Step 4: Create dashboard page**

```tsx
import { auth } from "@/lib/auth"
import { WelcomeCard } from "@/components/dashboard/welcome-card"
import { GettingStarted } from "@/components/dashboard/getting-started"
import { AccountsStatus } from "@/components/dashboard/accounts-status"

export default async function DashboardPage() {
  const session = await auth()

  return (
    <div className="space-y-6">
      <WelcomeCard userName={session?.user?.name ?? "there"} />
      <div className="grid gap-6 md:grid-cols-2">
        <GettingStarted />
        <AccountsStatus />
      </div>
    </div>
  )
}
```

**Step 5: Commit**

```bash
git add apps/web/app/(dashboard)/dashboard apps/web/components/dashboard
git commit -m "feat: add dashboard home page with welcome card and getting started"
```

---

## Task 11: Settings Page (Profile, Org, Billing)

**Files:**
- Create: `apps/web/app/(dashboard)/settings/page.tsx`
- Create: `apps/web/components/dashboard/settings/profile-tab.tsx`
- Create: `apps/web/components/dashboard/settings/organization-tab.tsx`
- Create: `apps/web/components/dashboard/settings/billing-tab.tsx`
- Create: `apps/web/components/ui/tabs.tsx` (shadcn)

**Step 1: Install tabs**

```bash
cd apps/web && npx shadcn@latest add tabs
```

**Step 2: Create profile tab**

Form with name field. Uses `user.updateProfile` tRPC mutation. Shows current email (read-only). Save button with loading state.

**Step 3: Create organization tab**

Form with org name field. Uses `user.updateOrganization` tRPC mutation. Shows current slug (read-only). Members list (read-only for now). Save button.

**Step 4: Create billing tab**

Shows current plan with badge. Plan comparison cards for FREE/STARTER/PRO/TEAM showing features. Upgrade buttons trigger `billing.createCheckoutSession`. "Manage Billing" button triggers `billing.createPortalSession` for existing subscribers.

**Step 5: Create settings page**

```tsx
"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileTab } from "@/components/dashboard/settings/profile-tab"
import { OrganizationTab } from "@/components/dashboard/settings/organization-tab"
import { BillingTab } from "@/components/dashboard/settings/billing-tab"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="organization">
          <OrganizationTab />
        </TabsContent>
        <TabsContent value="billing">
          <BillingTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

**Step 6: Commit**

```bash
git add apps/web/app/(dashboard)/settings apps/web/components/dashboard/settings
git commit -m "feat: add settings page with profile, organization, and billing tabs"
```

---

## Task 12: Accounts Page (Shell)

**Files:**
- Create: `apps/web/app/(dashboard)/accounts/page.tsx`
- Create: `apps/web/components/dashboard/accounts-empty.tsx`

**Step 1: Create empty state component**

Centered illustration/icon area with:
- Users icon (large, muted)
- "Connect your social accounts" heading
- "Link your Instagram, Facebook, LinkedIn, X, and TikTok accounts to start creating and scheduling content." description
- Platform icons row (Instagram, Facebook, LinkedIn, X, TikTok) all with "Coming in Phase 3" tooltip
- Each platform icon is a disabled button showing the platform's brand color

**Step 2: Create accounts page**

```tsx
import { AccountsEmpty } from "@/components/dashboard/accounts-empty"

export default function AccountsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Connected Accounts</h1>
      <AccountsEmpty />
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add apps/web/app/(dashboard)/accounts apps/web/components/dashboard/accounts-empty.tsx
git commit -m "feat: add accounts page with empty state"
```

---

## Task 13: Stripe Webhook Handler

**Files:**
- Create: `apps/web/app/api/webhooks/stripe/route.ts`

**Step 1: Create webhook handler**

```typescript
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { prisma } from "@grimoire/db"
import type { Plan } from "@grimoire/db"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

const PRICE_TO_PLAN: Record<string, Plan> = {
  [process.env.STRIPE_STARTER_MONTHLY_PRICE_ID ?? ""]: "STARTER",
  [process.env.STRIPE_STARTER_ANNUAL_PRICE_ID ?? ""]: "STARTER",
  [process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? ""]: "PRO",
  [process.env.STRIPE_PRO_ANNUAL_PRICE_ID ?? ""]: "PRO",
  [process.env.STRIPE_TEAM_MONTHLY_PRICE_ID ?? ""]: "TEAM",
  [process.env.STRIPE_TEAM_ANNUAL_PRICE_ID ?? ""]: "TEAM",
}

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    )
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      const orgId = session.metadata?.organizationId
      if (orgId && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        )
        const priceId = subscription.items.data[0]?.price.id ?? ""
        const plan = PRICE_TO_PLAN[priceId] ?? "FREE"

        await prisma.organization.update({
          where: { id: orgId },
          data: {
            plan,
            stripeCustomerId: session.customer as string,
            planExpiresAt: new Date(
              subscription.current_period_end * 1000
            ),
          },
        })
      }
      break
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      const priceId = subscription.items.data[0]?.price.id ?? ""
      const plan = PRICE_TO_PLAN[priceId] ?? "FREE"

      await prisma.organization.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          plan,
          planExpiresAt: new Date(
            subscription.current_period_end * 1000
          ),
        },
      })
      break
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      await prisma.organization.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          plan: "FREE",
          planExpiresAt: null,
        },
      })
      break
    }
  }

  return NextResponse.json({ received: true })
}
```

**Step 2: Commit**

```bash
git add apps/web/app/api/webhooks
git commit -m "feat: add Stripe webhook handler for subscription lifecycle"
```

---

## Task 14: Landing Page

**Files:**
- Modify: `apps/web/app/(marketing)/page.tsx`
- Create: `apps/web/app/(marketing)/layout.tsx`

**Step 1: Create marketing layout**

```tsx
import Link from "next/link"
import { ThemeToggle } from "@/components/shared/theme-toggle"

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold">
            Grimoire
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Grimoire. Your Marketing Wingman.
        </div>
      </footer>
    </div>
  )
}
```

**Step 2: Build landing page**

Full landing page with sections:
- **Hero:** "Your Marketing Wingman" headline, subtext about replacing 3-5 tools, CTA buttons
- **Problem:** "Stop juggling 5 tools" with pain point cards
- **Solution:** 3 key differentiators (flat pricing, end-to-end workflow, quality over quantity)
- **Pricing:** 4 plan cards (Free, Starter, Pro, Team) with feature lists
- **CTA:** Final call-to-action with signup button

All responsive, dark mode compatible, clean Notion/Linear aesthetic.

**Step 3: Commit**

```bash
git add apps/web/app/(marketing)
git commit -m "feat: add marketing landing page with hero, pricing, and CTA sections"
```

---

## Task 15: Organization Auto-Creation + Middleware

**Files:**
- Create: `apps/web/middleware.ts`

**Step 1: Create middleware**

```typescript
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAuthPage =
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/signup") ||
    req.nextUrl.pathname.startsWith("/forgot-password")
  const isDashboard = req.nextUrl.pathname.startsWith("/dashboard")

  if (isDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup", "/forgot-password"],
}
```

**Step 2: Add org auto-creation to dashboard layout**

In the dashboard layout, after auth check, call `user.ensureOrganization` tRPC mutation server-side to guarantee the user has an org before rendering any dashboard page.

**Step 3: Commit**

```bash
git add apps/web/middleware.ts apps/web/app/(dashboard)/layout.tsx
git commit -m "feat: add auth middleware and organization auto-creation"
```

---

## Task 16: Final Integration + Install

**Step 1: Run pnpm install from root**

```bash
cd C:/Users/Nathaniel/Documents/Grimoire && pnpm install
```

**Step 2: Start Docker services**

```bash
docker compose up -d
```

**Step 3: Copy .env.example to .env and fill values**

```bash
cp .env.example .env
```

Generate NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

**Step 4: Generate Prisma client and run migration**

```bash
pnpm db:generate
pnpm db:migrate
```

**Step 5: Verify dev server starts**

```bash
pnpm dev
```

Navigate to http://localhost:3000 — should see landing page.

**Step 6: Verify auth flow**

- Navigate to /signup, create account
- Should redirect to /dashboard
- Sidebar, header, theme toggle should all work
- Settings page should load with tabs

**Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete Phase 1 foundation — monorepo, auth, dashboard, Stripe"
```

---

## Summary

Phase 1 delivers:
- Turborepo monorepo with 3 packages (db, api, shared) + 1 app (web)
- Full Prisma schema with 10 models covering all phases
- NextAuth v5 with email/password + Google OAuth
- tRPC API layer with user and billing routers
- Dashboard shell with collapsible sidebar, theme toggle, responsive layout
- Auth pages (login, signup, forgot-password)
- Dashboard home with welcome card and getting-started checklist
- Settings page with profile, organization, and billing tabs
- Stripe integration (checkout, portal, webhook handler)
- Accounts page with empty state
- Marketing landing page with hero, pricing, CTA
- Auth middleware protecting dashboard routes
- Organization auto-creation on first login
- Dark mode from day one
- Docker Compose for local Postgres + Redis

**Environment variables needed before running:**
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — Random 32-byte base64 string
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — From Google Cloud Console
- `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` — From Stripe Dashboard
- `STRIPE_WEBHOOK_SECRET` — From Stripe CLI or Dashboard
- `STRIPE_*_PRICE_ID` — Create products/prices in Stripe Dashboard
