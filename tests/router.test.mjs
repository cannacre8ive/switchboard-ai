import test from "node:test";
import assert from "node:assert/strict";
import { SwitchboardRouter } from "../src/router.mjs";

const router = new SwitchboardRouter({ preferJev: false, mode: "balanced" });

test("routes repo debugging to codex", async () => {
  const result = await router.route("Debug this TypeScript repository and fix the failing tests");
  assert.equal(result.contract.taskType, "coding");
  assert.equal(result.policy.executor, "codex-coding");
});

test("routes strategic architecture to stronger reasoning", async () => {
  const result = await router.route("Design an architecture and roadmap for a multi-agent orchestration system");
  assert.ok(["frontier-reasoner", "claude-general"].includes(result.policy.executor));
});

test("detects current research as web-needed", async () => {
  const result = await router.route("Research the latest pricing and compare the current API options with sources");
  assert.equal(result.contract.needs.web, true);
});

import { estimateJevRoutingCostUsd, successfulTaskCost } from "../src/cost.mjs";

test("estimates Jev routing cost at a tiny fraction of a dollar", () => {
  const result = estimateJevRoutingCostUsd("Route this request", { schemaOverheadTokens: 500 });
  assert.ok(result.estimatedCostUsd > 0);
  assert.ok(result.estimatedCostUsd < 0.001);
});

test("successful task cost sums every orchestration layer", () => {
  assert.equal(successfulTaskCost({
    routingCostUsd: 0.01,
    executionCostUsd: 0.1,
    verificationCostUsd: 0.02,
    retriesCostUsd: 0.03,
  }), 0.16);
});

test("marks multi-action automation as decomposition-worthy", async () => {
  const result = await router.route(
    "Use browser tools to research the bug, update GitHub, run tests, and open a pull request",
  );
  assert.equal(result.contract.needsDecomposition, true);
});
