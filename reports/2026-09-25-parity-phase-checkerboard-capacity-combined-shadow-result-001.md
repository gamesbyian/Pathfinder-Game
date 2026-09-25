# Parity phase-distance / checkerboard-capacity combined shadow result 001

> **Status:** concluded-negative
> **Last evidence:** 2026-09-25 — local combined-shadow run, frozen 60-level EW1 pricing population, solver ref `c0f0bdb461c34e093e205d6419177c19e65dac5b`.
> **Decision:** both `WS2-PARITY-PHASE-DISTANCE` and `WS2-CHECKERBOARD-CAPACITY` are **CLOSE NEGATIVE** in their tested static form, per `docs/solver-parity-phase-capacity-preflight.md`'s own preregistered stop bands. Incremental incidence beyond existing scalar checks is negligible (phase-distance) or negligible-and-concentrated-in-one-parent (checkerboard-capacity), and every required observability axis is `satisfied` (`resolutionStatus: "resolution-ready"` for both, computed by the shadow's own resolution-envelope builder) — so this is an interpretable clean negative, not an observability-blocked non-result.
> **Remaining gate:** none for the tested static form. No hard prune, scorer, routing feature, or repair treatment is earned. Advance only with a materially different opportunity structure or population (see caveats below).
> **Evidence role:** first falsifier, per the preflight's own "Shadow without changing decisions" instruction — this is the first real corpus dispatch of the already-implemented observers, not a re-run of prior evidence.
> **Research questions:** `WS2-PARITY-PHASE-DISTANCE`, `WS2-CHECKERBOARD-CAPACITY`
> **Production effect:** none. Research-only observers; solver decisions never read observer output; no `--save-hints`.

## A real bug was blocking this shadow from ever running

`scripts/stress/parity-capacity-shadow.mjs` called `Solver.solveLevel(level, { workBudget, ... })`,
but `workBudget` was retired in favor of `baseWorkBudget` (`modules/solver/orchestration.ts` throws
explicitly: `"solveLevel: retired SolveOpts.workBudget input; use baseWorkBudget"`). Every invocation
of this script has therefore errored on every level since that rename landed, with no test to catch
it. Fixed in this branch (commit `c0f0bdb4`) before dispatching anything. Confirmed via a 5-level
canary on corpus1 before/after the fix (5/5 errored before, 5/5 produced real observer records
after).

## Population and protocol

Reused the existing, already-committed frozen 60-level EW1 pricing sample verbatim (the same
population `equal-work-production-reach.json` prices) — no new acquisition:

- Corpus: `data/stress/stress-levels-random.json` (corpus2), 60 ids extracted from
  `reports/stress/capability-runs/35687363645/equal-work-production-reach.json`'s
  `levelHeadroom.levels`.
- Command: `node scripts/run-bundled.mjs scripts/stress/parity-capacity-shadow.mjs -- --corpus=<60-level extract> --work-budget=10000000 --budget-ms=600000`.
- Real sequential production `solveLevel` ladder, `strictTotalWorkBudget: true`, no ablation/profile
  changes — matches the preflight's own fidelity requirement.
- Ran locally (not GHA): 60 levels at 10M canonical work each completed in ~40 minutes wall time,
  well within a single session; sharding would have added GHA queue/dispatch overhead for no
  benefit at this population size.

## Results

| Metric | Phase-distance | Checkerboard-capacity |
|---|---:|---:|
| Eligible levels (of 60) | 42 | 18 |
| Total evaluations | 226,236,120 | 366,494 |
| Headroom evaluations (scalar check would pass) | 226,157,978 | 330,309 |
| Scalar-only rejects | 78,142 | 36,185 |
| Conditioned-bound rejects (total) | 120,553 | 40,151 |
| **Incremental rejects (conditioned catches, scalar misses)** | **42,411** | **4,739** |
| Incremental rate (of total evaluations) | **0.0187%** | **1.29%** |
| Levels with >=1 incremental reject | 14 / 42 eligible | 4 / 18 eligible |
| Concentration | top 2 levels = 65% of increment | **top 1 level (R02657) = 83.6% of increment** |
| Coverage/censoring | 42/42 eligible completed, 0 deadline-truncated/error | 18/18 eligible completed, 0 deadline-truncated/error |

Full per-level breakdown: `reports/stress/parity-invariant-shadow/ew1-60-combined-shadow-2026-09-25.json`.

## Resolution-envelope readiness

The shadow tool computes its own resolution envelope per question (`buildResearchResolutionEnvelope`)
against 8 required observability axes (eligibility, opportunity, reach, participation,
measurementSupport, fidelity, coverage, censoring). **All 8 axes are `satisfied` for both questions**,
with zero blockers, giving `resolutionStatus: "resolution-ready"` for both. Per the tool's own
documented interpretation: *"A near-zero incremental incidence is interpretable only when every
required observability axis is satisfied; otherwise the result is observability-blocked, not a clean
negative."* Note specifically that `work-budget-reached` status (58/60 rows; only R02651/R02657/
R03106 reached `success`) does **not** trip the `censoring` axis — with `strictTotalWorkBudget: true`,
hitting the work cap is a controlled, deterministic observation boundary over the fraction of the
search actually explored, not an uncontrolled wall-clock cutoff; the axis specifically checks for
`deadlineTruncated`/`error` rows, of which there were zero.

## Applying the preflight's stop/advance bands

**`WS2-PARITY-PHASE-DISTANCE`: stop.** 0.0187% incremental incidence across 226M real evaluations
is decisively in the "negligible incremental decision-bearing incidence" stop band. The increment
does recur across 14 independent parents (not a single-level artifact), but at a magnitude in every
case far too small to plausibly justify stored-prefix replay, differential soundness checking, and a
production consumer, per the preflight's own economics framing.

**`WS2-CHECKERBOARD-CAPACITY`: stop.** 1.29% incremental incidence is a full order of magnitude
higher than phase-distance's, but the preflight's stop band is an *or*: "negligible **or**
concentrated only where another same-cost reject fires immediately." 83.6% of all incremental
capacity rejects come from a single level (R02657), with only 3 other levels (out of 18 eligible)
contributing anything at all. This is the "concentrated" branch of the stop condition — one parent
cannot recur-justify a production consumer regardless of its own local incidence rate.

## What this closes and does not close

Closes, in the tested static form (per each question's own `constrains` list already on file):

- the two-layer phase-conditioned relaxed distance bound as a hard-prune/ordering/routing candidate;
- the fixed-color-schedule checkerboard-capacity bound as a hard-prune/routing candidate.

Does **not** close:

- a materially different opportunity structure (e.g., portal placement relative to a proved cut, per
  Lane H's own "derivations that are not premises" section) — a different object, not a retry of this
  one;
- a twist-bearing extension of checkerboard-capacity (explicitly out of scope here — eligibility
  required zero twist pairs);
- the secondary observational seams listed in the preflight (admissible-order propagation, repair
  residual explanation, exact all-gates infeasibility) — none of those were exercised by this shadow
  and remain open on their own terms.

## A caveat on population representativeness

This population (the EW1 60-level pricing sample) was frozen for a different purpose — cheap
technique pricing on current production misses, not portal/twist diversity — and 58/60 rows hit the
10M work cap rather than naturally exhausting. The absolute evaluation counts are large enough
(226M/366K) that this does not read as an underpowered sample, but a future session revisiting this
question should not assume this exact population is the only possible source; if a different premise
resurrects phase/capacity conditioning from a new angle, size a population for that specific claim
rather than reusing this one by default.

## Artifacts

- `reports/stress/parity-invariant-shadow/ew1-60-combined-shadow-2026-09-25.json` — full result
  (protocol, per-level rows, resolution envelopes).
- `scripts/stress/parity-capacity-shadow.mjs` — the fixed shadow tool (commit `c0f0bdb4`).
- `reports/stress/capability-runs/35687363645/equal-work-production-reach.json` — source of the
  reused 60-level population.
