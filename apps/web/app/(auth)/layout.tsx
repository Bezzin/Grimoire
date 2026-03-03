import { Sparkles } from "lucide-react"
import Link from "next/link"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — brand + decorative */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 lg:flex lg:w-[45%]">
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

        {/* Testimonial / Value prop */}
        <div className="relative">
          <blockquote className="space-y-4">
            <p className="text-2xl font-light leading-relaxed text-white/90">
              &ldquo;Finally, one tool that handles everything. My marketing
              went from chaos to a well-oiled machine.&rdquo;
            </p>
            <footer className="text-sm text-white/60">
              &mdash; Future happy customer
            </footer>
          </blockquote>
        </div>

        {/* Bottom tagline */}
        <p className="relative text-sm text-white/50">
          Your AI marketing copilot
        </p>
      </div>

      {/* Right panel — auth form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">
        {/* Mobile logo */}
        <Link
          href="/"
          className="mb-8 flex items-center gap-2.5 lg:hidden"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-glow-sm">
            <Sparkles className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">Grimoire</span>
        </Link>

        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  )
}
