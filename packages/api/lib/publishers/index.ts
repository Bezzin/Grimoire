import type { PlatformPublisher } from "./types"
import { InstagramPublisher } from "./instagram"
import { FacebookPublisher } from "./facebook"
import { TwitterPublisher } from "./twitter"
import { LinkedInPublisher } from "./linkedin"
import { TikTokPublisher } from "./tiktok"
import { YouTubePublisher } from "./youtube"
import { PinterestPublisher } from "./pinterest"
import { ThreadsPublisher } from "./threads"

const publishers: Record<string, PlatformPublisher> = {
  INSTAGRAM: new InstagramPublisher(),
  FACEBOOK: new FacebookPublisher(),
  TWITTER: new TwitterPublisher(),
  LINKEDIN: new LinkedInPublisher(),
  TIKTOK: new TikTokPublisher(),
  YOUTUBE: new YouTubePublisher(),
  PINTEREST: new PinterestPublisher(),
  THREADS: new ThreadsPublisher(),
}

export function getPublisher(platform: string): PlatformPublisher {
  const publisher = publishers[platform]
  if (!publisher) {
    throw new Error(`No publisher for platform: ${platform}`)
  }
  return publisher
}

export type { PlatformPublisher, PublishInput, PublishResult } from "./types"
