import { Worker, Queue } from "bullmq"
import { getRedisConnection } from "./redis"
import { getPublisher } from "./publishers"
import { prisma } from "@grimoire/db"

export const PUBLISH_QUEUE_NAME = "publish-posts"

export function getPublishQueue() {
  return new Queue(PUBLISH_QUEUE_NAME, {
    connection: getRedisConnection(),
  })
}

interface PublishJobData {
  scheduledPostId: string
}

export function startPublishWorker() {
  const worker = new Worker<PublishJobData>(
    PUBLISH_QUEUE_NAME,
    async (job) => {
      const { scheduledPostId } = job.data

      const scheduledPost = await prisma.scheduledPost.findUnique({
        where: { id: scheduledPostId },
        include: {
          contentItem: true,
          socialAccount: true,
        },
      })

      if (!scheduledPost) {
        throw new Error(`ScheduledPost ${scheduledPostId} not found`)
      }

      if (scheduledPost.status !== "QUEUED" && scheduledPost.status !== "PROCESSING") {
        return
      }

      // Mark as processing
      await prisma.scheduledPost.update({
        where: { id: scheduledPostId },
        data: { status: "PROCESSING" },
      })

      const publisher = getPublisher(scheduledPost.socialAccount.platform)

      const result = await publisher.publish({
        text: scheduledPost.contentItem.body,
        mediaUrls: scheduledPost.contentItem.mediaUrls,
        hashtags: scheduledPost.contentItem.hashtags,
        accessToken: scheduledPost.socialAccount.accessToken,
        refreshToken: scheduledPost.socialAccount.refreshToken,
      })

      if (result.success) {
        await prisma.scheduledPost.update({
          where: { id: scheduledPostId },
          data: {
            status: "PUBLISHED",
            publishedAt: new Date(),
            platformPostId: result.platformPostId ?? null,
            platformPostUrl: result.platformPostUrl ?? null,
          },
        })

        // Update tokens if refreshed
        if (result.newAccessToken) {
          await prisma.socialAccount.update({
            where: { id: scheduledPost.socialAccountId },
            data: {
              accessToken: result.newAccessToken,
              ...(result.newRefreshToken ? { refreshToken: result.newRefreshToken } : {}),
              ...(result.newTokenExpiresAt ? { tokenExpiresAt: result.newTokenExpiresAt } : {}),
            },
          })
        }
      } else {
        const newRetryCount = scheduledPost.retryCount + 1
        if (newRetryCount >= 3) {
          await prisma.scheduledPost.update({
            where: { id: scheduledPostId },
            data: {
              status: "FAILED",
              errorMessage: result.error ?? "Publishing failed after 3 attempts",
              retryCount: newRetryCount,
            },
          })
        } else {
          await prisma.scheduledPost.update({
            where: { id: scheduledPostId },
            data: {
              status: "QUEUED",
              errorMessage: result.error,
              retryCount: newRetryCount,
            },
          })
        }
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 5,
    }
  )

  worker.on("failed", (job, err) => {
    console.error(`Publish job ${job?.id} failed:`, err)
  })

  return worker
}
