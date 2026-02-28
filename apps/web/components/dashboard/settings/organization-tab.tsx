"use client"

import { useState, useEffect } from "react"
import { trpc } from "@/lib/trpc/client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Loader2, Check, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"

const ROLE_STYLES: Record<string, string> = {
  OWNER: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  ADMIN: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  MEMBER: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?"
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function OrganizationSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-9 w-full animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-12 animate-pulse rounded bg-muted" />
            <div className="h-5 w-48 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-9 w-28 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="h-5 w-24 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
              <div className="space-y-1.5">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-48 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export function OrganizationTab() {
  const { data: org, isLoading } = trpc.user.getOrganization.useQuery()
  const utils = trpc.useUtils()

  const [orgName, setOrgName] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    if (org?.name) {
      setOrgName(org.name)
    }
  }, [org?.name])

  const updateOrg = trpc.user.updateOrganization.useMutation({
    onSuccess: () => {
      utils.user.getOrganization.invalidate()
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    },
  })

  function handleSave() {
    updateOrg.mutate({ name: orgName })
  }

  if (isLoading) {
    return <OrganizationSkeleton />
  }

  if (!org) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>
            No organization found. One will be created automatically.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>Manage your workspace settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Organization name"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-muted-foreground">Slug</Label>
            <p className="text-sm font-mono text-muted-foreground">
              {org.slug}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSave}
              disabled={
                updateOrg.isPending ||
                orgName === org.name ||
                orgName.trim().length === 0
              }
            >
              {updateOrg.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save changes
            </Button>
            {showSuccess && (
              <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                <Check className="h-4 w-4" />
                Organization updated
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Members</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" disabled>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite Members
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Coming soon</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {org.members.map((member) => (
              <div key={member.user.id} className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage
                    src={member.user.image ?? undefined}
                    alt={member.user.name ?? ""}
                  />
                  <AvatarFallback className="text-xs">
                    {getInitials(member.user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {member.user.name ?? "Unnamed"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.user.email}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    ROLE_STYLES[member.role] ?? ROLE_STYLES.MEMBER
                  )}
                >
                  {member.role}
                </span>
              </div>
            ))}
          </div>
          {org.members.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No members found
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
