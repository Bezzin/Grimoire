import { ListTodo } from "lucide-react"

export default function QueuePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <ListTodo className="h-12 w-12 text-muted-foreground" />
      <h1 className="text-2xl font-semibold">Publishing Queue</h1>
      <p className="text-muted-foreground max-w-md">
        Manage your scheduled, published, and failed posts. Monitor your publishing pipeline.
      </p>
      <p className="text-sm text-muted-foreground">Coming soon in Phase 4B</p>
    </div>
  )
}
