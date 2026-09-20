# Switchboard AI

A cost-aware, vendor-neutral **System One / System Two AI orchestration runtime**. Switchboard uses cheap structured decisions for routing and reserves generative models, tools, and multi-agent workflows for work that actually needs them.

```text
objective
  -> Jev/rules decision layer
  -> task contract + risk/confidence policy
  -> optional supervisor decomposition
  -> dependency-aware subtask DAG
  -> model + tool + context routing per step
  -> execution
  -> verification
  -> accept / retry / escalate
  -> telemetry + economics
```

## Status: V0.4

Working today:

- TypeSafe Jev adapter using `choice`, `noul`, and `score`
- zero-key deterministic routing fallback
- normalized task contracts
- economy / balanced / premium / max policies
- configurable OpenAI / Anthropic / Codex-style logical executors
- model registry with tiers, capabilities, and optional pricing
- confidence- and risk-based escalation
- Jev post-execution verification with deterministic fallback
- routing, execution, verification, and retry cost accounting
- least-privilege logical tool plans
- explicit write gate via `--allow-writes`
- context budgets and targeted retrieval plans
- supervisor decision for single-task vs decomposed workflow
- generative workflow planner with validated DAG output
- bounded-concurrency workflow scheduler
- dependency-scoped context propagation
- shared workflow budget split by step weight
- JSONL telemetry
- routing smoke benchmark
- GitHub Actions CI

Not yet implemented:

- provider-specific MCP / tool transport adapters
- live held-out Jev-vs-rules benchmark results
- learned routing policy from production outcomes
- web UI / dashboard

## Quick start

Requires Node 20+.

```bash
npm install
cp .env.example .env
npm test
npm run benchmark:routing
```

The project runs in offline/rules mode without API keys.

### Preview a normal routed task

```bash
node src/cli.mjs --dry-run --no-jev "Debug this repository and fix the failing tests"
```

### Preview supervisor decomposition

```bash
node src/cli.mjs --dry-run --no-jev --supervise \
  "Research this issue, update the repository, run tests, and summarize the result"
```

A supervisor dry-run does **not** spend a generative planning call. It reports whether a planner would be invoked.

### Run an explicit workflow plan

```bash
node src/cli.mjs --dry-run \
  --workflow-plan=examples/workflow.plan.json \
  "Research an API change, update the integration, test it, and summarize the result"
```

See [`docs/WORKFLOWS.md`](docs/WORKFLOWS.md).

## Enable Jev

Set your TypeSafe key locally; do not commit it:

```bash
export TYPESAFE_API_KEY="..."
export TYPESAFE_MODEL="jev-latest"
```

Then run the same commands without `--no-jev`.

## Enable live executors

Configure current provider model IDs rather than hard-coding them:

```bash
export OPENAI_API_KEY="..."
export OPENAI_MODEL="..."
export CODEX_MODEL="..."
export FRONTIER_MODEL="..."
export ANTHROPIC_API_KEY="..."
export ANTHROPIC_MODEL="..."
```

For accurate economics, copy `config/models.example.json`, add current input/output prices, and run with `--registry=...`.

## Least-privilege tool planning

Switchboard first chooses logical capability families such as `github`, `files`, `browser`, `python`, `drive`, and `email`. It does **not** automatically grant mutation permission.

```bash
node src/cli.mjs --dry-run --no-jev \
  "Use the browser and GitHub tools to update the repository and open a pull request"
```

Write-capable tools remain blocked. To explicitly allow write capabilities in the plan:

```bash
node src/cli.mjs --dry-run --allow-writes \
  "Update the repository and open a pull request"
```

V0.4 produces logical tool plans; mapping those plans to live MCP/provider tools is the next integration milestone.

## Modes and budgets

```bash
node src/cli.mjs \
  --dry-run \
  --mode=economy \
  --max-cost=0.25 \
  --max-attempts=2 \
  "Summarize this support ticket"
```

- `economy` — cheap first attempts and minimal verification
- `balanced` — quality-per-dollar default
- `premium` — stricter confidence thresholds
- `max` — aggressive escalation

## Benchmarking

```bash
npm run benchmark:routing
```

Without `TYPESAFE_API_KEY`, only the deterministic rules baseline runs. With a key, the same corpus also runs through Jev. The included corpus is a **smoke/regression benchmark**, not held-out evidence of generalization.

The main economic target is **successful-task cost**, not model price in isolation.

## Design principles

1. Deterministic software before AI when possible.
2. Jev for narrow typed judgments, not open-ended generation.
3. Cheapest plausible executor first; escalate on uncertainty/risk.
4. Give each worker only the context and tools it needs.
5. External mutations denied by default.
6. Independent subtasks may run in parallel; dependencies are explicit.
7. Measure real cost, latency, retries, verification, and success.
8. Keep models and providers swappable.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/WORKFLOWS.md`](docs/WORKFLOWS.md)
- [`docs/BENCHMARKING.md`](docs/BENCHMARKING.md)
