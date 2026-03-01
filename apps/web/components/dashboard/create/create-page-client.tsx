"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PromptTemplate } from "@grimoire/shared"
import { PLANS } from "@grimoire/shared"
import type { PlanKey } from "@grimoire/shared"
import { trpc } from "@/lib/trpc/client"
import { TemplatePicker } from "./template-picker"
import { GenerationPanel } from "./generation-panel"
import { ContentEditor } from "./content-editor"
import { PlatformPreviews } from "./platform-previews"
import { CustomTemplateWizard } from "./custom-template-wizard"

export function CreatePageClient() {
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null)
  const [contentItemId, setContentItemId] = useState<string | null>(null)
  const [generationData, setGenerationData] = useState<{
    systemPrompt: string
    modelId: string
    tier: string
    contentType?: "text" | "image" | "video"
    aspectRatio?: string
    duration?: number
  } | null>(null)
  const [currentContent, setCurrentContent] = useState("")
  const [showTemplateWizard, setShowTemplateWizard] = useState(false)
  const [customTemplate, setCustomTemplate] = useState<{
    id: string
    name: string
    category: string
    tier: string
    inputFields: unknown
    systemPrompt: string
  } | null>(null)

  const { data: orgData } = trpc.user.getOrganization.useQuery()
  const hasScheduling = orgData?.plan
    ? (PLANS[orgData.plan as PlanKey]?.scheduling ?? false)
    : false

  function handleGenerated(data: {
    contentItemId: string
    systemPrompt: string
    modelId: string
    aspectRatio?: string
    duration?: number
  }) {
    const tier = selectedTemplate?.tier ?? customTemplate?.tier ?? "standard"
    const contentType = tier === "image" ? "image" as const
      : tier === "video" ? "video" as const
      : "text" as const

    setContentItemId(data.contentItemId)
    setGenerationData({
      systemPrompt: data.systemPrompt,
      modelId: data.modelId,
      tier,
      contentType,
      aspectRatio: data.aspectRatio,
      duration: data.duration,
    })
  }

  function handleSelectCustom(ct: { id: string; name: string; category: string; tier: string; inputFields: unknown; systemPrompt: string }) {
    setCustomTemplate(ct)
    setSelectedTemplate(null)
  }

  function handleSelectBuiltIn(template: PromptTemplate) {
    setSelectedTemplate(template)
    setCustomTemplate(null)
  }

  if (showTemplateWizard) {
    return (
      <div className="py-8">
        <CustomTemplateWizard
          onComplete={() => setShowTemplateWizard(false)}
          onCancel={() => setShowTemplateWizard(false)}
        />
      </div>
    )
  }

  const customInputFields = customTemplate
    ? (customTemplate.inputFields as Array<{ key: string; label: string; type: string; required: boolean; placeholder?: string }>)
    : undefined

  return (
    <div className="flex h-[calc(100vh-3.5rem)] -mx-6 -my-8">
      {/* Left: Template Picker */}
      <div className="w-[280px] shrink-0">
        <div className="flex items-center justify-between border-b border-border/50 px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">Templates</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowTemplateWizard(true)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <TemplatePicker
          selected={selectedTemplate}
          onSelect={handleSelectBuiltIn}
          onSelectCustom={handleSelectCustom}
        />
      </div>

      {/* Center: Editor */}
      <div className="flex flex-1 flex-col">
        {selectedTemplate && (
          <GenerationPanel
            template={selectedTemplate}
            onGenerated={handleGenerated}
          />
        )}
        {customTemplate && (
          <GenerationPanel
            template={{
              id: customTemplate.id,
              name: customTemplate.name,
              category: customTemplate.category as "social" | "thread" | "blog" | "email" | "ads" | "image" | "video",
              description: "",
              icon: "FileText",
              tier: customTemplate.tier as "fast" | "standard" | "creative" | "image" | "video",
              inputSchema: {} as PromptTemplate["inputSchema"],
              systemPrompt: customTemplate.systemPrompt,
              platforms: [],
            }}
            customInputFields={customInputFields}
            onGenerated={handleGenerated}
          />
        )}
        <ContentEditor
          contentItemId={contentItemId}
          generationData={generationData}
          hasScheduling={hasScheduling}
        />
      </div>

      {/* Right: Platform Previews */}
      <div className="w-[320px] shrink-0">
        <PlatformPreviews
          content={currentContent}
          contentItemId={contentItemId}
        />
      </div>
    </div>
  )
}
