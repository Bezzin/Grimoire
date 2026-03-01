import Replicate from "replicate"

function getReplicateClient(): Replicate {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) throw new Error("REPLICATE_API_TOKEN is not configured")
  return new Replicate({ auth: token })
}

export interface VideoGenerationOptions {
  prompt: string
  duration?: number
  aspectRatio?: "16:9" | "9:16" | "1:1"
}

export interface VideoGenerationJob {
  predictionId: string
  status: string
}

export async function startVideoGeneration(
  options: VideoGenerationOptions
): Promise<VideoGenerationJob> {
  const replicate = getReplicateClient()

  const prediction = await replicate.predictions.create({
    model: "bytedance/seedance-1.5-pro",
    input: {
      prompt: options.prompt,
      duration: options.duration ?? 5,
      aspect_ratio: options.aspectRatio ?? "16:9",
    },
  })

  return {
    predictionId: prediction.id,
    status: prediction.status,
  }
}

export interface VideoStatusResult {
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled"
  outputUrl: string | null
  error: string | null
  progress: number | null
}

export async function getVideoStatus(
  predictionId: string
): Promise<VideoStatusResult> {
  const replicate = getReplicateClient()
  const prediction = await replicate.predictions.get(predictionId)

  let outputUrl: string | null = null
  if (prediction.status === "succeeded" && prediction.output) {
    outputUrl = Array.isArray(prediction.output)
      ? prediction.output[0]
      : typeof prediction.output === "string"
        ? prediction.output
        : null
  }

  let progress: number | null = null
  if (prediction.logs) {
    const progressMatch = prediction.logs.match(/(\d+)%/)
    if (progressMatch) {
      progress = parseInt(progressMatch[1], 10)
    }
  }

  return {
    status: prediction.status as VideoStatusResult["status"],
    outputUrl,
    error: prediction.error ? String(prediction.error) : null,
    progress,
  }
}
