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
