# Grimoire Phase 2: AI Core — Design Document

**Date:** 2026-02-28
**Status:** Approved
**Scope:** AI model routing, prompt templates, brand voice RAG, content creation workspace, platform adaptation, moderation, rate limiting

---

## 1. Overview

Phase 2 transforms Grimoire from a dashboard shell into a functional AI content generation engine. Users can select from curated prompt templates, generate marketing content aligned with their brand voice (via Pinecone RAG), edit in a rich text editor (Novel), create platform-specific variants, and save as drafts.

**Outcome:** Users can generate, edit, and store AI-powered marketing content that sounds like their brand, optimized for 8 social platforms.

## 2. Architecture

### New Package: `packages/ai/`

```
packages/ai/
├── router.ts              # Model tier routing logic
├── client.ts              # Vercel AI SDK + OpenRouter setup
├── rag/
│   ├── ingest.ts          # Document chunking + embedding + Pinecone upsert
│   ├── retrieve.ts        # Query Pinecone for brand context
│   └── vectorStore.ts     # Pinecone client abstraction
├── safety/
│   ├── moderation.ts      # OpenAI Moderation API wrapper
│   └── guardrails.ts      # Brand-specific content filters
└── index.ts               # Barrel exports
```

### Data Flow

```
User selects template → Fills guided input form
                              ↓
              Retrieve brand context from Pinecone (RAG)
                              ↓
              Build system prompt (template + brand context)
                              ↓
              Stream AI response via Vercel AI SDK + OpenRouter
                              ↓
              Display in Novel editor (real-time streaming)
                              ↓
              User edits → Adapt for platforms (AI variants)
                              ↓
              Run moderation check → Save as ContentItem (DRAFT)
```

### Technology Additions

| Layer | Choice |
|-------|--------|
| AI SDK | Vercel AI SDK (`ai` package) |
| AI Provider | OpenRouter (multi-model routing) |
| Vector DB | Pinecone (free tier, 1 index) |
| Editor | Novel (Tiptap-based, AI-ready) |
| Moderation | OpenAI Moderation API (free) |
| Embeddings | OpenRouter embedding model |

## 3. AI Model Routing

### Provider Setup

Use `@ai-sdk/openai` configured with OpenRouter's base URL (`https://openrouter.ai/api/v1`). This gives Vercel AI SDK streaming and hooks while routing through OpenRouter.

### Three Tiers

| Tier | Model | Cost (input/output per 1M) | Use Cases |
|------|-------|----------------------------|-----------|
| Fast | `openai/gpt-4o-mini` | $0.15 / $0.60 | Hashtags, rewrites, categorization, emoji suggestions |
| Standard | `openai/gpt-4o` | $2.50 / $10.00 | Social posts, email copy, ad variants, carousel scripts |
| Creative | `anthropic/claude-sonnet-4` | $3.00 / $15.00 | Brand-voice content, long-form, strategy, creative campaigns |

### Router Logic

- Each template declares its recommended tier
- `preferQuality` flag upgrades to next tier
- Auto-fallback on API failure: Creative → Standard → Fast
- Token usage tracked per request → stored on `ContentItem.aiTokensUsed`
- Model name stored on `ContentItem.aiModel`

### Streaming

- Server route: `app/api/ai/generate/route.ts` uses `streamText()` from Vercel AI SDK
- Client: `useCompletion()` hook for real-time generation display in editor

## 4. Prompt Template System

### 10 Launch Templates

| Category | Template | Tier |
|----------|----------|------|
| Social | Product Launch Announcement | Standard |
| Social | Testimonial Highlight | Standard |
| Social | Tip / Educational Post | Standard |
| Social | Engagement Question | Fast |
| Thread | How-To Thread | Creative |
| Thread | Listicle / Carousel | Standard |
| Blog | Blog Outline Generator | Standard |
| Blog | Full Blog Draft | Creative |
| Email | Welcome Sequence | Creative |
| Email | Product Update | Standard |

### Template Structure

```typescript
interface PromptTemplate {
  id: string                    // e.g., "social:product-launch"
  name: string                  // "Product Launch Announcement"
  category: "social" | "thread" | "blog" | "email" | "ads"
  description: string           // Short description for UI
  icon: string                  // Lucide icon name
  tier: "fast" | "standard" | "creative"
  inputs: ZodSchema             // Required user inputs
  systemPrompt: string          // Prompt with {{brandContext}}, {{userBrief}} placeholders
  platforms: SocialPlatform[]   // Which platforms this supports
}
```

### Storage

Templates are pure data constants in `packages/shared/constants/templates.ts`. No AI logic — just prompt definitions and metadata.

## 5. Brand Voice Configuration

### New Route: `/dashboard/brand`

#### Setup Wizard (5 steps)

1. **Name** — Name your brand profile (e.g., "Primary Voice", "Casual Voice")
2. **Tone Keywords** — Select 3-5 from curated grid: professional, casual, witty, authoritative, friendly, bold, minimal, playful, inspiring, edgy
3. **Examples** — Paste 3-10 example posts that represent your voice
4. **Avoid List** — Words/phrases to never use
5. **Test** — Generate sample content using this profile, review for voice consistency

#### Brand Profile Editor

- View/edit existing profiles
- Add/remove examples
- Update tone and avoid keywords
- Re-ingest examples to Pinecone on change

### Pinecone RAG Pipeline

#### Ingestion (`packages/ai/rag/ingest.ts`)

1. User pastes/uploads brand content examples
2. Chunk text into ~500-token segments with 50-token overlap
3. Generate embeddings via OpenRouter embedding model
4. Upsert vectors to Pinecone
   - Namespace: `org:{orgId}:brand:{profileId}`
   - Metadata: `{ source, contentType, createdAt }`
5. Store namespace in `BrandProfile.vectorNamespace`

#### Retrieval (`packages/ai/rag/retrieve.ts`)

1. During content generation, embed the user's brief/topic
2. Query Pinecone for top-5 most similar brand content chunks (cosine similarity)
3. Inject retrieved chunks into system prompt as brand context:

```
Brand Voice Context:
- Tone: {toneKeywords}
- Avoid: {avoidKeywords}
- Style Examples:
  {chunk1}
  {chunk2}
  ...
```

4. **Fallback:** If Pinecone unavailable, use tone keywords + avoid list directly in prompt (no RAG)

### Plan Restrictions

- Brand Voice RAG: Pro and Team plans only
- Free and Starter: Use tone keywords + avoid list (no vector retrieval)

## 6. Content Creation Workspace

### New Route: `/dashboard/create`

#### 3-Panel Layout

| Left Panel (280px) | Center Panel (flex-1) | Right Panel (320px) |
|---|---|---|
| Template picker | Novel editor | Platform previews |
| Category tabs (Social, Thread, Blog, Email) | AI generation panel (collapsible top) | Platform selector checkboxes |
| Searchable template list | Media upload area | Character count per platform |
| Click template → load input form | Inline AI assist (bubble menu) | Live mockup cards |

#### Generation Flow

1. **Select template** from left panel → guided input form appears at top of center
2. **Fill inputs** (brief, topic, tone override, etc.) validated by Zod schema
3. **Generate** → streams AI response into Novel editor in real-time
4. **Edit** in Novel editor (rich text: bold, italic, links, media)
5. **Adapt for Platforms** → AI creates variants for each selected platform
6. **Preview** variants in right panel (Instagram, Twitter, LinkedIn mockup cards)
7. **Save as Draft** → creates ContentItem with status = DRAFT

#### Novel Editor Configuration

- **Bubble menu:** Bold, italic, link, + AI actions (Rewrite, Expand, Shorten, Change Tone)
- **Slash commands:** `/generate`, `/hashtags`, `/shorten`, `/expand`
- **Character counter:** Overlay showing count per selected platform
- **Media:** Image drag-drop upload, stored as URLs in `ContentItem.mediaUrls`

#### AI Inline Assist

- User highlights text → bubble menu shows AI actions
- Each action (Rewrite, Expand, Shorten) makes a separate API call (Fast tier)
- Shows inline preview of suggestion → accept/reject

## 7. Platform Adaptation

### Supported Platforms (8)

| Platform | Char Limit | Notes |
|----------|-----------|-------|
| Instagram | 2,200 | Emoji-friendly, hashtag clusters |
| Facebook | 63,206 | Shareable, conversational |
| LinkedIn | 3,000 | Professional, thought-leadership |
| Twitter/X | 280 | Punchy, link-friendly |
| TikTok | 2,200 | Hashtag-driven, casual |
| Threads | 500 | Casual, conversational |
| YouTube | 5,000 | Description, link-heavy |
| Pinterest | 500 | Discovery-focused, keyword-rich |

### Adaptation Process

1. After primary content generation, user selects target platforms
2. Click "Adapt for Platforms" → AI generates a variant per platform
3. Each variant respects platform char limits, tone, and formatting conventions
4. Stored in `ContentItem.platformVariants` as JSON: `{ instagram: "...", twitter: "...", ... }`
5. Preview cards in right panel show styled mockups per platform

## 8. Content Moderation & Guardrails

### Moderation Flow

1. After AI generation, run content through OpenAI Moderation API (free)
2. Check for: hate, harassment, self-harm, sexual, violence, illegal content
3. If flagged → show warning banner with explanation + "Regenerate" button
4. Log flagged content for safety audit

### Brand Guardrails

- **Hard block:** Content containing "avoid" keywords → auto-removed or flagged
- **Warn:** If tone deviates significantly from profile → suggest regeneration
- **Log:** Track guardrail triggers for brand consistency reporting

## 9. Rate Limiting

### Per-Plan Generation Limits

| Plan | AI Generations / Month |
|------|----------------------|
| Free | 10 |
| Starter | 200 |
| Pro | Unlimited |
| Team | Unlimited |

### Implementation

- Add `aiGenerationsUsed` and `aiGenerationsResetAt` fields to Organization model
- Check limit before each generation call in tRPC middleware
- Increment counter on successful generation
- Reset counter when `aiGenerationsResetAt` passes (monthly)
- UI shows "X / 200 generations used this month" badge
- Graceful error: "You've reached your monthly limit. Upgrade to Pro for unlimited."

## 10. New tRPC Routers

### `content` Router (`packages/api/routers/content.ts`)

| Procedure | Description |
|-----------|-------------|
| `content.generate` | Select template + brief → stream AI content → save as draft |
| `content.regenerate` | Re-generate content for existing item |
| `content.adaptPlatforms` | Create per-platform variants |
| `content.list` | List all content items for org |
| `content.getById` | Get single content item |
| `content.update` | Update draft content (body, media, hashtags) |
| `content.delete` | Delete content item |

### `brand` Router (`packages/api/routers/brand.ts`)

| Procedure | Description |
|-----------|-------------|
| `brand.create` | Create brand profile + ingest examples to Pinecone |
| `brand.update` | Update profile + re-ingest examples |
| `brand.list` | List all brand profiles for org |
| `brand.getById` | Get single profile |
| `brand.setDefault` | Set default profile for org |
| `brand.testVoice` | Generate sample content to test voice |
| `brand.ingestExamples` | Manually trigger re-ingestion |

## 11. Database Changes

### New Fields on Organization

```prisma
aiGenerationsUsed    Int       @default(0)
aiGenerationsResetAt DateTime  @default(now())
```

### Existing Models Used

- `ContentItem` — All fields already defined in schema (type, status, body, platformVariants, aiModel, aiPromptTemplate, aiTokensUsed, brandProfileId, etc.)
- `BrandProfile` — All fields already defined (toneKeywords, avoidKeywords, exampleContent, vectorNamespace, etc.)

## 12. Environment Variables (Phase 2)

```env
# AI - Vercel AI SDK + OpenRouter
OPENROUTER_API_KEY=

# Vector Database - Pinecone
PINECONE_API_KEY=
PINECONE_INDEX=grimoire

# Moderation - OpenAI (free)
OPENAI_API_KEY=
```

## 13. New Dependencies

```json
{
  "packages/ai": {
    "@ai-sdk/openai": "latest",
    "ai": "latest",
    "@pinecone-database/pinecone": "^4.x",
    "openai": "^4.x"
  },
  "apps/web": {
    "novel": "latest",
    "ai": "latest"
  }
}
```

## 14. Pages Built (Phase 2)

| Route | Description |
|-------|-------------|
| `/dashboard/create` | Content creation workspace (3-panel: templates + editor + previews) |
| `/dashboard/brand` | Brand voice configuration wizard + profile editor |

### Previously Disabled Items Now Enabled

- Sidebar: "Create" and "Brand" nav items become active

## 15. What Phase 2 Does NOT Include

- Social platform OAuth connections (Phase 3)
- Content scheduling / calendar (Phase 3)
- BullMQ workers for publishing (Phase 3)
- Analytics dashboard (Phase 4)
- Review/approval workflows (Phase 4)
- Team collaboration features (Phase 4)
- Media generation / image AI (Phase 5)

## 16. Success Criteria

- [ ] User can select template → fill inputs → generate content (streaming)
- [ ] Generated content reflects brand voice via RAG context injection
- [ ] Novel editor allows rich text editing of generated content
- [ ] Platform variants are generated and previewed correctly
- [ ] Brand voice setup wizard guides user through 5 steps
- [ ] Moderation catches flagged content with regeneration option
- [ ] Rate limiting enforces plan generation limits
- [ ] All tRPC routes are end-to-end type-safe
- [ ] 80%+ test coverage on AI package and new routers
