import test from "node:test";
import assert from "node:assert/strict";
import { runWorkflowPlan } from "../src/workflow/workflow-runtime.mjs";

function acceptedTask(prompt, options) {
  return Promise.resolve({
    execution: { text: `done:${prompt}`, model: "fake" },
    outcome: { accepted: true, totalKnownCostUsd: options.maxCostUsd / 2 },
  });
}

test("workflow runs dependencies and passes only dependency output forward", async () => {
  const seen = [];
  const result = await runWorkflowPlan({ objective: "demo", steps: [
    { id: "a", objective: "Research A", dependsOn: [] },
    { id: "b", objective: "Research B", dependsOn: [] },
    { id: "synth", objective: "Synthesize", dependsOn: ["a"] },
  ] }, {
    budgetUsd: 3,
    concurrency: 2,
    runStep: async (prompt, options) => {
      seen.push(prompt);
      return acceptedTask(prompt, options);
    },
    preferJev: false,
  });

  assert.equal(result.outcome.accepted, true);
  assert.equal(result.outcome.acceptedSteps, 3);
  const synthPrompt = seen.find((prompt) => prompt.startsWith("Synthesize"));
  assert.match(synthPrompt, /done:Research A/);
  assert.doesNotMatch(synthPrompt, /done:Research B/);
});

test("failed dependency skips downstream step", async () => {
  const result = await runWorkflowPlan({ steps: [
    { id: "a", objective: "Fail", dependsOn: [] },
    { id: "b", objective: "Never run", dependsOn: ["a"] },
  ] }, {
    runStep: async (prompt) => prompt === "Fail"
      ? { execution: { text: "bad" }, outcome: { accepted: false, totalKnownCostUsd: 0 } }
      : { execution: { text: "unexpected" }, outcome: { accepted: true, totalKnownCostUsd: 0 } },
    preferJev: false,
  });

  assert.equal(result.steps[0].status, "failed");
  assert.equal(result.steps[1].status, "skipped");
  assert.equal(result.outcome.accepted, false);
});
