"use server"

import { prisma } from "@grimoire/db"
import { auth } from "@/lib/auth"
import { z } from "zod"

const onboardingSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  businessType: z.string().min(1, "Please select your role"),
  marketingGoals: z.array(z.string()).min(1, "Please select at least one goal"),
})

export async function completeOnboarding(formData: {
  name: string
  businessType: string
  marketingGoals: string[]
}) {
  const session = await auth()

  if (!session?.user?.id) {
    return { error: "You must be logged in to complete onboarding." }
  }

  const parsed = onboardingSchema.safeParse(formData)

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      businessType: parsed.data.businessType,
      marketingGoals: parsed.data.marketingGoals,
      onboardingCompleted: true,
    },
  })

  return { success: true }
}
