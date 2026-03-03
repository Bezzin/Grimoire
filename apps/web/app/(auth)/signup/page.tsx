"use client"

import { useState } from "react"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { registerUser } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function SignupPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append("name", name)
      formData.append("email", email)
      formData.append("password", password)

      const result = await registerUser(formData)

      if (result.error) {
        setError(result.error)
        return
      }

      await signIn("credentials", {
        email,
        password,
        callbackUrl: "/onboarding",
      })
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  function handleGoogleSignUp() {
    setIsGoogleLoading(true)
    signIn("google", { callbackUrl: "/onboarding" })
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Start your 14-day free Pro trial
        </p>
      </div>

      {/* Google sign-up first — less friction */}
      <Button
        variant="outline"
        className="h-11 w-full rounded-lg border-border/60 bg-muted/20 transition-colors hover:bg-muted/40"
        onClick={handleGoogleSignUp}
        disabled={isGoogleLoading}
      >
        {isGoogleLoading ? (
          <span className="flex items-center gap-2">
            <LoadingSpinner />
            Connecting...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <GoogleIcon />
            Sign up with Google
          </span>
        )}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/50" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-3 text-muted-foreground">or</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            disabled={isLoading}
            className="h-11 rounded-lg border-border/60 bg-muted/30 transition-colors focus:bg-background"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={isLoading}
            className="h-11 rounded-lg border-border/60 bg-muted/30 transition-colors focus:bg-background"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="8+ characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              disabled={isLoading}
              className="h-11 rounded-lg border-border/60 bg-muted/30 transition-colors focus:bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-sm font-medium">Confirm</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              disabled={isLoading}
              className="h-11 rounded-lg border-border/60 bg-muted/30 transition-colors focus:bg-background"
            />
          </div>
        </div>

        <Button
          type="submit"
          className="h-11 w-full rounded-lg grimoire-gradient text-white shadow-glow-sm transition-shadow hover:shadow-glow-md"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner />
              Creating account...
            </span>
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}
