import "server-only"
import { appRouter, createTRPCContext, createCallerFactory } from "@grimoire/api"
import { auth } from "@/lib/auth"
import { cache } from "react"

const createContext = cache(async () => {
  const session = await auth()
  return createTRPCContext({ session })
})

const createCaller = createCallerFactory(appRouter)

export const api = async () => {
  const context = await createContext()
  return createCaller(context)
}
