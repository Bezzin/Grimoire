# Phase 4A: Client Workspaces + Team Collaboration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add multi-client workspace switching, AGENCY plan, team invitations via Resend email, and role-based access control so solo marketers can manage multiple clients from one login.

**Architecture:** The active organization ID is stored in a cookie (`x-org-id`). `orgProtectedProcedure` reads this cookie to determine which org to scope all queries to. A client switcher dropdown in the sidebar lets users flip between orgs. Invitations use a unique token emailed via Resend; accepting an invite adds the user to the org. A new `roleProtectedProcedure` middleware enforces minimum role requirements per procedure.

**Tech Stack:** Prisma (Invitation model), Resend (email), Next.js cookies (org context), tRPC middleware (RBAC), React (client switcher UI, invite modal)

---

### Task 1: Install Resend + Add Env Vars + AGENCY Plan

**Files:**
- Modify: `apps/web/package.json` (add resend)
- Modify: `packages/shared/constants/plans.ts` (add AGENCY plan)
- Modify: `packages/db/prisma/schema.prisma` (add AGENCY to Plan enum)
- Modify: `.env` (add RESEND_API_KEY=, CRON_SECRET=)

**Step 1: Install resend in apps/web**

```bash
cd apps/web && pnpm add resend
```

**Step 2: Add AGENCY to Plan enum in schema.prisma**

```prisma
enum Plan {
  FREE
  STARTER
  PRO
  TEAM
  AGENCY
}
```

**Step 3: Add AGENCY plan to plans.ts**

```typescript
AGENCY: {
  name: "Agency",
  price: 14900,
  priceAnnual: 124167,
  socialAccounts: 25,
  aiGenerationsPerMonth: -1,
  scheduling: true,
  analytics: true,
  brandVoiceRag: true,
  teamSeats: 3,
  brandAssets: -1,
  customTemplates: -1,
  videoGeneration: true,
  maxOrganizations: 10,
},
```

Also add `maxOrganizations` to all existing plans:
- FREE: `maxOrganizations: 1`
- STARTER: `maxOrganizations: 1`
- PRO: `maxOrganizations: 1`
- TEAM: `maxOrganizations: 1`
- AGENCY: `maxOrganizations: 10`

**Step 4: Add env vars to .env**

```
RESEND_API_KEY=
CRON_SECRET=
```

**Step 5: Run Prisma push + generate**

```bash
cd packages/db && npx prisma db push && npx prisma generate
```

**Step 6: Commit**

```bash
git add packages/shared/constants/plans.ts packages/db/prisma/schema.prisma apps/web/package.json pnpm-lock.yaml
git commit -m "feat: add AGENCY plan and install Resend for team invitations"
```

---

### Task 2: Add Invitation Model to Schema

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

**Step 1: Add Invitation model and InvitationStatus enum**

Add after the Organization relations section:

```prisma
model Invitation {
  id             String           @id @default(cuid())
  email          String
  role           OrgRole          @default(MEMBER)
  token          String           @unique @default(cuid())
  expiresAt      DateTime
  status         InvitationStatus @default(PENDING)
  invitedById    String
  organizationId String
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  invitedBy    User         @relation(fields: [invitedById], references: [id])
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

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

Also add the `invitations` relation to the Organization model:
```prisma
// In Organization model, add:
invitations     Invitation[]
```

And add the `invitations` relation to the User model:
```prisma
// In User model, add:
invitations     Invitation[]
```

**Step 2: Run Prisma push + generate**

```bash
cd packages/db && npx prisma db push && npx prisma generate
```

**Step 3: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "feat: add Invitation model with token-based email invites"
```

---

### Task 3: Multi-Org Context — Cookie-Based Org Switching

**Files:**
- Modify: `packages/api/trpc.ts` (update orgProtectedProcedure to read org cookie)
- Create: `apps/web/lib/org-context.ts` (cookie helpers)
- Modify: `apps/web/app/(dashboard)/layout.tsx` (pass org context)

**Step 1: Create org context cookie helpers**

Create `apps/web/lib/org-context.ts`:

```typescript
import { cookies } from "next/headers"

const ORG_COOKIE = "grimoire-org-id"

export async function getActiveOrgId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(ORG_COOKIE)?.value ?? null
}

export async function setActiveOrgId(orgId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(ORG_COOKIE, orgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  })
}
```

**Step 2: Update orgProtectedProcedure in trpc.ts**

Currently it does `findFirst` to grab any org. Change it to:
1. Read `x-org-id` header from the request (passed by the tRPC client)
2. If present, validate membership for that specific org
3. If absent, fall back to first membership (backwards compatible)

```typescript
export const orgProtectedProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  // Read the active org ID from request header (set by tRPC client)
  const activeOrgId = ctx.activeOrgId ?? null

  const membership = activeOrgId
    ? await ctx.prisma.organizationMember.findFirst({
        where: { userId: ctx.session.user.id, organizationId: activeOrgId },
        include: { organization: true },
      })
    : await ctx.prisma.organizationMember.findFirst({
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

Also update `createTRPCContext` to accept `activeOrgId`:

```typescript
export interface CreateContextOptions {
  session: {
    user?: {
      id?: string
      email?: string | null
      name?: string | null
      image?: string | null
    }
  } | null
  activeOrgId?: string | null
}

export const createTRPCContext = (opts: CreateContextOptions) => {
  return {
    session: opts.session,
    prisma,
    activeOrgId: opts.activeOrgId ?? null,
  }
}
```

**Step 3: Update tRPC API handler to pass org cookie**

Find `apps/web/app/api/trpc/[trpc]/route.ts` and update the context creation to read the `grimoire-org-id` cookie and pass it as `activeOrgId`.

**Step 4: Update tRPC client to send org header**

Find `apps/web/lib/trpc/client.ts` and add a custom header that reads the org cookie and sends it with every request. Alternatively, since the server-side context already reads cookies, this may only be needed for the client-side tRPC link.

**Step 5: Commit**

```bash
git add packages/api/trpc.ts apps/web/lib/org-context.ts apps/web/app/api/trpc/[trpc]/route.ts apps/web/lib/trpc/client.ts
git commit -m "feat: add cookie-based multi-org context switching"
```

---

### Task 4: User Router — List Orgs, Create Org, Switch Org

**Files:**
- Modify: `packages/api/routers/user.ts`
- Create: `apps/web/app/api/org/switch/route.ts`

**Step 1: Add listOrganizations query to user router**

```typescript
listOrganizations: protectedProcedure.query(async ({ ctx }) => {
  const memberships = await ctx.prisma.organizationMember.findMany({
    where: { userId: ctx.session.user.id },
    include: {
      organization: {
        select: { id: true, name: true, slug: true, plan: true },
      },
    },
    orderBy: { createdAt: "asc" },
  })
  return memberships.map((m) => ({
    ...m.organization,
    role: m.role,
  }))
}),
```

**Step 2: Add createOrganization mutation**

```typescript
createOrganization: protectedProcedure
  .input(z.object({
    name: z.string().min(1).max(100),
  }))
  .mutation(async ({ ctx, input }) => {
    // Check workspace limit based on the user's highest plan
    const memberships = await ctx.prisma.organizationMember.findMany({
      where: { userId: ctx.session.user.id },
      include: { organization: true },
    })

    const highestPlan = memberships.reduce((best, m) => {
      const planOrder = { FREE: 0, STARTER: 1, PRO: 2, TEAM: 3, AGENCY: 4 }
      const current = planOrder[m.organization.plan as keyof typeof planOrder] ?? 0
      const bestVal = planOrder[best as keyof typeof planOrder] ?? 0
      return current > bestVal ? m.organization.plan : best
    }, "FREE" as string)

    const planConfig = PLANS[highestPlan as PlanKey]
    const maxOrgs = planConfig.maxOrganizations ?? 1
    if (memberships.length >= maxOrgs) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `You can create up to ${maxOrgs} client workspaces on your current plan.`,
      })
    }

    const org = await ctx.prisma.organization.create({
      data: {
        name: input.name,
        slug: generateSlug(input.name) + "-" + Date.now().toString(36),
        members: {
          create: {
            userId: ctx.session.user.id,
            role: "OWNER",
          },
        },
      },
    })

    return org
  }),
```

**Step 3: Create org switch API route**

Create `apps/web/app/api/org/switch/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@grimoire/db"
import { cookies } from "next/headers"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { organizationId } = await req.json() as { organizationId: string }

  // Verify membership
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id, organizationId },
  })

  if (!membership) {
    return new Response("Not a member of this organization", { status: 403 })
  }

  const cookieStore = await cookies()
  cookieStore.set("grimoire-org-id", organizationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  })

  return NextResponse.json({ success: true })
}
```

**Step 4: Commit**

```bash
git add packages/api/routers/user.ts apps/web/app/api/org/switch/route.ts
git commit -m "feat: add listOrganizations, createOrganization, and org switch API"
```

---

### Task 5: RBAC — roleProtectedProcedure Middleware

**Files:**
- Modify: `packages/api/trpc.ts`

**Step 1: Add roleProtectedProcedure**

After `orgProtectedProcedure`, add a factory function:

```typescript
const ROLE_HIERARCHY: Record<string, number> = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
}

export function roleProtectedProcedure(minimumRole: "VIEWER" | "MEMBER" | "ADMIN" | "OWNER") {
  return orgProtectedProcedure.use(async ({ ctx, next }) => {
    const userRoleLevel = ROLE_HIERARCHY[ctx.membership.role] ?? 0
    const requiredLevel = ROLE_HIERARCHY[minimumRole] ?? 0

    if (userRoleLevel < requiredLevel) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `This action requires ${minimumRole} role or higher.`,
      })
    }

    return next({ ctx })
  })
}
```

**Step 2: Commit**

```bash
git add packages/api/trpc.ts
git commit -m "feat: add roleProtectedProcedure RBAC middleware"
```

---

### Task 6: Invitation tRPC Router

**Files:**
- Create: `packages/api/routers/invitation.ts`
- Modify: `packages/api/root.ts` (register router)

**Step 1: Create invitation router**

Create `packages/api/routers/invitation.ts`:

```typescript
import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, publicProcedure, roleProtectedProcedure } from "../trpc"
import { PLANS } from "@grimoire/shared"
import type { PlanKey } from "@grimoire/shared"

export const invitationRouter = createTRPCRouter({
  create: roleProtectedProcedure("ADMIN")
    .input(z.object({
      email: z.string().email(),
      role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check seat limit
      const planConfig = PLANS[ctx.organization.plan as PlanKey]
      const memberCount = await ctx.prisma.organizationMember.count({
        where: { organizationId: ctx.organization.id },
      })
      const pendingCount = await ctx.prisma.invitation.count({
        where: { organizationId: ctx.organization.id, status: "PENDING" },
      })
      if (memberCount + pendingCount >= planConfig.teamSeats) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Your plan allows ${planConfig.teamSeats} team seats. Upgrade for more.`,
        })
      }

      // Check if already a member
      const existingMember = await ctx.prisma.user.findFirst({
        where: {
          email: input.email,
          organizations: { some: { organizationId: ctx.organization.id } },
        },
      })
      if (existingMember) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This person is already a member of this workspace.",
        })
      }

      // Check for existing pending invite
      const existingInvite = await ctx.prisma.invitation.findFirst({
        where: {
          email: input.email,
          organizationId: ctx.organization.id,
          status: "PENDING",
        },
      })
      if (existingInvite) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An invitation has already been sent to this email.",
        })
      }

      const invitation = await ctx.prisma.invitation.create({
        data: {
          email: input.email,
          role: input.role,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          invitedById: ctx.session.user.id,
          organizationId: ctx.organization.id,
        },
      })

      // Send email via Resend (in a separate step — Task 7)
      // For now, just return the invitation

      return invitation
    }),

  list: roleProtectedProcedure("ADMIN")
    .query(async ({ ctx }) => {
      return ctx.prisma.invitation.findMany({
        where: { organizationId: ctx.organization.id, status: "PENDING" },
        orderBy: { createdAt: "desc" },
        include: { invitedBy: { select: { name: true } } },
      })
    }),

  revoke: roleProtectedProcedure("ADMIN")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.prisma.invitation.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id, status: "PENDING" },
      })
      if (!invitation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found" })
      }
      return ctx.prisma.invitation.update({
        where: { id: input.id },
        data: { status: "REVOKED" },
      })
    }),

  accept: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.prisma.invitation.findUnique({
        where: { token: input.token },
        include: { organization: true },
      })

      if (!invitation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid invitation" })
      }
      if (invitation.status !== "PENDING") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This invitation is no longer valid" })
      }
      if (invitation.expiresAt < new Date()) {
        await ctx.prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: "EXPIRED" },
        })
        throw new TRPCError({ code: "BAD_REQUEST", message: "This invitation has expired" })
      }

      // The caller must be authenticated
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in to accept this invitation" })
      }

      // Add user to org
      await ctx.prisma.organizationMember.create({
        data: {
          userId: ctx.session.user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      })

      // Mark invitation as accepted
      await ctx.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED" },
      })

      return { organizationId: invitation.organizationId, organizationName: invitation.organization.name }
    }),
})
```

**Step 2: Register in root.ts**

Add `invitation: invitationRouter` to the app router in `packages/api/root.ts`.

**Step 3: Commit**

```bash
git add packages/api/routers/invitation.ts packages/api/root.ts
git commit -m "feat: add invitation tRPC router with create/list/revoke/accept"
```

---

### Task 7: Resend Email Integration

**Files:**
- Create: `apps/web/lib/email.ts`
- Modify: `packages/api/routers/invitation.ts` (call email after creating invitation)

**Step 1: Create email helper**

Create `apps/web/lib/email.ts`:

```typescript
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendInvitationEmail(params: {
  to: string
  inviterName: string
  organizationName: string
  role: string
  token: string
}) {
  const acceptUrl = `${process.env.NEXTAUTH_URL}/invite/${params.token}`

  await resend.emails.send({
    from: "Grimoire <noreply@updates.grimoire.dev>",
    to: params.to,
    subject: `You've been invited to ${params.organizationName} on Grimoire`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="margin-bottom: 16px;">You're invited!</h2>
        <p>${params.inviterName} has invited you to join <strong>${params.organizationName}</strong> as a <strong>${params.role}</strong> on Grimoire.</p>
        <a href="${acceptUrl}" style="display: inline-block; margin-top: 24px; padding: 12px 24px; background: linear-gradient(135deg, #7c3aed, #db2777); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Accept Invitation</a>
        <p style="margin-top: 24px; color: #666; font-size: 14px;">This invitation expires in 7 days.</p>
      </div>
    `,
  })
}
```

Note: The `from` address requires a verified domain on Resend. During development, use `onboarding@resend.dev` or skip sending if `RESEND_API_KEY` is empty.

**Step 2: Wire email sending into invitation.create**

In the `invitation.create` mutation, after creating the invitation, add:

```typescript
// Send invite email (non-blocking — don't fail the mutation if email fails)
try {
  const { sendInvitationEmail } = await import("@/lib/email")
  const inviter = await ctx.prisma.user.findUnique({ where: { id: ctx.session.user.id } })
  await sendInvitationEmail({
    to: input.email,
    inviterName: inviter?.name ?? "A team member",
    organizationName: ctx.organization.name,
    role: input.role,
    token: invitation.token,
  })
} catch (err) {
  console.error("Failed to send invitation email:", err)
}
```

Note: Since the invitation router is in `packages/api/` and the email helper is in `apps/web/lib/`, the import may need adjustment. The alternative is to create an API route (`/api/email/send-invite`) that the router calls, or move the email helper to `packages/api/lib/email.ts`. The implementer should choose the cleanest approach that works with the monorepo setup — likely creating the email module in `packages/api/lib/` since it needs to be callable from tRPC procedures.

**Step 3: Commit**

```bash
git add apps/web/lib/email.ts packages/api/routers/invitation.ts
git commit -m "feat: send invitation emails via Resend"
```

---

### Task 8: Invite Accept Page

**Files:**
- Create: `apps/web/app/invite/[token]/page.tsx`

**Step 1: Create the invite acceptance page**

This page:
1. Reads the `token` from the URL params
2. If user is not signed in, shows "Sign in to accept" button (redirects to /login with ?callbackUrl=/invite/{token})
3. If user is signed in, calls `invitation.accept` mutation with the token
4. On success, switches to the new org (sets cookie) and redirects to /dashboard
5. On error (expired, revoked, invalid), shows error message

```typescript
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"

export default function InvitePage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState("")
  const [orgName, setOrgName] = useState("")

  const acceptInvite = trpc.invitation.accept.useMutation({
    onSuccess: async (data) => {
      setOrgName(data.organizationName)
      setStatus("success")
      // Switch to the new org
      await fetch("/api/org/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: data.organizationId }),
      })
      setTimeout(() => router.push("/dashboard"), 2000)
    },
    onError: (err) => {
      setErrorMessage(err.message)
      setStatus("error")
    },
  })

  useEffect(() => {
    acceptInvite.mutate({ token: params.token })
  }, [params.token])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Team Invitation</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Accepting invitation...</p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="mx-auto h-8 w-8 text-green-500" />
              <p className="font-medium">Welcome to {orgName}!</p>
              <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="mx-auto h-8 w-8 text-destructive" />
              <p className="font-medium">Unable to accept invitation</p>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
              <Button onClick={() => router.push("/login")} variant="outline">
                Go to Login
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add apps/web/app/invite/[token]/page.tsx
git commit -m "feat: add invite acceptance page with auto org switch"
```

---

### Task 9: Client Switcher UI in Sidebar

**Files:**
- Modify: `apps/web/components/shared/sidebar.tsx`

**Step 1: Add client switcher dropdown**

Replace the branding section (the Sparkles icon + "Grimoire" text) with a client switcher that shows:
- Current org name (from a tRPC query `user.listOrganizations`)
- Dropdown with all orgs
- "Add New Client" button at the bottom

The switcher should:
1. Query `trpc.user.listOrganizations.useQuery()`
2. Determine the active org (first org or from cookie — can use a context/prop)
3. On click of another org, call `fetch("/api/org/switch", { ... })` and `router.refresh()`
4. On "Add New Client", show a dialog with a name input, call `trpc.user.createOrganization.useMutation()`

Keep the Grimoire logo/branding but move it smaller, and make the org name the prominent element in the sidebar header.

Use a Popover component (from shadcn/ui) for the dropdown, with a list of org items and a separator before "Add New Client".

**Step 2: Pass the active org ID**

The sidebar needs to know which org is active. The dashboard layout should read the `grimoire-org-id` cookie and pass it as a prop, or the sidebar can read from the `listOrganizations` response and compare with a cookie.

Simplest approach: the sidebar fetches `user.listOrganizations` and the `getActiveOrgId()` cookie value is passed down from the dashboard layout as a prop.

**Step 3: Commit**

```bash
git add apps/web/components/shared/sidebar.tsx apps/web/app/(dashboard)/layout.tsx
git commit -m "feat: add client workspace switcher in sidebar"
```

---

### Task 10: Team Management UI in Settings

**Files:**
- Modify: `apps/web/components/dashboard/settings/organization-tab.tsx`

**Step 1: Replace disabled "Invite Members" button with working invite modal**

The invite modal should:
- Open on "Invite Members" click
- Have an email input and a role dropdown (Admin / Member / Viewer)
- Call `trpc.invitation.create.useMutation()`
- Show success/error state

**Step 2: Add pending invites section**

Below the members list, add a "Pending Invitations" section:
- Query `trpc.invitation.list.useQuery()`
- Show each pending invite: email, role badge, sent date
- "Revoke" button per invite (calls `trpc.invitation.revoke.useMutation()`)

**Step 3: Add role editing and member removal**

For each member (except the OWNER):
- Role dropdown to change role (calls a new `user.updateMemberRole` mutation)
- Remove button (calls a new `user.removeMember` mutation)

Add these two mutations to the user router:

```typescript
updateMemberRole: orgProtectedProcedure
  .input(z.object({
    memberId: z.string(),
    role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
  }))
  .mutation(async ({ ctx, input }) => { ... }),

removeMember: orgProtectedProcedure
  .input(z.object({ memberId: z.string() }))
  .mutation(async ({ ctx, input }) => { ... }),
```

Both require ADMIN+ role to execute.

**Step 4: Commit**

```bash
git add apps/web/components/dashboard/settings/organization-tab.tsx packages/api/routers/user.ts
git commit -m "feat: add team invite modal, pending invites, and member management"
```

---

### Task 11: Enable Calendar, Queue, Analytics Nav Items

**Files:**
- Modify: `apps/web/components/shared/sidebar.tsx`

**Step 1: Enable the disabled nav items**

In the `navItems` array, change:
- Calendar: `disabled: false`
- Queue: `disabled: false`
- Analytics: `disabled: false`

These pages don't have content yet (that's Phase 4B-4D), but they should no longer show as locked. Create placeholder pages if they don't exist.

**Step 2: Create placeholder pages if needed**

- `apps/web/app/(dashboard)/dashboard/calendar/page.tsx` — "Calendar — Coming in Phase 4C"
- `apps/web/app/(dashboard)/dashboard/queue/page.tsx` — "Queue — Coming in Phase 4B"
- `apps/web/app/(dashboard)/dashboard/analytics/page.tsx` — "Analytics — Coming in Phase 4D"

Simple placeholder with heading and description.

**Step 3: Commit**

```bash
git add apps/web/components/shared/sidebar.tsx apps/web/app/(dashboard)/dashboard/calendar/page.tsx apps/web/app/(dashboard)/dashboard/queue/page.tsx apps/web/app/(dashboard)/dashboard/analytics/page.tsx
git commit -m "feat: enable calendar, queue, and analytics nav items with placeholder pages"
```

---

### Task 12: Build Verification

**Step 1: Run TypeScript check**

```bash
npx tsc --noEmit --project apps/web/tsconfig.json
```

**Step 2: Fix all errors**

Expected issues:
- `maxOrganizations` property not in plan type inference (may need explicit typing)
- `roleProtectedProcedure` export/import issues
- `activeOrgId` in tRPC context type
- Cookie API types (Next.js `cookies()` is async in App Router)
- Invitation model relation types after Prisma generate

**Step 3: Run Prisma generate if needed**

```bash
cd packages/db && npx prisma generate
```

**Step 4: Commit fixes**

```bash
git add -A
git commit -m "fix: resolve Phase 4A type errors for clean build"
```
