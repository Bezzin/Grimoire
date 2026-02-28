import type { LanguageModelV1 } from "ai"
import { getOpenRouterClient } from "./client"

export type ModelTier = "fast" | "standard" | "creative"

const TIER_MODELS: Record<ModelTier, string> = {
  fast: "openai/gpt-4o-mini",
  standard: "openai/gpt-4o",
  creative: "anthropic/claude-sonnet-4",
}

const FALLBACK_ORDER: ModelTier[] = ["creative", "standard", "fast"]

export interface RouterOptions {
  tier: ModelTier
  preferQuality?: boolean
}

function upgradeTier(tier: ModelTier): ModelTier {
  if (tier === "fast") return "standard"
  if (tier === "standard") return "creative"
  return "creative"
}

export function getModel(options: RouterOptions): LanguageModelV1 {
  const effectiveTier = options.preferQuality
    ? upgradeTier(options.tier)
    : options.tier
  const modelId = TIER_MODELS[effectiveTier]
  const client = getOpenRouterClient()
  return client(modelId)
}

export function getFallbackModels(
  tier: ModelTier,
): Array<{ tier: ModelTier; modelId: string; model: LanguageModelV1 }> {
  const startIndex = FALLBACK_ORDER.indexOf(tier)
  const tiers = FALLBACK_ORDER.slice(startIndex)
  const client = getOpenRouterClient()
  return tiers.map((t) => ({
    tier: t,
    modelId: TIER_MODELS[t],
    model: client(TIER_MODELS[t]),
  }))
}

export function getModelId(tier: ModelTier, preferQuality?: boolean): string {
  const effectiveTier = preferQuality ? upgradeTier(tier) : tier
  return TIER_MODELS[effectiveTier]
}
