"use client"

import { trpc } from "@/lib/trpc/client"
import { PlatformCard } from "./platform-card"
import { SOCIAL_OAUTH_CONFIG } from "@grimoire/shared"
import type { SocialOAuthPlatform } from "@grimoire/shared"

const ALL_PLATFORMS = Object.keys(SOCIAL_OAUTH_CONFIG) as SocialOAuthPlatform[]

export function AccountsPageClient() {
  const { data: accounts, refetch } = trpc.socialAccount.list.useQuery()
  const { data: usage } = trpc.socialAccount.getUsage.useQuery()

  const accountByPlatform = new Map(
    (accounts ?? []).map((a) => [a.platform, a])
  )

  return (
    <div className="space-y-6">
      {usage && (
        <p className="text-xs text-muted-foreground">
          {usage.used} / {usage.limit} accounts connected
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ALL_PLATFORMS.map((platform) => (
          <PlatformCard
            key={platform}
            platform={platform}
            account={accountByPlatform.get(platform) as Parameters<typeof PlatformCard>[0]["account"]}
            onDisconnect={() => refetch()}
          />
        ))}
      </div>
    </div>
  )
}
