"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "./theme-toggle"
import { UserMenu } from "./user-menu"

interface HeaderProps {
  onMenuToggle?: () => void
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function Header({ onMenuToggle, user }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuToggle}
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex-1" />
      <ThemeToggle />
      <UserMenu user={user} />
    </header>
  )
}
