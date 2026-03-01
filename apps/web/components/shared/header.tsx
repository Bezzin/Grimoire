"use client"

import { Menu, Search } from "lucide-react"
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
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border/50 bg-background/80 px-6 backdrop-blur-xl">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuToggle}
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Search bar placeholder */}
      <div className="hidden flex-1 md:block">
        <div className="flex max-w-md items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-border">
          <Search className="h-3.5 w-3.5" />
          <span className="select-none">Search...</span>
          <kbd className="ml-auto rounded border border-border/60 bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            /
          </kbd>
        </div>
      </div>

      <div className="flex-1 md:hidden" />
      <ThemeToggle />
      <UserMenu user={user} />
    </header>
  )
}
