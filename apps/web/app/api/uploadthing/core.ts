import { createUploadthing, type FileRouter } from "uploadthing/server"
import { auth } from "@/lib/auth"

const f = createUploadthing()

export const ourFileRouter = {
  brandAsset: f({
    image: { maxFileSize: "10MB", maxFileCount: 10 },
    pdf: { maxFileSize: "20MB", maxFileCount: 5 },
    blob: { maxFileSize: "5MB", maxFileCount: 5 },
  })
    .middleware(async () => {
      const session = await auth()
      if (!session?.user?.id) throw new Error("Unauthorized")
      return { userId: session.user.id }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.ufsUrl, name: file.name, size: file.size }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
