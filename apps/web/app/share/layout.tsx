"use client"

import { TRPCProvider } from "@/lib/trpc/provider"

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return <TRPCProvider>{children}</TRPCProvider>
}
