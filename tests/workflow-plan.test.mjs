import test from "node:test";
import assert from "node:assert/strict";
import { allocateStepBudgets, dependencyContext, validateWorkflowPlan } from "../src/workflow/plan.mjs";

test("workflow validator rejects missing dependencies and cycles", () => {
  assert.throws(
    () => validateWorkflowPlan({ steps: [{ id: "a", objective: "A", dependsOn: ["missing"] }] }),
    /missing step/,
  );
  assert.throws(() => validateWorkflowPlan({ steps: [
    { id: "a", objective: "A", dependsOn: ["b"] },
    { id: "b", objective: "B", dependsOn: ["a"] },
  ] }), /cycle/);
});

test("budget allocation respects weights and sums to total", () => {
  const plan = validateWorkflowPlan({ steps: [
    { id: "research", objective: "Research", budgetWeight: 1 },
    { id: "build", objective: "Build", budgetWeight: 3 },
  ] });
  const budgets = allocateStepBudgets(plan, 4);
  assert.equal(budgets.research, 1);
  assert.equal(budgets.build, 3);
});

test("dependency context includes only named dependency outputs", () => {
  const results = new Map([
    ["a", { execution: { text: "alpha" } }],
    ["b", { execution: { text: "beta" } }],
  ]);
  const text = dependencyContext({ dependsOn: ["a"] }, results);
  assert.match(text, /alpha/);
  assert.doesNotMatch(text, /beta/);
});
