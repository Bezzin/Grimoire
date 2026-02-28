import Link from "next/link"
import { Users } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function AccountsStatus() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected Accounts</CardTitle>
        <CardDescription>
          Manage your social media connections
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Users className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-sm font-semibold">
            No accounts connected
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect your social media accounts to start publishing
          </p>
          <Button className="mt-4" asChild>
            <Link href="/dashboard/accounts">Connect Account</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
