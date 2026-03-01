"use client"

import { useState } from "react"
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { trpc } from "@/lib/trpc/client"

const CATEGORY_OPTIONS = [
  { key: "social", label: "Social Post" },
  { key: "thread", label: "Thread / Carousel" },
  { key: "blog", label: "Blog" },
  { key: "email", label: "Email" },
  { key: "ads", label: "Ad Copy" },
] as const

const TIER_OPTIONS = [
  { key: "fast", label: "Fast", description: "Quick generation, good for simple content" },
  { key: "standard", label: "Standard", description: "Balanced quality and speed" },
  { key: "creative", label: "Creative", description: "Highest quality, best for long-form" },
] as const

interface InputField {
  key: string
  label: string
  type: "text" | "textarea" | "number" | "select"
  required: boolean
  placeholder: string
}

interface CustomTemplateWizardProps {
  onComplete: () => void
  onCancel: () => void
}

export function CustomTemplateWizard({ onComplete, onCancel }: CustomTemplateWizardProps) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<string>("social")
  const [tier, setTier] = useState<string>("standard")
  const [inputFields, setInputFields] = useState<InputField[]>([
    { key: "brief", label: "Brief", type: "textarea", required: true, placeholder: "Describe what you want..." },
  ])
  const [instructions, setInstructions] = useState("")

  const createTemplate = trpc.customTemplate.create.useMutation({
    onSuccess: onComplete,
  })

  const steps = ["Basics", "Inputs", "Instructions", "Review"]

  function addField() {
    const fieldNum = inputFields.length + 1
    setInputFields((prev) => [
      ...prev,
      { key: `field${fieldNum}`, label: `Field ${fieldNum}`, type: "text", required: false, placeholder: "" },
    ])
  }

  function updateField(index: number, updates: Partial<InputField>) {
    setInputFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...updates } : f))
    )
  }

  function removeField(index: number) {
    setInputFields((prev) => prev.filter((_, i) => i !== index))
  }

  function generateSystemPrompt(): string {
    return `You are a marketing copywriter. ${instructions}\n\nUse the following inputs to create the content:\n${inputFields.map((f) => `- ${f.label}: {{${f.key}}}`).join("\n")}\n\n{{brandContext}}`
  }

  function handleSubmit() {
    createTemplate.mutate({
      name,
      description: description || undefined,
      category: category as "social" | "thread" | "blog" | "email" | "ads" | "image" | "video",
      tier: tier as "fast" | "standard" | "creative",
      inputFields,
      systemPrompt: generateSystemPrompt(),
      platforms: [],
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Custom Template</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Step {step + 1} of {steps.length}: {steps[step]}
          </p>
        </div>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1.5">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= step ? "grimoire-gradient" : "bg-muted/30"
            }`}
          />
        ))}
      </div>

      <Card className="border-border/50">
        <CardContent className="pt-6">
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Template Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder='e.g., "Weekly Newsletter", "Product Teaser"'
                  className="h-11 border-border/60 bg-muted/30 focus:bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Description (optional)</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of what this template creates"
                  className="h-11 border-border/60 bg-muted/30 focus:bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Category</Label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {CATEGORY_OPTIONS.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setCategory(cat.key)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        category === cat.key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">AI Model Tier</Label>
                <div className="grid grid-cols-3 gap-2">
                  {TIER_OPTIONS.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTier(t.key)}
                      className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                        tier === t.key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <p className="text-sm font-medium">{t.label}</p>
                      <p className="text-[10px]">{t.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <Label className="text-sm font-medium">Input Fields</Label>
              <p className="text-xs text-muted-foreground">
                Define what the user fills in when using this template. Each field becomes a placeholder in the prompt.
              </p>
              {inputFields.map((field, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-border/50 p-3">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={field.label}
                      onChange={(e) => {
                        const label = e.target.value
                        const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
                        updateField(i, { label, key: key || `field${i + 1}` })
                      }}
                      placeholder="Field label"
                      className="h-8 text-sm"
                    />
                    <div className="flex gap-2">
                      <select
                        value={field.type}
                        onChange={(e) => updateField(i, { type: e.target.value as InputField["type"] })}
                        className="h-8 rounded-md border border-border/60 bg-muted/30 px-2 text-xs"
                      >
                        <option value="text">Short text</option>
                        <option value="textarea">Long text</option>
                        <option value="number">Number</option>
                      </select>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateField(i, { required: e.target.checked })}
                          className="rounded"
                        />
                        Required
                      </label>
                    </div>
                  </div>
                  {inputFields.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeField(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              {inputFields.length < 10 && (
                <Button variant="outline" size="sm" onClick={addField} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add Field
                </Button>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Label className="text-sm font-medium">Instructions</Label>
              <p className="text-xs text-muted-foreground">
                Describe in plain English what the AI should do with the inputs. The system will build the prompt automatically.
              </p>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={6}
                placeholder="e.g., Write a compelling email newsletter intro that hooks the reader and summarizes the key points. Keep it under 150 words and use a conversational tone."
                className="w-full rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="rounded-lg bg-muted/20 p-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Generated prompt preview</p>
                <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{generateSystemPrompt()}</pre>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Review Your Template</h3>
              <div className="space-y-3 rounded-lg bg-muted/20 p-4">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Name</span>
                  <p className="text-sm font-medium">{name}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Category</span>
                  <p className="text-sm capitalize">{category}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Model Tier</span>
                  <p className="text-sm capitalize">{tier}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Input Fields</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {inputFields.map((f) => (
                      <span key={f.key} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {f.label}{f.required ? " *" : ""}
                      </span>
                    ))}
                  </div>
                </div>
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
              (step === 1 && inputFields.length === 0) ||
              (step === 2 && instructions.trim().length === 0)
            }
            className="gap-2 grimoire-gradient text-white"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={createTemplate.isPending}
            className="gap-2 grimoire-gradient text-white"
          >
            <Check className="h-4 w-4" />
            {createTemplate.isPending ? "Creating..." : "Create Template"}
          </Button>
        )}
      </div>
    </div>
  )
}
