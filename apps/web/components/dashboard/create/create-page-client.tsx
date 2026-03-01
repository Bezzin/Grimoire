"use client"

import { useState } from "react"
import type { PromptTemplate } from "@grimoire/shared"
import { TemplatePicker } from "./template-picker"
import { GenerationPanel } from "./generation-panel"
import { ContentEditor } from "./content-editor"
import { PlatformPreviews } from "./platform-previews"

export function CreatePageClient() {
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null)
  const [contentItemId, setContentItemId] = useState<string | null>(null)
  const [generationData, setGenerationData] = useState<{
    systemPrompt: string
    modelId: string
    tier: string
  } | null>(null)
  const [currentContent, setCurrentContent] = useState("")

  function handleGenerated(data: { contentItemId: string; systemPrompt: string; modelId: string }) {
    setContentItemId(data.contentItemId)
    setGenerationData({
      systemPrompt: data.systemPrompt,
      modelId: data.modelId,
      tier: selectedTemplate?.tier ?? "standard",
    })
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] -mx-6 -my-8">
      {/* Left: Template Picker */}
      <div className="w-[280px] shrink-0">
        <TemplatePicker
          selected={selectedTemplate}
          onSelect={setSelectedTemplate}
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
        <ContentEditor
          contentItemId={contentItemId}
          generationData={generationData}
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
