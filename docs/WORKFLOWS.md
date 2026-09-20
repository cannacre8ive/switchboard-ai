# Workflow orchestration

Switchboard V0.4 can execute a dependency-aware DAG of independently routed subtasks.

## Why

A single objective often contains work with different economics and capabilities. Research might need web access, implementation might need a coding executor, and synthesis might be a cheap language task. Treating the whole objective as one giant frontier-model call wastes both context and model capability.

## Plan format

```json
{
  "objective": "Optional parent objective",
  "steps": [
    {
      "id": "research",
      "objective": "A self-contained subtask",
      "dependsOn": [],
      "budgetWeight": 1,
      "required": true
    }
  ]
}
```

Rules:

- IDs must be unique.
- Dependencies must exist.
- Cycles are rejected.
- Independent ready steps can run concurrently.
- A step receives outputs only from its declared dependencies.
- Failed dependencies cause downstream dependent steps to be skipped.
- The workflow budget is divided by `budgetWeight`.
- Each subtask is routed again, so different steps can use different executors and tools.

## Supplied plan

```bash
node src/cli.mjs \
  --workflow-plan=examples/workflow.plan.json \
  --dry-run \
  "Research an API change, update the integration, test it, and summarize the result"
```

## Autonomous supervisor

```bash
node src/cli.mjs --supervise "Research this issue, patch the repository, test it, and summarize the result"
```

The supervisor first decides whether decomposition is worthwhile. If not, it uses the normal single-task runtime. If yes, a generative planner creates the DAG and every step is independently routed through Switchboard.

A dry-run never spends a generative planner call. It reports whether planning would be needed.

## Security

Workflow decomposition does not bypass tool permissions. `--allow-writes` remains an explicit runtime permission inherited by workflow steps. Without it, write-capable logical tools stay blocked even when a generated plan asks for mutation.
