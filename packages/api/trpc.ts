import { initTRPC, TRPCError } from "@trpc/server"
import superjson from "superjson"
import { ZodError } from "zod"
import { prisma } from "@grimoire/db"

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

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

export const createCallerFactory = t.createCallerFactory
export const createTRPCRouter = t.router

export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user?.id) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }
  return next({
    ctx: {
      session: {
        ...ctx.session,
        user: {
          ...ctx.session.user,
          id: ctx.session.user.id,
        },
      },
    },
  })
})

export const orgProtectedProcedure = protectedProcedure.use(async ({ ctx, next }) => {
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
