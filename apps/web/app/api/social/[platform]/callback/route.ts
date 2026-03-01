import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@grimoire/db"
import { exchangeCodeForTokens, fetchPlatformProfile } from "@/lib/social/oauth"
import { SOCIAL_OAUTH_CONFIG } from "@grimoire/shared"
import type { SocialOAuthPlatform } from "@grimoire/shared"

export async function GET(
  req: Request,
  { params }: { params: { platform: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const error = url.searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/dashboard/accounts?error=${error ?? "no_code"}`, req.url)
    )
  }

  const platform = params.platform.toUpperCase() as SocialOAuthPlatform
  if (!(platform in SOCIAL_OAUTH_CONFIG)) {
    return NextResponse.redirect(new URL("/dashboard/accounts?error=invalid_platform", req.url))
  }

  try {
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      include: { organization: true },
    })
    if (!membership) {
      return NextResponse.redirect(new URL("/dashboard/accounts?error=no_org", req.url))
    }

    const tokens = await exchangeCodeForTokens(platform, code)
    const profile = await fetchPlatformProfile(platform, tokens.accessToken)

    await prisma.socialAccount.upsert({
      where: {
        platform_platformUserId_organizationId: {
          platform,
          platformUserId: profile.id,
          organizationId: membership.organizationId,
        },
      },
      update: {
        platformUsername: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresIn
          ? new Date(Date.now() + tokens.expiresIn * 1000)
          : null,
        isActive: true,
      },
      create: {
        platform,
        platformUserId: profile.id,
        platformUsername: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresIn
          ? new Date(Date.now() + tokens.expiresIn * 1000)
          : null,
        scopes: SOCIAL_OAUTH_CONFIG[platform].scopes,
        organizationId: membership.organizationId,
      },
    })

    return NextResponse.redirect(
      new URL(`/dashboard/accounts?connected=${platform.toLowerCase()}`, req.url)
    )
  } catch (err) {
    console.error(`OAuth callback error for ${platform}:`, err)
    return NextResponse.redirect(
      new URL(`/dashboard/accounts?error=connect_failed`, req.url)
    )
  }
}
