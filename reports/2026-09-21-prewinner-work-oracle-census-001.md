# Pre-winner work oracle census 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-21 — production-boundary run `35066677597` at solver ref `16114b80e54233910f34ec2ea8e2c1a41a859eb4`.
> **Decision:** action-selection work elimination has very large perfect-hindsight headroom on the current production solved population; advance to the smallest legal-signal capture study before changing scheduling.
> **Remaining gate:** measure how much pre-winner work can be predicted or avoided using only information available before each next action, starting with simple static/current-solve and compact failure-response signals; compare against an action-order-only baseline and preserve rare capability.
> **Evidence role:** forensic
> **Selection:** all solved rows in the frozen C1/C2 production-boundary result; no winner/stage subset selected after inspection.
> **Selection history:** C1/C2 are solver-outcome-selected development corpora; this supports current-production economics, not unseen-level prevalence.
> **Inference scope:** retrospective oracle ceiling for work on levels production solved in this recorded run; no claim that predecessor actions were ex-ante redundant.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-09-21","decision":"Action-selection work elimination has large perfect-hindsight headroom; advance to legal-signal capture before scheduling changes.","remainingGate":"Measure capture of pre-winner work using only information available before each next action, starting with simple static/current-solve and compact failure-response signals.","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":"GitHub Actions run 35066677597, C1 102 rows + C2 1,700 rows, solver ref 16114b80e54233910f34ec2ea8e2c1a41a859eb4","selection":"all solved C1/C2 rows","inferenceScope":"retrospective oracle ceiling for recorded production-solved levels"},"claimRefs":[],"sourceArtifacts":["scripts/analyze-prewinner-work-oracle.mjs"],"successors":{"questions":["WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE"],"artifacts":["reports/2026-09-21-action-selection-legal-signal-capture-preflight-001.md"]},"prospective":{"expectation":"Whole-action elimination may have greater leverage than repeated-proof caching if late winners incur large predecessor work.","surprise":"C2 pre-winner work is 94.74% of canonical work on solved rows.","anomaly":null}} -->

## Question

For levels the production solver eventually solved, how much canonical work had already been spent before the attempt that found the winning route?

This deliberately asks the strongest cheap counterfactual first:

> If a perfect free oracle knew which attempt would win, how much current work could disappear?

It does not ask whether production can know that answer in advance.

## Method

For each solved row:

1. locate the first successful attempt;
2. sum canonical `workSpent` across all earlier attempts;
3. divide that by total attempt work for the row;
4. retain winning attempt index, stage and action identity.

The reducer is `scripts/analyze-prewinner-work-oracle.mjs`.

Reproduction after this branch lands:

```bash
npm run research:prewinner-work-oracle -- \
  --inputs=reports/stress/solver-corpus1-latest.json,reports/stress/solver-corpus2-latest.json \
  --out=reports/stress/prewinner-work-oracle-current.json
```

## Result

| population | solved | winner first | winner later | pre-winner work / total work |
|---|---:|---:|---:|---:|
| C1 | 101 | 52 | 49 | **87.58%** |
| C2 | 1,169 | 208 | 961 | **94.74%** |

For C2:

- pre-winner canonical work: **65,657,307,264**;
- total canonical attempt work on solved rows: **69,302,968,971**;
- median winning attempt index: **4**;
- 90th-percentile winning attempt index: **59**;
- median pre-winner work: **22,621,864**;
- 90th-percentile pre-winner work: **207,969,832**;
- median per-level pre-winner work share: **89.04%**;
- interquartile per-level share: **60.82% to 96.37%**.

The result is not driven only by a handful of extreme late wins: **961/1,169** C2 successes occur after at least one failed predecessor attempt.

## Where the largest hindsight reservoir sits

Winning-stage decomposition is descriptive, not an instruction to skip stages.

| winning stage | wins | pre-winner work | pre-winner share within those solved rows |
|---|---:|---:|---:|
| portal-coarse-state-merge-dead-last-retry | 121 | 31.15B | 98.60% |
| main-search | 646 | 11.20B | 87.06% |
| late-repair-multiseed-retry | 33 | 6.20B | 97.08% |
| goal-attraction-disabled-retry | 51 | 3.87B | 95.44% |
| admissible-order-alternate-tiebreak-retry | 30 | 2.31B | 95.07% |

The late portal retry is especially visible because it wins after a long ladder, but that does **not** imply moving it earlier is safe or economical. Its 121 wins may depend on preserving other capabilities or on residual conditioning created by the existing order.

## Highest-cost predecessor → winner nominations

These are selected diagnostic nominations for later pair-targeted overlap work, not causal redundancy claims.

| predecessor stage | eventual winning stage | pre-winner work | levels |
|---|---|---:|---:|
| early-repair-search | main-search | 6.30B | 300 |
| guidance-goal-distance-retry | portal-coarse-state-merge-dead-last-retry | 5.83B | 121 |
| main-search | main-search | 4.90B | 384 |
| main-search | portal-coarse-state-merge-dead-last-retry | 3.87B | 121 |
| late-repair-multiseed-retry | portal-coarse-state-merge-dead-last-retry | 3.83B | 33 |

The first pair alone represents about **9.6%** of all C2 pre-winner work. These rankings are useful because they tell operational-overlap research where a positive finding could actually eliminate substantial work.

## Cheap selector baseline: exact action identity is unsafe

A deterministic 70/30 split by SHA-256(level ID) gives 1,186 C2 development levels and 514 validation levels, of which 356 validation levels are solved.

A deliberately crude policy says: skip an exact action key on validation only when that key appeared in development and recorded **zero wins** there. Unknown action keys remain protected.

That policy nominates **25.58%** of validation pre-winner work for removal, but it also suppresses the eventual winner on **10/356 validation solves**.

Making the zero-win requirement more conservative does not repair the problem cleanly:

| minimum development attempts with zero wins | captured validation pre-winner work | validation winners suppressed |
|---:|---:|---:|
| 1 | 25.58% | 10 |
| 100 | 22.05% | 8 |
| 200 | 19.60% | 7 |
| 500 | 4.97% | 3 |
| 1,000 | 0% | 0 |

Several lost winners came from exact actions with hundreds of development attempts and no development wins. Thus simple historical action identity has real economic signal but is not a safe deletion rule. Rare capability survives precisely where a global “this action never wins” rule looks most tempting.

This baseline is selected diagnostic evidence on the frozen production population. It earns contextual/current-instance discrimination, not global action removal.

## Interpretation

The admission question is decisively answered: action-selection economics has enough theoretical headroom to matter.

The critical distinction is now **ceiling versus capture**.

The 94.74% figure is a perfect-hindsight maximum. Earlier attempts may be:

- necessary because their failure response is what makes the later action predictable;
- protective of rare capabilities on other levels;
- cheap relative to the information they provide;
- conditionally valuable even when they do not win;
- observationally ordered by policy rather than causally redundant.

Therefore the next experiment is not “skip everything before the winner” and not a learned selector.

## Earned next gate: legal-signal capture

Use the retained attempt sequence and compact failure-response vocabulary to ask, at each action boundary:

> Given only information available at that moment, how much of the oracle ceiling can a simple policy capture without losing the eventual win?

Start with cheap legal signals already produced by production or derivable from current input:

- static level/mechanic features;
- action/stage identity and work already spent;
- prior attempt outcome and censoring;
- best/final badness where present;
- participation/exhaustion;
- simple repeated-action/config-family history.

Compare against simple fixed-order/tranche baselines before any dynamic model. Preserve rare unique action capability explicitly.

If these signals capture little of the 94.74% ceiling, close the dynamic-selector direction despite the large hindsight reservoir. If a simple signal captures a material fraction with zero/controlled solve loss, then a matched-work shadow/live scheduler consumer is earned.

## Relation to cross-action redundancy

This result also prioritizes the separate redundancy question but does not answer it. A large pre-winner reservoir means whole-action elimination could dwarf sub-node caching gains. The next legal-signal study should therefore record which predecessor actions consume the removable ceiling. Only high-cost recurrent predecessor/winner pairs should earn deeper operational-overlap tracing.

That ordering prevents an all-techniques trace census.

## Queue disposition

Add the legal-signal capture study to Workstream 1 as the next action-selection gate. Cross-action operational tracing remains downstream and pair-targeted: first identify expensive predecessor/winner relationships where a decision could actually change.

No production scheduling change is earned by this report alone.
