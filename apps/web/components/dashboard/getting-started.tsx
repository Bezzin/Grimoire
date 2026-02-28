import { Circle, ArrowRight } from "lucide-react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface ChecklistItem {
  readonly label: string
  readonly href?: string
  readonly badge?: string
  readonly disabled: boolean
}

const checklistItems: readonly ChecklistItem[] = [
  {
    label: "Connect your first social account",
    href: "/dashboard/accounts",
    disabled: false,
  },
  {
    label: "Set up your brand voice",
    badge: "Phase 2",
    disabled: true,
  },
  {
    label: "Create your first post",
    badge: "Phase 2",
    disabled: true,
  },
  {
    label: "Schedule your first post",
    badge: "Phase 3",
    disabled: true,
  },
] as const

export function GettingStarted() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Getting Started</CardTitle>
        <CardDescription>
          Complete these steps to get the most out of Grimoire
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {checklistItems.map((item) => (
            <li key={item.label}>
              {item.disabled ? (
                <div className="flex items-center gap-3 opacity-60">
                  <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {item.label}
                  </span>
                  {item.badge ? (
                    <span className="ml-auto shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
              ) : (
                <Link
                  href={item.href ?? "#"}
                  className="group flex items-center gap-3 rounded-md p-1 -m-1 transition-colors hover:bg-accent"
                >
                  <Circle className="h-5 w-5 shrink-0 text-primary" />
                  <span className="text-sm font-medium">{item.label}</span>
                  <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
