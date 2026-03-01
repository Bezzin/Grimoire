import { BarChart3 } from "lucide-react"

export default function AnalyticsPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <BarChart3 className="h-12 w-12 text-muted-foreground" />
      <h1 className="text-2xl font-semibold">Analytics Dashboard</h1>
      <p className="text-muted-foreground max-w-md">
        Track impressions, engagement, and top-performing posts across all your social platforms.
      </p>
      <p className="text-sm text-muted-foreground">Coming soon in Phase 4D</p>
    </div>
  )
}
