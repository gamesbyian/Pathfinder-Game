# B2: extinction-adjacent exact-prefix CP-SAT labels

> **Status:** bounded observational result; no production score/quota/retention change
> **Case file:** [`reports/stress/winning-lineage-extinction-adjacent-cases-2026-08-12.json`](stress/winning-lineage-extinction-adjacent-cases-2026-08-12.json) (32 cases, 15 decision points)
> **Source data:** [`reports/2026-08-11-winning-lineage-score-width-forensics.md`](2026-08-11-winning-lineage-score-width-forensics.md) / [`reports/stress/winning-lineage-same-config-2026-08-11.json`](stress/winning-lineage-same-config-2026-08-11.json)
> **Prior B1 run:** GitHub Actions `31537268571`, 12 atlas abstentions → 7 dead / 1 live / 4 abstain (not rerun here)
> **B2 run(s):** GitHub Actions `31555961680` (pre-fix, completed, 30/32 clean + 2 correctness alarms). A post-fix CI corroboration run (`31560336475`) was dispatched but cancelled after queueing behind an unrelated corpus-sweep workflow for an estimated ~90 minutes on shared runner capacity; this report's numbers come from a local rerun on the same commit/case file instead (see Results).
> **Tooling fix:** `scripts/stress/cpsat-full-probe.py` gate-visits under-constraint, commit `572f0e51`

## Goal

B1 found one direct counterexample to "the extinction problem is just tie order or beam width": at an
R00001 parent, the beam's first-ranked sibling is CP-SAT-proven `INFEASIBLE` while the same parent has
a known-valid continuation elsewhere. The open question was whether that pattern is a property of
R00001 specifically, or generalizes across the corpus. This task builds a bounded, targeted set of
same-parent-sibling exact-prefix cases at *real* score/width extinction events (from the winning-lineage
forensics table, not R00001/R00044 again) and labels them with the same CP-SAT oracle.

## Method

**Case selection.** The committed forensics artifact (`reports/stress/winning-lineage-same-config-2026-08-11.json`)
strips per-candidate paths from its `scoreWidthForensics` table (score/rank/margin only) — the
underlying `rankedPool`/`culled` records with full cell paths are deleted unconditionally by
`WinningLineageObserver.observe()` before the artifact is written. The original emitter commit
(`0e831fd910784c4c255367ed902fa1d447240a63`) no longer resolves in this repository, so the raw
per-candidate data could not be pulled from history. Instead:

1. Reran `scripts/stress/winning-lineage-pilot.mjs` at HEAD with `--include-stages
   --retain-all-removal-details` (same corpus, limit, beam width, node budget, profile as the original
   run). This reproduced the report's exact **13 solved / 17 failed** split and all **15** score-width
   forensics rows (depth, pool size, best/worst rank, cutoff score, margin, classification) bit-for-bit —
   strong evidence this is a faithful regeneration, not a different run standing in for the original.
2. The rerun's `culled` records (rank > beam width, i.e. actually cut) carry full candidate paths,
   giving the known-supported culled candidate directly. The beam's *retained* top-ranked and
   near-cutoff candidates are **not** in the committed artifact shape at all (the observer deletes the
   full `rankedPool` regardless of the retention flag), so a small supplementary script attached a raw
   observer (not `WinningLineageObserver`) that captured `record.details.rankedPool` verbatim at the
   target `score-width-culled` stage for each selected level/depth. This is a read-only research
   capture, not a solver code change; the script was deleted after use.
3. Selected all **15** rows of the forensics table's "Fifteen failed final score/width extinctions"
   (10 A / 3 B / 0 C / 2 D / 0 E), all distinct from the 12 cases B1 already labelled (R00001/R00044).
   For each row: the beam's rank-1 (score-preferred, retained) candidate — the direct generalization
   test of the R00001 pattern — and the nearest-miss known-supported culled candidate (lowest rank
   among the row's `supportedPool`) — confirming a genuine alternative existed. The two D-class
   (width-saturation) rows additionally got a third case: the retained candidate at rank 100 (the width
   boundary itself), to probe whether the saturated pool is mostly alive or mostly dead.
4. **32 cases total.** Corpus is `data/stress/stress-levels.json` for every row — all 15 selected levels
   live there (corpus-1 mixes S-/R-prefixed ids; the handoff doc's generic template example used
   `stress-levels-random.json`, which does not contain these ids — corrected here to the data's actual
   location, not a task-scope change).
5. Every prefix was replayed against the native solver (`getNeighbors`/`applyMove`, mirroring
   `cpsat-explicit-prefix-oracle.mjs`'s own `replayPrefix`) and confirmed legal before commit — 0
   `native-prefix-illegal` input alarms in the completed CI run or either local run.

**Dispatch.** `.github/workflows/cpsat-explicit-prefix-oracle.yml`, `case_format=cases`, `corpus=`
blank (case file supplies it), `time_limit=60`, `max_cases=32`.

## A correctness blocker found and fixed

The first dispatch (`31555961680`) processed all 32 cases but the job **failed** (exit code 2): 2 of the
32 rows — both on **S00108** — came back `sat-witness-referee-rejected`, a correctness alarm per this
task's own instructions ("treat any... referee alarm on a 'live' result as a correctness blocker to
investigate, not something to paper over").

Investigation traced this to `cpsat-full-probe.py`'s gate handling. S00108 is a **4-gate** level (the
only multi-gate level among the 15 selected rows — every other row's level has exactly 1 gate). The
model's only per-gate constraint was:

```python
for g in gates:
    if g in idx: m.Add(visits[g] <= 1)
```

This correctly bounds the *chosen* start gate (naturally forced to exactly 1 via `x[0][g]`), but left
every **other, unused** gate free to be visited once at any later timestep — CP-SAT happily routed a
witness straight through gate `(4,14)` mid-path. Real Pathfinder rules forbid this unconditionally:
`move-rules.ts` rejects any move whose target is in `gateKeys`, full stop, not just "the gate already
left" (`Invalid move at step 47` from `validateCandidatePath`, `invalid-gate-reentry`). The referee
caught exactly what it exists to catch; nothing was silently reported live.

Fixed (commit `572f0e51`) by tying each gate's visit count to whether it was the chosen start:

```python
for g in gates:
    if g in idx:
        m.Add(visits[g] == 1).OnlyEnforceIf(x[0][g])
        m.Add(visits[g] == 0).OnlyEnforceIf(x[0][g].Not())
```

Verified locally: both affected S00108 cases now resolve to referee-valid `live` results with 0
correctness alarms. A corroborating CI dispatch (`31560336475`, same commit, same case file) was
cancelled after queueing behind an unrelated corpus-sweep workflow for an estimated ~90 minutes on
shared runner capacity (the first B2 dispatch alone had already queued ~42 minutes before starting) —
not worth holding a runner slot for when local `ortools` execution gives the identical, deterministic
answer. This report's numbers are the local rerun. A **pre-existing**,
unrelated `--check-witness` failure on S00108 was confirmed present on the *unmodified* code too (via
`git stash`) — almost certainly the model's own documented gap on portal-pair-count 1–3 levels (the
file's header only validates 0/4/5/6/7 pairs; S00108 has 1) — left untouched, out of this task's scope.

Because an under-constrained (over-permissive) model can only produce **false positives** on
feasibility, never false negatives, this bug could not have corrupted either `dead`/`INFEASIBLE`
verdict reported below — a superset-relaxed model reporting infeasible guarantees the true, stricter
model is infeasible too. It only risked corrupting `live` verdicts, and those are independently
referee-checked before being reported — which is exactly how this was caught in the first place. This
fix is also relevant to item C (repair-retreat CP-SAT), which reuses this same script and could
encounter multi-gate elites.

## Results

Final (post-fix) local run, commit `572f0e51`, same case file dispatched to CI:

**32 cases: 9 live / 2 dead / 21 abstain. 0 correctness alarms. 0 input alarms.**

| level | class | pool/width | margin | top-1 (score-preferred) | known-supported (culled) | near-cutoff extra |
|---|---|---:|---:|---|---|---|
| S00001 | A | 142/100 | 11.92 | **dead** (INFEASIBLE) | **live** (OPTIMAL, referee-valid) | — |
| S00028 | A | 224/100 | 34.43 | abstain (unsupported-mechanics) | abstain (unsupported-mechanics) | — |
| S00030 | D | 256/100 | 3.19 | abstain (unsupported-mechanics) | abstain (unsupported-mechanics) | abstain (unsupported-mechanics) |
| S00035 | A | 229/100 | 21.80 | abstain (unsupported-mechanics) | abstain (unsupported-mechanics) | — |
| S00048 | D | 266/100 | 2.01 | abstain (unsupported-mechanics) | abstain (unsupported-mechanics) | abstain (unsupported-mechanics) |
| S00095 | B | 230/100 | 0.22 | **live** (OPTIMAL) | **live** (OPTIMAL) | — |
| S00099 | A | 255/100 | 3.10 | abstain (oracle-unknown, timeout) | **live** (OPTIMAL) | — |
| S00108 | B | 216/100 | 0.49 | **live** (OPTIMAL) | **live** (OPTIMAL) | — |
| S00120 | B | 141/100 | 0.99 | **live** (OPTIMAL) | **live** (OPTIMAL) | — |
| S00140 | A | 148/100 | 1.74 | abstain (unsupported-mechanics) | abstain (unsupported-mechanics) | — |
| R00058 | A | 218/100 | 12.11 | abstain (unsupported-mechanics) | abstain (unsupported-mechanics) | — |
| R00060 | A | 127/100 | 58.07 | abstain (unsupported-mechanics) | abstain (unsupported-mechanics) | — |
| R00064 | A | 163/100 | 9.01 | abstain (unsupported-mechanics) | abstain (unsupported-mechanics) | — |
| R00087 | A | 228/100 | 64.95 | abstain (unsupported-mechanics) | abstain (unsupported-mechanics) | — |
| R00104 | A | 165/100 | 28.37 | **dead** (INFEASIBLE) | **live** (OPTIMAL, referee-valid) | — |

`unsupported-mechanics` = the level carries a flipping filter (or, for two rows, filters/flippers plus
portals), which `cpsat-full-probe.py` explicitly does not encode yet (`SKIPPED (filters/flipping
filters not encoded yet)`) — this is a pre-existing, documented scope limit, not a new gap found here.
9 of 15 levels carry flipping filters and abstained entirely; this dominates the abstain count, not
case-construction failure (0 `native-prefix-illegal` / `illegal-native-step` results anywhere).

## Interpretation

**The mis-ranking pattern (score prefers a dead future over a viable one) generalized, cleanly, twice,
independent of R00001.** Both A-class rows that returned *any* usable label (S00001, R00104) reproduced
the exact B1 shape: the beam's own top choice at that decision point is CP-SAT-proven dead, while a
real, referee-valid continuation existed at that same parent (the nearest-miss known-supported
candidate). That is now **4 independent, exact-CP-SAT-confirmed instances** of "dead-preferred-over-viable"
across two separate runs (R00001, R00044-family from B1; S00001, R00104 from B2) — no longer a single
anecdote.

**The pattern is concentrated in large-margin (A-class) extinctions, not weak-margin (B-class) ones — a
genuine refinement, not just more of the same.** Every B-class row that returned usable data (S00095,
S00108, S00120 — all 3) showed the *opposite* shape: the score's top pick and the known alternative were
**both** exact-feasible. At these decision points the score wasn't preferring a dead future; it was
choosing between two live branches and the known one lost by under a single point. That is a different
failure mode from A-class extinctions, and it argues against a one-size-fits-all fix — a
mis-ranking-targeted intervention (e.g. a neutral future-opportunity descriptor) should expect to help
the A-class regime and do little or nothing for B-class near-ties, which look more like ordinary
close calls than errors.

**D-class (width-saturation) remains completely untested** — both D rows (S00030, S00048) hit
`unsupported-mechanics` on every case, including the extra near-cutoff probe. No conclusion is possible
yet on whether a saturated pool is mostly-alive (crowding, not mis-ranking) or mostly-dead.

**S00099 is a genuine partial**: the top-ranked candidate timed out (`UNKNOWN` at 60s) rather than
resolving either way, while its known-supported alternative confirmed live. Inconclusive on the
mis-ranking question at that specific parent, though consistent with (not contradicting) the pattern.

**Coverage is bottlenecked by one thing: flipping filters.** 9 of 15 targeted decision points (60%)
returned zero CP-SAT data purely because `cpsat-full-probe.py` doesn't encode flipping filters yet —
this is a much larger practical constraint on exact-label expansion than anything about the mis-ranking
question itself, and it will very likely also constrain item C (repair-retreat), which reuses the same
tool.

> **Update (2026-08-15): flipping filters are now encoded.** `cpsat-full-probe.py` supports
> flipping filters (single-use, board-wide crossing-order-parity axis requirement) — see
> [`reports/2026-08-15-cpsat-flipping-filter-support.md`](2026-08-15-cpsat-flipping-filter-support.md)
> for the encoding and validation. The 9 abstained rows above are unblocked and re-runnable through
> the same `cpsat-explicit-prefix-oracle.yml` pipeline. Note that same follow-up report's correction:
> `reports/2026-08-12-repair-retreat-cpsat.md`'s framing of a distinct "`mustCross >= 2`" coverage
> gap on `R00630`/`R02449` was a misattribution — both levels also carry flipping filters, which was
> the actual (and only) cause; mustCross of any count was never unsupported.
>
> **Follow-up (2026-08-15, same day): the 9 rows were re-run.** See "Follow-up (2026-08-15): the 9
> abstained rows re-run" below — 2 new confirmed R00001-pattern instances, both D-class, extending
> the "Does this justify..." section's "only for the A-class regime" conclusion below to D-class too.

## Follow-up (2026-08-15): the 9 abstained rows re-run, flipping filters now supported

**GHA run [`31858783552`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/31858783552), `cpsat-explicit-prefix-oracle.yml`, `main` @ `4efc2d1`, same case file (`winning-lineage-extinction-adjacent-cases-2026-08-12.json`), same 32 cases, same 60s/case time limit.** Full re-run of all 32 cases (not just the 20 in the previously-abstained 9 rows), since re-running a subset risked missing a regression on the already-resolved rows.

**Result: 25 live / 4 dead / 3 abstain, 0 correctness alarms, 0 input alarms** (up from the original 9 live / 2 dead / 21 abstain). All 3 remaining abstentions are genuine CP-SAT timeouts (`oracle-unknown`) — zero abstentions are `unsupported-mechanics` anymore, confirming flipping filters were the entire remaining blocker.

| level | class | top-1 (score-preferred) | known-supported (culled) | near-cutoff extra | R00001 pattern? |
|---|---|---|---|---|---|
| S00028 | A | live (OPTIMAL) | live (OPTIMAL) | — | no |
| S00030 | D | **dead** (INFEASIBLE) | **live** (OPTIMAL) | live (OPTIMAL) | **YES — new** |
| S00035 | A | abstain (oracle-unknown, timeout) | live (OPTIMAL) | — | inconclusive |
| S00048 | D | **dead** (INFEASIBLE) | **live** (OPTIMAL) | live (OPTIMAL) | **YES — new** |
| S00140 | A | live (OPTIMAL) | live (OPTIMAL) | — | no |
| R00058 | A | live (OPTIMAL) | live (OPTIMAL) | — | no |
| R00060 | A | live (OPTIMAL) | live (OPTIMAL) | — | no |
| R00064 | A | live (OPTIMAL) | live (OPTIMAL) | — | no |
| R00087 | A | abstain (oracle-unknown, timeout) | abstain (oracle-unknown, timeout) | — | inconclusive |

**The R00001 pattern (beam's top-1 pick provably `dead` while a known-valid alternative exists at the same parent) reproduces twice more, both D-class (width-saturation).** `S00030` and `S00048` join `S00001` and `R00104` from the original pass — 4 confirmed instances total now, across A-class *and* D-class regimes, not just A-class as the original report's "Does this justify..." section below (left unedited) had to leave open. For both `S00030` and `S00048`, the near-cutoff (rank-100, the width boundary itself) point is *also* live — consistent with the original report's D-class open question ("mostly alive... or mostly dead") resolving toward **mostly alive**: the saturated pool has real live capacity, and it's specifically the beam's *top-ranked* pick that's dead, not the whole pool.

**What this means for Priority 2's decision-bearing next step** (`docs/solver-optimization-current-queue.md`): the mis-ranking pattern is no longer A-class-only. A held-out, family-namespaced K-vs-2K descriptor test (the queue's prescribed next step) should now be scoped to include D-class parents alongside A-class, not restricted to A-class as the original report's interpretation suggested before this re-run.

Of the remaining 5 rows (S00028, S00140, R00058, R00060, R00064), all resolved fully live on both top-1 and culled branches — no extinction confirmed at these parents at all, so they contribute no new mis-ranking evidence either way. `S00035` and `R00087` remain genuinely inconclusive (real CP-SAT timeouts, not modeling gaps) — not pursued further with a longer time limit here.

## Does this justify moving to neutral future-opportunity descriptors?

**Partially, and only for the A-class (clearly-mis-ranked) regime.** The handoff doc's own next step —
"test neutral future-opportunity descriptors against those labels" — is now backed by 4 independent
exact-label instances of the pattern it's meant to address, all from large-margin extinctions across 3
different levels (R00001, R00044, S00001, R00104). That is enough to justify **starting** descriptor
design/testing scoped to that regime specifically (e.g. levels/decision-points resembling A-class:
material score margin, top-ranked candidate provably unreachable to a win).

It does **not** yet justify a general retention-policy or scoring change, for two reasons already visible
in this data, not just caution: (1) B-class extinctions — the *majority* of "near-cutoff" rows in the
original forensics table — show a different, non-mis-ranking failure shape, so a fix aimed at A-class
mis-ranking has no a priori reason to help (or even be relevant to) B-class near-ties; (2) D-class
(width-saturation) has zero exact evidence either way. Expanding the exact-label set for B/D classes —
which requires flipping-filter support in the CP-SAT model, not more case construction against the
current model — is the more valuable next step before any global counterfactual, exactly as the handoff
doc anticipated ("first expand the exact-label set... then test neutral descriptors").

> **Correction (2026-08-15): D-class is no longer zero exact evidence.** The 9-row re-run below found
> the R00001 pattern at `S00030` and `S00048`, both D-class — 2 of the section's 4 pattern instances
> are now D-class, not just A-class. "Only for the A-class regime" above is superseded: the descriptor
> test should be scoped to A-class *and* D-class. B-class evidence (3 resolved B-class rows in the
> original pass, all fully live, no extinction) is unchanged — still no mis-ranking evidence there.

## Deliverables

- Case file: `reports/stress/winning-lineage-extinction-adjacent-cases-2026-08-12.json` (32 cases).
- Tooling fix: `scripts/stress/cpsat-full-probe.py`, commit `572f0e51` (multi-gate visits constraint).
- CI runs: `31555961680` (pre-fix, completed, surfaced the correctness alarm). A post-fix corroboration
  run (`31560336475`) was dispatched then cancelled while queued behind an unrelated corpus sweep
  (~90 min estimated wait on shared runner capacity); this report's Results are the local rerun on the
  same commit/case file instead — see the CP-SAT feasibility-determinism note below.
- **Local vs. CI provenance:** `INFEASIBLE`/`OPTIMAL` verdicts from CP-SAT are deterministic answers
  to a fixed model, independent of the machine that finds them (only a borderline `UNKNOWN`/timeout
  call, like S00099's, could in principle differ under materially different CPU speed or contention).
  A future session with CI headroom can re-dispatch `31560336475`'s exact inputs
  (`reports/stress/winning-lineage-extinction-adjacent-cases-2026-08-12.json`, commit `572f0e51` or
  later, `time_limit=60`, `max_cases=32`) to obtain an official artifact if one is wanted; it is not
  expected to change any conclusion in this report.
- No production solver, score, quota, or retention change made or proposed here, per task scope.
