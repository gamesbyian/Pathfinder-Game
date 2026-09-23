# Technique census and broad-evidence closeout 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-22 — technique census run `35687337464`, stress refresh `35687363645`, shared solver ref `39d14d49023aa09cb680053b975ef786eeae9b01`, and automatic harvest commit `afd744a195b2177a865670d3ec3afc00ed5352a7`.
> **Decision:** treat the 120/120 specialized census combine as complete observational capability evidence, retain the 50M deep-census ceiling and 10M EW1 instrument, and route the newly visible cheap/deep capability mismatches into allocation/first-loss question intake. Do not change production scheduling from this census alone.
> **Remaining gate:** harden the census primary-result provenance contract so future standard `solver-sweep-result` publication is decision-valid, then materialize the refreshed second-order analysis before any scheduler-policy change that depends on census-derived economics.

## Completion and failure semantics

Technique census GHA run `35687337464` finished all **120/120 shards successfully**. The combine produced:

- **80,538 unique cells**;
- **0 duplicate cells removed**;
- **0 missing shards**;
- **0 still-partial shards**;
- **20,453 solved cells**;
- complete T1, T3, T4, flag-sensitivity, pair-synergy and EW1 combined outputs.

The workflow's final red conclusion is not a failed census. It occurred after combine/publication while the legacy persistence step tried to rebase a large hint commit onto a much newer `main`; hundreds of hint JSON paths conflicted.

The newer automatic harvester then did what it was designed to do: it persisted the census discoveries onto current `main` as `afd744a195b2177a865670d3ec3afc00ed5352a7` ("Harvest solver evidence: Technique census ..."). Therefore the run's scientific evidence and discovered hints both survived. No rerun of the 120-shard census is warranted.

## Current deep T1 boundary

Against the frozen production baseline used by the census:

- production-unsolved population: **532**;
- solved by at least one full-depth T1 isolated technique: **83 / 532 (15.6%)**;
- current misses with zero T1 isolated-technique solve: **449**;
- of the 83 T1-rescuable misses, **47 are singleton-supported** by exactly one T1 technique.

The strongest current-miss T1 rows are:

- repair / must-turn-biased: 17 solves, 11 unique;
- repair / turn-biased: 17 solves, 6 unique;
- admissible-order / no tie-break: 14 solves, 8 unique;
- repair / standard: 14 solves, 8 unique;
- mechanic-bucket intersection-harvest beam 5K: 6 solves, 2 unique.

This is capability evidence, not production entitlement. In particular the 47 singleton-supported misses are a useful microscope/routing population because losing or never offering one technique can erase all observed isolated capability for that level.

## Regression-safety read

Among **1,430 production-solved levels**, **140 have zero T1 isolated-technique solver at the 50M census ceiling**.

That does not mean production capability regressed. It means production's sequential/history-sensitive ladder solves a substantial set that no isolated T1 cell reproduces under the census protocol. This strengthens the rule that isolated census coverage is not a substitute for production-ladder safety evidence.

Flag/variant sensitivity also remains material: the fresh combine records **332 regressions on previously solved levels**. The tested variants are therefore not monotone improvements and should continue to require matched-work/control evidence before promotion.

## EW1 shallow pricing

The census's own EW1 tranche completed **2,024 cells across 60 frozen production-unsolved levels at 10M canonical work**, with **0 deadline-truncated cells**.

Its main economic split remains useful:

- 2K beam cells usually naturally exhaust cheaply, often around 1.2–1.4M mean work;
- DFS/admissible-order/repair rows usually consume the full 10M cap when they do not solve;
- only a small number of techniques solve anything on this frozen sample.

Separately, the fresh production-side equal-work reach join from stress refresh `35687363645` remains the better current production-allocation bridge. It identifies cheap isolated capability that production did not necessarily exploit and keeps actual production reach/wins/work attached to the same normalized technique identity.

A consumer-style join over current base identities exposes these particularly actionable mismatches:

- cheap EW1 capability with zero recorded production wins includes admissible-order `nearClosureRescue`, 2K `harvestThenFinish`, 2K `knotBuilder`, and DFS `finishFirst`;
- production participation with zero recorded wins includes 2K `harvestThenFinish`, 2K `knotBuilder`, DFS `closureCommitment`, DFS `finishFirst`, and DFS `nearClosureRescue`;
- many full-depth T1 techniques have capability but no EW1 win on the bounded sample, which is a depth/cost discriminator, not a global cheap-capability negative.

These are question nominations only. Zero production wins does not establish removable work, and no EW1 sample win does not establish global absence of cheap capability.

## Broad-run implications

The paired stress refresh + census now says something more specific than either run alone.

1. **The production solve boundary is stable.** The stress refresh reproduced 101/102 C1 and 1,169/1,700 C2 with no solved-set churn.
2. **Generic compact failure telemetry is saturated as a broad discriminator.** Same-stage failed controls look much like residual failures at the stage/work/cap level.
3. **Yet isolated capability headroom remains real.** 83 current misses have a full-depth T1 solution, and 47 have singleton T1 support.
4. **Some of that headroom is cheap.** The equal-work join exposes current misses / technique identities where inexpensive isolated capability exists but production routing or ordering does not capture it.
5. **Therefore the next information purchase should be about offer/allocation and first operational divergence, not more generic failure counts or a deeper standing census.**

This reinforces the current direction: use the compact 1,802-parent refresh as the denominator and solved-control frame, then spend richer evidence only on mechanically sampled first-loss / routing mismatches.

## Census budget decision

Do **not** increase the standing T1/T3/T4 ceiling above 50M nodes.

The fresh run does not show a decision-limiting reason to make the repository's most expensive matrix deeper. The relevant live discrepancies are already visible at 50M, while the cross-technique cost question is better answered by canonical `workSpent` through EW1 and production joins.

Keep the bounded **60-level / 10M-work EW1** tranche. It successfully separates cheap natural exhaustion from cap-bound continuation without deadline truncation and complements rather than duplicates T1.

## Provenance-contract defect

The generic `solver-sweep-result` wrapper for this run reports its primary result as non-decision-bearing because the combined census output does not expose the immutable execution SHA through the newer experiment/result identity contract. This is a real integration defect even though the specialized artifact records the run commit and has exact 120/120 shard coverage.

Required follow-up:

- bind combined census primary output to the immutable resolved execution SHA in the standard contract;
- make exact expected/observed cell identity available to the generic publisher;
- ensure a scientifically complete census can publish a decision-valid front door;
- keep the automatic harvester as the durable hint rail, so the combine job does not need to win a giant rebase race to preserve discoveries.

Until that is fixed, use the complete specialized artifact for observational census interpretation and keep production-changing claims behind ordinary controlled confirmation.

## Queue effect

No wholesale reorder of the solver queue is justified.

The important adjustments are:

- keep WS1 independent confirmation as its own precommitted gate;
- keep repair-deadline and admissible-order reserve repricing under their existing matched-work owners;
- for capability invention / residual research, prioritize sampled first-loss and offer/routing divergence using the fresh compact denominator and the 83/47 T1-rescuable cohorts;
- explicitly investigate cheap isolated / zero-production-win identities as allocation questions, not removal or promotion conclusions;
- do not schedule another full technique census merely for more depth or another copy of the same failure telemetry.

The broad acquisition requested on 2026-09-21 is therefore scientifically closed. The remaining census work is derived-materialization/provenance hardening, not another 120-shard acquisition.
