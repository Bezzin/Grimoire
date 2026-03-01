import { Circle, ArrowRight, CheckCircle2, Lock } from "lucide-react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface ChecklistItem {
  readonly label: string
  readonly description: string
  readonly href?: string
  readonly badge?: string
  readonly disabled: boolean
}

const checklistItems: readonly ChecklistItem[] = [
  {
    label: "Connect your first social account",
    description: "Link Instagram, X, LinkedIn or others",
    href: "/dashboard/accounts",
    disabled: false,
  },
  {
    label: "Set up your brand voice",
    description: "Define tone, keywords, and style",
    badge: "Phase 2",
    disabled: true,
  },
  {
    label: "Create your first post",
    description: "Generate content with AI assistance",
    badge: "Phase 2",
    disabled: true,
  },
  {
    label: "Schedule your first post",
    description: "Plan and queue your content",
    badge: "Phase 3",
    disabled: true,
  },
] as const

export function GettingStarted() {
  return (
    <Card className="border-border/50 shadow-soft">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Getting Started</CardTitle>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            1 of 4
          </span>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/4 rounded-full grimoire-gradient transition-all duration-500" />
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1">
          {checklistItems.map((item, i) => (
            <li key={item.label}>
              {item.disabled ? (
                <div className="flex items-start gap-3 rounded-xl px-3 py-3 opacity-50">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1">
                    <span className="text-sm text-muted-foreground">
                      {item.label}
                    </span>
                    <p className="mt-0.5 text-xs text-muted-foreground/60">
                      {item.description}
                    </p>
                  </div>
                  {item.badge ? (
                    <span className="mt-0.5 shrink-0 rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
              ) : (
                <Link
                  href={item.href ?? "#"}
                  className="group flex items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-primary/5"
                >
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-primary transition-all group-hover:scale-110" />
                  <div className="flex-1">
                    <span className="text-sm font-medium">{item.label}</span>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-primary opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                </Link>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
