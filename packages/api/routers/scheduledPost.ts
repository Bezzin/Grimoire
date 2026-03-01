import { z } from "zod"
import { TRPCError } from "@trpc/server"
import {
  createTRPCRouter,
  orgProtectedProcedure,
  roleProtectedProcedure,
} from "../trpc"
import { PLANS } from "@grimoire/shared"
import type { PlanKey } from "@grimoire/shared"

export const scheduledPostRouter = createTRPCRouter({
  create: roleProtectedProcedure("MEMBER")
    .input(
      z.object({
        contentItemId: z.string(),
        posts: z
          .array(
            z.object({
              socialAccountId: z.string(),
              scheduledFor: z.string().datetime(),
            }),
          )
          .min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Plan gating
      const planConfig = PLANS[ctx.organization.plan as PlanKey]
      if (!planConfig.scheduling) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Content scheduling requires a Starter plan or higher.",
        })
      }

      // Validate content item
      const contentItem = await ctx.prisma.contentItem.findFirst({
        where: {
          id: input.contentItemId,
          organizationId: ctx.organization.id,
        },
      })
      if (!contentItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Content item not found",
        })
      }

      // Validate social accounts
      const accountIds = input.posts.map((p) => p.socialAccountId)
      const accounts = await ctx.prisma.socialAccount.findMany({
        where: { id: { in: accountIds }, organizationId: ctx.organization.id },
      })
      if (accounts.length !== accountIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "One or more social accounts not found",
        })
      }

      // Create scheduled posts
      const created = await ctx.prisma.$transaction(
        input.posts.map((post) =>
          ctx.prisma.scheduledPost.create({
            data: {
              scheduledFor: new Date(post.scheduledFor),
              contentItemId: input.contentItemId,
              socialAccountId: post.socialAccountId,
              organizationId: ctx.organization.id,
              status: "QUEUED",
            },
          }),
        ),
      )

      // Update content item status
      await ctx.prisma.contentItem.update({
        where: { id: input.contentItemId },
        data: { status: "SCHEDULED" },
      })

      return { count: created.length, posts: created }
    }),

  list: orgProtectedProcedure
    .input(
      z.object({
        status: z
          .enum(["QUEUED", "PROCESSING", "PUBLISHED", "FAILED", "CANCELLED"])
          .optional(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.prisma.scheduledPost.findMany({
        where: {
          organizationId: ctx.organization.id,
          ...(input.status ? { status: input.status } : {}),
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { scheduledFor: "desc" },
        include: {
          contentItem: {
            select: {
              id: true,
              title: true,
              body: true,
              type: true,
              mediaUrls: true,
            },
          },
          socialAccount: {
            select: {
              id: true,
              platform: true,
              displayName: true,
              platformUsername: true,
              avatarUrl: true,
            },
          },
        },
      })

      let nextCursor: string | undefined
      if (items.length > input.limit) {
        const nextItem = items.pop()
        nextCursor = nextItem?.id
      }

      return { items, nextCursor }
    }),

  cancel: roleProtectedProcedure("MEMBER")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.prisma.scheduledPost.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
      })
      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Scheduled post not found",
        })
      }
      if (post.status !== "QUEUED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only queued posts can be cancelled",
        })
      }
      return ctx.prisma.scheduledPost.update({
        where: { id: input.id },
        data: { status: "CANCELLED" },
      })
    }),

  reschedule: roleProtectedProcedure("MEMBER")
    .input(
      z.object({
        id: z.string(),
        scheduledFor: z.string().datetime(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.prisma.scheduledPost.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
      })
      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Scheduled post not found",
        })
      }
      if (post.status !== "QUEUED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only queued posts can be rescheduled",
        })
      }
      return ctx.prisma.scheduledPost.update({
        where: { id: input.id },
        data: { scheduledFor: new Date(input.scheduledFor) },
      })
    }),

  retry: roleProtectedProcedure("MEMBER")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.prisma.scheduledPost.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
      })
      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Scheduled post not found",
        })
      }
      if (post.status !== "FAILED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only failed posts can be retried",
        })
      }
      return ctx.prisma.scheduledPost.update({
        where: { id: input.id },
        data: { status: "QUEUED", errorMessage: null },
      })
    }),

  getByContentItem: orgProtectedProcedure
    .input(z.object({ contentItemId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.scheduledPost.findMany({
        where: {
          contentItemId: input.contentItemId,
          organizationId: ctx.organization.id,
        },
        include: {
          socialAccount: {
            select: {
              platform: true,
              displayName: true,
              platformUsername: true,
            },
          },
        },
        orderBy: { scheduledFor: "asc" },
      })
    }),

  getByDateRange: orgProtectedProcedure
    .input(
      z.object({
        start: z.string().datetime(),
        end: z.string().datetime(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.scheduledPost.findMany({
        where: {
          organizationId: ctx.organization.id,
          scheduledFor: {
            gte: new Date(input.start),
            lte: new Date(input.end),
          },
        },
        include: {
          contentItem: {
            select: { id: true, title: true, body: true, type: true },
          },
          socialAccount: {
            select: { platform: true, displayName: true },
          },
        },
        orderBy: { scheduledFor: "asc" },
      })
    }),
})
