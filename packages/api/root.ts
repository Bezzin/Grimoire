import { createTRPCRouter } from "./trpc"
import { analyticsRouter } from "./routers/analytics"
import { userRouter } from "./routers/user"
import { billingRouter } from "./routers/billing"
import { brandRouter } from "./routers/brand"
import { brandAssetRouter } from "./routers/brandAsset"
import { contentRouter } from "./routers/content"
import { customTemplateRouter } from "./routers/customTemplate"
import { invitationRouter } from "./routers/invitation"
import { scheduledPostRouter } from "./routers/scheduledPost"
import { socialAccountRouter } from "./routers/socialAccount"

export const appRouter = createTRPCRouter({
  analytics: analyticsRouter,
  user: userRouter,
  billing: billingRouter,
  brand: brandRouter,
  brandAsset: brandAssetRouter,
  content: contentRouter,
  customTemplate: customTemplateRouter,
  invitation: invitationRouter,
  scheduledPost: scheduledPostRouter,
  socialAccount: socialAccountRouter,
})

export type AppRouter = typeof appRouter
