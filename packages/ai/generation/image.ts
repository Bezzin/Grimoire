import { getOpenRouterClient } from "../client"

export interface ImageGenerationOptions {
  prompt: string
  aspectRatio?: "1:1" | "16:9" | "9:16" | "3:2"
}

export interface ImageGenerationResult {
  base64Data: string
  mimeType: string
}

export async function generateImage(
  options: ImageGenerationOptions
): Promise<ImageGenerationResult> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured")

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-image-preview",
      messages: [
        { role: "user", content: options.prompt },
      ],
      modalities: ["image", "text"],
      image_config: {
        aspect_ratio: options.aspectRatio ?? "1:1",
      },
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Image generation failed: ${response.status} ${errorBody}`)
  }

  const data = await response.json() as {
    choices: Array<{
      message: {
        content?: string
        images?: Array<{
          type: string
          image_url: { url: string }
        }>
      }
    }>
  }

  const images = data.choices?.[0]?.message?.images
  if (!images || images.length === 0) {
    throw new Error("No image generated")
  }

  const dataUrl = images[0].image_url.url
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/)
  if (!match) throw new Error("Invalid image data format")

  return {
    base64Data: match[2],
    mimeType: match[1],
  }
}
