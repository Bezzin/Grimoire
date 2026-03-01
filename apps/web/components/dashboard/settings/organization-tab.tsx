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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Loader2,
  Check,
  UserPlus,
  X,
  Mail,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"

const ROLE_STYLES: Record<string, string> = {
  OWNER: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  ADMIN: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  MEMBER: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  VIEWER: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
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

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        ROLE_STYLES[role] ?? ROLE_STYLES.MEMBER
      )}
    >
      {role}
    </span>
  )
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

function InviteModal({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"ADMIN" | "MEMBER" | "VIEWER">("MEMBER")
  const [error, setError] = useState<string | null>(null)

  const createInvite = trpc.invitation.create.useMutation({
    onSuccess: () => {
      setOpen(false)
      setEmail("")
      setRole("MEMBER")
      setError(null)
      onSuccess()
    },
    onError: (err) => {
      setError(err.message)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    createInvite.mutate({ email, role })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Members
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Invite a team member</DialogTitle>
            <DialogDescription>
              Send an invitation email to add someone to your workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createInvite.isPending || !email.trim()}
            >
              {createInvite.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PendingInvitations() {
  const { data: invitations, isLoading } = trpc.invitation.list.useQuery()
  const utils = trpc.useUtils()

  const revokeInvite = trpc.invitation.revoke.useMutation({
    onSuccess: () => {
      utils.invitation.list.invalidate()
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!invitations || invitations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No pending invitations
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {invitations.map((invite) => (
        <div key={invite.id} className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
            <Mail className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{invite.email}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Sent {formatDate(invite.createdAt)}</span>
              {invite.invitedBy?.name && (
                <span>by {invite.invitedBy.name}</span>
              )}
            </div>
          </div>
          <RoleBadge role={invite.role} />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => revokeInvite.mutate({ id: invite.id })}
            disabled={revokeInvite.isPending}
            className="text-muted-foreground hover:text-destructive"
          >
            {revokeInvite.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
            <span className="sr-only">Revoke</span>
          </Button>
        </div>
      ))}
    </div>
  )
}

function MemberRow({
  member,
  currentUserId,
  isAdmin,
}: {
  member: {
    id: string
    role: string
    user: {
      id: string
      name: string | null
      email: string | null
      image: string | null
    }
  }
  currentUserId: string
  isAdmin: boolean
}) {
  const utils = trpc.useUtils()

  const updateRole = trpc.user.updateMemberRole.useMutation({
    onSuccess: () => {
      utils.user.getOrganization.invalidate()
    },
  })

  const removeMember = trpc.user.removeMember.useMutation({
    onSuccess: () => {
      utils.user.getOrganization.invalidate()
    },
  })

  const isOwner = member.role === "OWNER"
  const isSelf = member.user.id === currentUserId
  const canChangeRole = isAdmin && !isOwner
  const canRemove = isAdmin && !isOwner && !isSelf

  return (
    <div className="flex items-center gap-3">
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
          {isSelf && (
            <span className="ml-1 text-xs text-muted-foreground">(you)</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {member.user.email}
        </p>
      </div>
      {canChangeRole ? (
        <Select
          value={member.role}
          onValueChange={(value) =>
            updateRole.mutate({
              memberId: member.id,
              role: value as "ADMIN" | "MEMBER" | "VIEWER",
            })
          }
          disabled={updateRole.isPending}
        >
          <SelectTrigger className="w-[110px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="MEMBER">Member</SelectItem>
            <SelectItem value="VIEWER">Viewer</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <RoleBadge role={member.role} />
      )}
      {canRemove && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => removeMember.mutate({ memberId: member.id })}
          disabled={removeMember.isPending}
          className="text-muted-foreground hover:text-destructive"
        >
          {removeMember.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
          <span className="sr-only">Remove member</span>
        </Button>
      )}
    </div>
  )
}

export function OrganizationTab() {
  const { data: org, isLoading } = trpc.user.getOrganization.useQuery()
  const { data: me } = trpc.user.me.useQuery()
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

  function handleInviteSuccess() {
    utils.invitation.list.invalidate()
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

  const currentUserId = me?.id ?? ""
  const currentMember = org.members.find((m) => m.user.id === currentUserId)
  const isAdmin =
    currentMember?.role === "OWNER" || currentMember?.role === "ADMIN"

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
            {isAdmin && <InviteModal onSuccess={handleInviteSuccess} />}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {org.members.map((member) => (
              <MemberRow
                key={member.user.id}
                member={member}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
              />
            ))}
          </div>
          {org.members.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No members found
            </p>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>
              Invitations that have been sent but not yet accepted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PendingInvitations />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
