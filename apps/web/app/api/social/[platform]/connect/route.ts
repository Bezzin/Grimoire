import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { buildAuthUrl } from "@/lib/social/oauth"
import { SOCIAL_OAUTH_CONFIG } from "@grimoire/shared"
import type { SocialOAuthPlatform } from "@grimoire/shared"

export async function GET(
  _req: Request,
  { params }: { params: { platform: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const platform = params.platform.toUpperCase() as SocialOAuthPlatform
  if (!(platform in SOCIAL_OAUTH_CONFIG)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 })
  }

  const state = Buffer.from(
    JSON.stringify({ userId: session.user.id, platform, ts: Date.now() })
  ).toString("base64url")

  const url = buildAuthUrl(platform, state)
  return NextResponse.redirect(url)
}
