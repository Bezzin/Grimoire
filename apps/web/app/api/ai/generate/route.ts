import { streamText } from "ai"
import { auth } from "@/lib/auth"
import { getModel } from "@grimoire/ai"
import type { ModelTier } from "@grimoire/ai"

export const maxDuration = 60

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = await req.json()
  const { systemPrompt, tier } = body as {
    systemPrompt: string
    tier: ModelTier
  }

  if (!systemPrompt || !tier) {
    return new Response("Missing systemPrompt or tier", { status: 400 })
  }

  const model = getModel({ tier })

  const result = streamText({
    model,
    system: systemPrompt,
    prompt: "Generate the content now.",
  })

  return result.toDataStreamResponse()
}
