import type { Metadata } from "next"
import { DM_Sans, Instrument_Serif } from "next/font/google"
import "@/styles/globals.css"
import { ThemeProvider } from "@/components/shared/theme-provider"

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
})

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-display",
  weight: "400",
  style: ["normal", "italic"],
})

export const metadata: Metadata = {
  title: "Grimoire - Your Marketing Wingman",
  description:
    "An affordable, all-in-one AI marketing copilot for solopreneurs and small teams.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${instrumentSerif.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
