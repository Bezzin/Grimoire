"use client"

import { useState } from "react"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { TRPCProvider } from "@/lib/trpc/provider"

interface DashboardShellProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
  children: React.ReactNode
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <TRPCProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar
          user={user}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header
            user={user}
            onMenuToggle={() => setSidebarOpen((prev) => !prev)}
          />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-6xl px-6 py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </TRPCProvider>
  )
}
