import Link from "next/link"
import { Users, ArrowRight, Plus } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function AccountsStatus() {
  return (
    <Card className="border-border/50 shadow-soft">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">Connected Accounts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <h3 className="mt-4 text-sm font-semibold">
            No accounts connected yet
          </h3>
          <p className="mx-auto mt-1.5 max-w-[240px] text-xs text-muted-foreground">
            Link your social accounts to start creating and scheduling content.
          </p>
          <Button
            size="sm"
            className="group mt-5 gap-2 rounded-lg grimoire-gradient text-white shadow-glow-sm transition-shadow hover:shadow-glow-md"
            asChild
          >
            <Link href="/dashboard/accounts">
              <Plus className="h-3.5 w-3.5" />
              Connect Account
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
