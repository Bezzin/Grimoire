import { createOpenAI } from "@ai-sdk/openai"

export function getOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured")
  }
  return createOpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
  })
}
