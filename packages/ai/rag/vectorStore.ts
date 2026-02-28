import { Pinecone } from "@pinecone-database/pinecone"

let pineconeClient: Pinecone | null = null

export function getPinecone(): Pinecone {
  if (!pineconeClient) {
    const apiKey = process.env.PINECONE_API_KEY
    if (!apiKey) {
      throw new Error("PINECONE_API_KEY is not configured")
    }
    pineconeClient = new Pinecone({ apiKey })
  }
  return pineconeClient
}

export function getIndex() {
  const indexName = process.env.PINECONE_INDEX ?? "grimoire"
  return getPinecone().index(indexName)
}

export function getNamespace(orgId: string, profileId: string): string {
  return `org:${orgId}:brand:${profileId}`
}
