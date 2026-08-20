# Tooling catalog

This is the task-oriented index for Pathfinder's existing developer, solver, corpus, hint, family, and research tooling. Use it before creating a new script or GitHub Actions workflow.

`package.json` is the exhaustive source for npm aliases. [`../scripts/README.md`](../scripts/README.md) maps the script tree, and [`.github/workflows/README.md`](../.github/workflows/README.md) maps remote/sharded jobs. Individual topic docs remain authoritative for exact flags and interpretation.

## Pick the smallest tool that answers the question

| Question | Preferred entry point | Notes |
|---|---|---|
| Does the normal project pass its required checks? | `npm run ci` | Static checks, coverage/unit suites, node validators. See [`testing.md`](testing.md). |
| Do browser flows still work? | `npm run test:e2e` or a focused `test:e2e:*` alias | Use `ci:full` for full release confidence. |
| Can the production solver solve these specific levels? | `npm run solver:direct -- --levels=...` | Targeted local solving; explicit `pos:`/`id:` selectors are required for bare numbers/ranges. |
| Did a solver change regress the published solved set? | `npm run solver:bench -- --check` | Solved/failed regression safety only; it does not answer cost/performance. |
| Did a solver change get faster/slower? | `npm run solver:speed-probe` | Use the deterministic/work-budget guidance in [`solver-budget-determinism.md`](solver-budget-determinism.md). |
| What happens on the stress corpus? | `npm run stress:benchmark` | General benchmark entry point. For expensive full refreshes use the Actions workflow below. |
| Can I reproduce one stress-level failure cheaply? | `npm run stress:solve-one` | Prefer this before a population sweep. |
| Can I shrink a hard level while preserving the phenomenon? | `npm run stress:reduce-level` | Diagnostic reducer, not a solver that changes the original level into a solution. |
| Which solver lifecycle stage consumed/starved budget? | `npm run stress:lifecycle-failure-map` | Lifecycle/budget diagnosis. |
| Which existing solutions resemble this level's solution behavior? | `npm run stress:solution-profile-compare` | Uses known-solution fingerprints for analysis only. |
| Which single technique/config wins on which levels at full isolated budget? | `technique-census.yml` | Expensive sharded population experiment. See the current census report before dispatching again. |
| Can one named technique/list solve a level set directly? | `scripts/method-probe.mjs` / `method-probe-sweep.yml` | Lower-dimensional probe than technique census. |
| Do existing hints need generation/diversification work? | `npm run hints:workbench` | Unified hint workbench; see [`hint-workbench.md`](hint-workbench.md). |
| What do controlled sibling/cousin variants show? | `npm run family:generate`, `family:analyze`, `family:boundary-report` | See [`sibling-cousin-system.md`](sibling-cousin-system.md). |
| Was this idea already tested? | [`../reports/README.md`](../reports/README.md) + current queue/ledger | Search evidence before writing code. |

## General development and validation

Core commands:

- `npm run dev` / `build` / `preview`: Vite development and production build.
- `npm run check`: static repository checks.
- `npm run ci`: normal pre-merge gate.
- `npm run ci:full`: `ci` plus browser e2e.
- `npm run test:unit`, `test:coverage`, `test:node`: focused test tiers.
- `npm run test:e2e`, `test:e2e:smoke`, `test:e2e:a11y`, `test:e2e:editor`, `test:e2e:security`, `test:e2e:theme`: browser subsets.
- `npm run test:visual`: opt-in visual-regression comparison.
- `npm run check:documentation-links`: validates Markdown file targets and heading anchors.
- `npm run check:types` / `check:types:tests`: strict TypeScript checks.
- `npm run check:lint`: ESLint, including architectural invariants.

The complete validation taxonomy and what each check protects is in [`testing.md`](testing.md).

## Solver execution and comparison

These are the main local entry points. The detailed selection table, exact option syntax, output shapes, and budget semantics live in [`solver-architecture.md`](solver-architecture.md).

- `solver:direct`: targeted production-solver execution.
- `solver:bench`: published-corpus benchmark and solved-set regression check.
- `solver:speed-probe`: speed/cost comparison instrument.
- `solver:fingerprint` / `solver:fingerprint:compare`: determinism fingerprints.
- `solver:req-length-sweep`: hold a level fixed while varying exact required length.
- `solver:trap-audit`: trap-search audit.
- `solver:winning-attempts`: analyze winning attempt/config families.
- `solver:portfolio-report` / `solver:portfolio-replay`: portfolio-scheduler research/reporting.
- `solver:experiment-preflight`: experiment preflight validation.

Before using a historical winning config, saved hint, or level identity as an input to a capability claim, read [`solver-level-blindness.md`](solver-level-blindness.md). Exact-level history is research evidence, not production cold-solver policy.

## Ablation laboratory

`ablation:run` and the aliases `ablation:baseline`, `ablation:single`, `ablation:profiles`, `ablation:templates`, `ablation:order`, `ablation:pairs`, `ablation:full`, plus `ablation:analyze`, operate the solver's feature-flag experiment lab.

Read [`ablation.md`](ablation.md) and [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) before adding a new flag or repeating an old experiment. A retained default-off flag is not proof that its promotion question remains open.

## Stress-corpus tooling

The two principal stress corpora and their provenance/overfit caveats are documented in [`../data/stress/README.md`](../data/stress/README.md).

Generation and validation:

- `stress:generate`, `stress:generate-random`
- `stress:validate-witnesses`
- `stress:compare`
- `stress:smoke`

Benchmark/regression lifecycle:

- `stress:benchmark`, `stress:benchmark:raced`
- `stress:regression`
- `stress:compile-baseline`, `stress:diff-baseline`
- `stress:missing-levels`
- `stress:classify-stability`
- `stress:lifecycle-failure-map`
- `stress:curate-dev-benchmark`
- `stress:tune-parallelism`

Single-level/diagnostic analysis:

- `stress:solve-one`
- `stress:reduce-level`
- `stress:rank-levels`
- `stress:failure-inbox`
- `stress:witness-divergence`
- `stress:family-pair-divergence`
- `stress:solution-profile`, `stress:solution-profile-compare`
- `stress:repair-winner-classifier`
- `stress:provenance-coverage`

There are additional narrowly scoped probes in `scripts/stress/`. Do not infer their purpose solely from filenames; search the current solver docs/reports for the script name before reusing or replacing one.

## Hint tooling

- `hints:workbench`: unified generation/diversification workflow.
- `hints:workbench-parallel`: parallel workbench execution.
- `hints:expansion-audit`: expansion audit.
- `hints:discover-candidates`: candidate discovery.
- `hints:expand`: corpus expansion.
- `hints:diversify`: diversify known hints.
- `hints:calibrate-weights`: hint-selection weight calibration.
- `hints:complete-sharded`: sharded complete-enumeration workflow.

Use [`hint-workbench.md`](hint-workbench.md), [`hint-curation.md`](hint-curation.md), and the provenance rules in [`../DEVELOPER_REFERENCE.md`](../DEVELOPER_REFERENCE.md#hint-provenance). Stored valid hints include multiple provenance classes and are not automatically cold-capability evidence.

## Level and data tooling

- `levels:import-published`: import/merge published Firestore submissions and hints.
- `levels:generate-heatmaps`: regenerate hint heatmaps.
- `levels:heatmap-report`, `levels:ratings-report`: analysis/reporting.
- `check:hint-validity`, `check:level-provenance`, `check:corpus-level-formatting`: data invariants.

Writers of the three local corpora must preserve the repository's one-level-per-line serialization convention and persistent ID/provenance rules.

## Family and variant tooling

- `family:generate`: generate controlled family variants.
- `family:analyze`: analyze family results.
- `family:boundary-report`: boundary synthesis.
- `family:parent-hint-replay`: replay parent hints against relatives where appropriate.

See [`sibling-cousin-system.md`](sibling-cousin-system.md), [`variant-corpus-solver-research-plan.md`](variant-corpus-solver-research-plan.md), and `reports/families/` before proposing new variant generators or family analytics.

## Research pilots already present

Several focused solver-research pilots have dedicated aliases. Their existence is a strong reason to search the corresponding docs/reports before implementing a fresh instrument:

- `solver:winning-lineage-pilot`
- `solver:winning-prefix-atlas-pilot`
- `solver:producer-population-pilot`
- `solver:residual-interface-pilot`
- `solver:repair-rollback-pilot`
- `solver:symmetry-repair-seed-pilot`

These are research instruments, not production solver stages. Their conclusions may be positive, negative, inconclusive, superseded, or merely observational. Check the current queue and dated report chain before treating the code's presence as an endorsement.

## GitHub Actions research workflows

Use Actions for population-scale, sharded, or otherwise expensive jobs. The workflow directory has its own [`README.md`](../.github/workflows/README.md). The main research entry points include:

- `solver-stress-refresh.yml`: full current stress refresh.
- `solver-typical-budget-baseline.yml`: deterministic/typical-budget capability baseline and matched experiment support.
- `technique-census.yml`: isolated technique-by-level capability matrix.
- `method-probe-sweep.yml`: sharded named-method probing.
- `solver-highbudget-unsolved-sweep.yml`: high-budget sweep over unresolved levels; use only when the research question genuinely concerns more compute.
- `family-wide-trove.yml`: large family/variant sweep.
- `atlas-sweep.yml`: atlas-style research sweep.
- `cpsat-explicit-prefix-oracle.yml` and the CP-SAT hint-harvest workflows: external-oracle research.
- `mitm-frontier-sweep.yml`: meet-in-the-middle/frontier research.
- focused solver A/B workflows for repair fallback/probe and elite-prefix validation.

Do not dispatch a workflow merely because it is available. First confirm that the current queue/report has not already closed the question and that a cheaper local/sample tool cannot decide the next gate.

## Reports, logs, and outputs

- `reports/`: human-readable analyses, generated summaries, and investigation evidence. Start at [`../reports/README.md`](../reports/README.md).
- `logs/`: raw per-run/audit material and baselines. Treat raw logs as evidence inputs, not synthesized conclusions.
- `reports/stress/`: many stress-analysis artifacts, some of which are live inputs to other tools. Do not assume everything under `reports/` is archival.

Human-authored investigations should expose a clear current status, decision, and remaining gate using [`investigation-report-conventions.md`](investigation-report-conventions.md).

## Naming trap: command glossary

[`command-glossary.md`](command-glossary.md) maps engine/editor/review/solver lifecycle *flow names* to implementation locations. It is useful for code navigation, but it is not the catalog of command-line tools. Use this document for CLI/research discovery.
