<!-- agent-context-budget: warn=8500 max=11000 -->
# Scripts and local tooling

> **Historical path note:** `scripts/stress/` is the historical directory name for the current solver-research toolset. Maintained contents are current tools; the directory is not being renamed merely to modernize provenance.

For a named concept, use compact/queryable front doors before `package.json` or directory listings. [`../docs/tooling-catalog.md`](../docs/tooling-catalog.md) is the broader tool-choice reference; `package.json` is the npm-alias list, not the executable-file inventory.

## Cheap discovery first

- solver priority/state: [`../docs/solver-optimization-workstreams.md`](../docs/solver-optimization-workstreams.md);
- research status: `node scripts/research-status-index.mjs --compact [--query=...] [--status=...] [--kind=...]`;
- research composition: `research:dossier -- --question-id=<id>` is the read-only question join; `research:relations -- --list [--discover]` exposes lower-level premise/evidence/block relations;
- research lineage/integrity: `research:record-consumption -- ...` records evidence-use sidecars (`--selection-artifact` supported); `research:integration-audit` checks cross-system references without changing state;
- question/queue consistency: `npm run research:question-authority-audit`; hard-fails broken structured references/gate shape and emits conservative review warnings without auto-reopening research;
- repeated-state/signature falsifiers should reuse `scripts/signature-collision-analysis-lib.mjs` for mixed-label and independent-unit accounting instead of reimplementing grouping logic;
- solver evidence assets/joins: `node scripts/research-asset-query.mjs --query=<term>`; add `--id=<asset-id>` or `--full` only when needed;
- agent-context size: `node scripts/agent-context-budget.mjs [--route=<id>]`; `--check` fails missing/over-max required routes;
- completed naming-cleanup status/history: `npm run naming:status -- --batch=<id>` (phase/json options are also available); do not reopen the frozen plan;
- corpora: `node scripts/corpus-query.mjs --corpus=stress2`; filters/list/sample stay compact, `--full` emits exact levels;
- hint/provenance: `npx tsx scripts/hint-query.mjs --id=<ID> [--levels=<corpus>]`; use `--full` only for exact paths/provenance;
- controlled human/editor contrast pilot: `node scripts/human-parent-contrast-pilot.mjs --question=<id> --evidence-role=<development|confirmation|transfer> --parent=<id> --mode=<family-mode>`; see [`../docs/human-parent-contrast-research.md`](../docs/human-parent-contrast-research.md);
- full-level research generation: `npm run research:generate-levels -- --list`; source/suite/matching/origin-audit guidance: [`../docs/solver-research-generation.md`](../docs/solver-research-generation.md);
- tracked raw artifacts: `node scripts/artifact-query.mjs [--query=...] [--role=...]`;
- completed GHA runs: `npm run gha:fetch-result -- --run=<run-id>` or `--workflow=<name>`; enumerate shards only when standard retrieval is incomplete;
- tool lookup: `node scripts/tooling-census.mjs --compact --query=<term>`;
- lifecycle/orphan review: `node scripts/tooling-census.mjs --orphans`.

These are discovery views, not replacement authorities. Open raw reports/data/logs or specialist docs only when relevant.

## Solver research specialists

For a matched deterministic DFS/admissible causal comparison, use the bounded paired decision trace rather than full-tree dumps:

```text
node scripts/run-bundled.mjs scripts/paired-deterministic-trace.mjs -- \
  --corpus=data/stress/stress-levels-random.json --level=<ID> \
  --left=<attempt-config-key> --right=<attempt-config-key> \
  --node-budget=200000 --trace-limit=4096 --out=/tmp/paired-trace.json
```

It runs fresh matched arms and reports retained multi-child decision-prefix agreement, first candidate/order/traversal divergence, and bounded post-divergence overlap. It rejects beam/repair; use their frontier/retention and restart-native instrumentation. No observed divergence does not prove every one-child/prune state matched. See [`../docs/solver-technique-operational-taxonomy.md`](../docs/solver-technique-operational-taxonomy.md).


For beam rank/retention questions, `method-probe.mjs` can preserve the existing bounded beam frontier trace and, with `--beam-decision-limit=<N>`, also reduce cull events into the shared production-inert decision-observation contract. This records actual ranked pools and retained/cut candidates without changing solver policy.

For population construction from the real solver search distribution, use the reusable production-frontier sampler rather than inventing heuristic pseudo-states:

```text
npm run solver:sample-production-frontiers -- --levels=R01600,R03147 --depth-fraction=0.1 --picks=25 --seed=<frozen-seed> --question=<question-id> --cases-out=/tmp/cases.json --population-out=/tmp/population.json
```

It freezes multi-pick candidates before downstream labels, records frontier ancestry, and declares the parent level as the independence unit. Multiple rows from one parent improve sparse-phenomenon detection but do not become independent confirmation.

For the current D1 production-inert gate, use the two-phase decision observer rather than the frontier sampler. Capture first, with no exact oracle available to search:

```text
npm run solver:capture-d1-decisions -- --levels=R03147 --list-configured-beams

# choose one returned current-policy beam tuple, then capture it
npm run solver:capture-d1-decisions -- --levels=R03147 --evidence-role=development --profile=<profile> --width=<width> --mechanic-bucket-retention=<true|false> --cutoff-radius=2 --pause-after-phases=<N> --out=/tmp/d1-capture.json
```

Then annotate that frozen artifact offline:

```text
npm run solver:annotate-d1-decisions -- --input=/tmp/d1-capture.json --time-limit=45 --max-eligible-decisions=3 --out=/tmp/d1-annotated.json
```

The decision cap is a canary convenience only. This first implementation is intentionally development-only: it verifies that the isolated beam tuple exists in the current production attempt policy, but it does not reproduce full orchestration reach/allocation and therefore cannot establish independent production prevalence. Exact-query wall time is information-production cost, not solver `workSpent`.

Two offline measurement reducers are also available when a live ambiguity earns them:

```text
npm run solver:analyze-work-ladder -- --inputs=/tmp/b10.json,/tmp/b20.json,/tmp/b40.json --work-budgets=10,20,40 --out=/tmp/work-response.json
npm run solver:analyze-response-covariance -- --input=/tmp/experiment-responses.json --out=/tmp/response-covariance.json
```

The work-ladder reducer implements bounded MO-004 response analysis; it does not authorize standing full-corpus sweeps. The covariance reducer consumes experiments shaped as `{id, ancestryKey, rows:[{id,outcome}]}` with outcomes `gain|loss|unchanged`; shared ancestry is explicitly ineligible as independent support.

## Directory map

- `stress/`: corpus generation, benchmarks, diagnostics, reducers, profiles, provenance, oracle/research tools.
- `solver-parallel/`: parallel solver infrastructure.
- `solver-oracle/`: independent oracle/fuzz support.
- top-level `hint-*`: hint discovery/enumeration/provenance.
- top-level `family-*`: variant/family generation and analysis; `human-parent-contrast-pilot.mjs` is the question-first human/editor research wrapper over that machinery.
- `check-*`: repository/data/documentation invariants.
- `current-level-facts.mjs`: current level/count/maxima snapshot; `--check` guards the generated reference block and `--write` refreshes it.
- `*-unit-tests.mjs`: Vitest-owned suites.
- `*-node-test.mjs`: standalone Node/CLI harnesses normally surfaced through `npm run test:node` aliases.

## Before adding a script

1. Query `node scripts/tooling-census.mjs --compact --query=<concept>`; use the tooling catalog if the family is unclear.
2. Run `node scripts/tooling-census.mjs --orphans` so an unindexed specialist is not rebuilt under a new name.
3. For solver research, query existing assets and research status before generating evidence.
4. Check [`.github/workflows/`](../.github/workflows/README.md) for remote/sharded machinery.
5. Extend shared loaders/parsers/workers/report shapes when they already model the operation.
6. For telemetry/provenance/persistence/state/worker crossings, use [`../docs/change-recipes.md`](../docs/change-recipes.md).

Research-code presence does not imply an active hypothesis. Reconcile with [`../docs/solver-optimization-workstreams.md`](../docs/solver-optimization-workstreams.md) and dated evidence.

## Common rules

- Use the cheapest sufficient population/tool and persist long-run progress incrementally.
- Use shared explicit level selectors where required.
- Preserve level-blindness for cold capability experiments.
- Respect provenance classes when mining stored hints.
- Prefer compact query/summary views before large files.
- For controlled human/editor descendants, treat whole parent families as the independence unit and keep production solver outcomes out of generation acceptance.

Solver CLI semantics: [`../docs/solver-architecture.md`](../docs/solver-architecture.md). Validation: [`../docs/testing.md`](../docs/testing.md).