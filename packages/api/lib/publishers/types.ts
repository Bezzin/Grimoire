export interface PublishInput {
  text: string
  mediaUrls: string[]
  hashtags: string[]
  accessToken: string
  refreshToken?: string | null
  platformPostId?: string | null
}

export interface PublishResult {
  success: boolean
  platformPostId?: string
  platformPostUrl?: string
  error?: string
  newAccessToken?: string
  newRefreshToken?: string
  newTokenExpiresAt?: Date
}

export interface PlatformPublisher {
  publish(input: PublishInput): Promise<PublishResult>
}
