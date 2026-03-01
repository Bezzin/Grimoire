import { Instagram, Facebook, Linkedin, Twitter, Lock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const platforms = [
  { name: "Instagram", icon: Instagram, color: "text-pink-500", bgColor: "bg-pink-500/10" },
  { name: "Facebook", icon: Facebook, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  { name: "LinkedIn", icon: Linkedin, color: "text-blue-600", bgColor: "bg-blue-600/10" },
  { name: "X", icon: Twitter, color: "text-foreground", bgColor: "bg-foreground/10" },
] as const

export function AccountsEmpty() {
  return (
    <Card className="border-border/50 shadow-soft">
      <CardContent className="flex flex-col items-center justify-center gap-8 py-16">
        {/* Icon grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <TooltipProvider>
            {platforms.map((platform) => (
              <Tooltip key={platform.name}>
                <TooltipTrigger asChild>
                  <div className="group relative flex h-20 w-20 cursor-default flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 transition-colors hover:border-border sm:h-24 sm:w-24">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${platform.bgColor} opacity-50 transition-opacity group-hover:opacity-70`}>
                      <platform.icon className={`h-5 w-5 ${platform.color}`} />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {platform.name}
                    </span>
                    <Lock className="absolute right-2 top-2 h-3 w-3 text-muted-foreground/40" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Coming in Phase 3</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-lg font-semibold">Connect your first account</h2>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            Social account connections are coming in Phase 3. You&apos;ll be able
            to link Instagram, Facebook, LinkedIn, X, and more.
          </p>
        </div>

        {/* Status indicator */}
        <div className="inline-flex items-center gap-2 rounded-full bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
          <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Coming soon
        </div>
      </CardContent>
    </Card>
  )
}
