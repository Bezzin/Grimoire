export interface ScrapedPost {
  text: string
  mediaUrls: string[]
  platform: string
  postedAt: Date | null
  engagement: { likes: number; comments: number; shares: number }
}

type ScrapeAdapter = (accessToken: string, limit: number) => Promise<ScrapedPost[]>

const instagramAdapter: ScrapeAdapter = async (accessToken, limit) => {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/me/media?fields=caption,timestamp,like_count,comments_count,media_url&limit=${limit}&access_token=${accessToken}`
  )
  const data = await res.json()
  return (data.data ?? []).map((post: Record<string, unknown>) => ({
    text: (post.caption as string) ?? "",
    mediaUrls: post.media_url ? [post.media_url as string] : [],
    platform: "INSTAGRAM",
    postedAt: post.timestamp ? new Date(post.timestamp as string) : null,
    engagement: {
      likes: (post.like_count as number) ?? 0,
      comments: (post.comments_count as number) ?? 0,
      shares: 0,
    },
  }))
}

const facebookAdapter: ScrapeAdapter = async (accessToken, limit) => {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/me/posts?fields=message,created_time,shares&limit=${limit}&access_token=${accessToken}`
  )
  const data = await res.json()
  return (data.data ?? []).map((post: Record<string, unknown>) => ({
    text: (post.message as string) ?? "",
    mediaUrls: [],
    platform: "FACEBOOK",
    postedAt: post.created_time ? new Date(post.created_time as string) : null,
    engagement: {
      likes: 0,
      comments: 0,
      shares: ((post.shares as Record<string, number>)?.count) ?? 0,
    },
  }))
}

const twitterAdapter: ScrapeAdapter = async (accessToken, limit) => {
  const res = await fetch(
    `https://api.twitter.com/2/users/me/tweets?max_results=${Math.min(limit, 100)}&tweet.fields=created_at,public_metrics`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const data = await res.json()
  return (data.data ?? []).map((tweet: Record<string, unknown>) => {
    const metrics = tweet.public_metrics as Record<string, number> | undefined
    return {
      text: (tweet.text as string) ?? "",
      mediaUrls: [],
      platform: "TWITTER",
      postedAt: tweet.created_at ? new Date(tweet.created_at as string) : null,
      engagement: {
        likes: metrics?.like_count ?? 0,
        comments: metrics?.reply_count ?? 0,
        shares: metrics?.retweet_count ?? 0,
      },
    }
  })
}

const linkedinAdapter: ScrapeAdapter = async (_accessToken, _limit) => {
  return []
}

const tiktokAdapter: ScrapeAdapter = async (accessToken, limit) => {
  const res = await fetch(
    `https://open.tiktokapis.com/v2/video/list/?fields=title,create_time,like_count,comment_count,share_count`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ max_count: Math.min(limit, 20) }),
    }
  )
  const data = await res.json()
  return (data.data?.videos ?? []).map((video: Record<string, unknown>) => ({
    text: (video.title as string) ?? "",
    mediaUrls: [],
    platform: "TIKTOK",
    postedAt: video.create_time
      ? new Date((video.create_time as number) * 1000)
      : null,
    engagement: {
      likes: (video.like_count as number) ?? 0,
      comments: (video.comment_count as number) ?? 0,
      shares: (video.share_count as number) ?? 0,
    },
  }))
}

const threadsAdapter: ScrapeAdapter = async (accessToken, limit) => {
  const res = await fetch(
    `https://graph.threads.net/v1.0/me/threads?fields=text,timestamp&limit=${limit}&access_token=${accessToken}`
  )
  const data = await res.json()
  return (data.data ?? []).map((post: Record<string, unknown>) => ({
    text: (post.text as string) ?? "",
    mediaUrls: [],
    platform: "THREADS",
    postedAt: post.timestamp ? new Date(post.timestamp as string) : null,
    engagement: { likes: 0, comments: 0, shares: 0 },
  }))
}

const youtubeAdapter: ScrapeAdapter = async (accessToken, limit) => {
  const channelRes = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const channelData = await channelRes.json()
  const uploadsId =
    channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
  if (!uploadsId) return []

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=${Math.min(limit, 50)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const data = await res.json()
  return (data.items ?? []).map((item: Record<string, unknown>) => {
    const snippet = item.snippet as Record<string, unknown>
    return {
      text: `${snippet.title ?? ""}\n${snippet.description ?? ""}`,
      mediaUrls: [],
      platform: "YOUTUBE",
      postedAt: snippet.publishedAt
        ? new Date(snippet.publishedAt as string)
        : null,
      engagement: { likes: 0, comments: 0, shares: 0 },
    }
  })
}

const pinterestAdapter: ScrapeAdapter = async (accessToken, limit) => {
  const res = await fetch(
    `https://api.pinterest.com/v5/pins?page_size=${Math.min(limit, 25)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const data = await res.json()
  return (data.items ?? []).map((pin: Record<string, unknown>) => ({
    text: (pin.description as string) ?? (pin.title as string) ?? "",
    mediaUrls: [],
    platform: "PINTEREST",
    postedAt: pin.created_at ? new Date(pin.created_at as string) : null,
    engagement: { likes: 0, comments: 0, shares: 0 },
  }))
}

export const SCRAPE_ADAPTERS: Record<string, ScrapeAdapter> = {
  INSTAGRAM: instagramAdapter,
  FACEBOOK: facebookAdapter,
  TWITTER: twitterAdapter,
  LINKEDIN: linkedinAdapter,
  TIKTOK: tiktokAdapter,
  THREADS: threadsAdapter,
  YOUTUBE: youtubeAdapter,
  PINTEREST: pinterestAdapter,
}

export async function scrapePosts(
  platform: string,
  accessToken: string,
  limit = 50
): Promise<ScrapedPost[]> {
  const adapter = SCRAPE_ADAPTERS[platform]
  if (!adapter) return []
  try {
    return await adapter(accessToken, limit)
  } catch (error) {
    console.error(`Scraping failed for ${platform}:`, error)
    return []
  }
}
