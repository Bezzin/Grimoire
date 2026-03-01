import { SOCIAL_OAUTH_CONFIG } from "@grimoire/shared"
import type { SocialOAuthPlatform } from "@grimoire/shared"

export function getOAuthConfig(platform: SocialOAuthPlatform) {
  const config = SOCIAL_OAUTH_CONFIG[platform]
  const clientId = process.env[config.envClientId]
  const clientSecret = process.env[config.envClientSecret]
  return { ...config, clientId: clientId ?? "", clientSecret: clientSecret ?? "" }
}

export function buildAuthUrl(platform: SocialOAuthPlatform, state: string): string {
  const config = getOAuthConfig(platform)
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/social/${platform.toLowerCase()}/callback`
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: config.scopes.join(" "),
    state,
  })
  if (platform === "TWITTER") {
    params.set("code_challenge", "challenge")
    params.set("code_challenge_method", "plain")
  }
  return `${config.authUrl}?${params.toString()}`
}

export async function exchangeCodeForTokens(
  platform: SocialOAuthPlatform,
  code: string
): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }> {
  const config = getOAuthConfig(platform)
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/social/${platform.toLowerCase()}/callback`

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  })

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token exchange failed for ${platform}: ${text}`)
  }

  const data = await res.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  }
}

export async function fetchPlatformProfile(
  platform: SocialOAuthPlatform,
  accessToken: string
): Promise<{ id: string; username?: string; displayName?: string; avatarUrl?: string }> {
  const handlers: Record<string, () => Promise<{ id: string; username?: string; displayName?: string; avatarUrl?: string }>> = {
    INSTAGRAM: async () => {
      const res = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,username&access_token=${accessToken}`)
      const data = await res.json()
      return { id: data.id, username: data.username }
    },
    FACEBOOK: async () => {
      const res = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name,picture&access_token=${accessToken}`)
      const data = await res.json()
      return { id: data.id, displayName: data.name, avatarUrl: data.picture?.data?.url }
    },
    LINKEDIN: async () => {
      const res = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      return { id: data.sub, displayName: data.name, avatarUrl: data.picture }
    },
    TWITTER: async () => {
      const res = await fetch("https://api.twitter.com/2/users/me?user.fields=profile_image_url,username", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      return { id: data.data.id, username: data.data.username, displayName: data.data.name, avatarUrl: data.data.profile_image_url }
    },
    TIKTOK: async () => {
      const res = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      return { id: data.data.user.open_id, displayName: data.data.user.display_name, avatarUrl: data.data.user.avatar_url }
    },
    THREADS: async () => {
      const res = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username&access_token=${accessToken}`)
      const data = await res.json()
      return { id: data.id, username: data.username }
    },
    YOUTUBE: async () => {
      const res = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      const channel = data.items?.[0]
      return { id: channel?.id, displayName: channel?.snippet?.title, avatarUrl: channel?.snippet?.thumbnails?.default?.url }
    },
    PINTEREST: async () => {
      const res = await fetch("https://api.pinterest.com/v5/user_account", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      return { id: data.username, username: data.username, avatarUrl: data.profile_image }
    },
  }

  const handler = handlers[platform]
  if (!handler) throw new Error(`Unsupported platform: ${platform}`)
  return handler()
}
