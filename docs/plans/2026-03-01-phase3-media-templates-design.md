# Phase 3: Brand Assets, Social Scraping, Media Generation & Custom Templates — Design

**Goal:** Extend Grimoire with brand asset uploads, social account OAuth + auto brand profile generation from scraped content, AI image generation (Gemini Flash), AI video generation (Seedance 2), and user-created custom templates.

**Approach:** Phased rollout in 3 sub-phases:
- **3A** — Brand asset uploads (UploadThing) + custom template builder
- **3B** — Social OAuth (all 8 platforms) + auto brand profile scraping
- **3C** — Image generation (OpenRouter) + video generation (Replicate)

---

## Phase 3A: Brand Assets + Custom Templates

### 1. Brand Asset Uploads

**New model — `BrandAsset`:**

```
BrandAsset
  id          String    @id @default(cuid())
  type        AssetType (LOGO | FONT | COLOR_PALETTE | GUIDELINE_PDF | PRODUCT_PHOTO | STYLE_REFERENCE)
  name        String
  url         String    (UploadThing CDN URL)
  fileSize    Int       (bytes)
  mimeType    String
  metadata    Json?     (dimensions, color codes, font family, etc.)
  brandProfileId String → BrandProfile
  organizationId String → Organization
  createdAt   DateTime
  updatedAt   DateTime
```

**Upload infrastructure:**
- UploadThing SDK for Next.js
- File validation: images (PNG/JPG/SVG/WEBP, 10MB), PDFs (20MB), fonts (OTF/TTF/WOFF2, 5MB)
- Drag-and-drop or click upload in brand profile "Assets" tab

**Plan gating:**
- FREE: 5 assets
- STARTER: 50 assets
- PRO/TEAM: unlimited

**Brand context injection:**
- Asset metadata (type, name) appended to brand context string during content generation
- Logo/product photo URLs passed as reference context for image generation
- Color palette values injected for visual content

### 2. Custom Templates

**New model — `CustomTemplate`:**

```
CustomTemplate
  id            String    @id @default(cuid())
  name          String
  description   String?
  category      String    (social | thread | blog | email | ads | image | video)
  icon          String    (lucide icon name)
  tier          String    (fast | standard | creative)
  inputFields   Json      (array of {key, label, type, required, placeholder})
  systemPrompt  String    @db.Text (auto-generated from wizard)
  platforms     String[]
  organizationId String   → Organization
  createdById   String    → User
  isPublished   Boolean   @default(true)
  usageCount    Int       @default(0)
  createdAt     DateTime
  updatedAt     DateTime
```

**Guided wizard (4 steps):**
1. **What** — Pick content type + name the template
2. **Inputs** — Define input fields (add/remove with label, type, required toggle)
3. **Instructions** — Describe what the AI should do in plain English; system auto-generates the system prompt with `{{placeholder}}` variables from step 2
4. **Review** — Preview template card, test with sample inputs

**Template resolution:**
- Create page checks built-in `TEMPLATES` array first, then queries `CustomTemplate` table
- Both return the same shape to the generation panel

**Plan gating:**
- FREE: 3 custom templates
- STARTER: 20 custom templates
- PRO/TEAM: unlimited

---

## Phase 3B: Social OAuth + Auto Brand Profile Scraping

### 3. Social Account OAuth

**8 platform OAuth flows:**

| Platform  | OAuth Type                    | Content API         | Rate Limits     |
|-----------|-------------------------------|---------------------|-----------------|
| Instagram | Meta Graph API (OAuth 2.0)    | Media endpoint      | 200 req/hr      |
| Facebook  | Meta Graph API (shared w/ IG) | Posts endpoint      | 200 req/hr      |
| LinkedIn  | OAuth 2.0 + OpenID            | UGC Posts API       | 100 req/day     |
| Twitter/X | OAuth 2.0 PKCE                | Tweets endpoint     | 300 req/15min   |
| TikTok    | Login Kit (OAuth 2.0)         | Video List API      | 100 req/day     |
| Threads   | Meta Graph API                | Threads endpoint    | 200 req/hr      |
| YouTube   | Google OAuth 2.0              | Data API v3         | 10,000 units/day|
| Pinterest | OAuth 2.0                     | Pins endpoint       | 1,000 req/hr    |

**Implementation:**
- Each platform gets a NextAuth provider config + platform-specific API adapter
- Adapters normalize responses to a common `ScrapedPost` shape:
  ```
  ScrapedPost { text, mediaUrls[], platform, postedAt, engagement: {likes, comments, shares} }
  ```

**Token management:**
- Background job checks `tokenExpiresAt` daily, refreshes before expiry
- Failed refreshes mark account `isActive: false` and notify user

**UI:**
- `/dashboard/accounts` page gets connect flow — platform cards with "Connect" buttons → OAuth popups
- Connected accounts show avatar, username, status

### 4. Auto Brand Profile Scraping

**Trigger:** Fires automatically when OAuth completes and tokens are saved.

**Scrape pipeline:**
1. Fetch last 50-100 posts via platform API adapter
2. Normalize to `ScrapedPost[]`
3. Send batch to LLM (fast tier) with analysis prompt: "Extract tone keywords (5-10), phrases to avoid, writing style patterns, common topics, typical post length, emoji usage"
4. Create `BrandProfile` named `"{Platform} Voice — Auto-generated"` with extracted data
5. If RAG enabled (Pro/Team), ingest scraped posts into Pinecone as brand examples

**Multiple accounts:** Each connected account generates its own profile draft. Users can merge or pick favorites.

**Plan gating:**
- Scraping uses 1 AI generation credit per account connected
- Social account limits per plan: FREE=1, STARTER=5, PRO/TEAM=15

---

## Phase 3C: Media Generation (Image + Video)

### 5. Image Generation

**Model:** `google/gemini-3.1-flash-image-preview` via OpenRouter (already integrated).

**Flow:** Same as text generation — pick template, fill inputs, Generate — but returns an image instead of streaming text.

**Brand injection:**
- Tone keywords and style descriptors in system prompt
- Logo/product photo descriptions from `BrandAsset`
- Color palette values if uploaded

**Built-in image templates:**
- `image:social-graphic` — Social media graphic from a brief
- `image:product-showcase` — Product photo with branded styling
- `image:quote-card` — Quote/testimonial as a visual card
- `image:story-cover` — Instagram/TikTok story cover image

**Output:** Generated image uploaded to UploadThing, URL saved to `ContentItem.mediaUrls`. Editor shows image preview.

**Plan gating:** Image generations count toward `aiGenerationsPerMonth` (same as text).

### 6. Video Generation

**Model:** Seedance 2 via Replicate API.

**Flow (async — 30-120s):**
1. User picks video template, fills inputs (brief, reference image, duration)
2. Generate → tRPC mutation creates `ContentItem` (DRAFT) + kicks off Replicate prediction
3. UI shows progress indicator polling Replicate prediction status
4. On completion: video URL → download → upload to UploadThing → save to `ContentItem.mediaUrls`
5. Editor shows video player preview

**Brand injection:** Same as image — tone, style, reference assets. Product photos/logos passed as Seedance 2 reference images.

**Built-in video templates:**
- `video:product-demo` — Short product showcase (5-10s)
- `video:social-reel` — Vertical reel for Instagram/TikTok
- `video:explainer-clip` — Brief explainer animation
- `video:brand-intro` — Brand intro/outro bumper

**New env var:** `REPLICATE_API_TOKEN`

**Plan gating:** Video costs 3 AI generation credits per generation (expensive compute). Pro/Team still unlimited.

### 7. Updated Content Type System

**New `ContentType` enum values:** `IMAGE`, `VIDEO`

**Create page adaptations:**
- Template picker shows `image` and `video` category tabs
- Center panel adapts based on content type:
  - **Text** → textarea editor + streaming (existing)
  - **Image** → image preview + regenerate button
  - **Video** → progress bar → video player + regenerate button

**New `TemplateTier` value:** `media` — maps to image/video model instead of text LLM.

---

## New Environment Variables

```
# Phase 3A
UPLOADTHING_TOKEN=

# Phase 3B
# (OAuth credentials per platform — configured in NextAuth)
META_CLIENT_ID=
META_CLIENT_SECRET=
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
PINTEREST_APP_ID=
PINTEREST_APP_SECRET=

# Phase 3C
REPLICATE_API_TOKEN=
```

---

## Updated Plan Feature Gating

| Feature                | FREE | STARTER | PRO  | TEAM |
|------------------------|------|---------|------|------|
| Brand assets           | 5    | 50      | -1   | -1   |
| Custom templates       | 3    | 20      | -1   | -1   |
| Social accounts        | 1    | 5       | 15   | 15   |
| AI generations/mo      | 10   | 200     | -1   | -1   |
| Brand voice RAG        | no   | no      | yes  | yes  |
| Image generation       | yes  | yes     | yes  | yes  |
| Video generation       | no   | yes     | yes  | yes  |
| Video credit cost      | —    | 3x      | 3x   | 3x   |

(-1 = unlimited)

---

## Dependency Summary

| Sub-phase | New Dependencies |
|-----------|-----------------|
| 3A        | `uploadthing`, `@uploadthing/react` |
| 3B        | Platform OAuth SDKs (via NextAuth providers) |
| 3C        | `replicate` (Replicate Node SDK) |
