"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc/client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UploadDropzone } from "@/lib/uploadthing"
import {
  ArrowLeft,
  Loader2,
  ImagePlus,
  X,
  FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

const PLATFORMS = [
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "TWITTER", label: "Twitter / X" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "THREADS", label: "Threads" },
  { value: "YOUTUBE", label: "YouTube" },
  { value: "PINTEREST", label: "Pinterest" },
]

const COMPARE_OPTIONS = [
  { value: "none", label: "No comparison" },
  { value: "PREVIOUS_PERIOD", label: "Previous period" },
  { value: "PREVIOUS_WEEK", label: "Previous week" },
  { value: "PREVIOUS_MONTH", label: "Previous month" },
  { value: "PREVIOUS_YEAR", label: "Previous year" },
]

const QUICK_RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
]

function toInputDate(date: Date): string {
  return date.toISOString().split("T")[0]
}

function fromInputDate(value: string): Date {
  const d = new Date(value + "T00:00:00")
  return d
}

export default function NewReportPage() {
  const router = useRouter()

  // Form state
  const [title, setTitle] = useState("")
  const [dateStart, setDateStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return toInputDate(d)
  })
  const [dateEnd, setDateEnd] = useState(() => toInputDate(new Date()))
  const [comparePeriod, setComparePeriod] = useState("none")
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [screenshots, setScreenshots] = useState<Array<{ url: string; name: string }>>([])
  const [screenshotNotes, setScreenshotNotes] = useState<Record<string, string>>({})
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  // Queries
  const { data: templates } = trpc.report.listTemplates.useQuery()

  // Mutations
  const generateMutation = trpc.report.generate.useMutation({
    onSuccess: (data) => {
      router.push(`/dashboard/reports/${data.id}`)
    },
  })

  const saveTemplateMutation = trpc.report.saveTemplate.useMutation()

  function togglePlatform(platform: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform],
    )
  }

  function applyQuickRange(days: number) {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    setDateStart(toInputDate(start))
    setDateEnd(toInputDate(end))
  }

  function loadTemplate(templateId: string) {
    const template = templates?.find((t) => t.id === templateId)
    if (!template) return
    setSelectedPlatforms(template.platforms)
    if (template.comparePeriod) {
      setComparePeriod(template.comparePeriod)
    }
    setSelectedTemplateId(templateId)
  }

  function handleSaveTemplate() {
    if (selectedPlatforms.length === 0) return
    const name = title.trim() || "Untitled Template"
    saveTemplateMutation.mutate({
      name,
      platforms: selectedPlatforms,
      comparePeriod: comparePeriod !== "none" ? comparePeriod as any : undefined,
      includeScreenshots: screenshots.length > 0,
    })
  }

  function handleGenerate() {
    if (selectedPlatforms.length === 0 || !title.trim()) return

    const notesObj: Record<string, string> = {}
    for (const [url, note] of Object.entries(screenshotNotes)) {
      if (note.trim()) notesObj[url] = note.trim()
    }

    generateMutation.mutate({
      title: title.trim(),
      dateRangeStart: fromInputDate(dateStart).toISOString(),
      dateRangeEnd: fromInputDate(dateEnd).toISOString(),
      comparePeriod: comparePeriod !== "none" ? comparePeriod as any : undefined,
      platforms: selectedPlatforms,
      screenshotUrls: screenshots.map((s) => s.url),
      screenshotNotes: Object.keys(notesObj).length > 0 ? notesObj : undefined,
      templateId: selectedTemplateId ?? undefined,
    })
  }

  const canGenerate = title.trim().length > 0 && selectedPlatforms.length > 0

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/reports">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold">Generate Report</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main form — 2 columns */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Report Title */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Report Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="report-title">Report Title</Label>
                <Input
                  id="report-title"
                  placeholder="e.g. September Performance Report"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Date Range */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Date Range</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick range buttons */}
              <div className="flex flex-wrap gap-2">
                {QUICK_RANGES.map((range) => (
                  <Button
                    key={range.days}
                    variant="outline"
                    size="sm"
                    onClick={() => applyQuickRange(range.days)}
                  >
                    {range.label}
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date-start">Start Date</Label>
                  <Input
                    id="date-start"
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date-end">End Date</Label>
                  <Input
                    id="date-end"
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                  />
                </div>
              </div>

              {/* Compare to */}
              <div className="space-y-2">
                <Label>Compare to</Label>
                <Select value={comparePeriod} onValueChange={setComparePeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPARE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Platform Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Platforms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">
                Select which platforms to include in this report.
              </p>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((platform) => {
                  const isSelected = selectedPlatforms.includes(platform.value)
                  return (
                    <button
                      key={platform.value}
                      type="button"
                      onClick={() => togglePlatform(platform.value)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground",
                      )}
                    >
                      {platform.label}
                    </button>
                  )
                })}
              </div>
              {selectedPlatforms.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs"
                  onClick={() => setSelectedPlatforms([])}
                >
                  Clear all
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Screenshots (First-Party Data) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <ImagePlus className="h-4 w-4" />
                Screenshots & First-Party Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload screenshots of platform dashboards or other data sources.
                The AI will incorporate any notes you add into the executive summary.
              </p>

              {screenshots.length > 0 && (
                <div className="space-y-3">
                  {screenshots.map((screenshot) => (
                    <div
                      key={screenshot.url}
                      className="flex items-start gap-3 rounded-lg border border-border p-3"
                    >
                      <img
                        src={screenshot.url}
                        alt={screenshot.name}
                        className="h-16 w-16 shrink-0 rounded object-cover"
                      />
                      <div className="flex flex-1 flex-col gap-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          {screenshot.name}
                        </p>
                        <Input
                          placeholder="Add a note about this screenshot..."
                          value={screenshotNotes[screenshot.url] ?? ""}
                          onChange={(e) =>
                            setScreenshotNotes((prev) => ({
                              ...prev,
                              [screenshot.url]: e.target.value,
                            }))
                          }
                          className="text-sm"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          setScreenshots((prev) =>
                            prev.filter((s) => s.url !== screenshot.url),
                          )
                          setScreenshotNotes((prev) => {
                            const next = { ...prev }
                            delete next[screenshot.url]
                            return next
                          })
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {screenshots.length < 5 && (
                <UploadDropzone
                  endpoint="reportScreenshot"
                  onClientUploadComplete={(res) => {
                    if (res) {
                      setScreenshots((prev) => [
                        ...prev,
                        ...res.map((f) => ({
                          url: f.serverData.url,
                          name: f.serverData.name,
                        })),
                      ])
                    }
                  }}
                  onUploadError={(err) => {
                    console.error("Upload error:", err)
                  }}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar — 1 column */}
        <div className="flex flex-col gap-6">
          {/* Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <FileText className="h-4 w-4" />
                Templates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {templates && templates.length > 0 ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    Load a saved template to pre-fill settings.
                  </p>
                  <div className="space-y-2">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => loadTemplate(template.id)}
                        className={cn(
                          "w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                          selectedTemplateId === template.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-foreground/20",
                        )}
                      >
                        <p className="font-medium">{template.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {template.platforms.length} platforms
                        </p>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No templates saved yet. Generate a report and save its settings
                  as a template for quick reuse.
                </p>
              )}

              {selectedPlatforms.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleSaveTemplate}
                  disabled={saveTemplateMutation.isPending}
                >
                  {saveTemplateMutation.isPending ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : null}
                  {saveTemplateMutation.isSuccess
                    ? "Template Saved!"
                    : "Save as Template"}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Summary & Generate */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date range</span>
                  <span className="font-medium">
                    {new Date(dateStart + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    —{" "}
                    {new Date(dateEnd + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platforms</span>
                  <span className="font-medium">{selectedPlatforms.length} selected</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Compare</span>
                  <span className="font-medium">
                    {COMPARE_OPTIONS.find((o) => o.value === comparePeriod)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Screenshots</span>
                  <span className="font-medium">{screenshots.length}</span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleGenerate}
                disabled={!canGenerate || generateMutation.isPending}
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Report"
                )}
              </Button>

              {generateMutation.isError && (
                <p className="text-xs text-destructive">
                  {generateMutation.error.message}
                </p>
              )}

              {!canGenerate && (
                <p className="text-xs text-muted-foreground">
                  Add a title and select at least one platform.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
