import test from "node:test";
import assert from "node:assert/strict";
import { superviseObjective } from "../src/supervisor.mjs";

test("supervisor dry-run identifies a decomposable workflow without spending a planner call", async () => {
  const result = await superviseObjective(
    "Use the browser and GitHub tools to research the issue, update the repository, run tests, and open a pull request",
    { dryRun: true, preferJev: false },
  );
  assert.equal(result.mode, "workflow-dry-run");
  assert.equal(result.supervisorRoute.contract.needsDecomposition, true);
  assert.equal(result.planning.executed, false);
});

test("supervisor can execute a supplied workflow plan in dry-run mode", async () => {
  const result = await superviseObjective("Build the thing", {
    dryRun: true,
    preferJev: false,
    plan: {
      steps: [
        { id: "research", objective: "Research current options", dependsOn: [] },
        { id: "build", objective: "Build from research", dependsOn: ["research"] },
      ],
    },
  });
  assert.equal(result.mode, "workflow");
  assert.equal(result.workflow.steps.length, 2);
  assert.equal(result.workflow.outcome.accepted, true);
});
