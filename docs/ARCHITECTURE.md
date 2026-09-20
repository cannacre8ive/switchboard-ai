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
  -> model registry
  -> executor
  -> Jev/rules verifier
  -> accept OR escalate to next tier
  -> telemetry + cost accounting
```

## Jev routing questions

One System One call asks routing questions against the same state: task type, cheapest plausible executor, complexity, risk, web/code/context/tool needs, and parallelizability.

## Jev verification questions

After execution, a second System One call judges narrow properties of the candidate output: request fulfillment, unsupported-claim risk, completeness, and correctness/internal consistency.

Policy stays in deterministic code. Higher-risk tasks use stricter thresholds. Failed verification can escalate to the next configured model tier, subject to attempt and budget limits.

## Model registry

Executors are logical IDs rather than hard-coded model names. Registry entries define provider, model/environment variable, tier, capabilities, optional pricing, and enabled state.

## Cost discipline

Track router cost/latency, executor usage/cost, verifier cost, retries, escalations, and success. Optimize **successful-task cost**, not raw per-call price.

## Milestones

- **M1 Routing kernel:** complete.
- **M2 Model registry + economics:** functional; live pricing data remains user-configured.
- **M3 Verification loop:** functional.
- **M4 Tool/context routing:** next.
- **M5 Learned economics:** held-out corpus + empirical success/cost matrix.
