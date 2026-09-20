import test from "node:test";
import assert from "node:assert/strict";
import { GenerativePlanner, parseJsonObject } from "../src/workflow/generative-planner.mjs";
import { ModelRegistry } from "../src/registry/model-registry.mjs";

test("planner parser accepts clean or fenced JSON", () => {
  assert.equal(parseJsonObject('{"steps":[]}').steps.length, 0);
  assert.equal(parseJsonObject('```json\n{"steps":[]}\n```').steps.length, 0);
});

test("generative planner validates a model-produced DAG", async () => {
  const registry = new ModelRegistry([{
    id: "frontier-reasoner",
    provider: "openai",
    model: "fake",
    tier: 4,
    capabilities: ["reasoning"],
    inputUsdPerMillion: 1,
    outputUsdPerMillion: 1,
  }]);
  const planner = new GenerativePlanner({
    registry,
    execute: async () => ({
      provider: "openai",
      model: "fake",
      usage: { input_tokens: 100, output_tokens: 100 },
      text: JSON.stringify({ steps: [
        { id: "research", objective: "Research", dependsOn: [] },
        { id: "synth", objective: "Synthesize", dependsOn: ["research"] },
      ] }),
    }),
  });
  const result = await planner.plan("Do the work");
  assert.equal(result.plan.steps.length, 2);
  assert.equal(result.plan.steps[1].dependsOn[0], "research");
  assert.equal(result.economics.pricingKnown, true);
});
