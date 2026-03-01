import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, orgProtectedProcedure } from "../trpc"
import { PLANS } from "@grimoire/shared"
import type { PlanKey } from "@grimoire/shared"

const assetTypeEnum = z.enum([
  "LOGO",
  "FONT",
  "COLOR_PALETTE",
  "GUIDELINE_PDF",
  "PRODUCT_PHOTO",
  "STYLE_REFERENCE",
])

export const brandAssetRouter = createTRPCRouter({
  create: orgProtectedProcedure
    .input(
      z.object({
        brandProfileId: z.string(),
        type: assetTypeEnum,
        name: z.string().min(1).max(200),
        url: z.string().url(),
        fileSize: z.number().int().positive(),
        mimeType: z.string(),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.prisma.brandProfile.findFirst({
        where: { id: input.brandProfileId, organizationId: ctx.organization.id },
      })
      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Brand profile not found" })
      }

      const planConfig = PLANS[ctx.organization.plan as PlanKey]
      if (planConfig.brandAssets !== -1) {
        const currentCount = await ctx.prisma.brandAsset.count({
          where: { organizationId: ctx.organization.id },
        })
        if (currentCount >= planConfig.brandAssets) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `You've reached your limit of ${planConfig.brandAssets} brand assets. Upgrade to upload more.`,
          })
        }
      }

      return ctx.prisma.brandAsset.create({
        data: {
          type: input.type,
          name: input.name,
          url: input.url,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          metadata: input.metadata ?? undefined,
          brandProfileId: input.brandProfileId,
          organizationId: ctx.organization.id,
        },
      })
    }),

  listByProfile: orgProtectedProcedure
    .input(z.object({ brandProfileId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.brandAsset.findMany({
        where: {
          brandProfileId: input.brandProfileId,
          organizationId: ctx.organization.id,
        },
        orderBy: { createdAt: "desc" },
      })
    }),

  delete: orgProtectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const asset = await ctx.prisma.brandAsset.findFirst({
        where: { id: input.id, organizationId: ctx.organization.id },
      })

      if (!asset) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Asset not found" })
      }

      return ctx.prisma.brandAsset.delete({ where: { id: input.id } })
    }),

  getUsage: orgProtectedProcedure.query(async ({ ctx }) => {
    const planConfig = PLANS[ctx.organization.plan as PlanKey]
    const count = await ctx.prisma.brandAsset.count({
      where: { organizationId: ctx.organization.id },
    })
    return {
      used: count,
      limit: planConfig.brandAssets === -1 ? null : planConfig.brandAssets,
      unlimited: planConfig.brandAssets === -1,
    }
  }),
})
