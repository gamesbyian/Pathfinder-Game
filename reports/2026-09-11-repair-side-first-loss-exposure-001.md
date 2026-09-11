# Repair-side first-loss exposure on the class-4/class-5 frontier population 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-11 — (1) `census-repair-rollback-windows.mjs` (extended with `--only=<ids>`) run against the full 28-level first-loss frontier population at two matched-work node budgets (30,000 and 300,000); (2) `repair-plateau-rollout-classifier.mjs --retreat-file=<synthetic>` seeding `searchCompletionFromPartialPath` directly at the exact state where each level's beam known-solution-prefix survival lost support, using a referee-valid stored hint path as the already-proven-live splice point (no CP-SAT bisection needed — liveness is free from the known solution itself).
> **Decision:** the two questions dissociate cleanly. **Natural exposure is essentially absent and work-insensitive** (repair's random-restart search almost never wanders near these known-live states, and 10x more work does not change that). **Operator reachability when seeded exactly there is a different question with a different, non-trivial answer: 4/28 (14.3%) are reconstructable** by repair's own unmodified `searchCompletionFromPartialPath` operator (independently referee- and replay-verified), the other 24/28 (85.7%) exhaust the full 2,000,000-node diagnostic ceiling exactly (genuine operator incapability, not a budget artifact). This 14.3%/85.7% split is statistically indistinguishable from the general-population rate the Sept-2 program established on an unrelated random sample (21.4%/78.6% at n=28) — **this specific first-loss frontier population is not unusually operator-incapable; it is unusually unexposed.**
> **Remaining gate:** none for this specific population/question — both sub-questions are now resolved. The 4 reconstructable cases are a candidate trigger for the new-premise map's Card E (state-selection/continuation): a genuine state-selection signal (the exact point beam loses support) identifies partial states that repair's own operators can complete, but repair's ordinary restart policy does not naturally find them. Per the map's own discipline, this does not itself authorize implementing a handoff mechanism — see "Disposition" below.
> **Evidence role:** discovery/diagnosis (bounded, selected-diagnostic evidence, same population as the two first-loss phenotyping reports). Not a population-scale claim, not a production change.

## Why now

The bounded class-4/class-5 first-loss phenotyping program explicitly left repair `unknown`: "no existing tool cheaply traces known-solution-prefix survival through it... a real gap in this pilot's coverage, not a negative result." `solver-optimization-workstreams.md`'s WS2 gate 5 and this session's assignment (Line B) both name repair-side coverage as earned next work. The task's own framing requires distinguishing: repair never being exposed; repair receiving inadequate work; a valid repair being operator-reachable but poorly ranked/sampled; the required edit being outside current repair-operator topology; the path having already lost viability before repair can help.

## Method

`scripts/stress/census-repair-rollback-windows.mjs` already implements exactly the needed primitive: run `repairSearchFromGate` from the gate under its own randomized-restart policy, collect its best-badness elite arrivals, and compute (via `rollbackCensus`) the **longest common prefix** between each elite and any referee-valid known solution — i.e., how deep into the known-live trajectory repair's own natural search actually tracks before diverging. This is the same tool and metric the existing repair-reachability program (`2026-09-02-repair-live-prefix-reconstruction-near-budget-boundary-recurrence.md`) used to estimate a 21.4% reconstructable / 78.6% operator-incapable split on a **general** Corpus-2 sample.

The tool only supported `--sample=N` (fresh random draw) or `--limit-levels=N` (first N), neither of which can target our specific frozen 28-id population. Added `--only=<comma-ids>` (same convention already used by `repair-elite-path-dump.mjs`), purely additive — every existing caller/test is unaffected (verified via `naming-cleanup-phase8-cli-smoke-node-test.mjs`, which exercises this script's CLI).

Ran twice on the identical 28-id population (14 dev-sample + 14 confirmation-sample ids from the two phenotyping reports), varying only `--node-budget`, to separate "inadequate work" from a genuine exposure limit:

```
node scripts/run-bundled.mjs scripts/stress/census-repair-rollback-windows.mjs -- \
  --only=<28 ids> --limit-elites=5 --node-budget=30000 \
  --out=reports/stress/first-loss-frontier-repair-rollback-census-001.json

node scripts/run-bundled.mjs scripts/stress/census-repair-rollback-windows.mjs -- \
  --only=<28 ids> --limit-elites=5 --node-budget=300000 \
  --out=reports/stress/first-loss-frontier-repair-rollback-census-300k-001.json
```

30,000 matches this tool's own historical default (used throughout the Sept-2 general-population program); 300,000 is a 10x matched-work escalation, still well under production's `EARLY_REPAIR_SEARCH_ORDINARY_NODE_BUDGET` (2,000,000) — chosen as the smallest step that could plausibly falsify "just needs more work" before spending compute at full production scale.

## Result

**All 28 levels fully consumed their node budget at both settings** (`nodesExpanded` ≈ budget ± noise), so this is a genuine matched-work comparison, not an artifact of early natural termination.

| levelId | best natural common-prefix (30k) | best natural common-prefix (300k) | beam score-width cull depth (width=2000) | ratio (repair/beam) |
|---|---:|---:|---:|---:|
| R00139 | 3 | 3 | 14 | 0.21 |
| R00329 | 1 | 1 | 13 | 0.08 |
| R00786 | 3 | 3 | 21 | 0.14 |
| R01023 | 2 | 1 | 16 | 0.13 |
| R01097 | 1 | 1 | 16 | 0.06 |
| R01190 | 1 | 1 | 22 | 0.05 |
| R01290 | 1 | 1 | 11 | 0.09 |
| R01632 | 3 | 3 | 10 | 0.30 |
| R02025 | 1 | 1 | 16 | 0.06 |
| R02170 | 5 | 5 | 18 | 0.28 |
| R02185 | 12 | 3 | 16 | 0.75* |
| R02210 | 1 | 1 | 13 | 0.08 |
| R02309 | 3 | 3 | 19 | 0.16 |
| R02324 | 1 | 1 | 12 | 0.08 |
| R02438 | 9 | 9 | 17 | 0.53 |
| R02530 | 1 | 1 | 16 | 0.06 |
| R02590 | 1 | 1 | 22 | 0.05 |
| R02733 | 1 | 1 | 16 | 0.06 |
| R02801 | 1 | 1 | 12 | 0.08 |
| R02897 | 6 | 6 | 41 | 0.15 |
| R03083 | 1 | 1 | 11 | 0.09 |
| R03088 | 1 | 1 | 13 | 0.08 |
| R03101 | 17 | 17 | 16 | 1.06 |
| R03197 | 2 | 2 | 13 | 0.15 |
| R03223 | 1 | 1 | 14 | 0.07 |
| R03229 | 4 | 4 | 22 | 0.18 |
| R03275 | 1 | 1 | 15 | 0.07 |
| R03351 | 3 | 3 | 34 | 0.09 |

\* R02185's 30k value (12) is an artifact of which 5 (of the level's ~60-100) elites happened to be sampled at that budget, not a genuine work-driven improvement — its 300k value (3) is more representative and consistent with the rest of the population; both are far below its own beam cull depth (16).

**26/28 levels: zero change with a 10x work increase. 2/28: nominally worse** (an artifact of "best of only 5 sampled elites" changing which 5 arrived, not a real regression — repair's node-level search is not deterministic/monotonic across restarts with different arrival counts). **Mean ratio: repair's best natural common-prefix depth is ~19% of beam's own score-width cull depth on the same levels** — repair diverges from any known-valid trajectory dramatically earlier than beam does, and this gap does not close with an order-of-magnitude more work.

## Interpretation

This is the same "more dose does not buy proportional headroom" shape the phenotyping reports already established for beam width (2.5x width bought only 0-13 extra steps). Here, a **10x** work increase bought **zero** improvement on the large majority of levels. Per the operating model's own rule ("do not reopen closed forms by changing dose... width, or runtime"), this rules out "repair just needs a bigger node budget" as the explanation and instead nominates a genuine **exposure** limit: repair's randomized-restart-from-gate policy does not, even with substantially more sampling, wander into states resembling this population's known-live trajectories beyond a shallow point.

This is a materially different failure shape from beam's own loss on the same levels. Beam *does* track the known-live path deeply (10-41 steps) before its score-width competition discards it — beam clearly explores this territory. Repair's natural search essentially never reaches it at all. In the task's own vocabulary: this reads as **"repair never being exposed,"** not as "operator-reachable but poorly ranked/sampled" (that would require repair to actually visit states along this path).

## Operator reachability when seeded exactly there

The natural-exposure census leaves one question open: if repair's search *did* somehow arrive at the exact state where beam loses known-live support, could its own operators (`evaluatePrunedMove`/`getNeighbors`/`scoreAndSort`, the same `searchCompletionFromPartialPath` reconstruction primitive the general-population operator-incapability program uses) construct a legal completion from there?

This is answerable *without* the general program's own CP-SAT bisection step, because liveness at that exact depth is already free: it is a prefix of a referee-valid stored hint, not an unverified elite dead end. Built a synthetic `repair-retreat-binary-search.mjs`-shaped file directly — `{elite: {levelId, path: <known-live hint path>, eliteLength}, low: <beam's own finalSupportLoss.depth>, high: low+1}` for each of the 28 ids (`low` capped at the known path's own length as a safety bound) — and fed it straight to `repair-plateau-rollout-classifier.mjs --retreat-file=<synthetic> --backoffs=0 --close-gap-node-budget=2000000`, exactly the tool's own existing `--retreat-file` mode, unmodified.

```
node scripts/run-bundled.mjs scripts/stress/repair-plateau-rollout-classifier.mjs -- \
  --corpus=data/stress/stress-levels-random.json \
  --retreat-file=<synthetic retreat file, one entry per id, low=beam cull depth> \
  --backoffs=0 --rollout-trials=2000 --rollout-node-cap=5000 --close-gap-node-budget=2000000 \
  --seed=repair-operator-reachability-first-loss-frontier-2026-09-11 \
  --out=reports/stress/first-loss-frontier-repair-operator-reachability-001.json
```

**Result: 4/28 (14.3%) reconstructable, 24/28 (85.7%) operator-incapable.**

| id | verified-live depth (= beam cull depth) | `closeLengthGap` result | nodes | referee | independent replay |
|---|---:|---|---:|---|---|
| R02530 | 16 | **SOLVED** | 225,824 | ok | `isSolutionState: true` |
| R02733 | 16 | **SOLVED** | 965,566 | ok | `isSolutionState: true` |
| R02590 | 22 | **SOLVED** | 352,459 | ok | `isSolutionState: true` |
| R02897 | 41 | **SOLVED** | 6,593 | ok | `isSolutionState: true` |
| (other 24 ids) | 10-34 | **FAILED** | 2,000,000 (full ceiling, every case) | — | — |

Every failure exhausted the exact 2,000,000-node diagnostic ceiling — the same signature the Sept-2 general-population program uses to rule out "just needs a modest budget increase" and confirm genuine operator incapability rather than a truncated search. Every solve landed well inside that ceiling (6.6k-966k nodes) and passed both the canonical referee and an independent from-scratch replay.

## What this does and does not establish

- **Establishes (natural exposure):** on this specific 28-level first-loss frontier population, repair's natural search does not naturally approach the known-live trajectories, and this is not an artifact of a too-small node budget (10x escalation, fully matched-work, no improvement).
- **Establishes (operator reachability):** when seeded exactly at the state where beam loses known-live support, repair's own unmodified reconstruction operator solves 4/28 (14.3%), each independently referee- and replay-verified. This rate is statistically indistinguishable from the general-population Sept-2 program's own 21.4% (n=28, unrelated random sample) — **the two populations do not differ materially in operator-topology capability.** What differs is exposure: the general-population program samples repair's *own natural* near-misses (which it does reach), while this population's known-live states are ones repair's natural search essentially never visits at all (per the exposure census above). The frontier population's "repair coverage" deficit is therefore an **exposure/allocation** problem, not a **generic** operator-topology problem — though 24/28 *specific* required edits here remain outside current repair-operator topology, same as the general population's own majority class.
- **Does not establish** whether the underlying paths have already lost viability by depths beyond the tested splice point — that remains a WS5 exact/reference adjudication question if a specific nominated state's liveness is ever in doubt (not needed here, since liveness was already free from the known solution).
- **Does not itself earn the WS6 premise as originally framed:** WS6's trigger is a recurring valid rescue requiring an edit outside repair's operator topology *as the dominant obstacle*. Here the dominant obstacle for the reconstructable minority is not operator topology (their edits ARE within repair's topology) but that repair never samples them — an allocation/state-selection story. The 24/28 operator-incapable majority does match WS6's literal trigger shape, but at a rate indistinguishable from the already-characterized general population, so it does not constitute new evidence beyond what `2026-09-02-repair-live-prefix-reconstruction-near-budget-boundary-recurrence.md` already established.
- **Is a candidate trigger for the new-premise map's Card E (continuation/handoff), not WS6:** 4 concrete, independently verified cases where "a genuine state-selection signal identifies partial states retaining live futures" (the exact beam-cull-depth state) and "repair's own operators can complete them" — the map's own second route to reopening continuation/handoff work. This is a nomination, not an implementation: per the map's explicit discipline ("do not reopen... handoff... merely because the new premises are plausible... write a tiny prespecified preflight... before compute"), no handoff/continuation mechanism is proposed or built here. n=4 out of a 28-level bounded sample is also too small to size any such mechanism's expected value — a materially larger sample would be the next step before any design work, not implementation from this count alone.

## Artifacts

- `scripts/stress/census-repair-rollback-windows.mjs` — extended with `--only=<ids>` (additive; existing `--sample`/`--limit-levels` paths unchanged, verified via the existing CLI smoke test).
- [`reports/stress/first-loss-frontier-repair-rollback-census-001.json`](stress/first-loss-frontier-repair-rollback-census-001.json) (30k), [`...-300k-001.json`](stress/first-loss-frontier-repair-rollback-census-300k-001.json) (300k).
- [`reports/stress/first-loss-frontier-repair-operator-reachability-001.json`](stress/first-loss-frontier-repair-operator-reachability-001.json) — `repair-plateau-rollout-classifier.mjs --retreat-file` output (unmodified tool; synthetic input only).
