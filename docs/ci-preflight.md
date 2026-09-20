# CI preflight and failure prevention

Use this when a branch is ready to push or open/update a PR. The goal is to keep GitHub Actions as the merge-result/environment verifier, not the first place a deterministic repository rule is discovered.

## Pre-push finish line

Before treating ordinary work as push-ready:

1. Run the narrow checks used while editing.
2. Run the finish-line command below, using [`testing.md`](testing.md) to choose any additional targeted/deep/browser validation the change requires.
3. Fix deterministic failures locally before pushing. Do not use repeated Actions runs as an interactive validator.

For ordinary code/document/tooling changes, the default finish line is:

```bash
npm run ci:fast && npm run build
```

The explicit build matters: the PR `fast-gate` validates the production bundle, so the local finish line should not leave that deterministic check for GitHub to discover.

Use the deeper local finish line for the solver/deep-change classes listed in [`testing.md`](testing.md):

```bash
npm run ci && npm run build
```

Browser changes may additionally require `npm run ci:full` or focused Playwright coverage.

A push without the applicable local finish line is reasonable only when the failure mode genuinely depends on GitHub's merge ref, hosted-runner environment, Actions permissions, workflow syntax/runtime, or another condition that cannot be reproduced locally. Record that reason when it matters to review.

Before changing a branch to accommodate a failure on an apparently unrelated surface, establish whether the same failure already exists on current `main`. Inherited repository debt and branch-caused regression need different remedies.

## Workflow-change preflight

Workflow plumbing has failure modes that ordinary source tests cannot fully model. When editing a GitHub Actions workflow or its artifact pipeline:

- run `npm run check:workflow-actions` locally and follow the workflow recipe in [`change-recipes.md`](change-recipes.md);
- check hard platform constraints through executable guards where the repository can know them locally rather than relying on memory;
- inspect action defaults and step ordering when a later action can clean, move, overwrite, or reinterpret files produced/downloaded earlier;
- exercise meaningful cardinality/layout edges such as zero/one/many artifacts or shards when the action's output shape can vary;
- distinguish tracked-in-HEAD from materialized-in-worktree assumptions under sparse checkout;
- prefer shared contract writers/parsers/stagers over handwritten workflow-local representations;
- for expensive workflows, preserve enough provenance/intermediate output that downstream combine/validation/publish bugs can be repaired without rerunning upstream compute when practical.

Prioritize **plausible false success** over loud failure: a workflow that silently drops inputs and publishes a credible negative/incomplete research result is more dangerous than one that crashes.

## Guardrail-to-guidance map

When touching these surfaces, follow the authoring rule before relying on the corresponding validator to teach it after push.

| Surface changed | Authoring rule / preflight |
|---|---|
| `reports/*.md` or live research reports | Follow [`../reports/README.md`](../reports/README.md), including the required current-state block where applicable; run the documentation check. |
| Level-metric vocabulary or raw/normalized level fields | Follow [`change-recipes.md`](change-recipes.md) and the owning metric-boundary convention; classify any newly covered surface rather than leaving it ambiguous. |
| Canonical agent-facing authorities | Keep current-state prose compact; run `node scripts/agent-context-budget.mjs` while editing and `--check` before push. Treat a warning threshold as a compaction prompt, not spare capacity to consume casually. |
| Package scripts, CLI entrypoints, renamed/moved scripts | Update live consumers and lifecycle references; run the dead-script/package-script checks through the local finish line. |
| GitHub workflows, artifact pipelines, local workflow entrypoints, path filters, maintained action versions | Follow the workflow recipe in [`change-recipes.md`](change-recipes.md); keep local and Actions entrypoints semantically aligned. Run `check:workflow-actions`; `check:dead-scripts` also runs the mechanical local/GHA gate-parity check. |
| Naming/schema/state/telemetry changes | Use [`change-recipes.md`](change-recipes.md) to chase readers, writers, persistence, worker, CLI, workflow, test, and documentation consumers. |
| Runtime level/hint/corpus data | Use the canonical data validators rather than treating build success as sufficient. |

This table is deliberately a router, not a second source of truth. The linked authority and executable validator own the detailed rule.

## Deterministic failure triage

When Actions fails, first classify the failure:

- **Deterministic repository failure:** lint, type, static invariant, docs contract, Node/CLI contract, unit/deep proof, build, data validation. Reproduce locally, fix, and rerun the applicable local finish line before pushing again.
- **Merge-result failure:** branch passed locally but conflicts or combined base/head behavior break the PR merge ref. Reproduce against current `main` if possible.
- **Actions/infrastructure failure:** runner assignment, checkout/cache/network/service, permissions, workflow-runtime behavior. Diagnose as infrastructure rather than changing product/research semantics to make it green.
- **Research outcome:** a solver experiment or evidence workflow produced a scientifically negative or incomplete result. Keep this conceptually separate from repository correctness; research workflow contracts should distinguish negative findings from harness/infrastructure errors where practical.

Do not weaken a deterministic repository guardrail merely because it fires late in the workflow.

If the same root cause recurs, stop treating each red run as an isolated incident. Ask whether the durable repair is an earlier/local check, a shared helper, clearer authoring guidance, or a structural simplification.

## Local/GitHub Actions parity

`scripts/check-ci-gate-parity.mjs` mechanically watches the deterministic PR-gate contract. It verifies the expected Actions commands, the package-script composition that backs `ci:fast`/`ci`, the explicit deep-proof partition, and the two local finish-line commands above.

The check deliberately requires classification when a new `npm run ...` command is added to `.github/workflows/ci.yml`. That turns gate drift into a change that must be explained rather than something discovered months later from failure history.

## Context-budget discipline

`docs/agent-context-routes.json` defines hard and warning budgets for mandatory agent orientation. When editing a budgeted authority:

```bash
node scripts/agent-context-budget.mjs
node scripts/agent-context-budget.mjs --check
```

The report includes remaining warning and hard-limit headroom for each route/authority. If an authority crosses its warning threshold, prefer replacement, compaction, links to specialist detail, or archival of chronology. If it crosses a hard maximum, compact it as part of the same change rather than waiting for CI to reject the branch.

The durable principle is simple: repository growth is fine; mandatory preload growth must earn its cost.
