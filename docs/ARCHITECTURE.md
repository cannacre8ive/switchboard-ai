# Switchboard Architecture

## Design goal

Switchboard minimizes expected task cost while maintaining configurable quality and risk thresholds. Jev handles narrow System One judgments; generative models handle System Two work only when needed.

## Runtime path

```text
User request
  -> deterministic prechecks
  -> Jev decision bundle (or rules fallback)
  -> Task Contract
  -> policy / confidence gate
  -> executor selection
  -> model/tool execution
  -> telemetry
  -> verifier/escalation (next milestone)
```

## Jev questions in V1

One System One call asks all routing questions against the same state:

- Choice: primary task type
- Choice: cheapest plausible executor
- Score: complexity
- Score: consequence/risk
- Noul: needs web
- Noul: needs code
- Noul: needs long context
- Noul: needs tools
- Noul: parallelizable

This is intentionally narrow. Jev does not generate the plan or final answer.

## Cost discipline

The router must never claim savings from model substitution without measured telemetry. Every production execution should eventually record:

- router used and routing latency
- routing cost
- executor/model
- input/output token usage
- execution cost
- verifier result
- retries/escalations
- user rating or objective success signal

The optimization target becomes expected successful-task cost, not raw per-call price.

## Milestones

### M1 — Routing kernel (current)
Task contract, Jev adapter, rules fallback, escalation policy, CLI, JSONL telemetry.

### M2 — Real executors
Production provider adapters, model registry, token/cost accounting, streaming.

### M3 — Verification loop
Jev post-execution evaluator, deterministic test/check hooks, retry/escalation policy.

### M4 — Tool/context routing
MCP/tool registry, context retrieval, context relevance scoring, least-privilege tool exposure.

### M5 — Learned economics
Benchmark corpus, outcome labels, empirical success/cost matrix, adaptive routing policy.
