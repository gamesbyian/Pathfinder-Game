# Solver-research tooling completion matrix

> **Status:** active handoff reference after the 2026-08-11 remote A/B + CP-SAT runs and level-blind workflow hardening
> **Scope:** tooling/evidence state, not automatic production promotion
> **Date:** 2026-08-11

## Current completion state

| Objective | Implemented/current evidence | Next valid action |
|---|---|---|
| Level-blind capability boundary | Canonical contract in `docs/solver-level-blindness.md`; mechanics-only capability projection + dedicated anonymous worker; principal stress workflow has no baseline/prime-winner path; CI guard checks forbidden history/identity fields; Actions pins `github.sha` and removes stale shard files before combine. | Use this workflow for every headline capability run. Historical winner replay remains research/re-verification only. |
| Neighbor-budget caller policy | Corrected caller participation: stochastic repair `takePly` suppresses the prune; DFS, beam, deterministic repair sub-searches retain it. **Full level-blind A/B complete: C2 611→665 (+54; 59 gained/5 lost), C1 94→94; C2 nodes -3.94%, work -5.33%.** | Do not rerun full A/B unchanged. Diagnose five losses and test a generic equal-work integration before promotion. |
| Winning lineage | Real beam boundaries; OFF/ON parity; structural family v1; same-config 30-level C1 cohort: 13 solved/17 failed, 15 failed final score/width losses and 2 dedup, zero hard-prune alarms. | Expand exact labels near real extinctions before freezing retention/score changes. |
| Score/width forensics | 15 failed score/width final extinctions classified: 10 clear mis-rank, 3 weak-margin, 0 exact-tie/stable-order, 2 width-saturation. | Combine with exact CP-SAT labels; test neutral future-opportunity descriptors first. |
| Contrastive branch atlas / exact oracle | Dedicated explicit-prefix workflow accepts atlas abstentions or generic case files; native-prefix replay and referee validation are enforced. **First remote run complete: 12 → 7 dead / 1 live / 4 abstain, zero alarms.** | Do not rerun the original 12. Build a bounded extinction-adjacent same-parent set; retain live/dead/abstain distinction. |
| Residual interfaces | 20 levels / 288 solutions; 31,351 exact occurrences; 845 signatures; 14 cross-level, mostly generic rectangle detours. | Lane remains demoted; require new independent mechanic-conditioned evidence before operator work. |
| Repair causal window | Conservative rollback census shows long demonstrated retreat proxy, not minimum edit distance. Explicit-prefix workflow can accept generic retreat cases. | Run bounded coarse-to-fine exact retreat CP-SAT; no new repair operator yet. |
| Experiment preflight | Schema v2 records corpus/order/hash, complete solver flags, workflow dispatch inputs, seeds, work/deadline, profile, instrumentation, output. Capability workflow's exact-level blindness is structural, so `prime_winner` is no longer an experiment input. | Fresh manifests before decision A/Bs; reject any non-declared workflow-input or solver-flag drift. |
| Main-loop late reserve | Reserve-not-reorder mechanism and 14-level activation pilot complete. Full population acceptance remains pending. | Run level-blind fresh control + 5/10/15% arms, config count 4 everywhere. |
| Beam/repair producer premise | Bounded observation found preliminary non-redundancy; no live receptor verdict. | Optional bounded counterfactual only after exact-label work clarifies the receptor. |
| Differential reducer / blackboard | Existing reducer/interoperability seams inspected; trigger not met. | Conditional only; do not build without recurring independent evidence. |

## Remote result details now in hand

### Neighbor-budget A/B

Runs #32/#33. Dispatch metadata differed because the old workflow followed a mutable branch, but every actual shard report in both arms records solver SHA `c86ba8f86192801176b1e6c5fece3b120850df44`. The workflow is now hardened to immutable `github.sha` checkouts so this ambiguity cannot recur.

The historical 725→739 neighbor A/B remains evidence for the original wiring, but it used exact-level `--prime-winner` replay and is not a solver-capability baseline. The revised 611→665 level-blind run is the current decision-bearing population evidence.

### Explicit-prefix CP-SAT

Run `31537268571`:

- 7 exact-infeasible;
- 1 exact-live/OPTIMAL with referee-valid emitted path (`R00001:42:child-[5,6]:3`);
- 4 R00039 `unsupported-mechanics` abstentions;
- zero native-input or correctness alarms.

At least one R00001 sibling ranked first by the beam is CP-SAT-dead despite a known-valid continuation from the same parent. That upgrades the score-representation hypothesis from correlation to at least one direct same-parent feasibility counterexample.

## Normal-behavior / correctness interpretation

The level-blind workflow is infrastructure, not a new solver heuristic. It changes and hardens what information the harness is allowed to supply, not Pathfinder's legal search rules. The worker receives an allowlisted gameplay-mechanics object with exact ID/history/research fields absent. Saved hints/provenance remain output-side artifacts.

`PRUNE_MC_NEIGHBOR_BUDGET` remains default-off pending integration/promotion review because the revised run still loses five control solves. The population experiment itself is finished; the remaining work is not more sample size but recovery/placement of the mechanism.

## Exact remote queue now

1. Five-loss neighbor-budget diagnosis and equal-work integration design.
2. Extinction-adjacent explicit-prefix CP-SAT expansion.
3. Explicit-prefix exact repair-retreat census.
4. Level-blind main-loop late-reserve full A/B.

Items 2 and 3 can proceed observationally while 1 is analyzed. Item 4 is unblocked after the workflow-hardening merge, but population promotion experiments should still be interpreted against the actual default configuration at dispatch.

See `docs/claude-remote-solver-handoff.md` for exact remote inputs and `reports/2026-08-11-remote-neighbor-cpsat-and-level-blindness-reconciliation.md` for the result interpretation.
