# Switchboard AI

A cost-aware **System One / System Two AI runtime** that uses cheap structured decision intelligence for routing and reserves expensive generative models for work that needs them.

## Why

Most agent stacks use a generative LLM to decide which generative LLM or tool should run next. That can be wasteful. Switchboard separates **deciding** from **doing**:

```text
request -> Jev/rules -> task contract -> confidence/risk policy -> Claude/OpenAI/Codex-style executor -> telemetry
```

Jev is used for typed decisions such as task classification, complexity, tool requirements, and executor selection. It is not treated as a replacement for frontier reasoning models.

## Status

**V0.1 routing kernel is scaffolded.** It includes:

- offline rule router so the project runs without keys
- live TypeSafe Jev adapter using `Choice`, `Noul`, and `Score`
- normalized Task Contract
- economy / balanced / premium / max policies
- confidence- and risk-based escalation
- Anthropic Messages API executor
- OpenAI Responses API executor (also used for a configurable Codex model)
- JSONL telemetry
- explicit Jev routing-cost estimates and benchmark record schema
- CLI
- offline tests
- benchmark starter

## Quick start

Requires Node 20+.

```bash
npm install
cp .env.example .env
npm test
npm run demo
```

The demo uses the offline router by default.

### Enable Jev

Set:

```bash
export TYPESAFE_API_KEY="..."
export TYPESAFE_MODEL="jev-latest"
```

Then:

```bash
node src/cli.mjs --dry-run "Debug this repository and fix the failing tests"
```

### Enable live model execution

Set the provider key and model IDs in your environment. Model IDs are deliberately not hard-coded because model availability and pricing change.

```bash
export OPENAI_API_KEY="..."
export OPENAI_MODEL="..."
export CODEX_MODEL="..."
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
node src/cli.mjs --dry-run --mode=economy "Summarize this support ticket"
```

## Principles

1. Use deterministic software before AI when possible.
2. Use Jev for narrow typed judgments, not open-ended generation.
3. Give each worker only the context and tools it needs.
4. Escalate based on uncertainty and risk, not prestige.
5. Measure real successful-task cost; do not assume a cheaper router makes the whole workflow cheaper.
6. Keep provider/model IDs configurable so the runtime stays vendor-neutral.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/BENCHMARKING.md`](docs/BENCHMARKING.md).
