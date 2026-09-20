# Switchboard architecture

## Goal

Minimize **expected successful-task cost** while meeting configurable quality, risk, permission, and latency constraints.

Switchboard treats routing, generation, tool use, context selection, verification, and workflow orchestration as separate concerns.

## Runtime

```text
User objective
  -> deterministic prechecks
  -> Jev decision bundle or rules fallback
  -> Task Contract
  -> decomposition gate
       | single task -> normal runtime
       | workflow    -> generative planner -> validated DAG
  -> for each ready subtask:
       model policy
       logical tool plan
       context plan
       executor
       verifier
       accept / retry / escalate
  -> dependency outputs flow only to declared dependents
  -> workflow outcome + telemetry + economics
```

## System One layer

Jev handles closed-shape decisions such as:

- primary task type
- cheapest plausible executor
- complexity and consequence/risk
- whether web/code/long context/tools are needed
- whether work is parallelizable
- whether decomposition is worthwhile
- logical tool families
- whether external state mutation is required
- post-execution fulfillment/completeness/correctness judgments

Jev does **not** generate plans, prose, code, or final answers.

## System Two layer

Generative executors handle:

- open-ended planning
- writing and synthesis
- coding and debugging
- research synthesis
- complex reasoning

Executor names are logical IDs in the model registry, so providers and model IDs can change without rewriting orchestration policy.

## Supervisor and workflow DAG

When decomposition is worthwhile, a generative planner returns a constrained JSON plan. Switchboard validates:

- unique IDs
- dependency existence
- acyclic graph
- maximum step count
- positive budget weights

The scheduler:

- runs independent ready steps concurrently up to a limit
- routes every subtask independently
- allocates a share of the workflow budget to each step
- passes only declared dependency outputs downstream
- skips dependents when prerequisites fail
- preserves the global write-permission policy

## Tools and permissions

Tool routing is provider-neutral. Families currently include:

- web
- GitHub
- files
- browser
- Python
- Drive
- email

The registry expands families into read/execute/write capabilities with risk metadata. External mutation is denied by default and requires explicit write permission.

V0.4 stops at the logical capability plan. The next milestone maps these logical capabilities to live MCP/OpenAI/Claude tool transports.

## Context

Context planning is independent of model routing. It controls:

- planning token budget
- direct vs retrieve-and-rerank strategy
- retrieval top-K
- allowed source categories
- dependency-scoped workflow context

These are optimization controls, not claims about any provider's maximum context window.

## Verification and escalation

After execution, Jev can judge narrow output properties. Acceptance thresholds become stricter as risk rises. Failed verification can escalate to the next compatible model tier, subject to attempt and budget limits.

A deterministic verifier remains available as a structural fallback, but it is not treated as equivalent to semantic Jev verification.

## Economics

Track:

- routing cost/latency
- planning cost
- executor tokens/cost
- verifier cost
- retry/escalation cost
- tool exposure
- context volume
- workflow parallelism
- objective success

Unknown model pricing remains **unknown**; it is never silently converted to zero.

## Milestones

- **M1 — Routing kernel:** complete
- **M2 — Model registry + economics:** functional
- **M3 — Verification loop:** functional
- **M4 — Least-privilege tool/context planning:** functional
- **M5 — Supervisor + workflow DAG runtime:** functional
- **M6 — Live provider/MCP tool adapters:** next
- **M7 — Held-out benchmarks + learned economics:** planned
