import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { startVideoGeneration } from "@grimoire/ai"

export const maxDuration = 30

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = (await req.json()) as {
    systemPrompt: string
    duration?: number
    aspectRatio?: "16:9" | "9:16" | "1:1"
  }

  if (!body.systemPrompt) {
    return new Response("Missing systemPrompt", { status: 400 })
  }

  const job = await startVideoGeneration({
    prompt: body.systemPrompt,
    duration: body.duration,
    aspectRatio: body.aspectRatio,
  })

  return NextResponse.json(job)
}
