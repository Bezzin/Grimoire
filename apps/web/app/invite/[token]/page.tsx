"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { trpc } from "@/lib/trpc/client"
import { TRPCProvider } from "@/lib/trpc/provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"

type InviteStatus = "loading" | "success" | "error"

function InviteContent() {
  const router = useRouter()
  const params = useParams<{ token: string }>()
  const [status, setStatus] = useState<InviteStatus>("loading")
  const [errorMessage, setErrorMessage] = useState("")
  const [orgName, setOrgName] = useState("")

  const acceptInvite = trpc.invitation.accept.useMutation({
    onSuccess: async (data) => {
      setOrgName(data.organizationName)
      setStatus("success")
      try {
        await fetch("/api/org/switch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId: data.organizationId }),
        })
      } catch {
        // Org switch is best-effort; user can switch manually later
      }
      setTimeout(() => router.push("/dashboard"), 2000)
    },
    onError: (err) => {
      setErrorMessage(err.message)
      setStatus("error")
    },
  })

  useEffect(() => {
    if (params.token) {
      acceptInvite.mutate({ token: params.token })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.token])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Team Invitation</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Accepting invitation...
              </p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="mx-auto h-8 w-8 text-green-500" />
              <p className="font-medium">Welcome to {orgName}!</p>
              <p className="text-sm text-muted-foreground">
                Redirecting to dashboard...
              </p>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="mx-auto h-8 w-8 text-destructive" />
              <p className="font-medium">Unable to accept invitation</p>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
              <Button onClick={() => router.push("/login")} variant="outline">
                Go to Login
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function InvitePage() {
  return (
    <TRPCProvider>
      <InviteContent />
    </TRPCProvider>
  )
}
