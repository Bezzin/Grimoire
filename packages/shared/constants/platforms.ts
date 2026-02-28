export const SOCIAL_PLATFORMS = {
  INSTAGRAM: { name: "Instagram", charLimit: 2200, key: "instagram" },
  FACEBOOK: { name: "Facebook", charLimit: 63206, key: "facebook" },
  LINKEDIN: { name: "LinkedIn", charLimit: 3000, key: "linkedin" },
  TWITTER: { name: "Twitter/X", charLimit: 280, key: "twitter" },
  TIKTOK: { name: "TikTok", charLimit: 2200, key: "tiktok" },
  THREADS: { name: "Threads", charLimit: 500, key: "threads" },
  YOUTUBE: { name: "YouTube", charLimit: 5000, key: "youtube" },
  PINTEREST: { name: "Pinterest", charLimit: 500, key: "pinterest" },
} as const

export type SocialPlatformKey = keyof typeof SOCIAL_PLATFORMS
