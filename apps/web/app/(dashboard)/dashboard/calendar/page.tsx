import { CalendarDays } from "lucide-react"

export default function CalendarPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <CalendarDays className="h-12 w-12 text-muted-foreground" />
      <h1 className="text-2xl font-semibold">Content Calendar</h1>
      <p className="text-muted-foreground max-w-md">
        Visualise your scheduled content in a calendar view. Drag and drop to reschedule posts.
      </p>
      <p className="text-sm text-muted-foreground">Coming soon in Phase 4C</p>
    </div>
  )
}
