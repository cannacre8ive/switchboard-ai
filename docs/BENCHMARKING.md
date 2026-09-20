# Benchmarking the Jev hypothesis

Switchboard's core product hypothesis is not “Jev is cheap.” It is:

> A cheap calibrated decision layer can lower **successful-task cost** by avoiding unnecessary frontier calls, restricting context/tool exposure, and escalating only when uncertainty warrants it.

## Baselines

For the same task corpus, compare at least:

1. **Rules -> executor** (near-zero routing cost)
2. **Jev -> executor** (System One router)
3. **Frontier supervisor -> executor** (conventional generative router)
4. **Always-frontier** (no routing)

## Required measurements

- routing cost and latency
- executor cost and latency
- verification cost
- retry/escalation cost
- task success
- quality score
- tool-call count
- context tokens passed to executor

The primary metric is `total_cost_usd / successful_tasks`, with quality and latency constraints reported separately.

## Interpretation

Jev only wins economically when the savings produced by better/cheaper routing exceed the cost of the Jev call itself. On long expensive tasks, router savings may be marginal. On high-volume decision-heavy workflows, they may compound substantially.
