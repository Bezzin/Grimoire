"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useCompletion } from "ai/react"
import { Save, Loader2, RefreshCw, Image as ImageIcon, Film, Clock, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { trpc } from "@/lib/trpc/client"
import { ScheduleModal } from "./schedule-modal"

interface ContentEditorProps {
  contentItemId: string | null
  generationData: {
    systemPrompt: string
    modelId: string
    tier: string
    contentType?: "text" | "image" | "video"
    aspectRatio?: string
    duration?: number
  } | null
  hasScheduling?: boolean
}

export function ContentEditor({ contentItemId, generationData, hasScheduling }: ContentEditorProps) {
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [scheduleMode, setScheduleMode] = useState<"schedule" | "publish-now">("schedule")

  // Media state
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
  const [videoJobId, setVideoJobId] = useState<string | null>(null)
  const [videoProgress, setVideoProgress] = useState<number | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)

  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const contentType = generationData?.contentType ?? "text"

  const updateContent = trpc.content.update.useMutation({
    onSuccess: () => setSaving(false),
  })

  const saveMedia = trpc.content.saveMediaUrl.useMutation({
    onSuccess: () => setSaving(false),
  })

  const { completion, isLoading: isStreaming, complete } = useCompletion({
    api: "/api/ai/generate",
    onFinish: (_, completion) => {
      setContent(completion)
    },
  })

  // Reset all media state when generationData changes
  useEffect(() => {
    setMediaUrl(null)
    setIsGeneratingImage(false)
    setIsGeneratingVideo(false)
    setVideoJobId(null)
    setVideoProgress(null)
    setVideoError(null)
    setContent("")

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }, [generationData])

  // Text generation
  useEffect(() => {
    if (generationData && contentItemId && contentType === "text") {
      complete("", {
        body: {
          systemPrompt: generationData.systemPrompt,
          modelId: generationData.modelId,
          tier: generationData.tier,
        },
      })
    }
  }, [generationData, contentItemId, contentType, complete])

  // Image generation
  const generateImage = useCallback(async () => {
    if (!generationData || contentType !== "image") return

    setIsGeneratingImage(true)
    setMediaUrl(null)
    setVideoError(null)

    try {
      const response = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: generationData.systemPrompt,
          aspectRatio: generationData.aspectRatio,
        }),
      })

      if (!response.ok) {
        throw new Error(`Image generation failed: ${response.statusText}`)
      }

      const { base64Data, mimeType } = await response.json()
      const dataUrl = `data:${mimeType};base64,${base64Data}`
      setMediaUrl(dataUrl)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image generation failed"
      setVideoError(message)
    } finally {
      setIsGeneratingImage(false)
    }
  }, [generationData, contentType])

  useEffect(() => {
    if (generationData && contentItemId && contentType === "image") {
      generateImage()
    }
  }, [generationData, contentItemId, contentType, generateImage])

  // Video generation
  const generateVideo = useCallback(async () => {
    if (!generationData || contentType !== "video") return

    setIsGeneratingVideo(true)
    setMediaUrl(null)
    setVideoJobId(null)
    setVideoProgress(null)
    setVideoError(null)

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }

    try {
      const response = await fetch("/api/ai/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: generationData.systemPrompt,
          duration: generationData.duration,
          aspectRatio: generationData.aspectRatio,
        }),
      })

      if (!response.ok) {
        throw new Error(`Video generation failed: ${response.statusText}`)
      }

      const { predictionId } = await response.json()
      setVideoJobId(predictionId)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Video generation failed"
      setVideoError(message)
      setIsGeneratingVideo(false)
    }
  }, [generationData, contentType])

  useEffect(() => {
    if (generationData && contentItemId && contentType === "video") {
      generateVideo()
    }
  }, [generationData, contentItemId, contentType, generateVideo])

  // Video polling
  useEffect(() => {
    if (!videoJobId) return

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/ai/video-status?id=${videoJobId}`)

        if (!response.ok) {
          throw new Error(`Status check failed: ${response.statusText}`)
        }

        const { status, outputUrl, error, progress } = await response.json()

        if (progress !== undefined) {
          setVideoProgress(progress)
        }

        if (status === "succeeded") {
          clearInterval(interval)
          pollingIntervalRef.current = null
          setMediaUrl(outputUrl)
          setIsGeneratingVideo(false)
        } else if (status === "failed") {
          clearInterval(interval)
          pollingIntervalRef.current = null
          setVideoError(error ?? "Video generation failed")
          setIsGeneratingVideo(false)
        }
      } catch (error) {
        clearInterval(interval)
        pollingIntervalRef.current = null
        const message = error instanceof Error ? error.message : "Status check failed"
        setVideoError(message)
        setIsGeneratingVideo(false)
      }
    }, 3000)

    pollingIntervalRef.current = interval

    return () => {
      clearInterval(interval)
      pollingIntervalRef.current = null
    }
  }, [videoJobId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  const displayContent = isStreaming ? completion : content

  const handleSave = useCallback(() => {
    if (!contentItemId) return

    setSaving(true)

    if (contentType === "text") {
      if (!content) return
      updateContent.mutate({
        id: contentItemId,
        body: content,
      })
    } else if (contentType === "image") {
      if (!mediaUrl) return
      saveMedia.mutate({
        contentItemId,
        mediaUrl,
      })
    } else if (contentType === "video") {
      if (!mediaUrl) return
      saveMedia.mutate({
        contentItemId,
        mediaUrl,
        generationJobId: videoJobId ?? undefined,
      })
    }
  }, [contentItemId, content, contentType, mediaUrl, videoJobId, updateContent, saveMedia])

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

  const isGenerating = isStreaming || isGeneratingImage || isGeneratingVideo

  const canSave =
    contentType === "text" ? !!content && !isStreaming :
    (contentType === "image" || contentType === "video") ? !!mediaUrl && !isGenerating :
    false

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
          {isGeneratingImage && (
            <span className="flex items-center gap-1.5 text-xs text-primary">
              <Loader2 className="h-3 w-3 animate-spin" />
              <ImageIcon className="h-3 w-3" />
              Generating image...
            </span>
          )}
          {isGeneratingVideo && (
            <span className="flex items-center gap-1.5 text-xs text-primary">
              <Loader2 className="h-3 w-3 animate-spin" />
              <Film className="h-3 w-3" />
              Generating video...
              {videoProgress !== null && ` (${Math.round(videoProgress * 100)}%)`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(contentType === "image" || contentType === "video") && mediaUrl && !isGenerating && (
            <Button
              variant="outline"
              size="sm"
              onClick={contentType === "image" ? generateImage : generateVideo}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerate
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={saving || !canSave}
            className="gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving..." : "Save Draft"}
          </Button>
          {hasScheduling && canSave && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setScheduleMode("publish-now")
                  setScheduleModalOpen(true)
                }}
                disabled={!canSave}
                className="gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Publish Now
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setScheduleMode("schedule")
                  setScheduleModalOpen(true)
                }}
                disabled={!canSave}
                className="gap-1.5"
              >
                <Clock className="h-3.5 w-3.5" />
                Schedule
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Editor / Media Display */}
      <div className="flex-1 overflow-y-auto p-4">
        {contentType === "text" && (
          <textarea
            value={displayContent}
            onChange={(e) => setContent(e.target.value)}
            disabled={isStreaming}
            placeholder="Your generated content will appear here..."
            className="h-full w-full resize-none bg-transparent text-sm leading-relaxed focus:outline-none"
          />
        )}

        {contentType === "image" && (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            {isGeneratingImage && (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Generating your image...</p>
              </div>
            )}
            {mediaUrl && !isGeneratingImage && (
              <img
                src={mediaUrl}
                alt="Generated image"
                className="max-w-full rounded-lg"
              />
            )}
            {videoError && !isGeneratingImage && (
              <div className="flex flex-col items-center gap-3 text-center">
                <p className="text-sm text-destructive">{videoError}</p>
                <Button variant="outline" size="sm" onClick={generateImage} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Try Again
                </Button>
              </div>
            )}
          </div>
        )}

        {contentType === "video" && (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            {isGeneratingVideo && (
              <div className="flex w-full max-w-md flex-col items-center gap-3">
                <Film className="h-8 w-8 text-primary" />
                <p className="text-sm text-muted-foreground">Generating your video...</p>
                {videoProgress !== null && (
                  <div className="w-full">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${Math.round(videoProgress * 100)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-center text-xs text-muted-foreground">
                      {Math.round(videoProgress * 100)}%
                    </p>
                  </div>
                )}
              </div>
            )}
            {mediaUrl && !isGeneratingVideo && (
              <video
                controls
                src={mediaUrl}
                className="max-w-full rounded-lg"
              />
            )}
            {videoError && !isGeneratingVideo && (
              <div className="flex flex-col items-center gap-3 text-center">
                <p className="text-sm text-destructive">{videoError}</p>
                <Button variant="outline" size="sm" onClick={generateVideo} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Try Again
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {contentItemId && (
        <ScheduleModal
          open={scheduleModalOpen}
          onClose={() => setScheduleModalOpen(false)}
          contentItemId={contentItemId}
          mode={scheduleMode}
        />
      )}
    </div>
  )
}
