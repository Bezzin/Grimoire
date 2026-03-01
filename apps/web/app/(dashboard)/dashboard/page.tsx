import { auth } from "@/lib/auth"
import { WelcomeCard } from "@/components/dashboard/welcome-card"
import { GettingStarted } from "@/components/dashboard/getting-started"
import { AccountsStatus } from "@/components/dashboard/accounts-status"

export default async function DashboardPage() {
  const session = await auth()

  return (
    <div className="space-y-8 stagger-children">
      <WelcomeCard userName={session?.user?.name ?? "there"} />
      <div className="grid gap-6 lg:grid-cols-2">
        <GettingStarted />
        <AccountsStatus />
      </div>
    </div>
  )
}
