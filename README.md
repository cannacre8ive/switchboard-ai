# Switchboard AI

A cost-aware **System One / System Two AI runtime** that uses cheap structured decision intelligence for routing and reserves expensive generative models for work that needs them.

## Why

Most agent stacks use a generative LLM to decide which generative LLM or tool should run next. Switchboard separates **deciding** from **doing**:

```text
request -> Jev/rules -> task contract -> policy -> model registry -> executor -> verifier -> accept/escalate -> telemetry
```

Jev is used for typed routing and post-execution verification decisions. It is not treated as a replacement for frontier reasoning or generative models.

## Status

**V0.2 execution + verification loop is working.** It includes:

- offline deterministic router
- live TypeSafe Jev router using `Choice`, `Noul`, and `Score`
- normalized task contracts
- economy / balanced / premium / max policies
- Anthropic and OpenAI HTTP executors
- configurable model registry
- provider token-usage normalization and cost accounting
- Jev post-execution verification with risk-adjusted thresholds
- automatic retry/escalation to a higher model tier
- JSONL telemetry
- routing smoke benchmark corpus
- offline tests

## Quick start

Requires Node 20+.

```bash
npm install
cp .env.example .env
npm test
npm run demo
npm run benchmark:routing
```

The runtime works in rules/dry-run mode without API keys.

### Enable Jev

```bash
export TYPESAFE_API_KEY="..."
export TYPESAFE_MODEL="jev-latest"
node src/cli.mjs --dry-run "Debug this repository and fix the failing tests"
```

### Enable live model execution

Set the provider key and current model IDs:

```bash
export OPENAI_API_KEY="..."
export OPENAI_MODEL="..."
export CODEX_MODEL="..."
export FRONTIER_MODEL="..."
export ANTHROPIC_API_KEY="..."
export ANTHROPIC_MODEL="..."
```

Then remove `--dry-run`.

## Modes

- `economy` — cheaper first attempts, minimal verification
- `balanced` — quality-per-dollar default
- `premium` — stronger confidence thresholds and verification
- `max` — aggressive escalation to strongest configured path

Example:

```bash
node src/cli.mjs --dry-run --mode=economy --max-cost=0.25 --max-attempts=2 "Summarize this support ticket"
```

## Custom model registry

Copy `config/models.example.json` to your own config, fill in current model IDs/pricing, then run:

```bash
node src/cli.mjs --registry=config/models.json --max-cost=1.00 "your request"
```

## Benchmarking

`npm run benchmark:routing` runs the deterministic baseline and, when `TYPESAFE_API_KEY` is configured, the same corpus through Jev. The included corpus is deliberately labeled a **smoke/regression benchmark**, not held-out evidence of generalization.

## Principles

1. Use deterministic software before AI when possible.
2. Use Jev for narrow typed judgments, not open-ended generation.
3. Give each worker only the context and tools it needs.
4. Escalate based on uncertainty and risk, not prestige.
5. Optimize successful-task cost, not raw token price.
6. Keep provider/model IDs configurable.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/BENCHMARKING.md`](docs/BENCHMARKING.md).
