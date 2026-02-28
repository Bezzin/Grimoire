import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"

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
})
