import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, protectedProcedure, roleProtectedProcedure } from "../trpc"
import { PLANS } from "@grimoire/shared"
import type { PlanKey } from "@grimoire/shared"

export const invitationRouter = createTRPCRouter({
  create: roleProtectedProcedure("ADMIN")
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
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
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          invitedById: ctx.session.user.id,
          organizationId: ctx.organization.id,
        },
      })

      // Send invite email (non-blocking)
      try {
        const { sendInvitationEmail } = await import("../lib/email")
        const inviter = await ctx.prisma.user.findUnique({
          where: { id: ctx.session.user.id },
        })
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

      return invitation
    }),

  list: roleProtectedProcedure("ADMIN").query(async ({ ctx }) => {
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
        where: {
          id: input.id,
          organizationId: ctx.organization.id,
          status: "PENDING",
        },
      })
      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        })
      }

      return ctx.prisma.invitation.update({
        where: { id: input.id },
        data: { status: "REVOKED" },
      })
    }),

  accept: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.prisma.invitation.findUnique({
        where: { token: input.token },
        include: { organization: true },
      })

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid invitation",
        })
      }
      if (invitation.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation is no longer valid",
        })
      }
      if (invitation.expiresAt < new Date()) {
        await ctx.prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: "EXPIRED" },
        })
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation has expired",
        })
      }

      const existingMembership =
        await ctx.prisma.organizationMember.findFirst({
          where: {
            userId: ctx.session.user.id,
            organizationId: invitation.organizationId,
          },
        })

      if (existingMembership) {
        await ctx.prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: "ACCEPTED" },
        })
        return {
          organizationId: invitation.organizationId,
          organizationName: invitation.organization.name,
        }
      }

      await ctx.prisma.organizationMember.create({
        data: {
          userId: ctx.session.user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      })

      await ctx.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED" },
      })

      return {
        organizationId: invitation.organizationId,
        organizationName: invitation.organization.name,
      }
    }),
})
