import OpenAI from "openai"

let openaiClient: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured")
    }
    openaiClient = new OpenAI({ apiKey })
  }
  return openaiClient
}

export interface ModerationResult {
  flagged: boolean
  categories: string[]
  message?: string
}

export async function moderateContent(text: string): Promise<ModerationResult> {
  try {
    const openai = getOpenAI()
    const response = await openai.moderations.create({ input: text })
    const result = response.results[0]

    if (!result.flagged) {
      return { flagged: false, categories: [] }
    }

    const flaggedCategories = Object.entries(result.categories)
      .filter(([, flagged]) => flagged)
      .map(([category]) => category)

    return {
      flagged: true,
      categories: flaggedCategories,
      message: `Content flagged for: ${flaggedCategories.join(", ")}. Please regenerate or edit.`,
    }
  } catch (error) {
    // If moderation API is unavailable, log and allow (fail open)
    console.error("Moderation API error:", error)
    return { flagged: false, categories: [] }
  }
}
