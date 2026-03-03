"use client"

import { useState } from "react"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { trpc } from "@/lib/trpc/client"

const TONE_OPTIONS = [
  "professional", "casual", "witty", "authoritative", "friendly",
  "bold", "minimal", "playful", "inspiring", "edgy",
]

interface BrandWizardProps {
  onComplete: () => void
  onCancel: () => void
}

export function BrandWizard({ onComplete, onCancel }: BrandWizardProps) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState("")
  const [toneKeywords, setToneKeywords] = useState<string[]>([])
  const [examples, setExamples] = useState<string[]>([""])
  const [avoidKeywords, setAvoidKeywords] = useState("")

  const createProfile = trpc.brand.create.useMutation({
    onSuccess: onComplete,
  })

  const steps = ["Name", "Tone", "Examples", "Avoid", "Review"]

  function handleToggleTone(tone: string) {
    setToneKeywords((prev) =>
      prev.includes(tone)
        ? prev.filter((t) => t !== tone)
        : prev.length < 5
          ? [...prev, tone]
          : prev
    )
  }

  function handleAddExample() {
    setExamples((prev) => [...prev, ""])
  }

  function handleUpdateExample(index: number, value: string) {
    setExamples((prev) => prev.map((e, i) => (i === index ? value : e)))
  }

  function handleRemoveExample(index: number) {
    setExamples((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit() {
    const filteredExamples = examples.filter((e) => e.trim().length > 0)
    const avoidList = avoidKeywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)

    createProfile.mutate({
      name,
      toneKeywords,
      avoidKeywords: avoidList,
      exampleContent: filteredExamples,
      isDefault: true,
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Brand Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Step {step + 1} of {steps.length}: {steps[step]}
          </p>
        </div>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1.5">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-primary" : "bg-muted/30"
            }`}
          />
        ))}
      </div>

      <Card className="border-border/50 shadow-soft">
        <CardContent className="pt-6">
          {step === 0 && (
            <div className="space-y-4">
              <Label htmlFor="profileName" className="text-sm font-medium">
                Profile Name
              </Label>
              <Input
                id="profileName"
                placeholder='e.g., "Primary Voice", "Casual Voice"'
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-lg border-border/60 bg-muted/30 focus:bg-background"
              />
              <p className="text-xs text-muted-foreground">
                Give your brand voice a name to identify it later.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <Label className="text-sm font-medium">
                Select 3-5 Tone Keywords
              </Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {TONE_OPTIONS.map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => handleToggleTone(tone)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                      toneKeywords.includes(tone)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    {tone}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {toneKeywords.length}/5 selected
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Label className="text-sm font-medium">
                Paste Example Content
              </Label>
              <p className="text-xs text-muted-foreground">
                Add 3-10 posts or pieces of content that represent your brand voice.
              </p>
              {examples.map((example, i) => (
                <div key={i} className="flex gap-2">
                  <textarea
                    value={example}
                    onChange={(e) => handleUpdateExample(i, e.target.value)}
                    placeholder={`Example ${i + 1}...`}
                    rows={3}
                    className="flex-1 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {examples.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground"
                      onClick={() => handleRemoveExample(i)}
                    >
                      &times;
                    </Button>
                  )}
                </div>
              ))}
              {examples.length < 10 && (
                <Button variant="outline" size="sm" onClick={handleAddExample}>
                  + Add Example
                </Button>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <Label htmlFor="avoidKeywords" className="text-sm font-medium">
                Words & Phrases to Avoid
              </Label>
              <textarea
                id="avoidKeywords"
                value={avoidKeywords}
                onChange={(e) => setAvoidKeywords(e.target.value)}
                placeholder="synergy, disrupt, leverage, game-changer..."
                rows={4}
                className="w-full rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated. These words will be flagged if they appear in generated content.
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Review Your Profile</h3>
              <div className="space-y-3 rounded-lg bg-muted/20 p-4">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Name</span>
                  <p className="text-sm font-medium">{name}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Tone</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {toneKeywords.map((t) => (
                      <span key={t} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium capitalize text-primary">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Examples</span>
                  <p className="text-sm">{examples.filter((e) => e.trim()).length} examples added</p>
                </div>
                {avoidKeywords && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Avoid</span>
                    <p className="text-sm">{avoidKeywords}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        {step < steps.length - 1 ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={
              (step === 0 && name.trim().length === 0) ||
              (step === 1 && toneKeywords.length < 3)
            }
            className="gap-2 bg-primary text-primary-foreground shadow-glow-sm"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={createProfile.isPending}
            className="gap-2 bg-primary text-primary-foreground shadow-glow-sm"
          >
            <Check className="h-4 w-4" />
            {createProfile.isPending ? "Creating..." : "Create Profile"}
          </Button>
        )}
      </div>
    </div>
  )
}
