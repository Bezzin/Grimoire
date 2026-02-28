import { getIndex, getNamespace } from "./vectorStore"
import { getOpenRouterClient } from "../client"
import { embed } from "ai"

export interface BrandContext {
  toneKeywords: string[]
  avoidKeywords: string[]
  retrievedChunks: string[]
}

export function formatBrandContext(context: BrandContext): string {
  const parts: string[] = ["Brand Voice Context:"]

  if (context.toneKeywords.length > 0) {
    parts.push(`- Tone: ${context.toneKeywords.join(", ")}`)
  }

  if (context.avoidKeywords.length > 0) {
    parts.push(`- Avoid: ${context.avoidKeywords.join(", ")}`)
  }

  if (context.retrievedChunks.length > 0) {
    parts.push("- Style Examples:")
    for (const chunk of context.retrievedChunks) {
      parts.push(`  "${chunk.slice(0, 300)}"`)
    }
  }

  return parts.join("\n")
}

export async function retrieveBrandContext(params: {
  orgId: string
  profileId: string
  query: string
  toneKeywords: string[]
  avoidKeywords: string[]
  topK?: number
}): Promise<BrandContext> {
  const {
    orgId,
    profileId,
    query,
    toneKeywords,
    avoidKeywords,
    topK = 5,
  } = params

  const baseContext: BrandContext = {
    toneKeywords,
    avoidKeywords,
    retrievedChunks: [],
  }

  try {
    const client = getOpenRouterClient()
    const embeddingModel = client.textEmbeddingModel("openai/text-embedding-3-small")
    const { embedding } = await embed({ model: embeddingModel, value: query })

    const namespace = getNamespace(orgId, profileId)
    const index = getIndex()
    const ns = index.namespace(namespace)

    const results = await ns.query({
      vector: Array.from(embedding),
      topK,
      includeMetadata: true,
    })

    const chunks = results.matches
      .filter((m) => (m.score ?? 0) > 0.5)
      .map((m) => (m.metadata?.text as string) ?? "")
      .filter(Boolean)

    return { ...baseContext, retrievedChunks: chunks }
  } catch (error) {
    // Fallback: return tone/avoid only (no RAG)
    console.error("RAG retrieval failed, using fallback:", error)
    return baseContext
  }
}
