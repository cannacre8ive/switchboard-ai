import { SwitchboardRouter } from "./router.mjs";
import { executeById } from "./executors/http-executors.mjs";
import { logEvent } from "./telemetry/logger.mjs";
import { estimateJevRoutingCostUsd } from "./cost.mjs";

export async function runTask(prompt, { dryRun = false, mode, maxCostUsd } = {}) {
  const router = new SwitchboardRouter({
    mode: mode || process.env.SWITCHBOARD_MODE || "balanced",
    budgetUsd: maxCostUsd ?? Number(process.env.SWITCHBOARD_MAX_COST_USD || 1),
  });

  const started = performance.now();
  const routed = await router.route(prompt);
  const routingEconomics = routed.contract.decisionSource === "jev"
    ? estimateJevRoutingCostUsd(prompt)
    : { estimatedInputTokens: 0, estimatedCostUsd: 0, usdPerMillion: 0 };
  await logEvent({ type: "route", ...routed, routingEconomics });

  if (dryRun) {
    return { ...routed, routingEconomics, execution: { dryRun: true } };
  }

  const executionStarted = performance.now();
  const execution = await executeById(routed.policy.executor, prompt);
  const elapsedMs = Math.round(performance.now() - executionStarted);
  await logEvent({
    type: "execution",
    taskId: routed.contract.id,
    executor: routed.policy.executor,
    elapsedMs,
    provider: execution.provider,
    model: execution.model,
    usage: execution.usage,
  });

  return {
    ...routed,
    routingEconomics,
    execution: { ...execution, elapsedMs },
    totalElapsedMs: Math.round(performance.now() - started),
  };
}
