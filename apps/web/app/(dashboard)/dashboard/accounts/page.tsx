import { AccountsEmpty } from "@/components/dashboard/accounts-empty"
import { Sparkles } from "lucide-react"

export default function AccountsPage() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Connected Accounts</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your social media connections
        </p>
      </div>
      <AccountsEmpty />
    </div>
  )
}
