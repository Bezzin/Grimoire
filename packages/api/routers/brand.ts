import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, orgProtectedProcedure } from "../trpc"
import {
  ingestBrandExamples,
  retrieveBrandContext,
  formatBrandContext,
  getModel,
} from "@grimoire/ai"
import { streamText } from "ai"
import { PLANS } from "@grimoire/shared"
import type { PlanKey } from "@grimoire/shared"

export const brandRouter = createTRPCRouter({
  create: orgProtectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        toneKeywords: z.array(z.string()).min(1).max(10),
        avoidKeywords: z.array(z.string()).max(50).default([]),
        exampleContent: z.array(z.string()).max(20).default([]),
        isDefault: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.isDefault) {
        await ctx.prisma.brandProfile.updateMany({
          where: { organizationId: ctx.organization.id, isDefault: true },
          data: { isDefault: false },
        })
      }

      const profile = await ctx.prisma.brandProfile.create({
        data: {
          name: input.name,
          description: input.description,
          toneKeywords: input.toneKeywords,
          avoidKeywords: input.avoidKeywords,
          exampleContent: input.exampleContent,
          isDefault: input.isDefault,
          organizationId: ctx.organization.id,
          vectorNamespace: `org:${ctx.organization.id}:brand:`,
        },
      })

      const updated = await ctx.prisma.brandProfile.update({
        where: { id: profile.id },
        data: {
          vectorNamespace: `org:${ctx.organization.id}:brand:${profile.id}`,
        },
      })

      const planConfig = PLANS[ctx.organization.plan as PlanKey]
      if (planConfig.brandVoiceRag && input.exampleContent.length > 0) {
        try {
          await ingestBrandExamples({
            orgId: ctx.organization.id,
            profileId: profile.id,
            examples: input.exampleContent,
          })
        } catch (error) {
          console.error("Failed to ingest brand examples:", error)
        }
      }

      return updated
    }),

  update: orgProtectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        toneKeywords: z.array(z.string()).min(1).max(10).optional(),
        avoidKeywords: z.array(z.string()).max(50).optional(),
        exampleContent: z.array(z.string()).max(20).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.brandProfile.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
      })

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Brand profile not found" })
      }

      const { id, ...updateData } = input
      const updated = await ctx.prisma.brandProfile.update({
        where: { id },
        data: updateData,
      })

      if (input.exampleContent) {
        const planConfig = PLANS[ctx.organization.plan as PlanKey]
        if (planConfig.brandVoiceRag && input.exampleContent.length > 0) {
          try {
            await ingestBrandExamples({
              orgId: ctx.organization.id,
              profileId: id,
              examples: input.exampleContent,
            })
          } catch (error) {
            console.error("Failed to re-ingest brand examples:", error)
          }
        }
      }

      return updated
    }),

  list: orgProtectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.brandProfile.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    })
  }),

  getById: orgProtectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const profile = await ctx.prisma.brandProfile.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
      })

      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Brand profile not found" })
      }

      return profile
    }),

  setDefault: orgProtectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.prisma.brandProfile.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
      })

      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Brand profile not found" })
      }

      await ctx.prisma.brandProfile.updateMany({
        where: { organizationId: ctx.organization.id, isDefault: true },
        data: { isDefault: false },
      })

      return ctx.prisma.brandProfile.update({
        where: { id: input.id },
        data: { isDefault: true },
      })
    }),

  delete: orgProtectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.prisma.brandProfile.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
      })

      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Brand profile not found" })
      }

      return ctx.prisma.brandProfile.delete({
        where: { id: input.id },
      })
    }),

  testVoice: orgProtectedProcedure
    .input(
      z.object({
        profileId: z.string(),
        sampleTopic: z.string().min(1).max(300).default("our latest product update"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.prisma.brandProfile.findFirst({
        where: { id: input.profileId, organizationId: ctx.organization.id },
      })

      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Brand profile not found" })
      }

      const planConfig = PLANS[ctx.organization.plan as PlanKey]
      let brandContextStr = ""

      if (planConfig.brandVoiceRag) {
        const brandContext = await retrieveBrandContext({
          orgId: ctx.organization.id,
          profileId: profile.id,
          query: input.sampleTopic,
          toneKeywords: profile.toneKeywords,
          avoidKeywords: profile.avoidKeywords,
        })
        brandContextStr = formatBrandContext(brandContext)
      } else {
        brandContextStr = `Brand Voice Context:\n- Tone: ${profile.toneKeywords.join(", ")}\n- Avoid: ${profile.avoidKeywords.join(", ")}`
      }

      const model = getModel({ tier: "fast" })
      const result = await streamText({
        model,
        system: `You are a marketing copywriter. Write a short sample social media post to demonstrate brand voice.\n\n${brandContextStr}`,
        prompt: `Write a short social media post about: ${input.sampleTopic}`,
      })

      let text = ""
      for await (const chunk of result.textStream) {
        text += chunk
      }

      return { text, model: "openai/gpt-4o-mini" }
    }),

  ingestExamples: orgProtectedProcedure
    .input(z.object({ profileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const planConfig = PLANS[ctx.organization.plan as PlanKey]
      if (!planConfig.brandVoiceRag) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Brand Voice RAG requires Pro or Team plan.",
        })
      }

      const profile = await ctx.prisma.brandProfile.findFirst({
        where: { id: input.profileId, organizationId: ctx.organization.id },
      })

      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Brand profile not found" })
      }

      if (profile.exampleContent.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No examples to ingest. Add examples first.",
        })
      }

      const result = await ingestBrandExamples({
        orgId: ctx.organization.id,
        profileId: profile.id,
        examples: profile.exampleContent,
      })

      return result
    }),
})
