import { createTRPCRouter } from "./trpc"
import { userRouter } from "./routers/user"
import { billingRouter } from "./routers/billing"
import { brandRouter } from "./routers/brand"

export const appRouter = createTRPCRouter({
  user: userRouter,
  billing: billingRouter,
  brand: brandRouter,
})

export type AppRouter = typeof appRouter
