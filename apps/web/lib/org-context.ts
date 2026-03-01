import { cookies } from "next/headers"

const ORG_COOKIE = "grimoire-org-id"

export async function getActiveOrgId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(ORG_COOKIE)?.value ?? null
}

export async function setActiveOrgId(orgId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(ORG_COOKIE, orgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  })
}
