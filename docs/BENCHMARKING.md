# Benchmarking the Jev hypothesis

Switchboard's hypothesis is not simply “Jev is cheap.” It is:

> A cheap calibrated decision layer can lower **successful-task cost** by avoiding unnecessary frontier calls, restricting context/tool exposure, and escalating only when uncertainty warrants it.

## Baselines

Compare the same tasks across:

1. Rules -> executor
2. Jev -> executor
3. Frontier supervisor -> executor
4. Always-frontier

## Routing smoke benchmark

`npm run benchmark:routing` uses `benchmarks/routing-corpus.json`.

This corpus is a development smoke/regression set, **not evidence that the router generalizes**. A credible Jev-vs-rules comparison requires a larger held-out corpus not used while editing routing rules.

When `TYPESAFE_API_KEY` is absent, the Jev leg is skipped rather than simulated.

## End-to-end measurements

Track routing, execution, verification and retry cost/latency, task success, quality, tool calls, and executor context tokens.

The primary economic metric is `total_cost_usd / successful_tasks`, with minimum quality requirements reported separately.

## Interpretation

Jev only wins economically when savings from better routing, context restriction, tool selection, or verification exceed the Jev calls themselves.
