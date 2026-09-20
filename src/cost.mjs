// Current public Jev input price as of 2026-09-19. Keep configurable because pricing can change.
export const DEFAULT_JEV_INPUT_USD_PER_MILLION = Number(
  process.env.JEV_INPUT_USD_PER_MILLION || 0.042,
);

// Token count is deliberately an estimate in V1. Replace with provider-reported usage
// whenever the SDK exposes authoritative usage for the call.
export function estimateTokens(text) {
  if (!text) return 0;
  return Math.max(1, Math.ceil(String(text).length / 4));
}

export function estimateJevRoutingCostUsd(prompt, {
  usdPerMillion = DEFAULT_JEV_INPUT_USD_PER_MILLION,
  schemaOverheadTokens = 500,
} = {}) {
  const estimatedInputTokens = estimateTokens(prompt) + schemaOverheadTokens;
  return {
    estimatedInputTokens,
    usdPerMillion,
    estimatedCostUsd: (estimatedInputTokens / 1_000_000) * usdPerMillion,
  };
}

export function successfulTaskCost({ routingCostUsd = 0, executionCostUsd = 0, verificationCostUsd = 0, retriesCostUsd = 0 }) {
  return routingCostUsd + executionCostUsd + verificationCostUsd + retriesCostUsd;
}
