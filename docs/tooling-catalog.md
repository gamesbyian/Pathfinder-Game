# Tooling catalog

Task-oriented entry points for existing developer, solver, corpus, hint, family, and research tools. Check here before adding a script/workflow. `package.json` is the full npm-alias list; [`../scripts/README.md`](../scripts/README.md) and [`.github/workflows/README.md`](../.github/workflows/README.md) map local/remote tooling. For the executable-looking files that are *not* already surfaced through those front doors, run `node scripts/tooling-census.mjs --orphans` before inventing new machinery.

## Smallest tool that answers the question

| Question | Preferred entry point |
|---|---|
| Repository checks | `npm run ci:fast` by default; full `npm run ci` for solver-core changes/final completeness claims; [`testing.md`](testing.md) |
| Browser flows | focused `test:e2e:*`; `npm run ci:full` for release confidence |
| Existing-but-unindexed local tooling | `node scripts/tooling-census.mjs --orphans`; observational discovery only, then inspect lifecycle/current evidence before reuse |
| Production solver on named levels | `npm run solver:direct -- --levels=...` |
| Published solved-set regression | `npm run solver:bench -- --check` |
| Solver cost/performance | `npm run solver:speed-probe` |
| General stress benchmark | `npm run stress:benchmark` |
| Tune across-level worker count for the current machine/runner | `npm run stress:tune-parallelism`; empirical environment-local measurement, not a permanent default |
| One stress failure | `npm run stress:solve-one` |
| Shrink a diagnostic level | `npm run stress:reduce-level` |
| Lifecycle/budget diagnosis | `npm run stress:lifecycle-failure-map` |
| Known-solution comparison | `npm run stress:solution-profile-compare` |
| Preflight a matched solver experiment | `npm run solver:experiment-preflight`; validates corpus/level selection, solver flags, workflow inputs, work envelope, clean ref, and treatment/control comparability before expensive execution |
| Isolated technique × level census | `technique-census.yml`; expensive, check existing census first |
| Second-order technique-census analysis | `node scripts/technique-census-second-order.mjs [run-directory] [--production-run=<dir>] [--frozen-production-run=<dir>] [--check]`; rebuilds phenotype, multiplicity, router-bound, conditional-value, cover, substitutability, censored solve-hazard, and complete per-technique cap-retention/tranche-economics JSON plus a compact Markdown summary from committed cells. `--check` verifies that both committed generated outputs are current without rewriting them. Scheduler-facing budget-depth interpretation: [`../reports/2026-08-23-technique-budget-cap-efficiency.md`](../reports/2026-08-23-technique-budget-cap-efficiency.md). |
| Winning-lineage mechanic associations / mis-ranking cohorts | `node scripts/analyze-lineage-mechanics.mjs --lineage=<json> --levels=<json> --out=<json>`; offline observational association only, useful for nominating bounded follow-ups rather than production routing rules |
| Operational similarity of solver techniques/configs | Read [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md), then reuse/extend the existing technique-census, `method-probe`, lineage, beam-research, and debug telemetry surfaces. Start with bounded inversion/discordance cohorts rather than another full census. Measure local ranking, branch/frontier retention, and first-divergence behavior; outcome-vector Jaccard alone is not operational similarity. |
| Evidence-driven scheduling/allocation | **ASAP:** read [`solver-scheduling-policy.md`](solver-scheduling-policy.md), [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md), and the current census budget report [`../reports/2026-08-23-technique-budget-cap-efficiency.md`](../reports/2026-08-23-technique-budget-cap-efficiency.md); extend the second-order census/lifecycle/family analysis substrate before creating new storage, then validate with matched-work/shadow or level-blind A/B tooling |
| Architectural solver speed | **ASAP:** [`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md), `npm run solver:speed-probe`, deterministic pinned-work comparisons |
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
| Tool discovery | `scripts/tooling-census.mjs`; current front-door catalog plus observational orphan detection for periodic lifecycle review |
| Solver | `solver:direct`, `solver:bench`, `solver:speed-probe`, `solver:fingerprint*`, `solver:req-length-sweep`, `solver:trap-audit`, `solver:winning-attempts`, `solver:experiment-preflight`; [`solver-architecture.md`](solver-architecture.md), operational taxonomy: [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md), scheduling program: [`solver-scheduling-policy.md`](solver-scheduling-policy.md), speed program: [`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md) |
| Ablation | `ablation:*`; [`solver-ablation.md`](solver-ablation.md), [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) |
| Stress | `stress:generate*`, `stress:validate-witnesses`, `stress:benchmark*`, `stress:regression`, `stress:solve-one`, `stress:reduce-level`, `stress:rank-levels`, `stress:failure-inbox`, `stress:lifecycle-failure-map`, `stress:solution-profile*`, `stress:provenance-coverage`, `stress:tune-parallelism`; compact corpus discovery: `scripts/corpus-query.mjs`; [`../data/stress/README.md`](../data/stress/README.md) |
| Families | `family:generate`, `family:index`, `family:show`, `family:query`, `family:coverage`, `family:analyze`, `family:boundary-report`, `family:parent-hint-replay`, `stress:family-pair-divergence`, `solver:winning-attempts`; `--trove-root` for index/wide parent replay; `family:trove:doctor`; [`variant-level-research.md`](variant-level-research.md) |
| Hints | `hints:workbench`, `hints:workbench-parallel`, `hints:expansion-audit`, `hints:discover-candidates`, `hints:expand`, `hints:diversify`, `hints:calibrate-weights`, `hints:complete-sharded`; compact inspection: `npx tsx scripts/hint-query.mjs`; [`hint-workbench.md`](hint-workbench.md) |
| Level/data | `levels:import-published`, `levels:generate-heatmaps`, `levels:heatmap-report`, `levels:ratings-report`, `check:hint-validity`, `check:level-provenance`, `check:corpus-level-formatting`, `facts:levels` / `check:current-level-facts`; compact corpus query: `scripts/corpus-query.mjs` |
| Remote research | [`.github/workflows/README.md`](../.github/workflows/README.md) |
| Research status | `research:index`; compact mode includes structured current evidence plus non-authoritative discovery metadata for older loose reports |
| Artifact provenance | `scripts/artifact-query.mjs`; compact view over tracked exception metadata |

Historical portfolio tools (`solver:portfolio-report`, `solver:portfolio-replay`) and pilots remain available; code presence does not imply an active hypothesis. The old broad cold-start portfolio experiment is closed; reuse plumbing only if it serves the new scheduling design and current baselines. Completed migrations and narrow forensic audits may also remain as direct scripts without npm aliases; find them through `scripts/tooling-census.mjs`, then inspect their headers and dated evidence before reuse rather than promoting every executable into this task-oriented catalog.

## Rules

- Use the smallest population/tool that decides the next gate.
- Run `node scripts/tooling-census.mjs --orphans` before adding a new local tool when the concept might already exist under an old or specialist name. An orphan is a review candidate, not deletion evidence.
- For scheduler work, begin with the existing census second-order outputs, [`../reports/2026-08-23-technique-budget-cap-efficiency.md`](../reports/2026-08-23-technique-budget-cap-efficiency.md), [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md), lifecycle telemetry, current capability baselines, family index, solution-profile tools, lineage mechanics when relevant, and research-status index. Add a new analyzer only when these cannot express the required rebuildable view; do not create a second canonical evidence store.
- The per-technique cap-retention/tranche extension is **implemented** in `scripts/technique-census-second-order.mjs` at `100K/250K/500K/1M/2M/5M/10M/20M/30M/40M/50M`. Do not rebuild it as a separate tool. The next census-adjacent evidence tasks are the current-production `workSpent`/reach join and the bounded operational-similarity analysis defined in [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md).
- When comparing named techniques, identify the operational layer first: algorithm/search family, scoring weights, template geometry, frontier retention/dedup, pruning, retry context, or budget depth. Different names are not evidence of independent search behavior.
- Scheduler experiments must declare the shared total-work envelope. Prefer `strictTotalWorkBudget` when additive tail tiers would make treatment/control incomparable; see [`solver-budget-determinism.md`](solver-budget-determinism.md). Use `solver:experiment-preflight` before expensive matched runs when its manifest contract applies.
- For an archetype-gated `ATTEMPT_POLICY` change, default to `solver-archetype-sample-ab.yml` over a full-corpus `solver-stress-refresh.yml` sweep; reach for full-population coverage only when the change's blast radius isn't cleanly archetype-bounded or the decision needs complete coverage.
- Tune `shard_count`/`max_parallel` on GHA sweeps (`solver-stress-refresh.yml`, `method-probe-sweep.yml`, `solver-archetype-sample-ab.yml`) before dispatching, especially alongside other in-flight runs — `max_parallel`, not `shard_count` alone, is what actually bounds wall time. Use `stress:tune-parallelism` when the unknown is local/across-level worker count rather than GHA shard concurrency.
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
