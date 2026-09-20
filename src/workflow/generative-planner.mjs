import { executeById } from "../executors/http-executors.mjs";
import { calculateUsageCost } from "../economics/usage-cost.mjs";
import { defaultModelRegistry } from "../registry/model-registry.mjs";
import { validateWorkflowPlan } from "./plan.mjs";

export class GenerativePlanner {
  constructor({ executorId = "frontier-reasoner", execute = executeById, registry = defaultModelRegistry, maxSteps = 8 } = {}) {
    this.executorId = executorId;
    this.execute = execute;
    this.registry = registry;
    this.maxSteps = maxSteps;
  }

  async plan(objective) {
    const execution = await this.execute(
      this.executorId,
      buildPlannerPrompt(objective, this.maxSteps),
      { registry: this.registry },
    );
    const parsed = parseJsonObject(execution.text);
    const plan = validateWorkflowPlan(
      { ...parsed, objective: parsed.objective || objective },
      { maxSteps: this.maxSteps },
    );
    const entry = this.registry.get(this.executorId);
    const economics = calculateUsageCost({
      provider: execution.provider,
      usage: execution.usage,
      pricing: entry,
    });
    return { plan, execution, economics };
  }
}

export function buildPlannerPrompt(objective, maxSteps = 8) {
  return `You are the planning component of an AI orchestration runtime. Decompose the objective into the smallest useful dependency-aware workflow.

OBJECTIVE:
${objective}

Return ONLY valid JSON, with no markdown fences or prose. Shape:
{"steps":[{"id":"short-id","objective":"specific self-contained subtask","dependsOn":[],"budgetWeight":1,"required":true}]}

Rules:
- At most ${maxSteps} steps.
- Use parallel independent steps when useful.
- dependencies must reference earlier conceptual prerequisites.
- Give each worker only the work it needs.
- Do not create a step for trivial formatting if another step can do it.
- If final synthesis is required, make it an explicit final step depending on the relevant prior steps.
- Do not assume tools or permissions the objective did not request.`;
}

export function parseJsonObject(text) {
  const source = String(text || "").trim();
  if (!source) throw new Error("Planner returned an empty response");
  try { return JSON.parse(source); } catch {}
  const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  if (fenced) {
    try { return JSON.parse(fenced.trim()); } catch {}
  }
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try { return JSON.parse(source.slice(start, end + 1)); } catch {}
  }
  throw new Error("Planner response did not contain valid JSON");
}
