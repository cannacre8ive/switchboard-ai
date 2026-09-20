import { successfulTaskCost } from "../cost.mjs";

export function buildBenchmarkRecord({
  taskId,
  prompt,
  router,
  executor,
  routingCostUsd = 0,
  executionCostUsd = 0,
  verificationCostUsd = 0,
  retriesCostUsd = 0,
  success = null,
  qualityScore = null,
  latencyMs = null,
}) {
  return {
    version: 1,
    taskId,
    prompt,
    router,
    executor,
    economics: {
      routingCostUsd,
      executionCostUsd,
      verificationCostUsd,
      retriesCostUsd,
      totalCostUsd: successfulTaskCost({
        routingCostUsd,
        executionCostUsd,
        verificationCostUsd,
        retriesCostUsd,
      }),
    },
    outcome: { success, qualityScore, latencyMs },
  };
}
