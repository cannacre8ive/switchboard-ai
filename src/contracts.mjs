export const TASK_TYPES = [
  "coding",
  "research",
  "writing",
  "data",
  "automation",
  "planning",
  "retrieval",
  "other",
];

export const EXECUTORS = [
  "cheap-general",
  "claude-general",
  "codex-coding",
  "frontier-reasoner",
];

export function normalizeProbability(value, fallback = 0.5) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

export function createTaskContract({ prompt, decision, budgetUsd = 1, mode = "balanced" }) {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    prompt,
    mode,
    budgetUsd,
    decisionSource: decision.source ?? "unknown",
    taskType: decision.taskType ?? "other",
    complexity: normalizeProbability(decision.complexity),
    risk: normalizeProbability(decision.risk, 0.2),
    confidence: normalizeProbability(decision.confidence, 0.5),
    needs: {
      web: Boolean(decision.needsWeb),
      code: Boolean(decision.needsCode),
      longContext: Boolean(decision.needsLongContext),
      tools: Boolean(decision.needsTools),
    },
    parallelizable: Boolean(decision.parallelizable),
    recommendedExecutor: EXECUTORS.includes(decision.recommendedExecutor)
      ? decision.recommendedExecutor
      : "cheap-general",
    rawDecision: decision.raw ?? null,
  };
}
