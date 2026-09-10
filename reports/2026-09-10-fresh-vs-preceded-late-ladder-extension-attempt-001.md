# Fresh-vs-preceded reproduction: late-ladder extension attempt 001

> **Status:** inconclusive
> **Last evidence:** 2026-09-10 — three rounds of local diagnostic scripts (uncommitted, per this line's own convention), the last of which correctly isolated the cause
> **Decision:** the naive extension of `2026-09-03-fresh-vs-preceded-main-search-reproduction-check.md`'s method to `admissible-order-fallback`/`admissible-order-alternate-tiebreak-retry` does not produce valid evidence either way. It is **not** a confirmed state-isolation discrepancy — it is a diagnostic-methodology gap: reproducing a late-ladder winner requires reconstructing each preceding attempt's own active ablation-config override (e.g. `goal-attraction-disabled-retry`'s Proxy-toggled `SCORE_GOAL_ATTRACTION: false`), which none of this session's three diagnostic rounds did. `docs/architecture-unification-debt.md`'s "Search-stage mutable-state isolation" row is **not reopened** by this attempt.
> **Remaining gate:** build a stage-id → ablation-override reconstruction helper (see "What a correct extension needs" below) before attempting this extension again. Until then, `admissible-order-fallback`/`admissible-order-alternate-tiebreak-retry` (and every other `*-disabled-retry` stage) remain **untested by this method**, same as before this session — not passing, not failing.
> **Evidence role:** forensic (diagnosing why three successive diagnostic attempts failed to produce trustworthy evidence)
> **Selection:** observational — pre-filtered candidates from retained telemetry (winning stage ∈ target set), not random sampling; see population note below.

## Why this was attempted

`2026-09-03-fresh-vs-preceded-main-search-reproduction-check.md` closed `main-search`-stage winners (30/30 exact reproductions, 0 mismatches) but explicitly named `admissible-order-fallback`, the later retry tiers, and `repair-fallback` as untested extensions. This session's own admissible-order-search work-cap fix (see `2026-09-10-admissible-order-non-default-retry-matched-work-methodology-001.md`) made these two stages' dispatch mechanics unusually well understood, making them a natural, cheap, GHA-independent extension to attempt while waiting on an unrelated long-running capability refresh.

## Population

Corpus1 (`stress-levels.json`) + Corpus2 (`stress-levels-random.json`) solved levels whose **winning** attempt's `stageId` was `admissible-order-fallback` or `admissible-order-alternate-tiebreak-retry`, drawn from retained `solver-corpus{1,2}-latest.json` (run `33841017634`, 2026-09-04). 77 real cases found (2 corpus1, 75 corpus2) — a pre-filtered population, not random sampling, following the 2026-09-03 report's own suggested extension method.

## Round 1: isolated fresh reproduction with a substitute work ceiling

Mirrored the 2026-09-03 method exactly: match the winner's `AttemptConfig` via `getConfiguredAttemptConfigs(level, null)`, run it on a completely fresh `prepLevel(level)` with `prep._workCap = prep._strictWorkCap = <winner's own allocatedWorkCeiling>`, generous ms budget, `nodeBudget: Infinity`. Sampled 27/77 (all of corpus1, every 3rd corpus2 candidate by id).

**Result: 18/27 mismatches.** But this round's own reconstruction was wrong for these two stages specifically: `admissibleOrderSearch` does not consult `prep._workCap` at all (this session's own finding), and this retained data came from a non-strict sweep (`strict_total_work_budget=false`, the GHA default) where `prep._strictWorkCap` is never set either — so the real attempts were bound by neither field. Setting `_strictWorkCap` to a substitute `_workCap`-derived number injected an artificial constraint the real run never had.

## Round 2: corrected ceiling (real `allocatedNodeCeiling`, no workCap fields set)

Fixed round 1's ceiling bug: left `_workCap`/`_strictWorkCap` unset, passed `nodeBudget = winner.allocatedNodeCeiling` (the field that actually bounds these two stages under non-strict semantics) directly to `runAttempt`.

**Result: still 18/27 mismatches** (one case flipped from mismatch to match; the rate did not meaningfully change). This ruled out the round-1 ceiling bug as the primary explanation and initially looked like a genuine discrepancy worth escalating.

## Round 3: full-predecessor-replay (the rigorous form the correctness doc actually prescribes)

Rather than reconstructing an isolated attempt, replayed **every real preceding attempt in exact recorded order** (own `scoringProfileId`/`orderingBiasId`/`beamWidth`/`repair*`/`admissibleOrder*` identity, own `allocatedNodeCeiling`, own `seedSalt`, own `allocatedBudgetMs`) on one shared `prep`, then dispatched the winner with its own exact recorded parameters — eliminating "wrong reconstructed constraint" as a possible cause entirely, per `solver-correctness-hardening.md`'s own required-handling step 1.

First pass (2 representative cases, `R03108`/`R02109`) additionally logged **predecessor replay fidelity** — whether each individual preceding attempt, replayed with its own exact recorded parameters, reproduced its own recorded `ok`/`workSpent`/`nodesExpanded`:

- `R03108`: **6/22 preceding attempts matched.**
- `R02109`: **11/24 preceding attempts matched.**

This is the decisive signal: predecessor replay fidelity was already broken *before* reaching the target stage, and by a wide margin. Checking `R03108`'s stage sequence directly:

```
main-search ×11 -> goal-attraction-disabled-retry ×11 -> admissible-order-fallback (winner)
```

`goal-attraction-disabled-retry` "builds its overlay config through a hand-rolled Proxy" (`orchestration.ts`'s own comment) that toggles `SCORE_GOAL_ATTRACTION: false` for the duration of its own dispatch — **none of this session's three diagnostic rounds ever reconstructed this override.** Every replayed `goal-attraction-disabled-retry` attempt ran with `SCORE_GOAL_ATTRACTION` still on (the `getConfiguredAttemptConfigs(level, null)` default), diverging from the real run at attempt #12 of 23 and corrupting every downstream `prep`-scoped mutable value (memo caches, coarse-state-merge bookkeeping, etc.) before the winner even dispatched. This alone fully explains both the predecessor-fidelity gap and the winner mismatch, with no need to invoke cross-attempt state leakage as an explanation.

## What a correct extension needs

The 2026-09-03 check's scope (`main-search` winners) never had this problem structurally: a `main-search` winner is, by construction, reached before any `*-disabled-retry` override stage runs at all, so neither the winner nor any of its preceding attempts ever needs an ablation-config override reconstructed. Extending past `main-search` to any stage reachable only after an override-toggling retry tier (`goal-attraction-disabled-retry`, `coarse-state-near-tie-retention-disabled-retry`, `connectivity-axis-prune-disabled-retry`, `must-cross-neighbor-prune-disabled-retry`, `admissible-order-non-default-retry`'s own work-cap scope, etc.) requires, for **every** preceding attempt in the chain:

1. identifying which stage it belongs to (already recorded as `stageId`);
2. reconstructing that stage's exact ablation-config Proxy overlay (currently hand-rolled per stage, not a reusable/inspectable table — this is the missing piece);
3. applying it only for the duration of that one attempt, matching the real dispatch's own scoping.

No such stage → override reconstruction helper currently exists as reusable tooling. Building one is a real, if bounded, engineering task — out of scope for a cheap while-waiting diagnostic, and better done deliberately with its own equivalence tests (mirroring how `withWorkCapScope`/`BeamContinuation` equivalence was validated) rather than folded into a from-scratch investigation script.

## What this does not establish

- Does not confirm or deny a genuine fresh-vs-preceded discrepancy for `admissible-order-fallback`/`admissible-order-alternate-tiebreak-retry`, or for any `*-disabled-retry` stage. The question remains **open and untested**, exactly as it was before this session, not newly closed or newly failing.
- Does not reopen `docs/architecture-unification-debt.md`'s "Search-stage mutable-state isolation" row — no discrepancy survived correct reproduction; the discrepancy that appeared was fully attributable to an unreconstructed ablation override, a known, intentional, already-documented mechanism, not an undocumented leak.
- Does not change any production disposition.
- Local diagnostic scripts for all three rounds were not committed, per this line's own established convention (`2026-09-03-fresh-vs-preceded-main-search-reproduction-check.md`'s "Reproduction" section) — this report is the durable record.
