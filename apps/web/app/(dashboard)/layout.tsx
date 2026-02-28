import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { DashboardShell } from "@/components/shared/dashboard-shell"
import { api } from "@/lib/trpc/server"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Ensure user has an organization (creates one on first login)
  const caller = await api()
  await caller.user.ensureOrganization()

  return <DashboardShell user={session.user}>{children}</DashboardShell>
}
