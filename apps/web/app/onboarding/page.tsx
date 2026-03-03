"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { completeOnboarding } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Building2,
  Briefcase,
  Users,
  Lightbulb,
  BarChart3,
  CalendarDays,
  PenTool,
  Zap,
} from "lucide-react"

const BUSINESS_TYPES = [
  {
    value: "agency",
    label: "Marketing / Ad Agency",
    description: "I manage marketing for multiple clients",
    icon: Building2,
  },
  {
    value: "in-house",
    label: "In-house Marketing Team",
    description: "I manage marketing for my own company",
    icon: Briefcase,
  },
  {
    value: "freelancer",
    label: "Freelance Marketer",
    description: "I'm an independent consultant",
    icon: Users,
  },
  {
    value: "solopreneur",
    label: "Solopreneur / Creator",
    description: "I run my own business or brand",
    icon: Lightbulb,
  },
] as const

const MARKETING_GOALS = [
  {
    value: "content-creation",
    label: "Create content faster",
    icon: PenTool,
  },
  {
    value: "scheduling",
    label: "Schedule & publish posts",
    icon: CalendarDays,
  },
  {
    value: "analytics",
    label: "Track campaign performance",
    icon: BarChart3,
  },
  {
    value: "all",
    label: "All of the above",
    icon: Zap,
  },
] as const

export default function OnboardingPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [businessType, setBusinessType] = useState("")
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  function toggleGoal(goal: string) {
    if (goal === "all") {
      setSelectedGoals(["all"])
      return
    }
    setSelectedGoals((prev) => {
      const filtered = prev.filter((g) => g !== "all")
      if (filtered.includes(goal)) {
        return filtered.filter((g) => g !== goal)
      }
      return [...filtered, goal]
    })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    if (!name.trim()) {
      setError("Please enter your name.")
      return
    }

    if (!businessType) {
      setError("Please select what describes you best.")
      return
    }

    if (selectedGoals.length === 0) {
      setError("Please select at least one goal.")
      return
    }

    setIsLoading(true)

    try {
      const result = await completeOnboarding({
        name: name.trim(),
        businessType,
        marketingGoals: selectedGoals,
      })

      if (result.error) {
        setError(result.error)
        return
      }

      router.push("/dashboard")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="animate-fade-in-up space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Tell us about yourself
        </h1>
        <p className="text-sm text-muted-foreground">
          This helps us personalize your experience
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Name input */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">
            Your first name
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="Jane"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="given-name"
            autoFocus
            disabled={isLoading}
            className="h-11 rounded-lg border-border/60 bg-muted/30 transition-colors focus:bg-background"
          />
        </div>

        {/* Business type selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">I am a...</Label>
          <div className="grid gap-2">
            {BUSINESS_TYPES.map((type) => {
              const Icon = type.icon
              const isSelected = businessType === type.value
              return (
                <button
                  key={type.value}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setBusinessType(type.value)}
                  className={`group flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all ${
                    isSelected
                      ? "border-primary/50 bg-primary/5 shadow-glow-sm"
                      : "border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors ${
                      isSelected
                        ? "grimoire-gradient text-white"
                        : "bg-muted text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        isSelected ? "text-foreground" : "text-foreground/80"
                      }`}
                    >
                      {type.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {type.description}
                    </p>
                  </div>
                  <div className="ml-auto shrink-0">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {isSelected && (
                        <div className="h-2 w-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Goals selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Select your main goal</Label>
          <div className="grid grid-cols-2 gap-2">
            {MARKETING_GOALS.map((goal) => {
              const Icon = goal.icon
              const isSelected = selectedGoals.includes(goal.value)
              return (
                <button
                  key={goal.value}
                  type="button"
                  disabled={isLoading}
                  onClick={() => toggleGoal(goal.value)}
                  className={`group flex flex-col items-center gap-2 rounded-lg border px-3 py-4 text-center transition-all ${
                    isSelected
                      ? "border-primary/50 bg-primary/5 shadow-glow-sm"
                      : "border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                      isSelected
                        ? "grimoire-gradient text-white"
                        : "bg-muted text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <p
                    className={`text-xs font-medium leading-tight ${
                      isSelected ? "text-foreground" : "text-foreground/80"
                    }`}
                  >
                    {goal.label}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="h-11 w-full rounded-lg grimoire-gradient text-white shadow-glow-sm transition-shadow hover:shadow-glow-md"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner />
              Setting up...
            </span>
          ) : (
            "Continue"
          )}
        </Button>
      </form>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}
