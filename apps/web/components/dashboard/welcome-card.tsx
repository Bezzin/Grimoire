"use client"

import Link from "next/link"
import { PenSquare, Calendar, BarChart3, Users, ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface WelcomeCardProps {
  userName: string
}

const disabledActions = [
  { label: "Create Post", icon: PenSquare, tooltip: "Coming in Phase 2" },
  { label: "View Calendar", icon: Calendar, tooltip: "Coming in Phase 3" },
  { label: "Analytics", icon: BarChart3, tooltip: "Coming in Phase 4" },
] as const

export function WelcomeCard({ userName }: WelcomeCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-primary p-[1px]">
      <div className="relative rounded-[15px] bg-card px-6 py-8 md:px-8">
        {/* Decorative glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-accent/5 blur-3xl" />

        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Dashboard
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                Welcome back,{" "}
                <span className="grimoire-gradient-text">{userName}</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Here&apos;s what&apos;s happening with your marketing today.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2.5">
            <TooltipProvider>
              {disabledActions.map((action) => (
                <Tooltip key={action.label}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 rounded-lg border-border/50 bg-muted/30 opacity-45"
                      disabled
                    >
                      <action.icon className="h-3.5 w-3.5" />
                      {action.label}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{action.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
            <Button
              size="sm"
              className="group gap-2 rounded-lg bg-primary text-primary-foreground shadow-glow-sm transition-shadow hover:shadow-glow-md"
              asChild
            >
              <Link href="/dashboard/accounts">
                <Users className="h-3.5 w-3.5" />
                Connect Account
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
