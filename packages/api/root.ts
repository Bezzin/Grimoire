import { createTRPCRouter } from "./trpc"
import { userRouter } from "./routers/user"
import { billingRouter } from "./routers/billing"

export const appRouter = createTRPCRouter({
  user: userRouter,
  billing: billingRouter,
})

export type AppRouter = typeof appRouter
