import { runTask } from "../runtime.mjs";
import { logEvent } from "../telemetry/logger.mjs";
import { allocateStepBudgets, dependencyContext, validateWorkflowPlan } from "./plan.mjs";

export async function runWorkflowPlan(planInput, {
  budgetUsd = Number(process.env.SWITCHBOARD_MAX_COST_USD || 1),
  concurrency = 3,
  runStep = runTask,
  allowWrites = false,
  preferJev = true,
  mode = process.env.SWITCHBOARD_MODE || "balanced",
  registry,
  verifier,
  maxAttempts = 2,
  dependencyContextMaxChars = 20000,
  dryRun = false,
} = {}) {
  const plan = validateWorkflowPlan(planInput);
  const stepBudgets = allocateStepBudgets(plan, budgetUsd);
  const results = new Map();
  const pending = new Map(plan.steps.map((step) => [step.id, step]));
  const started = performance.now();

  await logEvent({
    type: "workflow_start",
    objective: plan.objective,
    steps: plan.steps.map(({ id, dependsOn }) => ({ id, dependsOn })),
    budgetUsd,
  });

  while (pending.size) {
    const blocked = [...pending.values()].filter((step) => step.dependsOn.some((depId) => {
      const dep = results.get(depId);
      return dep && dep.status !== "accepted";
    }));
    for (const step of blocked) {
      const result = {
        stepId: step.id,
        status: "skipped",
        reason: "dependency did not complete successfully",
        budgetUsd: stepBudgets[step.id],
      };
      results.set(step.id, result);
      pending.delete(step.id);
      await logEvent({ type: "workflow_step", ...result });
    }

    const ready = [...pending.values()].filter(
      (step) => step.dependsOn.every((depId) => results.get(depId)?.status === "accepted"),
    );
    if (!ready.length) {
      if (pending.size) throw new Error("Workflow scheduler reached an impossible state");
      break;
    }

    const batch = ready.slice(0, Math.max(1, Number(concurrency) || 1));
    const completed = await Promise.all(batch.map(async (step) => {
      const context = dependencyContext(step, results, { maxChars: dependencyContextMaxChars });
      const stepPrompt = context
        ? `${step.objective}\n\nUse only the dependency outputs below as inherited workflow context:${context}`
        : step.objective;
      try {
        const task = await runStep(stepPrompt, {
          mode,
          maxCostUsd: stepBudgets[step.id],
          preferJev,
          allowWrites,
          registry,
          verifier,
          maxAttempts,
          dryRun,
        });
        return {
          stepId: step.id,
          status: task.outcome?.accepted === false ? "failed" : "accepted",
          budgetUsd: stepBudgets[step.id],
          knownCostUsd: Number(task.outcome?.totalKnownCostUsd || 0),
          execution: task.execution,
          task,
        };
      } catch (error) {
        return {
          stepId: step.id,
          status: "failed",
          budgetUsd: stepBudgets[step.id],
          knownCostUsd: 0,
          error: error.message,
        };
      }
    }));

    for (const result of completed) {
      results.set(result.stepId, result);
      pending.delete(result.stepId);
      await logEvent({
        type: "workflow_step",
        stepId: result.stepId,
        status: result.status,
        budgetUsd: result.budgetUsd,
        knownCostUsd: result.knownCostUsd,
        error: result.error,
      });
    }
  }

  const ordered = plan.steps.map((step) => results.get(step.id));
  const requiredFailures = plan.steps.filter(
    (step) => step.required && results.get(step.id)?.status !== "accepted",
  );
  const totalKnownCostUsd = ordered.reduce(
    (sum, result) => sum + Number(result?.knownCostUsd || 0),
    0,
  );
  const outcome = {
    accepted: requiredFailures.length === 0,
    totalSteps: plan.steps.length,
    acceptedSteps: ordered.filter((result) => result?.status === "accepted").length,
    failedSteps: ordered.filter((result) => result?.status === "failed").length,
    skippedSteps: ordered.filter((result) => result?.status === "skipped").length,
    totalKnownCostUsd,
    budgetUsd,
    budgetExceeded: totalKnownCostUsd > budgetUsd,
  };

  await logEvent({ type: "workflow_result", objective: plan.objective, outcome });
  return {
    plan,
    stepBudgets,
    steps: ordered,
    outcome,
    totalElapsedMs: Math.round(performance.now() - started),
  };
}
