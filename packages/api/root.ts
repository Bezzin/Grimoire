import { createTRPCRouter } from "./trpc"
import { userRouter } from "./routers/user"
import { billingRouter } from "./routers/billing"
import { brandRouter } from "./routers/brand"
import { contentRouter } from "./routers/content"

export const appRouter = createTRPCRouter({
  user: userRouter,
  billing: billingRouter,
  brand: brandRouter,
  content: contentRouter,
})

export type AppRouter = typeof appRouter
