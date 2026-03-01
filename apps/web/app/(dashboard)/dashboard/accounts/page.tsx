import { AccountsPageClient } from "@/components/dashboard/accounts/accounts-page-client"

export default function AccountsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Connected Accounts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your social media accounts to analyze your brand voice
        </p>
      </div>
      <AccountsPageClient />
    </div>
  )
}
