import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { generateImage } from "@grimoire/ai"

export const maxDuration = 60

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = await req.json() as {
    systemPrompt: string
    aspectRatio?: "1:1" | "16:9" | "9:16" | "3:2"
  }

  if (!body.systemPrompt) {
    return new Response("Missing systemPrompt", { status: 400 })
  }

  const result = await generateImage({
    prompt: body.systemPrompt,
    aspectRatio: body.aspectRatio,
  })

  return NextResponse.json({
    base64Data: result.base64Data,
    mimeType: result.mimeType,
  })
}
