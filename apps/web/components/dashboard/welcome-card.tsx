"use client"

import Link from "next/link"
import { PenSquare, Calendar, BarChart3, Users } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  {
    label: "Create Post",
    icon: PenSquare,
    tooltip: "Coming in Phase 2",
  },
  {
    label: "View Calendar",
    icon: Calendar,
    tooltip: "Coming in Phase 2",
  },
  {
    label: "Check Analytics",
    icon: BarChart3,
    tooltip: "Coming in Phase 3",
  },
] as const

export function WelcomeCard({ userName }: WelcomeCardProps) {
  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">
          Welcome back, {userName}
        </CardTitle>
        <CardDescription>
          Here&apos;s what&apos;s happening with your marketing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          <TooltipProvider>
            {disabledActions.map((action) => (
              <Tooltip key={action.label}>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 opacity-50"
                    disabled
                  >
                    <action.icon className="h-4 w-4" />
                    {action.label}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{action.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
          <Button variant="outline" className="flex items-center gap-2" asChild>
            <Link href="/dashboard/accounts">
              <Users className="h-4 w-4" />
              Connect Account
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
