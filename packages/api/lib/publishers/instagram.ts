import type { PlatformPublisher, PublishInput, PublishResult } from "./types"

export class InstagramPublisher implements PlatformPublisher {
  async publish(input: PublishInput): Promise<PublishResult> {
    // TODO: Implement Instagram Graph API publishing
    // 1. Upload media container via POST /me/media
    // 2. Publish container via POST /me/media_publish
    console.log(`[Instagram] Publishing: ${input.text.slice(0, 50)}...`)
    return {
      success: true,
      platformPostId: `ig_stub_${Date.now()}`,
      platformPostUrl: "https://instagram.com/p/stub",
    }
  }
}
