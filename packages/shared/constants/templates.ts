import { z } from "zod"
import type { SocialPlatformKey } from "./platforms"

export type TemplateCategory = "social" | "thread" | "blog" | "email" | "ads" | "image" | "video"
export type TemplateTier = "fast" | "standard" | "creative" | "image" | "video"

export interface PromptTemplate {
  id: string
  name: string
  category: TemplateCategory
  description: string
  icon: string
  tier: TemplateTier
  inputSchema: z.ZodObject<Record<string, z.ZodTypeAny>>
  systemPrompt: string
  platforms: SocialPlatformKey[]
}

const briefAndTone = {
  brief: z.string().min(10).max(2000).describe("What is this about?"),
  toneOverride: z.string().max(100).optional().describe("Override tone (optional)"),
}

export const TEMPLATES: PromptTemplate[] = [
  {
    id: "social:product-launch",
    name: "Product Launch Announcement",
    category: "social",
    description: "Announce a new product, feature, or update to your audience.",
    icon: "Rocket",
    tier: "standard",
    inputSchema: z.object({
      ...briefAndTone,
      productName: z.string().min(1).max(200).describe("Product or feature name"),
      keyBenefits: z.string().min(1).max(500).describe("Key benefits (comma-separated)"),
    }),
    systemPrompt: `You are a marketing copywriter. Write a compelling product launch announcement for social media.

{{brandContext}}

Product: {{productName}}
Key Benefits: {{keyBenefits}}
Brief: {{brief}}
{{toneOverride}}

Write an engaging social media post that creates excitement and drives interest. Include a clear call-to-action. Do NOT use hashtags — they will be added separately.`,
    platforms: ["INSTAGRAM", "FACEBOOK", "LINKEDIN", "TWITTER"],
  },
  {
    id: "social:testimonial-highlight",
    name: "Testimonial Highlight",
    category: "social",
    description: "Turn a customer testimonial into an engaging social post.",
    icon: "Quote",
    tier: "standard",
    inputSchema: z.object({
      ...briefAndTone,
      testimonial: z.string().min(10).max(1000).describe("Customer testimonial text"),
      customerName: z.string().max(100).optional().describe("Customer name (optional)"),
    }),
    systemPrompt: `You are a marketing copywriter. Transform this customer testimonial into an engaging social media post.

{{brandContext}}

Testimonial: "{{testimonial}}"
Customer: {{customerName}}
Brief: {{brief}}
{{toneOverride}}

Create a post that highlights the testimonial naturally — don't just paste it. Add context and a call-to-action. Do NOT use hashtags.`,
    platforms: ["INSTAGRAM", "FACEBOOK", "LINKEDIN", "TWITTER"],
  },
  {
    id: "social:educational-tip",
    name: "Tip / Educational Post",
    category: "social",
    description: "Share an educational tip or insight with your audience.",
    icon: "Lightbulb",
    tier: "standard",
    inputSchema: z.object({
      ...briefAndTone,
      topic: z.string().min(1).max(300).describe("Topic or tip to share"),
    }),
    systemPrompt: `You are a marketing copywriter. Write an educational social media post that provides genuine value.

{{brandContext}}

Topic: {{topic}}
Brief: {{brief}}
{{toneOverride}}

Write a post that teaches something useful. Use a hook to grab attention, then deliver the insight clearly. End with a question or call-to-action to drive engagement. Do NOT use hashtags.`,
    platforms: ["INSTAGRAM", "FACEBOOK", "LINKEDIN", "TWITTER", "THREADS"],
  },
  {
    id: "social:engagement-question",
    name: "Engagement Question",
    category: "social",
    description: "Spark conversation with your audience using a thought-provoking question.",
    icon: "MessageCircleQuestion",
    tier: "fast",
    inputSchema: z.object({
      ...briefAndTone,
      topic: z.string().min(1).max(300).describe("Topic to ask about"),
    }),
    systemPrompt: `You are a marketing copywriter. Write a social media post designed to spark engagement and conversation.

{{brandContext}}

Topic: {{topic}}
Brief: {{brief}}
{{toneOverride}}

Write a short, punchy post with a thought-provoking or relatable question. Keep it casual and inviting. End with a clear question that's easy to answer. Do NOT use hashtags.`,
    platforms: ["INSTAGRAM", "FACEBOOK", "TWITTER", "THREADS"],
  },
  {
    id: "thread:how-to",
    name: "How-To Thread",
    category: "thread",
    description: "Create a step-by-step tutorial thread or carousel.",
    icon: "ListOrdered",
    tier: "creative",
    inputSchema: z.object({
      ...briefAndTone,
      topic: z.string().min(1).max(300).describe("What to teach"),
      steps: z.string().min(1).max(500).optional().describe("Key steps to cover (optional)"),
    }),
    systemPrompt: `You are a marketing copywriter. Write a multi-post thread that teaches something step by step.

{{brandContext}}

Topic: {{topic}}
Key Steps: {{steps}}
Brief: {{brief}}
{{toneOverride}}

Structure as a thread with 5-8 posts. First post is the hook. Each subsequent post is one step. Final post is a recap + CTA. Separate each post with "---". Keep each post under 280 characters for Twitter compatibility. Do NOT use hashtags.`,
    platforms: ["TWITTER", "THREADS", "LINKEDIN"],
  },
  {
    id: "thread:listicle-carousel",
    name: "Listicle / Carousel",
    category: "thread",
    description: "Create a carousel or listicle of tips, ideas, or examples.",
    icon: "LayoutList",
    tier: "standard",
    inputSchema: z.object({
      ...briefAndTone,
      topic: z.string().min(1).max(300).describe("Listicle topic"),
      itemCount: z.coerce.number().min(3).max(15).default(7).describe("Number of items"),
    }),
    systemPrompt: `You are a marketing copywriter. Create a listicle-style carousel.

{{brandContext}}

Topic: {{topic}}
Number of items: {{itemCount}}
Brief: {{brief}}
{{toneOverride}}

Create a carousel with slides separated by "---". Slide 1 is the title/hook. Each subsequent slide is one item with a short explanation. Final slide is a CTA. Keep each slide concise (under 100 words). Do NOT use hashtags.`,
    platforms: ["INSTAGRAM", "LINKEDIN", "TIKTOK"],
  },
  {
    id: "blog:outline",
    name: "Blog Outline Generator",
    category: "blog",
    description: "Generate a structured blog post outline with sections and talking points.",
    icon: "FileText",
    tier: "standard",
    inputSchema: z.object({
      ...briefAndTone,
      title: z.string().min(1).max(300).describe("Blog post title or topic"),
      audience: z.string().max(200).optional().describe("Target audience (optional)"),
    }),
    systemPrompt: `You are a content strategist. Create a detailed blog post outline.

{{brandContext}}

Title/Topic: {{title}}
Target Audience: {{audience}}
Brief: {{brief}}
{{toneOverride}}

Create a structured outline with:
- Suggested title (H1)
- Introduction hook
- 4-6 main sections (H2) with 2-3 talking points each
- Conclusion with CTA
- Suggested meta description (under 160 chars)

Use markdown formatting.`,
    platforms: [],
  },
  {
    id: "blog:full-draft",
    name: "Full Blog Draft",
    category: "blog",
    description: "Generate a complete blog post draft from a topic or outline.",
    icon: "BookOpen",
    tier: "creative",
    inputSchema: z.object({
      ...briefAndTone,
      title: z.string().min(1).max(300).describe("Blog post title"),
      outline: z.string().max(2000).optional().describe("Outline to follow (optional)"),
      wordCount: z.coerce.number().min(300).max(3000).default(800).describe("Target word count"),
    }),
    systemPrompt: `You are a content writer. Write a complete blog post draft.

{{brandContext}}

Title: {{title}}
Outline: {{outline}}
Target word count: {{wordCount}}
Brief: {{brief}}
{{toneOverride}}

Write a well-structured blog post with:
- Engaging introduction with a hook
- Clear sections with H2 headings
- Practical examples or insights
- Strong conclusion with CTA
- Suggested meta description

Use markdown formatting. Aim for {{wordCount}} words.`,
    platforms: [],
  },
  {
    id: "email:welcome-sequence",
    name: "Welcome Sequence",
    category: "email",
    description: "Create a welcome email for new subscribers or customers.",
    icon: "MailPlus",
    tier: "creative",
    inputSchema: z.object({
      ...briefAndTone,
      businessName: z.string().min(1).max(200).describe("Your business name"),
      offer: z.string().max(500).optional().describe("Special offer for new subscribers (optional)"),
    }),
    systemPrompt: `You are an email marketing copywriter. Write a welcome email for new subscribers.

{{brandContext}}

Business: {{businessName}}
Special Offer: {{offer}}
Brief: {{brief}}
{{toneOverride}}

Write a warm, engaging welcome email with:
- Subject line
- Preview text (under 90 chars)
- Greeting
- Body (introduce the brand, set expectations, deliver value)
- CTA button text
- P.S. line

Use markdown formatting. Mark the subject line with "Subject:" and preview with "Preview:".`,
    platforms: [],
  },
  {
    id: "email:product-update",
    name: "Product Update",
    category: "email",
    description: "Announce a product update or new feature via email.",
    icon: "Mail",
    tier: "standard",
    inputSchema: z.object({
      ...briefAndTone,
      updateTitle: z.string().min(1).max(300).describe("Update title"),
      changes: z.string().min(1).max(1000).describe("Key changes or features"),
    }),
    systemPrompt: `You are an email marketing copywriter. Write a product update email.

{{brandContext}}

Update: {{updateTitle}}
Changes: {{changes}}
Brief: {{brief}}
{{toneOverride}}

Write a clear, exciting product update email with:
- Subject line
- Preview text (under 90 chars)
- Headline
- Body (explain what changed and why it matters)
- Feature highlights (bullet points)
- CTA button text

Use markdown formatting. Mark the subject line with "Subject:" and preview with "Preview:".`,
    platforms: [],
  },
  // ── Image Templates ──
  {
    id: "image:social-graphic",
    name: "Social Media Graphic",
    category: "image",
    description: "Generate a branded social media graphic from a brief.",
    icon: "ImagePlus",
    tier: "image",
    inputSchema: z.object({
      brief: z.string().min(10).max(2000).describe("Describe the image you want"),
      style: z.string().max(200).optional().describe("Visual style (e.g., minimalist, vibrant, corporate)"),
      aspectRatio: z.enum(["1:1", "16:9", "9:16", "3:2"]).default("1:1").describe("Aspect ratio"),
    }),
    systemPrompt: `Generate a professional social media graphic based on this brief.

{{brandContext}}

Brief: {{brief}}
Style: {{style}}
Aspect Ratio: {{aspectRatio}}

Create a visually striking, brand-aligned image. Use clean composition, readable text if any, and bold colors.`,
    platforms: ["INSTAGRAM", "FACEBOOK", "LINKEDIN", "TWITTER"],
  },
  {
    id: "image:product-showcase",
    name: "Product Showcase",
    category: "image",
    description: "Generate a branded product photo with styled background.",
    icon: "Package",
    tier: "image",
    inputSchema: z.object({
      brief: z.string().min(10).max(2000).describe("Product description and context"),
      productName: z.string().min(1).max(200).describe("Product name"),
      style: z.string().max(200).optional().describe("Visual style (e.g., studio, lifestyle, flat-lay)"),
    }),
    systemPrompt: `Generate a professional product showcase image.

{{brandContext}}

Product: {{productName}}
Brief: {{brief}}
Style: {{style}}

Create a high-quality product image with clean styling and professional presentation.`,
    platforms: ["INSTAGRAM", "FACEBOOK"],
  },
  {
    id: "image:quote-card",
    name: "Quote Card",
    category: "image",
    description: "Turn a quote or testimonial into a visual card.",
    icon: "Quote",
    tier: "image",
    inputSchema: z.object({
      brief: z.string().min(5).max(500).describe("The quote text"),
      attribution: z.string().max(200).optional().describe("Who said it"),
      style: z.string().max(200).optional().describe("Visual style"),
    }),
    systemPrompt: `Generate a beautiful quote card image.

{{brandContext}}

Quote: "{{brief}}"
Attribution: {{attribution}}
Style: {{style}}

Design an elegant, readable quote card with typography as the focal point. Keep it clean and shareable.`,
    platforms: ["INSTAGRAM", "FACEBOOK", "TWITTER", "LINKEDIN"],
  },
  {
    id: "image:story-cover",
    name: "Story / Reel Cover",
    category: "image",
    description: "Generate an Instagram/TikTok story or reel cover image.",
    icon: "Smartphone",
    tier: "image",
    inputSchema: z.object({
      brief: z.string().min(10).max(2000).describe("What the story/reel is about"),
      headline: z.string().max(100).optional().describe("Headline text for the cover"),
    }),
    systemPrompt: `Generate a vertical story/reel cover image (9:16 aspect ratio).

{{brandContext}}

Brief: {{brief}}
Headline: {{headline}}

Design an eye-catching vertical cover image that grabs attention in a story or reel thumbnail. Use bold visuals and minimal text.`,
    platforms: ["INSTAGRAM", "TIKTOK"],
  },
  // ── Video Templates ──
  {
    id: "video:product-demo",
    name: "Product Demo Clip",
    category: "video",
    description: "Short product showcase video (5-10s).",
    icon: "Play",
    tier: "video",
    inputSchema: z.object({
      brief: z.string().min(10).max(2000).describe("Describe the product demo scene"),
      productName: z.string().min(1).max(200).describe("Product name"),
      duration: z.enum(["5", "10"]).default("5").describe("Duration in seconds"),
    }),
    systemPrompt: `Create a short product demo video.

{{brandContext}}

Product: {{productName}}
Brief: {{brief}}
Duration: {{duration}} seconds

Generate a professional, cinematic product showcase that highlights the product's key features.`,
    platforms: [],
  },
  {
    id: "video:social-reel",
    name: "Social Reel",
    category: "video",
    description: "Vertical reel for Instagram/TikTok.",
    icon: "Film",
    tier: "video",
    inputSchema: z.object({
      brief: z.string().min(10).max(2000).describe("What the reel should show"),
      style: z.string().max(200).optional().describe("Visual style (e.g., dynamic, calm, energetic)"),
    }),
    systemPrompt: `Create a short vertical social media reel.

{{brandContext}}

Brief: {{brief}}
Style: {{style}}

Generate a visually engaging vertical video for social media. Make it eye-catching within the first second.`,
    platforms: ["INSTAGRAM", "TIKTOK"],
  },
  {
    id: "video:explainer-clip",
    name: "Explainer Clip",
    category: "video",
    description: "Brief explainer animation (5-10s).",
    icon: "Clapperboard",
    tier: "video",
    inputSchema: z.object({
      brief: z.string().min(10).max(2000).describe("What concept to explain visually"),
      duration: z.enum(["5", "10"]).default("5").describe("Duration in seconds"),
    }),
    systemPrompt: `Create a short explainer clip.

{{brandContext}}

Brief: {{brief}}
Duration: {{duration}} seconds

Generate a clear, visually informative animation that explains the concept simply and engagingly.`,
    platforms: [],
  },
  {
    id: "video:brand-intro",
    name: "Brand Intro / Outro",
    category: "video",
    description: "Brand intro or outro bumper (3-5s).",
    icon: "Tv",
    tier: "video",
    inputSchema: z.object({
      brief: z.string().min(10).max(2000).describe("Brand elements and mood to feature"),
      type: z.enum(["intro", "outro"]).default("intro").describe("Intro or outro"),
    }),
    systemPrompt: `Create a brand {{type}} bumper video.

{{brandContext}}

Brief: {{brief}}
Type: {{type}}

Generate a polished, cinematic brand bumper that feels professional and memorable. Keep it 3-5 seconds.`,
    platforms: [],
  },
]

export function getTemplateById(id: string): PromptTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id)
}

export function getTemplatesByCategory(category: TemplateCategory): PromptTemplate[] {
  return TEMPLATES.filter((t) => t.category === category)
}
