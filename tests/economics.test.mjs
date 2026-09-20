import test from "node:test";
import assert from "node:assert/strict";
import { calculateUsageCost } from "../src/economics/usage-cost.mjs";

test("null model prices remain unknown instead of becoming zero-cost", () => {
  const result = calculateUsageCost({
    provider: "openai",
    usage: { input_tokens: 1000, output_tokens: 500 },
    pricing: { inputUsdPerMillion: null, outputUsdPerMillion: null },
  });
  assert.equal(result.pricingKnown, false);
  assert.equal(result.inputCostUsd, null);
  assert.equal(result.outputCostUsd, null);
  assert.equal(result.totalCostUsd, null);
});

test("known pricing calculates provider usage cost", () => {
  const result = calculateUsageCost({
    provider: "openai",
    usage: { input_tokens: 1_000_000, output_tokens: 500_000 },
    pricing: { inputUsdPerMillion: 2, outputUsdPerMillion: 8 },
  });
  assert.equal(result.pricingKnown, true);
  assert.equal(result.inputCostUsd, 2);
  assert.equal(result.outputCostUsd, 4);
  assert.equal(result.totalCostUsd, 6);
});
