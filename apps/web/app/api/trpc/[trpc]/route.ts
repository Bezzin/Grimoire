import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { appRouter, createTRPCContext } from "@grimoire/api"
import { auth } from "@/lib/auth"

const handler = async (req: Request) => {
  const session = await auth()

  const cookieHeader = req.headers.get("cookie") ?? ""
  const orgCookie = cookieHeader
    .split(";")
    .find((c) => c.trim().startsWith("grimoire-org-id="))
  const activeOrgId = orgCookie?.split("=")[1]?.trim() ?? null

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ session, activeOrgId }),
  })
}

export { handler as GET, handler as POST }
