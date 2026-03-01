"use client"

import { useState } from "react"
import { useCompletion } from "ai/react"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { SOCIAL_PLATFORMS, type SocialPlatformKey } from "@grimoire/shared"
import { cn } from "@/lib/utils"

interface PlatformPreviewsProps {
  content: string
  contentItemId: string | null
}

const AVAILABLE_PLATFORMS: SocialPlatformKey[] = [
  "INSTAGRAM", "FACEBOOK", "LINKEDIN", "TWITTER", "TIKTOK", "THREADS", "YOUTUBE", "PINTEREST"
]

export function PlatformPreviews({ content, contentItemId }: PlatformPreviewsProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<SocialPlatformKey>>(new Set())
  const [variants, setVariants] = useState<Record<string, string>>({})
  const [adaptingPlatform, setAdaptingPlatform] = useState<string | null>(null)

  const { complete } = useCompletion({
    api: "/api/ai/adapt",
    onFinish: (_, completion) => {
      if (adaptingPlatform) {
        setVariants((prev) => ({ ...prev, [adaptingPlatform]: completion }))
        setAdaptingPlatform(null)
      }
    },
  })

  function handleTogglePlatform(platform: SocialPlatformKey) {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev)
      if (next.has(platform)) {
        next.delete(platform)
      } else {
        next.add(platform)
      }
      return next
    })
  }

  async function handleAdaptAll() {
    for (const platform of selectedPlatforms) {
      setAdaptingPlatform(platform)
      await complete("", {
        body: { content, platform },
      })
    }
  }

  return (
    <div className="flex h-full flex-col border-l border-border/50">
      <div className="border-b border-border/50 p-3">
        <h2 className="mb-2 text-sm font-semibold">Platforms</h2>
        <div className="flex flex-wrap gap-1.5">
          {AVAILABLE_PLATFORMS.map((platform) => {
            const config = SOCIAL_PLATFORMS[platform]
            return (
              <button
                key={platform}
                onClick={() => handleTogglePlatform(platform)}
                className={cn(
                  "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                  selectedPlatforms.has(platform)
                    ? "bg-primary/10 text-primary"
                    : "bg-muted/20 text-muted-foreground hover:text-foreground"
                )}
              >
                {config.name}
              </button>
            )
          })}
        </div>

        {selectedPlatforms.size > 0 && content && (
          <Button
            onClick={handleAdaptAll}
            disabled={!!adaptingPlatform}
            size="sm"
            className="mt-2 w-full gap-1.5 text-xs"
            variant="outline"
          >
            <Sparkles className="h-3 w-3" />
            {adaptingPlatform ? "Adapting..." : "Adapt for Selected"}
          </Button>
        )}
      </div>

      {/* Preview cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {Array.from(selectedPlatforms).map((platform) => {
          const config = SOCIAL_PLATFORMS[platform]
          const variant = variants[platform]
          return (
            <Card key={platform} className="border-border/50">
              <CardHeader className="pb-2 pt-3 px-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{config.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {(variant ?? content ?? "").length} / {config.charLimit}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {variant ?? (content ? content.slice(0, config.charLimit) : "Generate content first...")}
                </p>
              </CardContent>
            </Card>
          )
        })}

        {selectedPlatforms.size === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <p className="text-xs text-muted-foreground">
              Select platforms to preview adapted content
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
