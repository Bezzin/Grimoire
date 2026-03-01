"use client"

import { useState } from "react"
import { Trash2, FileImage, FileText, Type, Palette, Package, Image } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { trpc } from "@/lib/trpc/client"
import { UploadDropzone } from "@/lib/uploadthing"

const ASSET_TYPE_MAP: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  LOGO: { label: "Logo", icon: Image },
  FONT: { label: "Font", icon: Type },
  COLOR_PALETTE: { label: "Color Palette", icon: Palette },
  GUIDELINE_PDF: { label: "Guidelines", icon: FileText },
  PRODUCT_PHOTO: { label: "Product Photo", icon: Package },
  STYLE_REFERENCE: { label: "Style Ref", icon: FileImage },
}

const ASSET_TYPES = ["LOGO", "FONT", "COLOR_PALETTE", "GUIDELINE_PDF", "PRODUCT_PHOTO", "STYLE_REFERENCE"] as const

interface BrandAssetsPanelProps {
  profileId: string
  onClose: () => void
}

export function BrandAssetsPanel({ profileId, onClose }: BrandAssetsPanelProps) {
  const [selectedType, setSelectedType] = useState<typeof ASSET_TYPES[number]>("LOGO")

  const { data: assets, refetch } = trpc.brandAsset.listByProfile.useQuery({ brandProfileId: profileId })
  const { data: usage } = trpc.brandAsset.getUsage.useQuery()

  const createAsset = trpc.brandAsset.create.useMutation({
    onSuccess: () => refetch(),
  })

  const deleteAsset = trpc.brandAsset.delete.useMutation({
    onSuccess: () => refetch(),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Brand Assets</h2>
          {usage && !usage.unlimited && (
            <p className="text-xs text-muted-foreground">
              {usage.used} / {usage.limit} assets used
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Back to Profile
        </Button>
      </div>

      {/* Asset type selector */}
      <div className="flex flex-wrap gap-2">
        {ASSET_TYPES.map((type) => {
          const config = ASSET_TYPE_MAP[type]
          const IconComp = config.icon
          return (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedType === type
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              <IconComp className="h-3.5 w-3.5" />
              {config.label}
            </button>
          )
        })}
      </div>

      {/* Upload area */}
      <UploadDropzone
        endpoint="brandAsset"
        onClientUploadComplete={(res) => {
          if (res) {
            for (const file of res) {
              createAsset.mutate({
                brandProfileId: profileId,
                type: selectedType,
                name: file.name,
                url: file.ufsUrl,
                fileSize: file.size,
                mimeType: file.type,
              })
            }
          }
        }}
        onUploadError={(error: Error) => {
          console.error("Upload error:", error)
        }}
        className="border-dashed border-border/60 bg-muted/10 ut-button:bg-primary ut-button:text-white ut-label:text-muted-foreground"
      />

      {/* Asset grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {assets?.map((asset) => {
          const config = ASSET_TYPE_MAP[asset.type]
          const IconComp = config?.icon ?? FileImage
          const isImage = asset.mimeType.startsWith("image/")
          return (
            <Card key={asset.id} className="border-border/50">
              <CardContent className="p-3">
                {isImage ? (
                  <img
                    src={asset.url}
                    alt={asset.name}
                    className="mb-2 h-24 w-full rounded-md object-cover"
                  />
                ) : (
                  <div className="mb-2 flex h-24 items-center justify-center rounded-md bg-muted/20">
                    <IconComp className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{asset.name}</p>
                    <span className="text-[10px] text-muted-foreground">{config?.label}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteAsset.mutate({ id: asset.id })}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {(!assets || assets.length === 0) && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No assets uploaded yet. Select a type above and drop files to upload.
        </p>
      )}
    </div>
  )
}
