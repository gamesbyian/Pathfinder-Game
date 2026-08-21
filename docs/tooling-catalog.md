# Tooling catalog

Task-oriented entry points for existing developer, solver, corpus, hint, family, and research tools. Check this before creating another script or workflow. `package.json` is the exhaustive npm-alias list; [`../scripts/README.md`](../scripts/README.md) and [`.github/workflows/README.md`](../.github/workflows/README.md) map local and remote tooling.

## Pick the smallest tool that answers the question

| Question | Preferred entry point |
|---|---|
| Repository checks | `npm run ci`; [`testing.md`](testing.md) |
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
| One technique over a population | `scripts/method-probe.mjs` / `method-probe-sweep.yml` |
| Hint generation/diversification | `npm run hints:workbench`; [`hint-workbench.md`](hint-workbench.md) |
| Family/variant research | [`variant-level-research.md`](variant-level-research.md) plus `family:*` tools |
| Existing generated variant trove | separate worktree of branch `claude/variant-levels-solver-insights-tpk4qg`; verify with `node scripts/family-trove-doctor.mjs --root=<path>`; see [`variant-level-research.md`](variant-level-research.md) |
| Prior experiment evidence | [`../reports/README.md`](../reports/README.md), current queue, opt-in ledger |

## Command families

| Area | Main commands / references |
|---|---|
| Validation | `check`, `ci`, `ci:full`, `test:unit`, `test:coverage`, `test:node`, `test:e2e*`, `test:visual`, `check:documentation-links`, `check:types*`, `check:lint`; [`testing.md`](testing.md) |
| Solver | `solver:direct`, `solver:bench`, `solver:speed-probe`, `solver:fingerprint*`, `solver:req-length-sweep`, `solver:trap-audit`, `solver:winning-attempts`, `solver:experiment-preflight`; [`solver-architecture.md`](solver-architecture.md) |
| Ablation | `ablation:*`; [`ablation.md`](ablation.md), [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) |
| Stress | `stress:generate*`, `stress:validate-witnesses`, `stress:benchmark*`, `stress:regression`, `stress:solve-one`, `stress:reduce-level`, `stress:rank-levels`, `stress:failure-inbox`, `stress:lifecycle-failure-map`, `stress:solution-profile*`, `stress:provenance-coverage`; [`../data/stress/README.md`](../data/stress/README.md) |
| Families | `family:generate`, `family:analyze`, `family:boundary-report`, `family:parent-hint-replay`, `stress:family-pair-divergence`, `solver:winning-attempts`; safe trove boundary check: `node scripts/family-trove-doctor.mjs`; [`variant-level-research.md`](variant-level-research.md) |
| Hints | `hints:workbench`, `hints:workbench-parallel`, `hints:expansion-audit`, `hints:discover-candidates`, `hints:expand`, `hints:diversify`, `hints:calibrate-weights`, `hints:complete-sharded`; [`hint-workbench.md`](hint-workbench.md) |
| Level/data | `levels:import-published`, `levels:generate-heatmaps`, `levels:heatmap-report`, `levels:ratings-report`, `check:hint-validity`, `check:level-provenance`, `check:corpus-level-formatting` |
| Remote research | [`.github/workflows/README.md`](../.github/workflows/README.md) |

Historical portfolio tools (`solver:portfolio-report`, `solver:portfolio-replay`) and research pilots remain available but code presence does not imply an active hypothesis. Search reports before rerunning them.

## Rules

- Use the smallest population and cheapest tool that can decide the next gate.
- Preserve the [`solver-level-blindness.md`](solver-level-blindness.md) boundary for capability research.
- Check current queue/report status before dispatching expensive workflows or repeating flag experiments.
- Batch tools must persist progress incrementally.
- Use shared explicit level selectors (`pos:` / `id:`) where required.
- Treat parent families, not sibling variants, as independent evaluation units.
- Do not generate another large family trove before checking the existing research branch.
- Keep current `main` as the code/instruction environment when using the off-main trove; do not run historical branch code merely because the data lives there.
- Stored valid hints are broader than cold solver evidence; use shared provenance classification.

[`command-glossary.md`](command-glossary.md) maps runtime flow names to code; it is not a CLI catalog.
