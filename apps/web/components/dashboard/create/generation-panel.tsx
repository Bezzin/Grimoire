"use client"

import { useState } from "react"
import { Sparkles, ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { trpc } from "@/lib/trpc/client"
import type { PromptTemplate } from "@grimoire/shared"

interface GenerationPanelProps {
  template: PromptTemplate
  onGenerated: (data: {
    contentItemId: string
    systemPrompt: string
    modelId: string
    aspectRatio?: string
    duration?: number
  }) => void
  customInputFields?: Array<{ key: string; label: string; type: string; required: boolean; placeholder?: string }>
}

export function GenerationPanel({ template, onGenerated, customInputFields }: GenerationPanelProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [inputs, setInputs] = useState<Record<string, string>>({})

  const { data: profiles } = trpc.brand.list.useQuery()
  const { data: usage } = trpc.content.getUsage.useQuery()
  const generate = trpc.content.generate.useMutation({
    onSuccess: (data) => onGenerated(data),
  })
  const generateImage = trpc.content.generateImage.useMutation({
    onSuccess: (data) => onGenerated({
      contentItemId: data.contentItemId,
      systemPrompt: data.systemPrompt,
      modelId: "",
      aspectRatio: data.aspectRatio,
    }),
  })
  const generateVideo = trpc.content.generateVideo.useMutation({
    onSuccess: (data) => onGenerated({
      contentItemId: data.contentItemId,
      systemPrompt: data.systemPrompt,
      modelId: "",
      duration: data.duration,
      aspectRatio: data.aspectRatio,
    }),
  })

  const inputFields = customInputFields
    ? customInputFields.map((f) => ({
        key: f.key,
        label: f.label,
        type: f.type,
        placeholder: f.placeholder,
      }))
    : Object.entries(template.inputSchema.shape).map(
        ([key, schema]) => ({
          key,
          label: (schema as { description?: string }).description ?? key,
          type: key === "brief" || key === "outline" || key === "testimonial" || key === "changes" ? "textarea" : "text",
          placeholder: undefined as string | undefined,
        })
      )

  function handleGenerate() {
    const payload = {
      templateId: template.id,
      inputs,
      brandProfileId: profiles?.[0]?.id,
    }

    if (template.tier === "image") {
      generateImage.mutate(payload)
    } else if (template.tier === "video") {
      generateVideo.mutate(payload)
    } else {
      generate.mutate({ ...payload, preferQuality: false })
    }
  }

  const isPending = generate.isPending || generateImage.isPending || generateVideo.isPending
  const error = generate.error || generateImage.error || generateVideo.error

  return (
    <div className="border-b border-border/50">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          {template.name}
        </span>
        {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>

      {!collapsed && (
        <div className="space-y-3 px-4 pb-4">
          {inputFields.map(({ key, label, type, placeholder }) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs font-medium">{label}</Label>
              {type === "textarea" ? (
                <textarea
                  value={inputs[key] ?? ""}
                  onChange={(e) =>
                    setInputs((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  rows={3}
                  className="w-full rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder={placeholder ?? label}
                />
              ) : type === "number" ? (
                <Input
                  type="number"
                  value={inputs[key] ?? ""}
                  onChange={(e) =>
                    setInputs((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="h-9 text-sm"
                  placeholder={placeholder ?? label}
                />
              ) : (
                <Input
                  value={inputs[key] ?? ""}
                  onChange={(e) =>
                    setInputs((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="h-9 text-sm"
                  placeholder={placeholder ?? label}
                />
              )}
            </div>
          ))}

          <div className="flex items-center justify-between pt-2">
            {usage && !usage.unlimited && (
              <span className="text-[11px] text-muted-foreground">
                {usage.used} / {usage.limit} generations used
              </span>
            )}
            <Button
              onClick={handleGenerate}
              disabled={isPending}
              className="gap-2 grimoire-gradient text-white shadow-glow-sm"
              size="sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isPending ? "Generating..." : "Generate"}
            </Button>
          </div>

          {error && (
            <p className="text-xs text-destructive">{error.message}</p>
          )}
        </div>
      )}
    </div>
  )
}
