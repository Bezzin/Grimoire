export interface GuardrailResult {
  passed: boolean
  violations: string[]
}

export function checkBrandGuardrails(
  content: string,
  avoidKeywords: string[]
): GuardrailResult {
  if (avoidKeywords.length === 0) {
    return { passed: true, violations: [] }
  }

  const lowerContent = content.toLowerCase()
  const violations = avoidKeywords.filter((keyword) =>
    lowerContent.includes(keyword.toLowerCase())
  )

  return {
    passed: violations.length === 0,
    violations,
  }
}
