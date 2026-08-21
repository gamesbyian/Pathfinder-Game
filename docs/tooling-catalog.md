# Tooling catalog

Task-oriented index for existing developer, solver, corpus, hint, family, and research machinery. Use
this before creating another script or Actions workflow. `package.json` is exhaustive for npm aliases;
[`../scripts/README.md`](../scripts/README.md) maps scripts and
[`.github/workflows/README.md`](../.github/workflows/README.md) maps remote jobs.

## Pick the smallest tool that answers the question

| Question | Preferred entry point |
|---|---|
| Normal repository checks | `npm run ci` |
| Browser flows | focused `test:e2e:*`, or `npm run ci:full` for release confidence |
| Production solver on named levels | `npm run solver:direct -- --levels=...` |
| Published solved-set regression | `npm run solver:bench -- --check` |
| Solver cost/performance | `npm run solver:speed-probe` |
| General stress benchmark | `npm run stress:benchmark` |
| One stress failure | `npm run stress:solve-one` |
| Shrink a diagnostic level | `npm run stress:reduce-level` |
| Lifecycle/budget diagnosis | `npm run stress:lifecycle-failure-map` |
| Known-solution comparison | `npm run stress:solution-profile-compare` |
| Isolated technique-by-level capability | `technique-census.yml` (expensive; check existing census first) |
| One named technique over a population | `scripts/method-probe.mjs` / `method-probe-sweep.yml` |
| Hint generation/diversification | `npm run hints:workbench` |
| Controlled family/variant research | [`variant-level-research.md`](variant-level-research.md) plus `family:*` tools |
| Use the existing ~2.5 GB generated variant trove | research branch `claude/variant-levels-solver-insights-tpk4qg`; see [`variant-level-research.md`](variant-level-research.md) |
| Was an idea already tested? | [`../reports/README.md`](../reports/README.md) + current queue/ledger |

## General validation

- `dev`, `build`, `preview`: Vite lifecycle.
- `check`, `ci`, `ci:full`: repository gates.
- `test:unit`, `test:coverage`, `test:node`: test tiers.
- `test:e2e` and focused `test:e2e:*`: browser suites.
- `test:visual`: opt-in visual comparison.
- `check:documentation-links`: links, anchors, indexes, workflow discovery, agent routers, and report metadata.
- `check:types`, `check:types:tests`, `check:lint`: type/architecture checks.

See [`testing.md`](testing.md) for finish-line requirements.

## Solver execution and comparison

- `solver:direct`: targeted production solver.
- `solver:bench`: published solved-set regression.
- `solver:speed-probe`: deterministic cost comparison.
- `solver:fingerprint` / `solver:fingerprint:compare`: determinism fingerprints.
- `solver:req-length-sweep`: exact-required-length sweep.
- `solver:trap-audit`: trap-search audit.
- `solver:winning-attempts`: winning technique/config analysis, including family grouping.
- `solver:portfolio-report` / `solver:portfolio-replay`: historical portfolio research.
- `solver:experiment-preflight`: experiment preflight.

Read [`solver-level-blindness.md`](solver-level-blindness.md) before using historical winners, hints,
or exact IDs in capability research.

## Ablation laboratory

`ablation:run`, `ablation:baseline`, `ablation:single`, `ablation:profiles`, `ablation:templates`,
`ablation:order`, `ablation:pairs`, `ablation:full`, and `ablation:analyze` operate the feature-flag
lab. Read [`ablation.md`](ablation.md) and [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md)
before adding or repeating a flag experiment.

## Stress-corpus tooling

Current corpus contract: [`../data/stress/README.md`](../data/stress/README.md).

Generation/validation: `stress:generate`, `stress:generate-random`, `stress:validate-witnesses`,
`stress:compare`, `stress:smoke`.

Benchmark/regression: `stress:benchmark`, `stress:benchmark:raced`, `stress:regression`,
`stress:compile-baseline`, `stress:diff-baseline`, `stress:missing-levels`,
`stress:classify-stability`, `stress:lifecycle-failure-map`, `stress:curate-dev-benchmark`,
`stress:tune-parallelism`.

Diagnosis: `stress:solve-one`, `stress:reduce-level`, `stress:rank-levels`, `stress:failure-inbox`,
`stress:witness-divergence`, `stress:family-pair-divergence`, `stress:solution-profile`,
`stress:solution-profile-compare`, `stress:repair-winner-classifier`, `stress:provenance-coverage`.

## Family and variant tooling

The canonical resource is [`variant-level-research.md`](variant-level-research.md). The generated
research dataset is intentionally off-main on `claude/variant-levels-solver-insights-tpk4qg` under
`data/families/`, `logs/family-census/`, and `reports/families/`.

- `family:generate`: controlled variants.
- `family:analyze`: mutation-effect/family joins.
- `family:boundary-report`: relational boundary synthesis.
- `family:parent-hint-replay`: validate/replay variant discoveries on parents.
- `stress:family-pair-divergence`: selected parent/variant differential replay.
- `solver:winning-attempts`: family-conditioned winner analysis.
- `family-wide-trove.yml`: population-scale generation/solve/enumeration workflow.

Do not create a second generator, generic family database, or fresh large trove before checking the
research branch. Treat parent families, not sibling rows, as independent evaluation units.

## Hint tooling

`hints:workbench`, `hints:workbench-parallel`, `hints:expansion-audit`, `hints:discover-candidates`,
`hints:expand`, `hints:diversify`, `hints:calibrate-weights`, `hints:complete-sharded`.
See [`hint-workbench.md`](hint-workbench.md), [`hint-curation.md`](hint-curation.md), and provenance in
[`../DEVELOPER_REFERENCE.md`](../DEVELOPER_REFERENCE.md#hint-provenance).

## Level/data tooling

- `levels:import-published`
- `levels:generate-heatmaps`
- `levels:heatmap-report`, `levels:ratings-report`
- `check:hint-validity`, `check:level-provenance`, `check:corpus-level-formatting`

## Research pilots already present

Before building a fresh instrument, search the corresponding reports for:

- `solver:winning-lineage-pilot`
- `solver:winning-prefix-atlas-pilot`
- `solver:producer-population-pilot`
- `solver:residual-interface-pilot`
- `solver:repair-rollback-pilot`
- `solver:symmetry-repair-seed-pilot`

Code presence does not imply a positive or still-active hypothesis.

## GitHub Actions research workflows

Remote index: [`.github/workflows/README.md`](../.github/workflows/README.md). Main population tools:

- `solver-stress-refresh.yml`
- `solver-typical-budget-baseline.yml`
- `technique-census.yml`
- `method-probe-sweep.yml`
- `solver-highbudget-unsolved-sweep.yml`
- `family-wide-trove.yml`
- `atlas-sweep.yml`
- `mitm-frontier-sweep.yml`
- `cpsat-explicit-prefix-oracle.yml` and CP-SAT hint-harvest workflows
- focused repair/elite-prefix A/B workflows

Dispatch only after confirming the current queue/report still has an open gate and that a cheaper
sample/local tool cannot answer it.

## Reports and naming trap

[`../reports/README.md`](../reports/README.md) routes human-readable evidence. `logs/` contains raw run
material. Some `reports/stress/` files are live tooling inputs, not archive-only artifacts.

[`command-glossary.md`](command-glossary.md) maps runtime flow names to code. It is not a CLI catalog.
