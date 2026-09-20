# Switchboard Architecture

## Design goal

Switchboard minimizes expected successful-task cost while maintaining configurable quality and risk thresholds. Jev handles narrow System One judgments; generative models handle System Two work only when needed.

## Runtime path

```text
User request
  -> deterministic prechecks
  -> Jev decision bundle (or rules fallback)
  -> Task Contract
  -> policy / confidence gate
  -> logical tool plan + context plan
  -> model registry
  -> executor
  -> Jev/rules verifier
  -> accept OR escalate to next tier
  -> telemetry + cost accounting
```

## Jev routing

A single System One call can classify task type/executor, complexity/risk, web/code/context/tool needs, parallelizability, logical tool families, and whether external mutation is required.

## Jev verification

After execution, a System One call judges request fulfillment, unsupported-claim risk, completeness, and correctness/internal consistency. Policy remains deterministic code. Higher-risk tasks use stricter thresholds.

## Model registry

Executors are logical IDs rather than hard-coded model names. Registry entries define provider, model/environment variable, tier, capabilities, optional pricing, and enabled state.

## Least-privilege capability plan

Tool routing is provider-neutral. The router emits families such as `github`, `files`, `browser`, `python`, `drive`, and `email`. The logical registry expands those into read/execute/write capabilities with risk metadata.

External mutation is denied by default. Write-capable GitHub/file/browser/Drive/email capabilities require explicit write permission.

Context planning is separate from tool planning. It assigns a planning token budget, retrieval strategy, top-K target, and context-source categories. These are optimization knobs, not provider context-window claims.

## Cost discipline

Track router cost/latency, executor usage/cost, verifier cost, retries, escalations, tool exposure, context volume, and success. Optimize **successful-task cost**, not raw per-call price.

## Milestones

- **M1 Routing kernel:** complete.
- **M2 Model registry + economics:** functional.
- **M3 Verification loop:** functional.
- **M4 Tool/context routing:** logical capability planning and write gating are functional; provider adapters are next.
- **M5 Learned economics:** held-out corpus + empirical success/cost matrix.
