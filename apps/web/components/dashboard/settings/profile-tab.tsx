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
import { Loader2, Check } from "lucide-react"

function ProfileSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-24 animate-pulse rounded bg-muted" />
        <div className="h-4 w-56 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="h-4 w-12 animate-pulse rounded bg-muted" />
          <div className="h-9 w-full animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-12 animate-pulse rounded bg-muted" />
          <div className="h-9 w-full animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  )
}

export function ProfileTab() {
  const { data: user, isLoading } = trpc.user.me.useQuery()
  const utils = trpc.useUtils()

  const [name, setName] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    if (user?.name) {
      setName(user.name)
    }
  }, [user?.name])

  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      utils.user.me.invalidate()
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    },
  })

  function handleSave() {
    updateProfile.mutate({ name })
  }

  if (isLoading) {
    return <ProfileSkeleton />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Manage your personal information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={user?.email ?? ""}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            Email cannot be changed
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={updateProfile.isPending || name === user?.name}
          >
            {updateProfile.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save changes
          </Button>
          {showSuccess && (
            <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
              <Check className="h-4 w-4" />
              Profile updated
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
