import { NextResponse } from "next/server"
import { prisma } from "@grimoire/db"
import { Queue } from "bullmq"
import IORedis from "ioredis"

const PUBLISH_QUEUE_NAME = "publish-posts"

export async function GET(req: Request) {
  // Authenticate cron calls
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  const now = new Date()

  // Find all due posts
  const duePosts = await prisma.scheduledPost.findMany({
    where: {
      status: "QUEUED",
      scheduledFor: { lte: now },
    },
    take: 100,
    orderBy: { scheduledFor: "asc" },
  })

  if (duePosts.length === 0) {
    return NextResponse.json({ enqueued: 0 })
  }

  // Create queue connection inline to avoid import issues across packages
  const connection = new IORedis(
    process.env.REDIS_URL ?? "redis://localhost:6379",
    {
      maxRetriesPerRequest: null,
    }
  )

  const queue = new Queue(PUBLISH_QUEUE_NAME, { connection })

  let enqueued = 0
  for (const post of duePosts) {
    try {
      const job = await queue.add(
        `publish-${post.id}`,
        {
          scheduledPostId: post.id,
        },
        {
          attempts: 1,
          removeOnComplete: true,
          removeOnFail: false,
        }
      )

      await prisma.scheduledPost.update({
        where: { id: post.id },
        data: { bullJobId: job.id ?? null },
      })

      enqueued++
    } catch (err) {
      console.error(`Failed to enqueue post ${post.id}:`, err)
    }
  }

  // Clean up connection
  await queue.close()
  await connection.quit()

  return NextResponse.json({ enqueued, total: duePosts.length })
}
