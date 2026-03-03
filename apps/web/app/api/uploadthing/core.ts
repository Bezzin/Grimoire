import { createUploadthing, type FileRouter } from "uploadthing/next"
import { auth } from "@/lib/auth"

const f = createUploadthing()

export const ourFileRouter = {
  brandAsset: f({
    image: { maxFileSize: "16MB", maxFileCount: 10 },
    pdf: { maxFileSize: "16MB", maxFileCount: 5 },
    blob: { maxFileSize: "4MB", maxFileCount: 5 },
  })
    .middleware(async () => {
      const session = await auth()
      if (!session?.user?.id) throw new Error("Unauthorized")
      return { userId: session.user.id }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.ufsUrl, name: file.name, size: file.size }
    }),

  generatedMedia: f({
    image: { maxFileSize: "16MB", maxFileCount: 1 },
    video: { maxFileSize: "256MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const session = await auth()
      if (!session?.user?.id) throw new Error("Unauthorized")
      return { userId: session.user.id }
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl, name: file.name, size: file.size }
    }),

  reportScreenshot: f({
    image: { maxFileSize: "16MB", maxFileCount: 5 },
  })
    .middleware(async () => {
      const session = await auth()
      if (!session?.user?.id) throw new Error("Unauthorized")
      return { userId: session.user.id }
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl, name: file.name, size: file.size }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
