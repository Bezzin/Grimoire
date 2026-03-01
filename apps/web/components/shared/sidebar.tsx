"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
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
  Lock,
  ChevronsUpDown,
  Check,
  Plus,
  Loader2,
  Building2,
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { trpc } from "@/lib/trpc/client"

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, disabled: false, phase: null },
  { title: "Create", href: "/dashboard/create", icon: PenSquare, disabled: false, phase: null },
  { title: "Calendar", href: "/dashboard/calendar", icon: Calendar, disabled: false, phase: null },
  { title: "Queue", href: "/dashboard/queue", icon: ListChecks, disabled: false, phase: null },
  { title: "Analytics", href: "/dashboard/analytics", icon: BarChart3, disabled: false, phase: null },
  { title: "Brand", href: "/dashboard/brand", icon: Palette, disabled: false, phase: null },
  { title: "Accounts", href: "/dashboard/accounts", icon: Users, disabled: false, phase: null },
  { title: "Settings", href: "/dashboard/settings", icon: Settings, disabled: false, phase: null },
] as const

const PLAN_STYLES: Record<string, string> = {
  FREE: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  PRO: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  AGENCY: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
}

interface SidebarProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
  open: boolean
  onClose: () => void
  activeOrgId: string | null
}

export function Sidebar({ user, open, onClose, activeOrgId }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

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
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out md:relative md:z-auto",
          collapsed ? "md:w-[68px]" : "md:w-[260px]",
          open ? "w-[260px] translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Client Switcher */}
        <div className="flex h-16 items-center border-b border-sidebar-border px-3">
          <ClientSwitcher
            activeOrgId={activeOrgId}
            collapsed={collapsed}
          />

          {/* Mobile close */}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto shrink-0 md:hidden"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          <p
            className={cn(
              "mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted",
              collapsed && "md:hidden"
            )}
          >
            Navigation
          </p>
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href))

            const linkContent = (
              <span
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-sidebar-foreground/65 hover:bg-sidebar-accent/8 hover:text-sidebar-foreground",
                  item.disabled && "cursor-not-allowed opacity-40",
                  collapsed && "md:justify-center md:px-2"
                )}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                )}
                <item.icon className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-colors",
                  isActive && "text-primary"
                )} />
                {!collapsed && (
                  <span className="flex-1 md:block">{item.title}</span>
                )}
                {collapsed && (
                  <span className="flex-1 md:hidden">{item.title}</span>
                )}
                {!collapsed && item.disabled && (
                  <Lock className="h-3 w-3 shrink-0 text-sidebar-muted md:block" />
                )}
              </span>
            )

            const wrappedLink = item.disabled ? (
              <span key={item.href} aria-disabled="true">
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" className="flex items-center gap-2">
                      <Lock className="h-3 w-3" />
                      <span>{item.title} — Phase {item.phase}</span>
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

        {/* Grimoire branding (small) */}
        <div
          className={cn(
            "flex items-center gap-2 border-t border-sidebar-border px-4 py-2",
            collapsed && "md:justify-center md:px-2"
          )}
        >
          <Link
            href="/dashboard"
            className="flex items-center gap-2"
          >
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded grimoire-gradient">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
            {!collapsed && (
              <span className="text-xs font-medium text-sidebar-muted md:block">
                Grimoire
              </span>
            )}
            {collapsed && (
              <span className="text-xs font-medium text-sidebar-muted md:hidden">
                Grimoire
              </span>
            )}
          </Link>
        </div>

        {/* User section */}
        <div className="border-t border-sidebar-border p-3">
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5",
              collapsed && "md:justify-center md:px-0"
            )}
          >
            <Avatar className="h-8 w-8 shrink-0 ring-2 ring-primary/20 ring-offset-1 ring-offset-sidebar">
              <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex flex-col overflow-hidden md:block">
                <span className="truncate text-sm font-semibold">
                  {user.name ?? "User"}
                </span>
                <span className="truncate text-xs text-sidebar-muted">
                  {user.email}
                </span>
              </div>
            )}
            {collapsed && (
              <div className="flex flex-col overflow-hidden md:hidden">
                <span className="truncate text-sm font-semibold">
                  {user.name ?? "User"}
                </span>
                <span className="truncate text-xs text-sidebar-muted">
                  {user.email}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Collapse toggle */}
        <div className="hidden border-t border-sidebar-border p-2 md:block">
          <Button
            variant="ghost"
            size="icon"
            className="w-full text-sidebar-muted hover:text-sidebar-foreground"
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

/* ------------------------------------------------------------------ */
/*  Client Workspace Switcher                                         */
/* ------------------------------------------------------------------ */

interface ClientSwitcherProps {
  activeOrgId: string | null
  collapsed: boolean
}

function ClientSwitcher({ activeOrgId, collapsed }: ClientSwitcherProps) {
  const router = useRouter()
  const { data: orgs } = trpc.user.listOrganizations.useQuery()
  const utils = trpc.useUtils()

  const [showNewDialog, setShowNewDialog] = useState(false)
  const [newOrgName, setNewOrgName] = useState("")
  const [switching, setSwitching] = useState(false)

  const createOrg = trpc.user.createOrganization.useMutation({
    onSuccess: async (data) => {
      utils.user.listOrganizations.invalidate()
      setNewOrgName("")
      setShowNewDialog(false)
      await switchToOrg(data.id)
    },
  })

  const activeOrg = orgs?.find((o) => o.id === activeOrgId) ?? orgs?.[0]

  async function switchToOrg(orgId: string) {
    if (orgId === activeOrgId) return
    setSwitching(true)
    try {
      await fetch("/api/org/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      })
      router.refresh()
    } catch {
      // Switch failed silently; user can retry
    } finally {
      setSwitching(false)
    }
  }

  function handleCreateOrg() {
    const trimmed = newOrgName.trim()
    if (trimmed.length === 0) return
    createOrg.mutate({ name: trimmed })
  }

  // Collapsed state: show icon only with tooltip
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10"
            aria-label={activeOrg?.name ?? "Select workspace"}
          >
            <Building2 className="h-4 w-4 text-primary" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{activeOrg?.name ?? "Select workspace"}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  // New client dialog overlay
  if (showNewDialog) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-xs font-semibold text-sidebar-foreground">
          New Client
        </p>
        <div className="space-y-2">
          <Label htmlFor="new-org-name" className="sr-only">
            Client name
          </Label>
          <Input
            id="new-org-name"
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
            placeholder="Client name"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateOrg()
              if (e.key === "Escape") {
                setShowNewDialog(false)
                setNewOrgName("")
              }
            }}
          />
          <div className="flex gap-1.5">
            <Button
              size="sm"
              className="h-7 flex-1 text-xs"
              onClick={handleCreateOrg}
              disabled={createOrg.isPending || newOrgName.trim().length === 0}
            >
              {createOrg.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Create"
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => {
                setShowNewDialog(false)
                setNewOrgName("")
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-sidebar-accent/8",
            switching && "pointer-events-none opacity-60"
          )}
          aria-label="Switch workspace"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold leading-tight">
              {activeOrg?.name ?? "Select workspace"}
            </span>
            {activeOrg?.plan && (
              <span
                className={cn(
                  "mt-0.5 inline-flex w-fit items-center rounded-full px-1.5 py-0 text-[10px] font-medium leading-relaxed",
                  PLAN_STYLES[activeOrg.plan] ?? PLAN_STYLES.FREE
                )}
              >
                {activeOrg.plan}
              </span>
            )}
          </div>
          {switching ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-sidebar-muted" />
          ) : (
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-sidebar-muted" />
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[228px]">
        {orgs?.map((org) => (
          <DropdownMenuItem
            key={org.id}
            className="flex cursor-pointer items-center gap-2"
            onSelect={() => switchToOrg(org.id)}
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10">
              <Building2 className="h-3 w-3 text-primary" />
            </div>
            <span className="flex-1 truncate text-sm">{org.name}</span>
            {org.plan && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-medium",
                  PLAN_STYLES[org.plan] ?? PLAN_STYLES.FREE
                )}
              >
                {org.plan}
              </span>
            )}
            {org.id === activeOrgId && (
              <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="flex cursor-pointer items-center gap-2 text-sm"
          onSelect={() => setShowNewDialog(true)}
        >
          <Plus className="h-4 w-4" />
          <span>Add New Client</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
