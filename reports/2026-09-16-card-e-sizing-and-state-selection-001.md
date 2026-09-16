# Card-E continuation/handoff sizing and state-selection descriptor gate 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-16 — a fresh 156-row independent population (score-width-culled, unsolved, class-4/class-5, current post-Class-4-promotion residual), run through the identical natural-exposure-census + seeded-operator-reachability contract the original 28-row nomination used, followed by an offline legal current-state descriptor test on the resulting labelled population.
> **Decision:** the reconstructable-but-unexposed phenomenon **recurs at 17/156 (10.9%, 95% CI [6.9%, 16.8%])**, cross-class (9 class-4 / 8 class-5) and cross-regime (intersection-heavy/must-cross-heavy/multi-portal), clearing the prespecified sizing trigger. The immediate descendant question — can a compact, mechanism-earned, legal current-state descriptor rank these states above the current (null) continuation boundary, beyond what generic cull depth already predicts — is **CLOSED NEGATIVE**: two independently motivated descriptor families both failed a depth-controlled likelihood-ratio test (3.11 and 3.47 against a critical value of 5.99 at df=2, p=0.05) and neither improved held-out AUC over a depth-only baseline. Per the standing instruction, do not implement a matched-work handoff pilot from this evidence; the sizing result itself is preserved as capability-memory evidence.
> **Remaining gate:** none for Card E under the current production boundary and the two tested descriptor families. Reopen only with a materially different, mechanism-earned descriptor family (not depth/difficulty, not the failed families here) nominated by new evidence.
> **Evidence role:** the 156-row population is discovery/sizing evidence (prespecified before outcomes were inspected) for the exposure/reachability question; it is *development* evidence for any future descriptor nomination (its labels already informed which descriptor families were tried and rejected here).
> **Production authority:** none. This report is research measurement only; production behavior is unchanged.

## Why this ran

`docs/solver-optimization-workstreams.md` names Card-E continuation/handoff sizing as the sole earned WS2 premise-generation gate as of 2026-09-16, following the September first-loss program's 4/28 (14.3%) nomination (`reports/2026-09-11-repair-side-first-loss-exposure-001.md`) and the harvest/reopen-map reports that explicitly required a materially larger independent sample under the same causal decomposition before any handoff design (`reports/2026-09-16-post-ws2-premise-harvest-001.md`, `reports/2026-09-11-new-premise-reopen-map-001.md`).

## Reconstructed measurement contract

Verified from code before compute (not from report prose):

- **Beam known-solution-prefix survival / phenotype screen:** `scripts/stress/collect-known-solution-prefix-survival.mjs`. At the recorded `finalSupportLoss`, `lossCause` distinguishes `score-width-culled` (ordinary simultaneous-frontier competition, the Card-E phenotype) from `coarse-state-merge-removed` (the R01273/WS4 mechanism) and hard-prune. Both original 28-row samples were 28/28 `score-width-culled`; this report freezes eligibility on the same predicate rather than loosening it.
- **Natural repair exposure:** `scripts/stress/census-repair-rollback-windows.mjs --only=<ids> --node-budget=<30000|300000>`, using its own `rollbackCensus` (`scripts/stress/research-analysis-lib.mjs`) `commonPrefixSteps` — the longest prefix an elite shares with any known-valid trajectory.
- **Seeded operator reachability:** `scripts/stress/repair-plateau-rollout-classifier.mjs --retreat-file=<synthetic> --backoffs=0 --rollout-trials=2000 --rollout-node-cap=5000 --close-gap-node-budget=2000000`, invoking the real `searchCompletionFromPartialPath` operator from the exact beam-cull-depth state, with referee validation (`Solver.validateCandidatePath`) plus an independent from-scratch replay (`isSolutionState`) on every claimed solve — identical parameters to the original 2026-09-11 report.

These are the same tools/parameters the original nomination used; nothing here is a looser proxy.

## Population contract (frozen before outcomes were inspected)

1. Rebuilt the current production residual atlas against the post-Class-4-promotion baseline run `35066677597` (the live authority's own boundary: 531 residual, classes 17/30/23/71/390) via `analyze-post-1029-residual-atlas.mjs` with that run's per-level/lifecycle files, the existing `33717910218` technique census, and current `data/stress/hints-random` — reproduced the documented 531/17/30/23/71/390 split exactly.
2. Eligible = `primaryClass` in {4,5}, referee-valid stored hint present, **excluding**:
   - the original 28-id Card-E population (14 dev + 14 confirmation ids from the two September first-loss phenotyping reports) — excluded regardless of current residual membership (17/28 are still resident; excluded anyway per the task's independence requirement);
   - the 21 ids `PRUNE_MC_PORTAL_FORCED_NEIGHBOR` already rescues (the dev sample's own `excludedGains`) — defensive exclusion, none were still resident;
   - 5 ids spent on pipeline-timing calibration before any frozen draw existed (`R00044,R00046,R00073,R00088,R00093`), same discipline as Card A's `R00726`.
   - Result: 439 eligible rows (65 class-4, 374 class-5).
3. **Draw pool** (`card-e-draw-pool.json`, seed `card-e-sizing-population-2026-09-16`, mulberry32/FNV-1a/Fisher-Yates — same convention as `census-repair-rollback-windows.mjs` and siblings): **all 65 eligible class-4 rows** (the full stratum — deliberate, not a subsample, because the class-4 residual itself is small) **+ 135 class-5 rows** drawn proportionally by routing regime (112 intersection-heavy, 13 multi-portal, 8 must-cross-heavy, 2 general). Total M=200.
4. **Phenotype screen (Step 1a):** `collect-known-solution-prefix-survival.mjs --beam-width=2000 --node-budget=3000000` on all 200 draw-pool ids. Frozen cohort = `solved===false` AND `lossCause==='score-width-culled'`: **156/200 (78%)**. 44/200 (22%) instead lost known-live support via `coarse-state-merge-removed` (0 via hard-prune, 0 solved outright at this elevated single-technique budget). This screen was run once, before any exposure/reachability measurement, exactly as prespecified.

The frozen cohort (156 rows: 59 class-4, 97 class-5; 125 intersection-heavy, 20 multi-portal, 10 must-cross-heavy, 1 general) is **5.6x the original 28-row nomination** and independent of it by construction.

### Side observation: 44/200 coarse-state-merge-removed rows (not pursued further here)

These 44 rows (6 class-4, 38 class-5; 40 intersection-heavy, 2 must-cross-heavy, 2 general, **0 multi-portal**) are excluded from the Card-E population because they lose known-live support through a materially different mechanism (WS4's coarse-state-merge, not score-width competition). Their **non-portal** concentration is notable: the only promoted/closed coarse-state-merge work (`STRATEGY_PORTAL_COARSE_STATE_MERGE`, closed negative; `R01273`'s forensic) is portal-scoped, so this 22% non-portal recurrence rate is a candidate WS4 reopening nomination, not yet investigated. Preserving it here as capability-memory evidence per the standing rule; not pursued in this session (out of Card-E's scope, and the task's instructions are explicit about not manufacturing parallel archaeology).

## Confirmation pass (Step 1b, width=5000, not used for filtering)

Ran `--beam-width=5000 --node-budget=6000000` on the frozen 156-row cohort to confirm width-insensitivity (matching both original reports' method). **150/156 (96%) remain `score-width-culled` at the higher width**; 5/156 shift to a different loss cause (coarse-state-merge becoming reachable at the wider frontier) and 1/156 (`R03365`) solves outright at this elevated single-technique budget. Among the 150 still-culled rows, the width-5000 cull depth moves out by a median of **1 step** and mean of **2.4 steps** relative to width-2000 (range 0-34) — a clean replication of both original reports' "2.5x width buys only a handful of extra steps, not proportional headroom" finding, now on 5.6x more levels. This is confirmatory only; it does not change cohort membership, the frozen phenotype screen, or any decision above.

## Step 2: natural repair exposure (30k and 300k dose)

`census-repair-rollback-windows.mjs --only=<156 ids> --node-budget=30000` and again at `300000`, exactly as the original report. Mean natural best-common-prefix / beam-cull-depth ratio at 300k: **0.173** (original 28-row report: ~0.19) — a clean replication of "natural exposure is essentially absent," now on a 5.6x larger sample. **0/156** rows had a natural common-prefix depth at or beyond their own beam cull depth at 300k dose (the frozen `naturally-exposed` predicate) — i.e. the `reconstructable+exposed` bucket is empty by construction in this population, replicating the original finding that repair's random-restart search does not wander into this territory on its own, at any tested dose.

## Step 3: seeded operator reachability (2,000,000-node ceiling)

Built one synthetic retreat-file entry per frozen-cohort row: `{elite: {levelId, path: <referee-valid known-live hint path sharing the row's recorded beam gateKey>, eliteLength}, low: <beam cull depth>, high: low+1}` (identical construction to the original report), then ran `repair-plateau-rollout-classifier.mjs --retreat-file=... --backoffs=0 --rollout-trials=2000 --rollout-node-cap=5000 --close-gap-node-budget=2000000`.

**Result: 17/156 (10.9%) reconstructable** — `searchCompletionFromPartialPath` solved, referee-valid, and independently replay-valid on all 17 (nodes ranged 297 to 1,914,068). **139/156 (89.1%) non-reconstructable** — every one exhausted the exact 2,000,000-node ceiling (genuine operator incapability at this budget, not a truncation artifact). **0/156 indeterminate** (no errors, no unresolved retreat-file entries, no untrusted referee/replay result).

## Cross-tabulation (the Card-E answer)

| Bucket | n | rate |
|---|---:|---:|
| reconstructable + naturally exposed | 0 | 0.0% |
| **reconstructable + NOT naturally exposed (OPPORTUNITY)** | **17** | **10.9%** (95% Wilson CI [6.9%, 16.8%]) |
| non-reconstructable | 139 | 89.1% |
| indeterminate | 0 | 0.0% |

Opportunity rows span **both classes** (9 class-4, 8 class-5) and **three routing regimes** (12 intersection-heavy, 3 must-cross-heavy, 2 multi-portal). Overall reconstructable rate (10.9%) is statistically indistinguishable from the original 28-row nomination's 14.3% (both inside each other's confidence interval), and the overall exposure-ratio shape (mean 0.173 vs ~0.19) replicates cleanly — this is the same phenomenon, not a new one, now measured with much narrower uncertainty.

## Decision: sizing trigger cleared

Prespecified (before any frozen-cohort outcome was inspected — see `card-e-prespec.md`, folded in here for the record) trigger required **all** of:

1. opportunity rate point estimate ≥ ~8% → **10.9% clears it**;
2. absolute opportunity count ≥ ~16 (enough for a genuinely held-out development/confirmation split) → **17 clears it**;
3. recurrence across both classes and multiple routing regimes → **9/8 class split, 3 regimes clears it**.

**Card E's sizing gate is POSITIVE.** The reconstructable-but-unexposed phenomenon is real, recurring, and not confined to one class or structural cluster. Per the standing instruction, this earns exactly one next step: an offline legal state-selection descriptor test, splitting the newly-labelled population into development/held-out halves — not a handoff implementation.

## State-selection descriptor gate

**Question:** can a compact, mechanism-earned, legal current-state/current-search descriptor rank/filter the 17 opportunity rows above the 139 non-reconstructable rows, beyond what generic cull depth alone predicts?

**Split:** stratified by label (to guarantee both halves contain positives), deterministic seed `card-e-descriptor-split-2026-09-16`: dev 79 rows (9 positive), held-out 77 rows (8 positive).

**Legality boundary enforced:** only fields computable from the beam search's own generic frontier/state at the cull point, or from static level structure, were used. Fields requiring the known-solution-label subset of the candidate pool (`bestKnownRank`, `scoreMarginToCutoff`, `structuralWinningFamilies`, `canonicalWorkAfterExtinction`, the A/B/C/D `classification`) are oracle-derived and were excluded from every candidate descriptor — they exist in the underlying data only because this is an offline labelled study, not because production could compute them.

**Tested descriptor families** (kept small, per the standing "no generic feature soup" rule):

1. **Mechanism family 1 — score-width competition intensity + obligation load:** `poolCrowding = candidatePoolSize / beamWidth` (directly the phenotyping reports' own "beam's simultaneous multi-path width competition" mechanism) and `obligationLoad = mustCross + mustPass` (unresolved structural obligation).
2. **Mechanism family 2 — near-miss margin / saturation:** `candidatesTiedAtCutoff` and `widthSaturated` (directly the phenotyping reports' own A-clearly-mis-ranked vs D-diversity-width-saturation classification boundary, using only the generic pool-size/tie-count facts, not the oracle-derived rank/margin).

Both were fit as logistic regression on the **full 156-row labelled set** (control-for-depth check) and separately as held-out-evaluated models fit only on the dev half (predictive check):

| Model | Depth-controlled LR stat (df=2, crit=5.99 @ p=.05) | Held-out AUC (dev-fit) | Depth-only held-out AUC |
|---|---:|---:|---:|
| depth + poolCrowding + obligationLoad | 3.11 (not significant, below even p=.10 crit 4.61) | 0.955 | **0.989** |
| depth + tiedAtCutoff + widthSaturated | 3.47 (not significant) | — | — |

In both cases, adding the mechanism-earned features did **not** improve fit beyond depth alone, and for family 1 the full model's held-out AUC was actually *lower* than the depth-only baseline's. Per the standing instruction ("Control for generic depth/difficulty/work effects. A descriptor that merely identifies later/deeper/harder states is not enough"), depth itself does not count as a valid descriptor even though it is by far the strongest univariate predictor here (raw depth-only held-out AUC 0.989) — precisely because the task explicitly disqualifies a descriptor that merely tracks generic depth/difficulty, and neither tested mechanism family adds anything beyond what depth already explains.

**Disposition: state-selection descendant CLOSED NEGATIVE.** No compact legal descriptor beyond generic depth survives for the two tested mechanism families. Per the standing rule ("If no compact legal signal survives, close the state-selection descendant without implementing handoff"), do not proceed to a matched-work handoff pilot from this evidence.

## What this does and does not establish

- **Establishes:** the reconstructable-but-unexposed phenomenon Card E nominated is real and recurs at a stable ~11% rate across a materially larger, independent, cross-class, cross-regime population — not an artifact of the original 28-row sample.
- **Establishes:** natural repair exposure to this territory remains essentially zero regardless of dose, replicating the original exposure finding at 5.6x scale.
- **Establishes:** two mechanism-earned candidate descriptor families do not clear the depth-controlled bar this task sets, closing the immediate next gate.
- **Does not establish:** that *no* legal descriptor could ever work — only that these two motivated, small families do not, on this population.
- **Does not establish** a solution to a second, logically prior engineering gap this measurement exposed: even a working descriptor would need to identify *which specific discarded beam candidate* (out of ~2,000-4,500 per cull event) is worth seeding repair from, without oracle knowledge of which one is "known-live." This offline study only ever tests the oracle-known candidate's own reachability; it does not test candidate-selection-within-pool at all. Any future descendant of this line needs to solve that sub-problem explicitly, not assume it away.
- **Does not** license reopening this exact form later merely by trying a third or fourth descriptor family on the same labelled population without new evidence motivating it — that population is now development data for any future descriptor nomination, per the evaluation-evidence contract.

## Disposition

- **Card E (mechanism-aware continuation/handoff), sizing sub-gate:** **CLOSED — PHENOMENON CONFIRMED, no production or research-implementation action follows directly.** The recurring ~11% reconstructable-but-unexposed rate is preserved as capability-memory evidence (mechanism: score-width retention loss with seeded-repair-reconstructable residue), not converted into runtime steering.
- **Card E, state-selection descendant:** **CLOSED NEGATIVE** for the two tested descriptor families. Do not implement a bounded matched-work handoff pilot from current evidence. Reopen only with a materially different, mechanism-earned descriptor family motivated by new evidence (not depth/difficulty, not a retry of the two families tested here) — or after a separate line establishes a legal candidate-selection-within-pool mechanism, since that gap blocks any handoff regardless of ranking-descriptor success.
- **Side observation (not pursued):** 44/200 (22%) of the broader residual draw lost known-live support via non-portal `coarse-state-merge-removed`, a materially different rate/scope than the single-level `R01273` finding the current WS4 disposition rests on. This is a candidate WS4 reopening nomination for a future session, not investigated here.

## Artifacts

- [`draw pool`](stress/card-e-sizing-draw-pool-001.json) — 200-id stratified draw with provenance/features.
- [`frozen cohort`](stress/card-e-sizing-frozen-cohort-001.json) — 156-row score-width-culled Card-E population plus excluded-row bookkeeping.
- [`beam survival, width=2000`](stress/card-e-sizing-beam-width2000-001.json) — Step 1a raw output (200 rows) and score-width forensics.
- [`beam survival, width=5000`](stress/card-e-sizing-beam-width5000-001.json) — Step 1b confirmatory raw output (frozen 156-row cohort).
- [`repair rollback census, 30k`](stress/card-e-sizing-repair-rollback-census-30k-001.json) / [`300k`](stress/card-e-sizing-repair-rollback-census-300k-001.json) — Step 2 natural-exposure census.
- [`retreat file`](stress/card-e-sizing-retreat-file-001.json) — synthetic seeded-reachability input (156 entries).
- [`operator reachability`](stress/card-e-sizing-repair-operator-reachability-001.json) — Step 3 raw output including referee/replay verification per solve.
- [`cross-tab`](stress/card-e-sizing-cross-tab-001.json) — the 4-bucket classification per row.
- [`descriptor dataset`](stress/card-e-sizing-descriptor-dataset-001.json) / [`descriptor result`](stress/card-e-sizing-descriptor-result-001.json) — state-selection gate inputs/outputs.

Reused unmodified: `collect-known-solution-prefix-survival.mjs`, `census-repair-rollback-windows.mjs`, `repair-plateau-rollout-classifier.mjs`, `analyze-post-1029-residual-atlas.mjs`. No production or solver code was modified in this report.
