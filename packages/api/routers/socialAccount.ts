import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, orgProtectedProcedure } from "../trpc"
import { PLANS } from "@grimoire/shared"
import type { PlanKey } from "@grimoire/shared"
import { scrapePosts, analyzeVoice } from "@grimoire/ai"
import { SOCIAL_OAUTH_CONFIG } from "@grimoire/shared"
import type { SocialOAuthPlatform } from "@grimoire/shared"

const platformEnum = z.enum([
  "INSTAGRAM",
  "FACEBOOK",
  "LINKEDIN",
  "TWITTER",
  "TIKTOK",
  "THREADS",
  "YOUTUBE",
  "PINTEREST",
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found",
        })
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
})
