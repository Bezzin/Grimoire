import { createTRPCReact } from "@trpc/react-query"
import type { AppRouter } from "@grimoire/api"

export const trpc = createTRPCReact<AppRouter>()
