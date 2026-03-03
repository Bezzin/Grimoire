import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Sparkles } from "lucide-react"
import Link from "next/link"

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — brand + motivational */}
      <div className="relative hidden flex-col justify-between overflow-hidden grimoire-gradient p-10 lg:flex lg:w-[45%]">
        {/* Decorative elements */}
        <div className="pointer-events-none absolute inset-0 dot-grid opacity-10" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -top-20 -left-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />

        {/* Logo */}
        <Link href="/" className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">Grimoire</span>
        </Link>

        {/* Value proposition */}
        <div className="relative space-y-6">
          <h2 className="text-3xl font-light leading-relaxed text-white/90">
            Let&apos;s set up your
            <br />
            <span className="font-semibold text-white">marketing command center</span>
          </h2>
          <ul className="space-y-3 text-sm text-white/70">
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-white/60" />
              Personalized content tailored to your business
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-white/60" />
              AI-powered suggestions based on your goals
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-white/60" />
              Takes less than a minute to get started
            </li>
          </ul>
        </div>

        {/* Bottom tagline */}
        <p className="relative text-sm text-white/50">
          Your AI marketing copilot
        </p>
      </div>

      {/* Right panel — onboarding form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">
        {/* Mobile logo */}
        <Link
          href="/"
          className="mb-8 flex items-center gap-2.5 lg:hidden"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg grimoire-gradient shadow-glow-sm">
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-xl font-bold">Grimoire</span>
        </Link>

        <div className="w-full max-w-[480px]">{children}</div>
      </div>
    </div>
  )
}
