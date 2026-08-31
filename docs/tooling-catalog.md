# Tooling catalog

Task-oriented entry points for existing developer, solver, corpus, hint, family, and research tools. Check here before adding a script/workflow. `package.json` is the full npm-alias list; [`../scripts/README.md`](../scripts/README.md) and [`.github/workflows/README.md`](../.github/workflows/README.md) map local/remote tooling. For executable-looking files that are *not* already surfaced through those front doors, run `node scripts/tooling-census.mjs --orphans` before inventing new machinery.

> **Tool choice is not evidence quality.** A tool may be perfect for discovery and inappropriate for promotion. Before a decision-bearing solver run, state the evidence role, selection procedure, population, independent unit, and work envelope under [`solver-research-operating-model.md`](solver-research-operating-model.md), [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md), and [`investigation-report-conventions.md`](investigation-report-conventions.md).

## Before launching solver research

Use this short preflight before choosing a command:

1. Read [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md). A specialist tool's local “next question” does not override the current execution priority.
2. Classify the question: correctness, routing, allocation, search quality, retention/representation, implementation speed, or generalization.
3. Decide whether the run is **discovery/tuning, confirmation, transfer, or forensic**. A new seed from the same generator is confirmation, not cross-generator transfer.
4. If the treatment was selected from prior results, do not use the selected-on population as sole confirmation.
5. Use `workSpent` for cross-technique allocation comparisons; make wall deadlines non-binding when deterministic search evidence matters.
6. Run `npm run solver:experiment-preflight` when its manifest contract applies.
7. Choose the smallest tool/population that can falsify or decide the next gate. Escalate only survivors.
8. Prefer branch/PR execution. Do not merge experimental code to `main` merely because GHA is convenient unless the needed workflow genuinely requires it.

## Smallest tool that answers the question

| Question | Preferred entry point / evidence limit |
|---|---|
| Repository checks | `npm run ci:fast` by default; full `npm run ci` for solver-core changes/final implementation completeness; [`testing.md`](testing.md). CI validates implementation, not research efficacy/generalization. |
| Active naming-cleanup execution state | `npm run naming:status [-- --phase=N|--batch=8A|--json]`; derives next phase/batch, immutable row IDs, high-risk rows, active claim, and compatibility retirement from the ledger. This is an execution view, not a naming authority. |
| Browser flows | focused `test:e2e:*`; `npm run ci:full` for release confidence |
| Existing-but-unindexed local tooling | `node scripts/tooling-census.mjs --orphans`; observational discovery only, then inspect lifecycle/current evidence before reuse |
| Supported surfaced-tool import health | `node scripts/tooling-census.mjs --health`; checks literal local import/export targets reachable from surfaced script entrypoints. Observational support-health signal only; it does not scan historical/cold tooling or replace normal tests. |
| Production solver on named levels | `npm run solver:direct -- --levels=...`; useful for debugging/forensics, not population evidence by itself |
| Published solved-set regression | `npm run solver:regression -- --check`; outcome regression check, not speed/generalization evidence |
| Solver cost/performance | `npm run solver:measure-speed`; combine with deterministic work/representative workloads for speed claims |
| Cheap retrospective search-cost drift | `node scripts/stress/hint-cost-drift.mjs [--corpus=published|corpus1|corpus2] [--min-ratio=N] [--by-commit]`; mines same-config/same-budget rediscoveries from hint provenance, preferring machine-independent `workSpent`; drift is an attribution lead, not automatically a regression |
| Solve stability / budget-edge fragility | `node scripts/stress/classify-stability.mjs --in=<benchmark> [--compare=<second-run>] [--budget-ms=N]`; distinguishes comfortable solves, budget-edge solves, known-unsolved levels, and cross-run flakiness |
| General stress benchmark | `npm run stress:measure-solver`; interpret according to corpus/evidence role |
| Generate cross-generator challenge levels | `npm run stress:generate-topology -- --count=N --master-seed=S --out=tmp/...`; topology-first macro-maze/module construction independent of Corpus-1/2 `generateWitness()`. **Before use, apply the suitability/expansion gate:** v0.1 is limited to 12x12/15x15 perfect-maze-diameter topology and its documented mechanic subset; unsupported activation/topology makes the run unsuitable, not negative evidence. Expand only when a ranked claim is blocked by missing coverage. See [`solver-evaluation-evidence.md#suitability-and-expansion-gate`](solver-evaluation-evidence.md#suitability-and-expansion-gate). |
| Tune across-level worker count for the current machine/runner | `npm run stress:tune-parallelism`; environment-local throughput measurement, not a solver-policy feature |
| One stress failure | `npm run stress:solve-one`; forensic/diagnostic fixture only |
| Shrink a diagnostic level | `npm run stress:reduce-level`; reducer output is a mechanism fixture, not independent confirmation |
| Lifecycle/budget diagnosis | `npm run stress:lifecycle-failure-map`; use current-code reach/work before changing allocation |
| Attempt-shape signatures among unsolved levels | `node scripts/stress/cluster-unsolved-failures.mjs --in=<benchmark> --corpus=<levels>`; observational clustering only; `beam-collapse` is not itself a search-quality diagnosis |
| Which level features correlate with current solve/fail outcomes? | `node scripts/stress/feature-solvability-analysis.mjs --baseline=<compiled-baseline> --corpus=<levels>`; observational nomination, not a causal routing rule; selected features/thresholds need held-out confirmation |
| Are legal winning continuations badly ordered before beam/frontier survival matters? | `node scripts/stress/witness-rank-diagnostic.mjs`; ranks the best continuation across all known solutions sharing each prefix and separately flags known-valid moves absent from `getNeighbors()` as correctness alarms |
| Why does one level's current scoring diverge from its known winning route? | `node scripts/stress/hint-divergence.mjs --id=<level-id> [--profile=<profile>]`; replays the production winning attempt shape and ablates scoring components to localize discrepancies; diagnostic, not an automatic weight-tuning recipe |
| Does a close solved/unsolved twin expose routing, starvation, or genuine technique failure? | `node scripts/stress/near-twin-response-comparison.mjs --neighbors=<nearest-neighbor-report> --baseline=<compiled-baseline> --corpus=<levels>`; classifies never-attempted, zero-node-starved, and real-attempt differences without treating static similarity as causal evidence |
| Connectivity-prune soundness after topology/prune changes | `node scripts/run-bundled.mjs scripts/stress/connectivity-soundness-check.mjs`; every stored valid-solution prefix must remain connected; zero counterexamples on this harness is still not a mathematical proof beyond supported coverage |
| Must-cross prune soundness | `node scripts/run-bundled.mjs scripts/stress/mc-prune-soundness-check.mjs -- [--corpus=corpus2]`; validates shipped must-cross rejection rules over known-valid paths |
| Must-cross neighbor-budget propagator soundness | `node scripts/run-bundled.mjs scripts/stress/mc-neighbor-budget-soundness-check.mjs -- [--corpus=corpus2]`; validates the actual production lower-bound function over known-valid paths |
| Known-solution comparison | `npm run stress:solution-profile-compare`; offline hypothesis generation only; solution-derived profiles are forbidden direct production-routing inputs |
| Preflight a matched solver experiment | `npm run solver:experiment-preflight`; validates corpus/selection, flags, workflow inputs, work envelope, clean ref, and treatment/control comparability; preflight does not make discovery data into confirmation |
| Broad feature/profile ablation | `ablation:*`; **exploratory/discovery by default** because the legacy lab is wall-budgeted and ranks many arms on one population; see [`solver-ablation.md`](solver-ablation.md) before promoting anything |
| Isolated technique × level census | `technique-census.yml`; expensive development evidence; check existing census first; isolated success is nomination, not live-ladder promotion |
| Technique-census analysis | `node scripts/analyze-technique-census.mjs [run-directory] [--production-run=<dir>] [--frozen-production-run=<dir>] [--check]`; rebuilds phenotype, multiplicity, router-bound, conditional-value, cover, substitutability, censored solve-hazard, and cap/tranche economics. Treat the matrix as heavily mined development evidence. |
| Known-solution-prefix survival mechanic associations / mis-ranking cohorts | `node scripts/analyze-known-solution-prefix-survival.mjs --survival=<json> --levels=<json> --out=<json>`; offline association only; known-solution-prefix survival is a diagnostic proxy, not production objective |
| Operational similarity of techniques/configs | Read [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md), then reuse existing census/`method-probe`/known-solution-prefix-survival/beam telemetry. Use bounded pairs after outcome/work screening; do not create another exhaustive census by default. |
| Operational taxonomy/cohort rebuild | `node scripts/run-bundled.mjs scripts/technique-operational-similarity.mjs`; rebuilds compact taxonomy/outcome joins and bounded cohorts; null operational fields mean unmeasured, not equivalent |
| Bounded encountered-state ordering | `method-probe.mjs --ordering-profiles=... --ordering-limit=4096`; observational ranking agreement/divergence; selected inversions need broader confirmation |
| Bounded paired deterministic first divergence | `node scripts/run-bundled.mjs scripts/paired-deterministic-trace.mjs -- --level=<id> --left=<attempt-config-key> --right=<attempt-config-key> [--node-budget=N] [--trace-limit=N]`; fresh DFS/admissible arms only. Compares retained multi-child decision events under matched bounds; a censored/no-divergence result is not proof that every one-child/prune state matched. |
| Bounded beam trace | isolated beam `method-probe --beam-trace-limit=512`, compare with `compare-operational-beam-traces.mjs`; Jaccard can be censored when buckets truncate and is not a solve metric |
| Exact/reference feasibility or explicit-prefix live/dead label | `python3 scripts/stress/cpsat-reference-probe.py <levelId> <seconds> [--corpus=...] [--prefix=...] [--check-witness]` plus existing prefix/repair-retreat drivers; read [`../reports/2026-08-23-solver-reference-model-capability-audit.md`](../reports/2026-08-23-solver-reference-model-capability-audit.md) before interpreting support. Pinning a valid witness detects over-constraint; every cold/model-emitted path used as evidence must also pass the canonical referee to detect under-constraint. Static regular filters are currently unsupported. Timeout/unsupported are not dead/UNSAT. |
| Evidence-driven scheduling/allocation | Read [`solver-scheduling-policy.md`](solver-scheduling-policy.md) and [`../reports/2026-08-23-solver-portfolio-repricing-design.md`](../reports/2026-08-23-solver-portfolio-repricing-design.md); first join current reach/`workSpent`, compute Pareto/oracle headroom and test simple policies before building dynamic scheduler infrastructure |
| Automatic configuration/racing | Extend the stable action/config substrate described in [`solver-scheduling-policy.md`](solver-scheduling-policy.md); prespecify ranges, race weak arms out early, record search size, and independently confirm selected survivors |
| Architectural solver speed | [`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md), `npm run solver:measure-speed`; profile first, use representative pinned-work comparisons, and require end-to-end movement beyond microbenchmarks |
| One technique over a population | `scripts/method-probe.mjs` / `method-probe-sweep.yml`; isolated technique evidence, not automatically full-ladder value |
| Deterministically sample where an opt-in flag adds an exact attempt action | `node scripts/run-bundled.mjs scripts/stress/select-attempt-exposure-sample.mjs -- --enable-flag=<FLAG> --attempt-config=<attemptConfigIdentity> [--count=N --seed=S --exclude-ids=...]` (`--technique` accepted as a deprecated alias); mechanics-only offline selector for development/confirmation planning, never outcome evidence by itself |
| Analyze a bounded equal-work census against the frozen full-depth census | `node scripts/stress/analyze-equal-work-census.mjs --equal-work=<combined-cells.json> [--node-census=<frozen-census>]`; offline pricing/depth join and diagnostic greedy cover only, never a production scheduler |
| Validate a routing-regime-gated candidate | `solver-routing-regime-sample-ab.yml`; useful explicit stratified sample, but if the rule/threshold was mined from the same routing-regime population it remains tuning evidence until independent confirmation |
| One-off level-blind check over a specific id list | `solver-level-blind-targeted-sweep.yml`; exact ID lists are normally targeted/forensic or confirmation only if specified independently before outcomes were inspected |
| Full-population level-blind capability baseline | `solver-stress-refresh.yml`; proves level-blind behavior on that population, not that the population was untouched during treatment design |
| Required-length sensitivity | `npm run solver:req-length-sweep`; correlated within-parent diagnostic; use `workBudget`, distinguish feasibility from search cliffs, and group by base level |
| Hint generation/diversification | `npm run hints:workbench`; [`hint-workbench.md`](hint-workbench.md) |
| Hint/provenance evidence for one level | `npx tsx scripts/hint-query.mjs --id=<ID> [--levels=<corpus>]`; offline/forensic; exact paths/provenance only with `--full` |
| Family/variant research | [`variant-level-research.md`](variant-level-research.md); `family:index` then `family:show`, `family:query`, or `family:coverage`; siblings are not independent |
| Existing variant-family dataset | worktree branch `claude/variant-levels-solver-insights-tpk4qg`; verify with `validate-variant-family-dataset-worktree.mjs`; query before generating more |
| Prior experiment evidence | `node scripts/research-status-index.mjs --compact --query=<term>` before opening reports; historical evidence nominates current work only after comparability check |
| Machine-readable investigation status | `npm run research:index`; compact/filter with `research-status-index.mjs`; status metadata does not replace reading the decisive evidence for a promotion |
| Corpus shape / matching levels | `node scripts/corpus-query.mjs --corpus=stress2`; compact discovery; if filters are tuned after outcome inspection, resulting cohort is selected development data |
| Raw-artifact meaning | `node scripts/artifact-query.mjs [--query=...] [--role=...]`; source metadata: [`../logs/artifact-metadata.json`](../logs/artifact-metadata.json) |

## Command families

| Area | Main commands / references |
|---|---|
| Validation | `check`, `ci`, `ci:fast`, `ci:full`, `test:unit`, `test:unit:fast`, `test:coverage`, `test:node`, `test:e2e*`, `test:visual`, `check:documentation-links`, `check:types*`, `check:lint`; [`testing.md`](testing.md) |
| Tool discovery | `scripts/tooling-census.mjs --orphans` for lifecycle discovery and `--health` for observational support-scoped import health; current front-door catalog plus periodic lifecycle review |
| Solver | `solver:direct`, `solver:regression`, `solver:measure-speed`, `solver:fingerprint*`, `solver:req-length-sweep`, `solver:audit-false-goal-triggerability`, `solver:winning-attempts`, `solver:experiment-preflight`; [`solver-architecture.md`](solver-architecture.md), [`solver-scheduling-policy.md`](solver-scheduling-policy.md), [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md), [`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md) |
| Reference / exact feasibility model | `scripts/stress/cpsat-reference-probe.py` and existing explicit-prefix / repair-retreat drivers; current support/validation limits: [`../reports/2026-08-23-solver-reference-model-capability-audit.md`](../reports/2026-08-23-solver-reference-model-capability-audit.md) |
| Ablation | `ablation:*`; exploratory by default; [`solver-ablation.md`](solver-ablation.md), [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) |
| Stress | `stress:generate*` (including `stress:generate-topology`), `stress:validate-witnesses`, `stress:measure-solver*`, `stress:regression`, `stress:solve-one`, `stress:reduce-level`, `stress:rank-levels`, `stress:failure-inbox`, `stress:lifecycle-failure-map`, `stress:solution-profile*`, `stress:provenance-coverage`, `stress:tune-parallelism`; specialist diagnostics include cost/stability (`hint-cost-drift.mjs`, `classify-stability.mjs`), structural/failure analysis (`cluster-unsolved-failures.mjs`, `feature-solvability-analysis.mjs`, `near-twin-response-comparison.mjs`), witness/scoring diagnosis (`witness-rank-diagnostic.mjs`, `hint-divergence.mjs`), and proof-oriented `*-soundness-check.mjs`; [`../data/stress/README.md`](../data/stress/README.md) |
| Families | `family:generate`, `family:index`, `family:show`, `family:query`, `family:coverage`, `family:analyze`, `family:boundary-report`, `family:parent-hint-replay`, `stress:family-pair-divergence`, `solver:winning-attempts`; use `--trove-root`; [`variant-level-research.md`](variant-level-research.md) |
| Hints | `hints:workbench`, `hints:workbench-parallel`, `hints:expansion-audit`, `hints:discover-candidates`, `hints:expand`, `hints:diversify`, `hints:calibrate-weights`, `hints:complete-sharded`; compact inspection: `hint-query.mjs`; [`hint-workbench.md`](hint-workbench.md) |
| Level/data | `levels:import-published`, `levels:generate-heatmaps`, `levels:ratings-report`, `check:level-data-validity`, `check:level-provenance`, `check:corpus-level-formatting`, `facts:levels` / `check:current-level-facts`; compact corpus query: `scripts/corpus-query.mjs` |
| Remote research | `npm run gha:fetch-result -- --run=<run-id>` for completed-run retrieval; [`.github/workflows/README.md`](../.github/workflows/README.md) for workflow selection/fallbacks |
| Research status | `research:index`; structured current evidence plus non-authoritative discovery metadata for older reports |
| Artifact provenance | `scripts/artifact-query.mjs`; compact view over tracked exception metadata |

Historical portfolio tools (`solver:legacy-latency-portfolio-report`, `solver:legacy-latency-portfolio-replay`) and pilots remain available; code presence does not imply an active hypothesis. The old broad cold-start portfolio experiment is closed; reuse plumbing only if it serves the new scheduling design and current baselines. Completed migrations and narrow forensic audits may remain as direct scripts without npm aliases; find them through `scripts/tooling-census.mjs`, inspect headers/evidence, then delete or deliberately retain according to current lifecycle value.

## Rules

- Use the smallest population/tool that decides the next gate; escalate only survivors.
- Read [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md) before treating any tool-local proposal as current priority.
- Run `node scripts/tooling-census.mjs --orphans` before adding local tooling when the concept may already exist. An orphan is a lifecycle review candidate, not deletion or promotion evidence. Use `--health` when the question is whether currently surfaced script entrypoints still resolve their literal local imports/exports; historical doc references remain visible in JSON but do not promote a script into current support.
- For scheduler work, begin with existing cap/tranche outputs, lifecycle/current capability, family index, current action identities, and bounded operational evidence. Add a new analyzer/store only when current rebuildable surfaces cannot answer a repeated decision-relevant query.
- The cap-retention/tranche extension is already implemented in `analyze-technique-census.mjs` at `100K/250K/500K/1M/2M/5M/10M/20M/30M/40M/50M`. Do not rebuild it separately.
- Bounded operational-similarity tooling is implemented. Use it after outcome/work screening, not as a prerequisite for every scheduler decision and not as a reason to trace every technique pair.
- When comparing named techniques, identify the operational layer first: search family, scoring profile, structural ordering bias, beam retention/coarse-state merge, pruning, retry context, seed/restart, or budget depth.
- Solver speed evidence has layers: use `hint-cost-drift.mjs` for cheap retrospective attribution when provenance happens to contain matched rediscoveries, `classify-stability.mjs` to identify fragile/budget-edge solves, and the deterministic matched-work protocol for promotion decisions. Neither retrospective tool substitutes for a controlled before/after benchmark.
- Scheduler experiments declare the shared total-work envelope and selection/evidence role. Prefer `strictTotalWorkBudget` when additive tails otherwise make arms incomparable.
- Exact/reference claims state current mechanic support and validation direction. Witness pinning can expose over-constraint; cold emitted witnesses must be refereed to expose under-constraint. Timeout/unsupported remain distinct from UNSAT/dead.
- Routing-regime/sample workflows save compute but do not cure selection bias. If the same routing-regime population nominated/tuned the rule, obtain confirmation proportional to the selection pressure; use cross-generator challenge only when the claim/risk warrants it under [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md).
- Tune GHA shard/parallelism for execution efficiency, but never use host throughput as a live solver allocation signal.
- Prefer compact query/summary views over opening or regenerating large corpora/logs.
- Preserve [`solver-level-blindness.md`](solver-level-blindness.md), including its distinction between runtime blindness and statistical generalization.
- Check queue/report status before expensive workflows or repeated flag experiments.
- Batch tools persist progress incrementally.
- Use shared explicit level selectors (`pos:` / `id:`) where required.
- Treat parent families, not siblings, as independent evaluation units.
- Check the existing variant-family dataset before generating another family set; new bulk generation requires question, analysis, pilot, and stop condition.
- Use current `main` code/instructions with off-main historical data; do not run historical branch code as current authority.
- Stored valid hints/solutions are broader than cold-solver evidence; keep provenance classes distinct.
- If a tool's proxy metric improves but cold solve/work/correctness does not, do not keep optimizing the proxy.
- If a clear negative answers the tested form, stop. Do not use a large workflow merely to make the negative feel more official.

[`command-glossary.md`](command-glossary.md) maps runtime flow names to code; it is not a CLI catalog.