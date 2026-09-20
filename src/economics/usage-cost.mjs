function numberOrZero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function hasKnownPrice(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

export function normalizeUsage(provider, usage = {}) {
  if (!usage) return { inputTokens: 0, outputTokens: 0 };
  if (provider === "anthropic") {
    return { inputTokens: numberOrZero(usage.input_tokens), outputTokens: numberOrZero(usage.output_tokens) };
  }
  return {
    inputTokens: numberOrZero(usage.input_tokens ?? usage.prompt_tokens),
    outputTokens: numberOrZero(usage.output_tokens ?? usage.completion_tokens),
  };
}

export function calculateUsageCost({ provider, usage, pricing }) {
  const normalized = normalizeUsage(provider, usage);
  const hasInputPrice = hasKnownPrice(pricing?.inputUsdPerMillion);
  const hasOutputPrice = hasKnownPrice(pricing?.outputUsdPerMillion);
  const inputRate = hasInputPrice ? Number(pricing.inputUsdPerMillion) : null;
  const outputRate = hasOutputPrice ? Number(pricing.outputUsdPerMillion) : null;

  return {
    ...normalized,
    inputCostUsd: hasInputPrice ? (normalized.inputTokens / 1_000_000) * inputRate : null,
    outputCostUsd: hasOutputPrice ? (normalized.outputTokens / 1_000_000) * outputRate : null,
    totalCostUsd: hasInputPrice && hasOutputPrice
      ? (normalized.inputTokens / 1_000_000) * inputRate + (normalized.outputTokens / 1_000_000) * outputRate
      : null,
    pricingKnown: hasInputPrice && hasOutputPrice,
  };
}
