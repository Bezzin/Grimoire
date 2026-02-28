import { Users, Instagram, Facebook, Linkedin, Twitter } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const platforms = [
  { name: "Instagram", icon: Instagram, color: "text-pink-500" },
  { name: "Facebook", icon: Facebook, color: "text-blue-600" },
  { name: "LinkedIn", icon: Linkedin, color: "text-blue-700" },
  { name: "X (Twitter)", icon: Twitter, color: "text-foreground" },
  { name: "TikTok", icon: null, color: "text-foreground" },
] as const

export function AccountsEmpty() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 gap-6">
        <Users className="h-12 w-12 text-muted-foreground" />
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-xl font-semibold">Connect your social accounts</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Link your Instagram, Facebook, LinkedIn, X, and TikTok accounts to
            start creating and scheduling content.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          <TooltipProvider>
            {platforms.map((platform) => (
              <Tooltip key={platform.name}>
                <TooltipTrigger asChild>
                  <span className="inline-block">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 opacity-50 cursor-not-allowed"
                      disabled
                    >
                      {platform.icon !== null ? (
                        <platform.icon className={`h-4 w-4 ${platform.color}`} />
                      ) : null}
                      {platform.name}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Coming in Phase 3</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  )
}
