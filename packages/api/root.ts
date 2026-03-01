import { createTRPCRouter } from "./trpc"
import { userRouter } from "./routers/user"
import { billingRouter } from "./routers/billing"
import { brandRouter } from "./routers/brand"
import { brandAssetRouter } from "./routers/brandAsset"
import { contentRouter } from "./routers/content"
import { customTemplateRouter } from "./routers/customTemplate"
import { socialAccountRouter } from "./routers/socialAccount"

export const appRouter = createTRPCRouter({
  user: userRouter,
  billing: billingRouter,
  brand: brandRouter,
  brandAsset: brandAssetRouter,
  content: contentRouter,
  customTemplate: customTemplateRouter,
  socialAccount: socialAccountRouter,
})

export type AppRouter = typeof appRouter
