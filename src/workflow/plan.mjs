const ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;

export function validateWorkflowPlan(input, { maxSteps = 12 } = {}) {
  if (!input || typeof input !== "object") throw new Error("Workflow plan must be an object");
  if (!Array.isArray(input.steps) || input.steps.length === 0) throw new Error("Workflow plan requires at least one step");
  if (input.steps.length > maxSteps) throw new Error(`Workflow plan exceeds maxSteps=${maxSteps}`);

  const ids = new Set();
  const steps = input.steps.map((raw, index) => {
    if (!raw || typeof raw !== "object") throw new Error(`Step ${index + 1} must be an object`);
    const id = String(raw.id || "").trim();
    if (!ID_RE.test(id)) throw new Error(`Invalid workflow step id: ${id || "<empty>"}`);
    if (ids.has(id)) throw new Error(`Duplicate workflow step id: ${id}`);
    ids.add(id);
    const objective = String(raw.objective || "").trim();
    if (!objective) throw new Error(`Step ${id} requires an objective`);
    const dependsOn = raw.dependsOn == null ? [] : raw.dependsOn;
    if (!Array.isArray(dependsOn)) throw new Error(`Step ${id} dependsOn must be an array`);
    return {
      id,
      objective,
      dependsOn: [...new Set(dependsOn.map(String))],
      budgetWeight: normalizeWeight(raw.budgetWeight),
      required: raw.required !== false,
      metadata: raw.metadata && typeof raw.metadata === "object" ? raw.metadata : {},
    };
  });

  for (const step of steps) {
    for (const dep of step.dependsOn) {
      if (!ids.has(dep)) throw new Error(`Step ${step.id} depends on missing step ${dep}`);
      if (dep === step.id) throw new Error(`Step ${step.id} cannot depend on itself`);
    }
  }
  assertAcyclic(steps);

  return {
    version: 1,
    objective: String(input.objective || "").trim() || null,
    steps,
    metadata: input.metadata && typeof input.metadata === "object" ? input.metadata : {},
  };
}

export function createSingleStepPlan(objective) {
  return validateWorkflowPlan({
    objective,
    steps: [{ id: "execute", objective, dependsOn: [], budgetWeight: 1 }],
  });
}

export function allocateStepBudgets(plan, totalBudgetUsd) {
  const validated = validateWorkflowPlan(plan);
  const budget = Number(totalBudgetUsd);
  if (!Number.isFinite(budget) || budget <= 0) throw new Error("Workflow budget must be greater than zero");
  const totalWeight = validated.steps.reduce((sum, step) => sum + step.budgetWeight, 0);
  return Object.fromEntries(
    validated.steps.map((step) => [step.id, budget * (step.budgetWeight / totalWeight)]),
  );
}

export function dependencyContext(step, results, { maxChars = 20000 } = {}) {
  if (!step.dependsOn?.length) return "";
  const blocks = [];
  let used = 0;
  for (const depId of step.dependsOn) {
    const dep = results.get(depId);
    const text = dep?.execution?.text ?? dep?.output ?? dep?.error ?? "No usable output.";
    const block = `\n--- dependency:${depId} ---\n${String(text)}\n--- end dependency:${depId} ---\n`;
    const remaining = Math.max(0, maxChars - used);
    if (!remaining) break;
    blocks.push(block.slice(0, remaining));
    used += Math.min(block.length, remaining);
  }
  return blocks.join("");
}

function normalizeWeight(value) {
  const n = Number(value ?? 1);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function assertAcyclic(steps) {
  const indegree = new Map(steps.map((step) => [step.id, step.dependsOn.length]));
  const dependents = new Map(steps.map((step) => [step.id, []]));
  for (const step of steps) for (const dep of step.dependsOn) dependents.get(dep).push(step.id);
  const queue = [...steps.filter((step) => indegree.get(step.id) === 0).map((step) => step.id)];
  let visited = 0;
  while (queue.length) {
    const id = queue.shift();
    visited += 1;
    for (const child of dependents.get(id)) {
      indegree.set(child, indegree.get(child) - 1);
      if (indegree.get(child) === 0) queue.push(child);
    }
  }
  if (visited !== steps.length) throw new Error("Workflow plan contains a dependency cycle");
}
