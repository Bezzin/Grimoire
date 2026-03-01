import { streamText } from "ai"
import { auth } from "@/lib/auth"
import { getModel } from "@grimoire/ai"
import { SOCIAL_PLATFORMS } from "@grimoire/shared"
import type { SocialPlatformKey } from "@grimoire/shared"

export const maxDuration = 60

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = await req.json()
  const { content, platform } = body as {
    content: string
    platform: SocialPlatformKey
  }

  if (!content || !platform) {
    return new Response("Missing content or platform", { status: 400 })
  }

  const platformConfig = SOCIAL_PLATFORMS[platform]
  if (!platformConfig) {
    return new Response("Invalid platform", { status: 400 })
  }

  const model = getModel({ tier: "fast" })

  const result = streamText({
    model,
    system: `You are a social media expert. Adapt the following content for ${platformConfig.name}.
Rules:
- Character limit: ${platformConfig.charLimit} characters
- Match the platform's tone and conventions
- Keep the core message intact
- Add appropriate formatting for the platform
- Do NOT add hashtags (they will be added separately)`,
    prompt: `Adapt this content for ${platformConfig.name}:\n\n${content}`,
  })

  return result.toDataStreamResponse()
}
