# Operational-similarity substrate and bounded cohorts

> **Status:** superseded
> **Last evidence:** 2026-08-25 — paired deterministic trace completion and lifecycle-attribution correction in [`2026-08-25-paired-deterministic-trace-and-lifecycle-attribution-correction.md`](2026-08-25-paired-deterministic-trace-and-lifecycle-attribution-correction.md)
> **Decision:** retain the bounded taxonomy, ranking, admissible, and beam pilot substrate, plus the new paired deterministic trace, as targeted research tools. Do not execute the old broad repair/beam/trace expansion as a standalone program; current work is decision-driven by the live queue.
> **Remaining gate:** none
> **Evidence role:** discovery
> **Selection:** selected after inspecting controlled census outcome cells and nominated exact cohort fixtures

## What was built

The rebuild command derives a machine-readable taxonomy for all 35 isolated census techniques, retains every scoring weight and per-term difference, joins the eight controlled comparisons to outcome Jaccard, and selects at most eight exact level fixtures in each of `leftOnly`, `rightOnly`, `both`, and `neither`. The resulting compact artifact is deliberately downstream of the existing census rather than a second technique database.

The pure reducer covers deterministic 2/3/4-child ranking agreement, deterministic ties, Kendall agreement, top margins, true `ida:none` stable equal-slack ordering, soft tie breaking that cannot override distinct slack, and a bounded signature collector. No solver hot path or production policy changed.

`method-probe.mjs --ordering-profiles=<profiles> --ordering-limit=4096` now activates an observation-only seam in ordinary DFS ordering. The active sort still runs first and is unchanged; the observer rescored copied candidate IDs against each requested profile and retained only compact aggregate comparisons. Admissible ordering exposes the actual slack and its final stable order through the same seam. Focused tests establish that enabling the seam does not mutate the active DFS ordering and that `ida:none` reports the exact production order.

## Current evidence and limitation

The controlled outcome evidence remains striking: objective beam 2K/5K has Jaccard 0.705, objective plain/diverse 5K 0.768, IDA none/default 0.619, beam CW/CCW 0.630, and DFS CW/CCW 0.784. These are **outcome** measurements only. The generated operational component fields are explicitly `null` with status `not-measured-by-source-proxy`; this makes an incomplete trace run impossible to misread as empirical operational evidence.

The taxonomy artifact alone does not support strongest-operational-pair, first-divergence, repair-fingerprint, or scheduler-exhaustion conclusions. The encountered-state pilot below supports a narrow ordinary-profile ordering nomination, but broad trace/frontier/repair conclusions were intentionally not promoted into production decisions.

## First encountered-state pilot

The committed `operational-ranking-pilot.json` ran `dfs:harvestThenFinish` for 50,000 nodes on corpus-1 positions 1, 14, 37, 73, and 99 (`S00001`, `S00103`, `R00408`, `R01336`, `R01944`). These are exact fixtures nominated by the controlled cohorts, not production steering. Each level observed 12,118–15,107 multi-child states and retained the first 4,096; all five attempts were node-censored and unsolved.

`harvestThenFinish` versus `portalFirstTransfer` agreed on the top child in 95.703%–99.976% of retained states and on the full ranking in 95.581%–99.976%. This is the strongest measured ordinary-profile relationship in the pilot and is consistent with their 0.932 outcome Jaccard, but the result also shows why source proximity is insufficient: on `R01336` the profiles still changed about 4.3% of top choices. `objectiveFirst` versus `mustCrossFirst` was similarly close on four fixtures (98.438%–99.976% top agreement) but fell to 96.069% on must-cross-heavy `R00408`; this nominates must-cross urgency as a state-dependent discriminator rather than a globally different search mode. These corrected figures preserve each candidate set's original tie order; an earlier reducer replay incorrectly used the left policy's order as the stable-tie basis and was replaced before this report was concluded.

The compact first-divergence records make the fragility concrete. On `S00001`, the first retained `harvestThenFinish`/`portalFirstTransfer` top-choice flip occurred at depth 10 after 1,043 retained multi-child states: the former preferred candidate `589826` by 1.069 score points, while the latter preferred `589828` by only 0.245. Per-weight counterfactual decomposition reproduces the -1.313 margin change exactly: goal attraction contributed -1.563, must-cross urgency +0.500, and objective attraction -0.250. On `R00408` the flip occurred much earlier, at depth 11 after 103 retained states; candidates `262148` and `327683` reversed from a +1.000 to -0.500 margin, explained by must-pass urgency (-2.000) partly offset by must-cross urgency (+0.500). These are causal local ordering boundaries—both candidates existed, the profile changed their order, and the linear contribution sum reproduces the ordinary score-margin change—but this pilot by itself does not establish permanent winning-lineage loss.

The pilot is prefix-censored, samples states encountered by the `harvestThenFinish` traversal rather than a symmetric union of both traversals, and does not by itself say whether any disagreement is consequential. It therefore supports a local-ordering redundancy nomination, not removal/reordering of attempts. The missing reusable follow-up seam was later implemented as `scripts/paired-deterministic-trace.mjs`; see the 2026-08-25 completion report for its current role and stop rules.

A matched observer-off replay of the same five fixtures produced identical outcomes and exact node counts on all five levels. This verifies the central research invariant under the pilot protocol: enabling score comparison changes wall-clock overhead only, not production survivor ordering or deterministic work behavior.

## Admissible-order anatomy pilot

The committed `operational-admissible-pilot.json` ran `ida:default` for 50,000 nodes on corpus-1 positions 1, 37, 73, 87, and 90, comparing `none`, `default`, `mustCrossFirst`, `intersectionHarvest`, and `nearClosureRescue` on the same retained candidate sets. Equal-slack siblings occurred in 38.062%–79.614% of the first 4,096 multi-child states per fixture, so the soft tie-break has frequent but level-dependent opportunity to intervene.

`ida:none` agreed with `default` on only 76.050%–81.787% of top choices; full-ranking agreement ranged from 48.389% on tie-heavy `S00001` to 77.466% on `R01336`. This establishes the mechanism behind `none`'s operational distinction: it is not an independent primary search principle, but retaining candidate order across a large equal-slack population can still change many local decisions. Among informed tie-breakers, `default`/`mustCrossFirst` top-choice agreement ranged from 93.799% to 99.414%, and `mustCrossFirst`/`nearClosureRescue` from 94.653% to 99.756%. Thus the informed profiles form a much tighter operational cluster than any of them does with `none`, while `R01696` remains a useful high-divergence fixture.

This pilot is still prefix-censored and follows states encountered by `ida:default`. It does not determine whether `ida:none`'s distinctive census solves concentrate specifically in high-tie states. That question remains available as a bounded diagnostic if a future decision depends on it; it is not a current standalone gate.

The admissible pilot also has a matched observer-off replay with identical outcomes and exact node counts on all five fixtures, extending the non-interference result to the slack-order engine.

## Beam-width frontier pilot

The committed `operational-beam-width-pilot.json` compares objective beam 2K and 5K on exact cohort fixtures `S00103` and `R01227`, with a matched 200,000-node cap and the deterministic bottom 512 FNV-1a path hashes retained per stage/depth. It reuses the existing beam research observer; `method-probe --beam-trace-limit=512` reduces its copied paths immediately to bounded hashes. A matched observer-off 2K replay produced identical outcomes and node counts on both fixtures.

On `S00103`, median retained-signature Jaccard across 48 post-width-cull depths was 0.240; generated-candidate median Jaccard was 0.253. On `R01227`, those medians were 0.247 and 0.241 across 49 depths. Late retained-frontier overlap fell to 0.085 and 0.004 respectively. The 2K arm solved `R01227` in 100,829 nodes while the 5K arm exhausted 200,002 nodes, a concrete width inversion rather than monotonic dominance.

These bottom-k samples are censored whenever a stage/depth has more than 512 unique paths, so their direct Jaccards are diagnostic sample overlap, not exact full-frontier overlap. Even with that limitation, the progressive collapse from shared early frontiers to low late overlap rejects the simple story that 5K merely carries 3K more copies of the same ranked mode: width changes which parent population generates the next depth and can move the search into a different residual region.

The August 23 local next step was to add diversity-bucket occupancy and winning-lineage survival before comparing plain/diverse 5K. That broader expansion is now **superseded as a standalone gate**. Reopen it only if a current ranked beam/scheduler decision requires that distinction.

## 2026-08-25 disposition

The original substrate remains useful, but its open-ended research agenda no longer owns priority.

The missing deterministic paired-search seam is now implemented and documented. Its first urgent intended use, the alleged predecessor-conditioned admissible-order anomaly, was resolved earlier in the evidence chain: immutable attempt telemetry showed that the eight supposed admissible-order wins were actually later diverse-beam retry wins, misattributed by a stale lifecycle reducer, and the census comparison omitted the exact winning compound configurations.

See [`2026-08-25-paired-deterministic-trace-and-lifecycle-attribution-correction.md`](2026-08-25-paired-deterministic-trace-and-lifecycle-attribution-correction.md) for the complete reconstruction, fix, test/CI record, and current stop tree.

Current operational-similarity policy lives in [`../docs/solver-technique-operational-taxonomy.md`](../docs/solver-technique-operational-taxonomy.md): trace only when a concrete portfolio or causal decision can change, and stop when the distinction is no longer economically or mechanistically decision-relevant.
