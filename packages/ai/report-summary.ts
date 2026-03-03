import { generateText } from "ai"
import { getModel } from "./router"

interface PlatformMetrics {
  platform: string
  impressions: number
  engagements: number
  clicks: number
  shares: number
}

interface ReportData {
  dateRangeStart: string
  dateRangeEnd: string
  overview: {
    impressions: number
    engagements: number
    clicks: number
    shares: number
    publishedPosts: number
    engagementRate: number
  }
  previousOverview?: {
    impressions: number
    engagements: number
    clicks: number
    shares: number
    publishedPosts: number
    engagementRate: number
  } | null
  platformBreakdown: PlatformMetrics[]
  topPosts: Array<{
    platformPostId: string
    total: number
    title?: string | null
    platform?: string | null
  }>
  screenshotNotes?: Record<string, string> | null
}

export async function generateExecutiveSummary(data: ReportData): Promise<string> {
  const { overview, previousOverview, platformBreakdown, topPosts } = data

  let comparisonSection = ""
  if (previousOverview) {
    const pctChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? "+100%" : "0%"
      const change = ((curr - prev) / prev) * 100
      return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`
    }

    comparisonSection = `
COMPARISON TO PREVIOUS PERIOD:
- Impressions: ${pctChange(overview.impressions, previousOverview.impressions)} (${previousOverview.impressions.toLocaleString()} → ${overview.impressions.toLocaleString()})
- Engagements: ${pctChange(overview.engagements, previousOverview.engagements)} (${previousOverview.engagements.toLocaleString()} → ${overview.engagements.toLocaleString()})
- Clicks: ${pctChange(overview.clicks, previousOverview.clicks)} (${previousOverview.clicks.toLocaleString()} → ${overview.clicks.toLocaleString()})
- Shares: ${pctChange(overview.shares, previousOverview.shares)} (${previousOverview.shares.toLocaleString()} → ${overview.shares.toLocaleString()})
- Engagement Rate: ${pctChange(overview.engagementRate, previousOverview.engagementRate)}
- Published Posts: ${pctChange(overview.publishedPosts, previousOverview.publishedPosts)}
`
  }

  const platformSection = platformBreakdown
    .map(
      (p) =>
        `  ${p.platform}: ${p.impressions.toLocaleString()} impressions, ${p.engagements.toLocaleString()} engagements, ${p.clicks.toLocaleString()} clicks`,
    )
    .join("\n")

  const topPostsSection = topPosts
    .slice(0, 5)
    .map(
      (p, i) =>
        `  ${i + 1}. ${p.title ?? p.platformPostId}${p.platform ? ` (${p.platform})` : ""} — ${p.total.toLocaleString()} metric value`,
    )
    .join("\n")

  const screenshotSection = data.screenshotNotes
    ? Object.entries(data.screenshotNotes)
        .map(([url, note]) => `  - ${note}`)
        .join("\n")
    : ""

  const prompt = `You are a social media analytics expert writing an executive summary for a performance report.

REPORT PERIOD: ${data.dateRangeStart} to ${data.dateRangeEnd}

OVERALL METRICS:
- Impressions: ${overview.impressions.toLocaleString()}
- Engagements: ${overview.engagements.toLocaleString()}
- Clicks: ${overview.clicks.toLocaleString()}
- Shares: ${overview.shares.toLocaleString()}
- Published Posts: ${overview.publishedPosts}
- Engagement Rate: ${(overview.engagementRate * 100).toFixed(1)}%
${comparisonSection}
PLATFORM BREAKDOWN:
${platformSection}

TOP PERFORMING CONTENT:
${topPostsSection}
${screenshotSection ? `\nADDITIONAL NOTES FROM SCREENSHOTS:\n${screenshotSection}` : ""}

Write a concise executive summary (3-5 paragraphs) that:
1. Highlights overall performance and key trends
2. Calls out the best-performing platform(s) and why
3. Notes top content and what made it successful
${previousOverview ? "4. Compares to the previous period, highlighting improvements and areas needing attention" : ""}
${screenshotSection ? "5. Incorporates any additional context from the screenshot notes" : ""}

Use a professional but approachable tone. Include specific numbers. Do not use markdown headings — write in flowing prose paragraphs.`

  const result = await generateText({
    model: getModel({ tier: "standard" }),
    prompt,
    maxTokens: 1000,
  })

  return result.text
}
