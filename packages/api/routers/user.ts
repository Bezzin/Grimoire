import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, protectedProcedure, orgProtectedProcedure } from "../trpc"
import { PLANS } from "@grimoire/shared"
import type { PlanKey } from "@grimoire/shared"

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

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

  createOrganization: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const memberships = await ctx.prisma.organizationMember.findMany({
        where: { userId: ctx.session.user.id },
        include: { organization: true },
      })

      const planOrder: Record<string, number> = {
        FREE: 0,
        STARTER: 1,
        PRO: 2,
        TEAM: 3,
        AGENCY: 4,
      }
      const highestPlan = memberships.reduce((best, m) => {
        const current = planOrder[m.organization.plan] ?? 0
        const bestVal = planOrder[best] ?? 0
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

      const slug =
        input.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") +
        "-" +
        Date.now().toString(36)

      const org = await ctx.prisma.organization.create({
        data: {
          name: input.name,
          slug,
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

  updateMemberRole: orgProtectedProcedure
    .input(
      z.object({
        memberId: z.string(),
        role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ROLE_HIERARCHY: Record<string, number> = { VIEWER: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 }
      if ((ROLE_HIERARCHY[ctx.membership.role] ?? 0) < ROLE_HIERARCHY.ADMIN) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can change roles." })
      }

      const member = await ctx.prisma.organizationMember.findFirst({
        where: { id: input.memberId, organizationId: ctx.organization.id },
      })
      if (!member) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" })
      }
      if (member.role === "OWNER") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot change the owner's role." })
      }

      return ctx.prisma.organizationMember.update({
        where: { id: input.memberId },
        data: { role: input.role },
      })
    }),

  removeMember: orgProtectedProcedure
    .input(z.object({ memberId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const ROLE_HIERARCHY: Record<string, number> = { VIEWER: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 }
      if ((ROLE_HIERARCHY[ctx.membership.role] ?? 0) < ROLE_HIERARCHY.ADMIN) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can remove members." })
      }

      const member = await ctx.prisma.organizationMember.findFirst({
        where: { id: input.memberId, organizationId: ctx.organization.id },
      })
      if (!member) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" })
      }
      if (member.role === "OWNER") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot remove the owner." })
      }
      if (member.userId === ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot remove yourself." })
      }

      return ctx.prisma.organizationMember.delete({ where: { id: input.memberId } })
    }),
})
