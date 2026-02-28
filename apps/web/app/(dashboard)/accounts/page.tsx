import { AccountsEmpty } from "@/components/dashboard/accounts-empty"

export default function AccountsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Connected Accounts</h1>
        <p className="text-muted-foreground">Manage your social media connections</p>
      </div>
      <AccountsEmpty />
    </div>
  )
}
