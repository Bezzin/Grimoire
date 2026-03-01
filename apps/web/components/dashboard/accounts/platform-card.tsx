"use client"

import { useState } from "react"
import * as LucideIcons from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SOCIAL_OAUTH_CONFIG } from "@grimoire/shared"
import type { SocialOAuthPlatform } from "@grimoire/shared"
import { trpc } from "@/lib/trpc/client"

interface ConnectedAccount {
  id: string
  platform: string
  platformUsername: string | null
  displayName: string | null
  avatarUrl: string | null
  isActive: boolean
  tokenExpiresAt: Date | null
}

interface PlatformCardProps {
  platform: SocialOAuthPlatform
  account?: ConnectedAccount
  onDisconnect: () => void
}

export function PlatformCard({ platform, account, onDisconnect }: PlatformCardProps) {
  const config = SOCIAL_OAUTH_CONFIG[platform]
  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[config.icon]
  const [scraping, setScraping] = useState(false)

  const scrape = trpc.socialAccount.scrapeAndGenerateProfile.useMutation({
    onSettled: () => setScraping(false),
  })

  const disconnect = trpc.socialAccount.disconnect.useMutation({
    onSuccess: onDisconnect,
  })

  function handleConnect() {
    window.location.href = `/api/social/${platform.toLowerCase()}/connect`
  }

  function handleScrape() {
    if (!account) return
    setScraping(true)
    scrape.mutate({ accountId: account.id })
  }

  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${config.bgColor}`}>
            {IconComponent && <IconComponent className={`h-5 w-5 ${config.color}`} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{config.name}</p>
            {account ? (
              <div className="flex items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full ${account.isActive ? "bg-emerald-500" : "bg-amber-500"}`} />
                <span className="truncate text-xs text-muted-foreground">
                  @{account.platformUsername ?? account.displayName ?? "connected"}
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Not connected</span>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          {account ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={handleScrape}
                disabled={scraping || scrape.isPending}
              >
                {scraping ? "Analyzing..." : "Analyze Voice"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-destructive"
                onClick={() => disconnect.mutate({ id: account.id })}
                disabled={disconnect.isPending}
              >
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              className="flex-1 text-xs grimoire-gradient text-white"
              onClick={handleConnect}
            >
              Connect
            </Button>
          )}
        </div>

        {scrape.isSuccess && (
          <p className="mt-2 text-xs text-emerald-600">
            Brand profile created from {scrape.data.postsAnalyzed} posts!
          </p>
        )}
        {scrape.isError && (
          <p className="mt-2 text-xs text-destructive">
            {scrape.error.message}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
