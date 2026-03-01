import { generateText } from "ai"
import { getModel } from "../router"
import type { ScrapedPost } from "./adapters"

export interface VoiceAnalysis {
  toneKeywords: string[]
  avoidKeywords: string[]
  styleGuide: string
  exampleContent: string[]
}

export async function analyzeVoice(
  posts: ScrapedPost[],
  platformName: string
): Promise<VoiceAnalysis> {
  const postTexts = posts
    .filter((p) => p.text.trim().length > 10)
    .slice(0, 50)
    .map((p, i) => `[Post ${i + 1}]: ${p.text.slice(0, 500)}`)
    .join("\n\n")

  if (postTexts.length === 0) {
    return {
      toneKeywords: ["professional"],
      avoidKeywords: [],
      styleGuide: "No content available to analyze.",
      exampleContent: [],
    }
  }

  const model = getModel({ tier: "fast" })
  const { text } = await generateText({
    model,
    system: `You are a brand voice analyst. Analyze the following social media posts and extract the brand's writing style. Return ONLY valid JSON with this exact structure:
{
  "toneKeywords": ["keyword1", "keyword2", ...],
  "avoidKeywords": ["word1", "word2", ...],
  "styleGuide": "A 2-3 sentence description of the writing style, common patterns, and voice characteristics."
}

Rules:
- toneKeywords: 5-10 adjectives describing the tone (e.g., "witty", "professional", "casual")
- avoidKeywords: Words or phrases the brand never uses, or tones to avoid
- styleGuide: Describe post length patterns, emoji usage, hashtag patterns, formatting habits`,
    prompt: `Analyze these ${platformName} posts and extract the brand voice:\n\n${postTexts}`,
  })

  try {
    const cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim()
    const parsed = JSON.parse(cleaned) as {
      toneKeywords?: string[]
      avoidKeywords?: string[]
      styleGuide?: string
    }
    return {
      toneKeywords: parsed.toneKeywords ?? ["professional"],
      avoidKeywords: parsed.avoidKeywords ?? [],
      styleGuide: parsed.styleGuide ?? "",
      exampleContent: posts
        .filter((p) => p.text.trim().length > 20)
        .slice(0, 10)
        .map((p) => p.text),
    }
  } catch {
    return {
      toneKeywords: ["professional"],
      avoidKeywords: [],
      styleGuide: "Failed to parse voice analysis.",
      exampleContent: posts
        .filter((p) => p.text.trim().length > 20)
        .slice(0, 10)
        .map((p) => p.text),
    }
  }
}
