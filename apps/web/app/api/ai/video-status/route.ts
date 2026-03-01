import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getVideoStatus } from "@grimoire/ai"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const url = new URL(req.url)
  const predictionId = url.searchParams.get("id")

  if (!predictionId) {
    return new Response("Missing prediction ID", { status: 400 })
  }

  const status = await getVideoStatus(predictionId)
  return NextResponse.json(status)
}
