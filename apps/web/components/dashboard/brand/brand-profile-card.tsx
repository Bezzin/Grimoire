"use client"

import { useState } from "react"
import { Star, Trash2, MoreHorizontal, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { trpc } from "@/lib/trpc/client"

interface BrandProfileCardProps {
  profile: {
    id: string
    name: string
    description: string | null
    toneKeywords: string[]
    avoidKeywords: string[]
    exampleContent: string[]
    isDefault: boolean
  }
  onUpdate: () => void
}

export function BrandProfileCard({ profile, onUpdate }: BrandProfileCardProps) {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  const setDefault = trpc.brand.setDefault.useMutation({
    onSuccess: onUpdate,
  })

  const deleteProfile = trpc.brand.delete.useMutation({
    onSuccess: onUpdate,
  })

  const testVoice = trpc.brand.testVoice.useMutation({
    onSuccess: (data) => {
      setTestResult(data.text)
      setTesting(false)
    },
    onError: () => setTesting(false),
  })

  return (
    <Card className="border-border/50 shadow-soft transition-shadow hover:shadow-elevated">
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold">{profile.name}</h3>
          {profile.isDefault && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              <Star className="h-3 w-3 fill-current" />
              Default
            </span>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!profile.isDefault && (
              <DropdownMenuItem onClick={() => setDefault.mutate({ id: profile.id })}>
                <Star className="mr-2 h-4 w-4" />
                Set as Default
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => deleteProfile.mutate({ id: profile.id })}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-3">
        {profile.description && (
          <p className="text-sm text-muted-foreground">{profile.description}</p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {profile.toneKeywords.map((keyword) => (
            <span
              key={keyword}
              className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
            >
              {keyword}
            </span>
          ))}
        </div>
        {profile.avoidKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.avoidKeywords.slice(0, 5).map((keyword) => (
              <span
                key={keyword}
                className="rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
              >
                {keyword}
              </span>
            ))}
            {profile.avoidKeywords.length > 5 && (
              <span className="text-xs text-muted-foreground">
                +{profile.avoidKeywords.length - 5} more
              </span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            {profile.exampleContent.length} example{profile.exampleContent.length !== 1 ? "s" : ""}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            disabled={testing || testVoice.isPending}
            onClick={() => {
              setTesting(true)
              setTestResult(null)
              testVoice.mutate({ profileId: profile.id })
            }}
          >
            <Sparkles className="h-3 w-3" />
            Test Voice
          </Button>
        </div>
        {testResult && (
          <div className="rounded-lg bg-muted/30 p-3 text-sm">{testResult}</div>
        )}
      </CardContent>
    </Card>
  )
}
