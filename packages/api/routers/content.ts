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
import { PLANS, getTemplateById } from "@grimoire/shared"
import type { PlanKey } from "@grimoire/shared"

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
      await checkAiRateLimit(ctx)

      const template = getTemplateById(input.templateId)
      if (!template) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid template ID" })
      }

      const parsed = template.inputSchema.safeParse(input.inputs)
      if (!parsed.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid inputs: ${parsed.error.message}`,
        })
      }

      let brandContextStr = ""
      let brandProfileId = input.brandProfileId

      if (brandProfileId) {
        const profile = await ctx.prisma.brandProfile.findFirst({
          where: { id: brandProfileId, organizationId: ctx.organization.id },
        })

        if (profile) {
          const planConfig = PLANS[ctx.organization.plan as PlanKey]
          if (planConfig.brandVoiceRag) {
            const brandContext = await retrieveBrandContext({
              orgId: ctx.organization.id,
              profileId: profile.id,
              query: (parsed.data as Record<string, string>).brief ?? (parsed.data as Record<string, string>).topic ?? "",
              toneKeywords: profile.toneKeywords,
              avoidKeywords: profile.avoidKeywords,
            })
            brandContextStr = formatBrandContext(brandContext)
          } else {
            brandContextStr = `Brand Voice Context:\n- Tone: ${profile.toneKeywords.join(", ")}\n- Avoid: ${profile.avoidKeywords.join(", ")}`
          }
        }
      } else {
        const defaultProfile = await ctx.prisma.brandProfile.findFirst({
          where: { organizationId: ctx.organization.id, isDefault: true },
        })
        if (defaultProfile) {
          brandProfileId = defaultProfile.id
          brandContextStr = `Brand Voice Context:\n- Tone: ${defaultProfile.toneKeywords.join(", ")}\n- Avoid: ${defaultProfile.avoidKeywords.join(", ")}`
        }
      }

      let systemPrompt = template.systemPrompt.replace("{{brandContext}}", brandContextStr)

      for (const [key, value] of Object.entries(parsed.data as Record<string, string>)) {
        systemPrompt = systemPrompt.replace(
          new RegExp(`\\{\\{${key}\\}\\}`, "g"),
          String(value ?? "")
        )
      }

      systemPrompt = systemPrompt.replace(/\{\{[^}]+\}\}/g, "")

      const modelId = getModelId(template.tier, input.preferQuality)

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
    const planConfig = PLANS[ctx.organization.plan as PlanKey]
    const limit = planConfig.aiGenerationsPerMonth
    return {
      used: ctx.organization.aiGenerationsUsed,
      limit: limit === -1 ? null : limit,
      unlimited: limit === -1,
      resetAt: ctx.organization.aiGenerationsResetAt,
    }
  }),
})
