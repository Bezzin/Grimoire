import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@grimoire/db"
import { cookies } from "next/headers"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { organizationId } = (await req.json()) as { organizationId: string }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id, organizationId },
  })

  if (!membership) {
    return new Response("Not a member of this organization", { status: 403 })
  }

  const cookieStore = await cookies()
  cookieStore.set("grimoire-org-id", organizationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  })

  return NextResponse.json({ success: true })
}
