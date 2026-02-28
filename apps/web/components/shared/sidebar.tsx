"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  PenSquare,
  Calendar,
  ListChecks,
  BarChart3,
  Palette,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, disabled: false },
  { title: "Create", href: "/dashboard/create", icon: PenSquare, disabled: true },
  { title: "Calendar", href: "/dashboard/calendar", icon: Calendar, disabled: true },
  { title: "Queue", href: "/dashboard/queue", icon: ListChecks, disabled: true },
  { title: "Analytics", href: "/dashboard/analytics", icon: BarChart3, disabled: true },
  { title: "Brand", href: "/dashboard/brand", icon: Palette, disabled: true },
  { title: "Accounts", href: "/dashboard/accounts", icon: Users, disabled: false },
  { title: "Settings", href: "/dashboard/settings", icon: Settings, disabled: false },
] as const

interface SidebarProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
  open: boolean
  onClose: () => void
}

export function Sidebar({ user, open, onClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  const initials =
    user.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "U"

  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out md:relative md:z-auto",
          collapsed ? "md:w-16" : "md:w-64",
          open ? "w-64 translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Header / Branding */}
        <div className="flex h-16 items-center border-b border-sidebar-border px-4">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-2 font-semibold tracking-tight",
              collapsed && "md:justify-center"
            )}
          >
            <Sparkles className="h-5 w-5 shrink-0 text-primary" />
            {!collapsed && (
              <span className="text-lg md:block">Grimoire</span>
            )}
            {collapsed && (
              <span className="text-lg md:hidden">Grimoire</span>
            )}
          </Link>

          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto md:hidden"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href))

            const linkContent = (
              <span
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  item.disabled && "cursor-not-allowed opacity-50",
                  collapsed && "md:justify-center md:px-2"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="md:block">{item.title}</span>}
                {collapsed && <span className="md:hidden">{item.title}</span>}
              </span>
            )

            const wrappedLink = item.disabled ? (
              <span key={item.href} aria-disabled="true">
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{item.title} - Coming Soon</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  linkContent
                )}
              </span>
            ) : (
              <Link key={item.href} href={item.href} onClick={onClose}>
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{item.title}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  linkContent
                )}
              </Link>
            )

            return wrappedLink
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-sidebar-border p-3">
          <div
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2",
              collapsed && "md:justify-center md:px-0"
            )}
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex flex-col overflow-hidden md:block">
                <span className="truncate text-sm font-medium">
                  {user.name ?? "User"}
                </span>
                <span className="truncate text-xs text-sidebar-foreground/60">
                  {user.email}
                </span>
              </div>
            )}
            {collapsed && (
              <div className="flex flex-col overflow-hidden md:hidden">
                <span className="truncate text-sm font-medium">
                  {user.name ?? "User"}
                </span>
                <span className="truncate text-xs text-sidebar-foreground/60">
                  {user.email}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden border-t border-sidebar-border p-2 md:block">
          <Button
            variant="ghost"
            size="icon"
            className="w-full"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
