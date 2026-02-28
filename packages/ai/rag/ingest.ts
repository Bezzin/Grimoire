import { getIndex, getNamespace } from "./vectorStore"
import { getOpenRouterClient } from "../client"
import { embed } from "ai"

const CHUNK_SIZE = 500
const CHUNK_OVERLAP = 50

export function chunkText(text: string): string[] {
  const words = text.split(/\s+/)
  const chunks: string[] = []

  for (let i = 0; i < words.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
    const chunk = words.slice(i, i + CHUNK_SIZE).join(" ")
    if (chunk.trim().length > 0) {
      chunks.push(chunk.trim())
    }
  }

  return chunks
}

export async function ingestBrandExamples(params: {
  orgId: string
  profileId: string
  examples: string[]
  source?: string
}) {
  const { orgId, profileId, examples, source = "manual" } = params
  const namespace = getNamespace(orgId, profileId)
  const index = getIndex()
  const ns = index.namespace(namespace)

  // Delete existing vectors in this namespace first
  try {
    await ns.deleteAll()
  } catch {
    // Namespace may not exist yet — that's fine
  }

  // Chunk all examples
  const allChunks: string[] = []
  for (const example of examples) {
    const chunks = chunkText(example)
    allChunks.push(...chunks)
  }

  if (allChunks.length === 0) return { chunksUpserted: 0 }

  // Generate embeddings
  const client = getOpenRouterClient()
  const embeddingModel = client.textEmbeddingModel("openai/text-embedding-3-small")

  const vectors: Array<{
    id: string
    values: number[]
    metadata: Record<string, string>
  }> = []

  // Process in batches of 10
  for (let i = 0; i < allChunks.length; i += 10) {
    const batch = allChunks.slice(i, i + 10)
    const results = await Promise.all(
      batch.map((chunk) =>
        embed({ model: embeddingModel, value: chunk })
      )
    )

    for (let j = 0; j < batch.length; j++) {
      vectors.push({
        id: `${profileId}-${i + j}`,
        values: Array.from(results[j].embedding),
        metadata: {
          text: batch[j],
          source,
          contentType: "brand-example",
          createdAt: new Date().toISOString(),
        },
      })
    }
  }

  // Upsert in batches of 100 (Pinecone limit)
  for (let i = 0; i < vectors.length; i += 100) {
    await ns.upsert(vectors.slice(i, i + 100))
  }

  return { chunksUpserted: vectors.length }
}
