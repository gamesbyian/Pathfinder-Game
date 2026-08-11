# Solver-research tooling completion matrix

> **Status:** active handoff reference (reconciled after PR #1358 and remote-handoff hardening)
> **Scope:** observation/tooling evidence, not production promotion
> **Date:** 2026-08-11

## Current completion state

| Objective | Implemented/current evidence | Next valid action |
|---|---|---|
| Neighbor-budget caller policy | Corrected independent caller participation: stochastic repair `takePly` suppresses the prune; DFS, beam, and deterministic repair sub-searches retain it. | Remote-only fresh full 1,700-level corrected-wiring A/B; do not reuse the old +14 verdict. |
| Winning lineage | Real beam boundaries; OFF/ON parity; structural family v1 (portal use, crossing placement, must-cross first-entry/completion order). Same-config Corpus-1 width-100/default/100k cohort: 13 solved, 17 failed; mean normalized last support 0.505 vs 0.239; failed final loss 15 score/width, 2 dedup; zero hard-prune alarms. | Local cutoff forensics are complete in the companion report. Obtain remote contrastive labels before freezing a retention counterfactual. |
| Score/width forensics | Cull artifacts now record candidate pool, supported ranks/scores/families, cutoff/first-culled score, tie population, insertion order, margin, and post-extinction work. Level-balanced failure/control classification is published. | Test only a narrow retention counterfactual after CP-SAT labels; no production score/width/dedup change now. |
| Contrastive branch atlas | Existing known-prefix sibling enumeration preserves explicit abstention; initial 12 abstentions remain unlabelled. A dedicated GitHub execution seam now accepts the exact atlas abstentions or a generic committed prefix-case list and reuses `cpsat-full-probe.py --prefix`. | Remote-only dispatch of `.github/workflows/cpsat-explicit-prefix-oracle.yml`: 12 first, then bounded same-parent siblings near extinctions; keep live/dead/timeout distinct and referee-check SAT witnesses. |
| Residual interfaces | 20 levels / 288 canonical-valid solutions: 31,351 exact occurrences → 845 translation-invariant signatures; 459 multi-solution, 201 cross-structural-family, 14 cross-level. The 14 are inspectable with provenance and held-out classification. | Continue only motifs surviving independent held-out scrutiny; no substitution machinery. |
| Repair causal window | Existing conservative rollback census over retained elites shows a large retreat proxy, not exact edit distance. | Remote-only bounded retreat using the same explicit-prefix CP-SAT workflow; no new repair operator. |
| Experiment preflight | Schema v2 clean-SHA manifest records corpus, ordered IDs/hash, complete solver flag map, **workflow dispatch inputs**, seeds, work/deadline, profile, instrumentation, and output. Arm comparison permits only named false→true target polarity plus explicitly declared workflow treatment dimensions. Tests cover corpus/order/budget/deadline/profile/seeds/instrumentation/non-target drift/polarity/duplicate/missing IDs plus workflow drift such as prime-winner/workers/reserve config. | Generate fresh pairs on remote `main` immediately before each decision A/B, verify actual GitHub run inputs against the intended manifest, and reject mismatches before accepting results. |
| Main-loop late reserve | Default-off reserve-not-reorder mechanism and 14-level activation pilot complete; frozen protocol unchanged. Schema v2 can now lock fraction/config count and other workflow settings. | Remote-only full A/B after neighbor-budget is recorded, with a fresh preflight pair for each fraction. |
| Beam/repair producer premise | Bounded real-population observation found preliminary non-redundancy; no live receptor verdict. | Optional bounded counterfactual after oracle/lineage work clarifies the receptor. |
| Differential reducer / blackboard | Existing single-level reducer and interoperability seams inspected; trigger not met. | Conditional only; do not build without recurring independent evidence. |

## Normal-behavior and correctness evidence

Observation fields remain absent by default. Focused OFF/ON fixtures assert identical solution/failure and canonical nodes. The published benchmark remains 160/160 at 51,959,647 canonical nodes in the last completed validation. No valid known prefix in the bounded lineage cohort hit a hard prune; this is sample evidence, not a global proof.

The explicit-prefix CP-SAT seam is execution plumbing only. It does not change the CP-SAT model or native solver. Its pure case extraction/status parsing is covered by the existing `test:research-analysis-lib` node check; the GitHub workflow installs `ortools`, runs that check, then invokes the existing probe. The workflow has not yet been dispatched as part of this local hardening.

## Exact remote-only queue

1. Corrected `PRUNE_MC_NEIGHBOR_BUDGET` deterministic full Corpus-2 OFF/ON A/B, using schema-v2 workflow-input manifests.
2. Explicit-prefix CP-SAT contrastive labels (12 abstentions first, then bounded extinction-adjacent siblings).
3. Explicit-prefix CP-SAT exact repair-retreat census.
4. Frozen `STRATEGY_MAIN_LOOP_LATE_RESERVE` full A/B, separate and normally after item 1, with reserve fraction/config-count recorded in manifests.

See [`../docs/claude-remote-solver-handoff.md`](../docs/claude-remote-solver-handoff.md) for exact dispatch inputs and stop conditions. None of these remote jobs was run or approximated locally during this cleanup.

## Supersession note

The first 8-level lineage smoke and 5-level interface pilot remain historical tooling checks. They are superseded for active routing by the 30-level same-config cohort, score/width forensics, and 20-level unique-signature census above. Future agents should not rebuild lineage instrumentation or repeat raw-pair signature reduction.
