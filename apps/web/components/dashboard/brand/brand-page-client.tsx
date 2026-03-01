"use client"

import { useState } from "react"
import { Palette, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { trpc } from "@/lib/trpc/client"
import { BrandProfileCard } from "./brand-profile-card"
import { BrandWizard } from "./brand-wizard"
import { BrandAssetsPanel } from "./brand-assets-panel"

export function BrandPageClient() {
  const [showWizard, setShowWizard] = useState(false)
  const [assetProfileId, setAssetProfileId] = useState<string | null>(null)
  const { data: profiles, isLoading, refetch } = trpc.brand.list.useQuery()

  if (assetProfileId) {
    return (
      <BrandAssetsPanel
        profileId={assetProfileId}
        onClose={() => setAssetProfileId(null)}
      />
    )
  }

  if (showWizard) {
    return (
      <BrandWizard
        onComplete={() => {
          setShowWizard(false)
          refetch()
        }}
        onCancel={() => setShowWizard(false)}
      />
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Brand Voice</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Define how your brand sounds across all content
          </p>
        </div>
        <Button
          onClick={() => setShowWizard(true)}
          className="gap-2 grimoire-gradient text-white shadow-glow-sm hover:shadow-glow-md"
        >
          <Plus className="h-4 w-4" />
          New Profile
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-xl border border-border/50 bg-muted/20"
            />
          ))}
        </div>
      ) : !profiles || profiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/60 py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Palette className="h-7 w-7 text-primary" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold">No brand profiles yet</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Create your first brand voice profile to ensure consistent, on-brand content.
            </p>
          </div>
          <Button
            onClick={() => setShowWizard(true)}
            className="gap-2 grimoire-gradient text-white shadow-glow-sm"
          >
            <Plus className="h-4 w-4" />
            Create Your First Profile
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {profiles.map((profile) => (
            <BrandProfileCard
              key={profile.id}
              profile={profile}
              onUpdate={refetch}
              onViewAssets={setAssetProfileId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
