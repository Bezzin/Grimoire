"use client"

import { useState, useEffect, useCallback } from "react"
import { useCompletion } from "ai/react"
import { Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { trpc } from "@/lib/trpc/client"

interface ContentEditorProps {
  contentItemId: string | null
  generationData: {
    systemPrompt: string
    modelId: string
    tier: string
  } | null
}

export function ContentEditor({ contentItemId, generationData }: ContentEditorProps) {
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)

  const updateContent = trpc.content.update.useMutation({
    onSuccess: () => setSaving(false),
  })

  const { completion, isLoading: isStreaming, complete } = useCompletion({
    api: "/api/ai/generate",
    onFinish: (_, completion) => {
      setContent(completion)
    },
  })

  useEffect(() => {
    if (generationData && contentItemId) {
      complete("", {
        body: {
          systemPrompt: generationData.systemPrompt,
          modelId: generationData.modelId,
          tier: generationData.tier,
        },
      })
    }
  }, [generationData, contentItemId, complete])

  const displayContent = isStreaming ? completion : content

  const handleSave = useCallback(() => {
    if (!contentItemId || !content) return
    setSaving(true)
    updateContent.mutate({
      id: contentItemId,
      body: content,
    })
  }, [contentItemId, content, updateContent])

  if (!contentItemId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/30">
          <span className="text-2xl">&#x2728;</span>
        </div>
        <div>
          <h3 className="font-semibold">Select a template to begin</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Choose a template from the left panel, fill in the details, and generate your content.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-2">
        <div className="flex items-center gap-2">
          {isStreaming && (
            <span className="flex items-center gap-1.5 text-xs text-primary">
              <Loader2 className="h-3 w-3 animate-spin" />
              Generating...
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={saving || isStreaming || !content}
          className="gap-1.5"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "Saving..." : "Save Draft"}
        </Button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto p-4">
        <textarea
          value={displayContent}
          onChange={(e) => setContent(e.target.value)}
          disabled={isStreaming}
          placeholder="Your generated content will appear here..."
          className="h-full w-full resize-none bg-transparent text-sm leading-relaxed focus:outline-none"
        />
      </div>
    </div>
  )
}
