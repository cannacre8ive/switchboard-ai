import { SwitchboardRouter } from "./router.mjs";
import { runTask } from "./runtime.mjs";
import { GenerativePlanner } from "./workflow/generative-planner.mjs";
import { runWorkflowPlan } from "./workflow/workflow-runtime.mjs";
import { validateWorkflowPlan } from "./workflow/plan.mjs";
import { defaultModelRegistry } from "./registry/model-registry.mjs";

export async function superviseObjective(objective, {
  dryRun = false,
  plan,
  planner,
  budgetUsd = Number(process.env.SWITCHBOARD_MAX_COST_USD || 1),
  mode = process.env.SWITCHBOARD_MODE || "balanced",
  preferJev = true,
  allowWrites = false,
  concurrency = 3,
  registry = defaultModelRegistry,
  verifier,
  execute,
  maxAttempts = 2,
} = {}) {
  const router = new SwitchboardRouter({ mode, budgetUsd, preferJev });
  const route = await router.route(objective);

  if (plan) {
    const validated = validateWorkflowPlan({ ...plan, objective: plan.objective || objective });
    const workflow = await runWorkflowPlan(validated, {
      budgetUsd, concurrency, allowWrites, preferJev, mode, registry, verifier, maxAttempts, dryRun,
    });
    return { mode: "workflow", supervisorRoute: route, planning: { source: "provided" }, workflow };
  }

  if (!route.contract.needsDecomposition) {
    const task = await runTask(objective, {
      dryRun, mode, maxCostUsd: budgetUsd, preferJev, allowWrites, registry, verifier, maxAttempts, execute,
    });
    return { mode: "single-task", supervisorRoute: route, task };
  }

  if (dryRun) {
    return {
      mode: "workflow-dry-run",
      supervisorRoute: route,
      planning: {
        required: true,
        executed: false,
        reason: "dry-run does not spend a generative planning call",
      },
    };
  }

  const activePlanner = planner || new GenerativePlanner({ registry, execute });
  const planning = await activePlanner.plan(objective);
  const planningCostUsd = planning.economics?.totalCostUsd ?? 0;
  const remainingBudgetUsd = Math.max(0.000001, budgetUsd - planningCostUsd);
  const workflow = await runWorkflowPlan(planning.plan, {
    budgetUsd: remainingBudgetUsd, concurrency, allowWrites, preferJev, mode, registry, verifier, maxAttempts,
  });

  return {
    mode: "workflow",
    supervisorRoute: route,
    planning: {
      source: "generative",
      executor: planning.execution?.model,
      economics: planning.economics,
      plan: planning.plan,
    },
    workflow,
    outcome: {
      accepted: workflow.outcome.accepted,
      totalKnownCostUsd: planningCostUsd + workflow.outcome.totalKnownCostUsd,
      budgetUsd,
    },
  };
}
