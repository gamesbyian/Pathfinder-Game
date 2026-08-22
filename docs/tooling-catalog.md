# Tooling catalog

Task-oriented entry points for existing developer, solver, corpus, hint, family, and research tools. Check here before adding a script/workflow. `package.json` is the full npm-alias list; [`../scripts/README.md`](../scripts/README.md) and [`.github/workflows/README.md`](../.github/workflows/README.md) map local/remote tooling.

## Smallest tool that answers the question

| Question | Preferred entry point |
|---|---|
| Repository checks | `npm run ci:fast` by default; full `npm run ci` for solver-core changes/final completeness claims; [`testing.md`](testing.md) |
| Browser flows | focused `test:e2e:*`; `npm run ci:full` for release confidence |
| Production solver on named levels | `npm run solver:direct -- --levels=...` |
| Published solved-set regression | `npm run solver:bench -- --check` |
| Solver cost/performance | `npm run solver:speed-probe` |
| General stress benchmark | `npm run stress:benchmark` |
| One stress failure | `npm run stress:solve-one` |
| Shrink a diagnostic level | `npm run stress:reduce-level` |
| Lifecycle/budget diagnosis | `npm run stress:lifecycle-failure-map` |
| Known-solution comparison | `npm run stress:solution-profile-compare` |
| Isolated technique × level census | `technique-census.yml`; expensive, check existing census first |
| Second-order technique-census analysis | `node scripts/technique-census-second-order.mjs [run-directory] [--production-run=<dir>] [--frozen-production-run=<dir>]`; rebuilds phenotype, multiplicity, router-bound, conditional-value, and cover outputs from committed cells |
| One technique over a population | `scripts/method-probe.mjs` / `method-probe-sweep.yml` |
| Validate/promote an archetype-gated `ATTEMPT_POLICY` routing change | `solver-archetype-sample-ab.yml` (preferred over a full-population `solver-stress-refresh.yml` sweep — same evidence via a deterministic stratified sample, a fraction of the wall time; [`../.github/workflows/README.md`](../.github/workflows/README.md)) |
| One-off level-blind check over a specific id list | `solver-level-blind-targeted-sweep.yml` (dynamically sharded, artifact-only) |
| Full-population level-blind capability baseline | `solver-stress-refresh.yml`; [`../.github/workflows/solver-stress-refresh.md`](../.github/workflows/solver-stress-refresh.md) |
| Hint generation/diversification | `npm run hints:workbench`; [`hint-workbench.md`](hint-workbench.md) |
| Hint/provenance evidence for one level | `npx tsx scripts/hint-query.mjs --id=<ID> [--levels=<corpus>]`; compact by default, exact paths/provenance only with `--full` |
| Family/variant research | [`variant-level-research.md`](variant-level-research.md); `family:index` then `family:show`, `family:query`, or `family:coverage` |
| Existing variant trove | worktree branch `claude/variant-levels-solver-insights-tpk4qg`; verify with `node scripts/family-trove-doctor.mjs --root=<path>`; [`variant-level-research.md`](variant-level-research.md) |
| Prior experiment evidence | `node scripts/research-status-index.mjs --compact --query=<term>` before opening reports; includes title/heading discovery for older top-level reports |
| Machine-readable investigation status | `npm run research:index`; compact/filter with `node scripts/research-status-index.mjs --compact [--query=...] [--status=...] [--kind=queue|experiment|evidence|legacy-evidence]` |
| Corpus shape / matching levels | `node scripts/corpus-query.mjs --corpus=stress2`; filters/list/sample are compact by default; `--full` emits exact matched level payloads |
| Raw-artifact meaning | `node scripts/artifact-query.mjs [--query=...] [--role=...]`; source metadata: [`../logs/artifact-metadata.json`](../logs/artifact-metadata.json) |

## Command families

| Area | Main commands / references |
|---|---|
| Validation | `check`, `ci`, `ci:fast`, `ci:full`, `test:unit`, `test:unit:fast`, `test:coverage`, `test:node`, `test:node:fast`, `test:e2e*`, `test:visual`, `check:documentation-links`, `check:types*`, `check:lint`; [`testing.md`](testing.md) |
| Solver | `solver:direct`, `solver:bench`, `solver:speed-probe`, `solver:fingerprint*`, `solver:req-length-sweep`, `solver:trap-audit`, `solver:winning-attempts`, `solver:experiment-preflight`; [`solver-architecture.md`](solver-architecture.md) |
| Ablation | `ablation:*`; [`solver-ablation.md`](solver-ablation.md), [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) |
| Stress | `stress:generate*`, `stress:validate-witnesses`, `stress:benchmark*`, `stress:regression`, `stress:solve-one`, `stress:reduce-level`, `stress:rank-levels`, `stress:failure-inbox`, `stress:lifecycle-failure-map`, `stress:solution-profile*`, `stress:provenance-coverage`; compact corpus discovery: `scripts/corpus-query.mjs`; [`../data/stress/README.md`](../data/stress/README.md) |
| Families | `family:generate`, `family:index`, `family:show`, `family:query`, `family:coverage`, `family:analyze`, `family:boundary-report`, `family:parent-hint-replay`, `stress:family-pair-divergence`, `solver:winning-attempts`; `--trove-root` for index/wide parent replay; `family:trove:doctor`; [`variant-level-research.md`](variant-level-research.md) |
| Hints | `hints:workbench`, `hints:workbench-parallel`, `hints:expansion-audit`, `hints:discover-candidates`, `hints:expand`, `hints:diversify`, `hints:calibrate-weights`, `hints:complete-sharded`; compact inspection: `npx tsx scripts/hint-query.mjs`; [`hint-workbench.md`](hint-workbench.md) |
| Level/data | `levels:import-published`, `levels:generate-heatmaps`, `levels:heatmap-report`, `levels:ratings-report`, `check:hint-validity`, `check:level-provenance`, `check:corpus-level-formatting`, `facts:levels` / `check:current-level-facts`; compact corpus query: `scripts/corpus-query.mjs` |
| Remote research | [`.github/workflows/README.md`](../.github/workflows/README.md) |
| Research status | `research:index`; compact mode includes structured current evidence plus non-authoritative discovery metadata for older loose reports |
| Artifact provenance | `scripts/artifact-query.mjs`; compact view over tracked exception metadata |

Historical portfolio tools (`solver:portfolio-report`, `solver:portfolio-replay`) and pilots remain available; code presence does not imply an active hypothesis. Check reports before rerunning them.

## Rules

- Use the smallest population/tool that decides the next gate.
- For an archetype-gated `ATTEMPT_POLICY` change, default to `solver-archetype-sample-ab.yml` over a full-corpus `solver-stress-refresh.yml` sweep; reach for full-population coverage only when the change's blast radius isn't cleanly archetype-bounded or the decision needs complete coverage.
- Tune `shard_count`/`max_parallel` on GHA sweeps (`solver-stress-refresh.yml`, `method-probe-sweep.yml`, `solver-archetype-sample-ab.yml`) before dispatching, especially alongside other in-flight runs — `max_parallel`, not `shard_count` alone, is what actually bounds wall time.
- Prefer compact query/summary views over opening large reports, logs, corpora, or hint files wholesale.
- Preserve [`solver-level-blindness.md`](solver-level-blindness.md) for capability research.
- Check queue/report status before expensive workflows or repeated flag experiments.
- Batch tools persist progress incrementally.
- Use shared explicit level selectors (`pos:` / `id:`) where required.
- Treat parent families, not siblings, as independent evaluation units.
- Check the existing trove before generating another large family set.
- Use current `main` code/instructions with the off-main trove; do not run historical branch code merely because data lives there.
- Stored valid hints are broader than cold-solver evidence; use shared provenance classification.

[`command-glossary.md`](command-glossary.md) maps runtime flow names to code; it is not a CLI catalog.
