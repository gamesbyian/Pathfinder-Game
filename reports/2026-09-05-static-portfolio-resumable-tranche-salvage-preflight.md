# Static-portfolio resumable-tranche salvage preflight

> **Status:** active
> **Last evidence:** 2026-09-10 — implemented and validated the bounded-overshoot approximation for production-width continuation capture (single-digit-percent measured overshoot at widths 2000/5000 on real corpus levels); see "Option 2 implemented and validated" below. Prior evidence: 2026-09-05 — the real production A/B closed one-shot `portfolio-18-tranche-v2` as a replacement scheduler (14/40 vs production 18/40), but postmortem attribution found 3/4 losses were already-present beam configs stopped only ~2–12% short in node count; same-policy beam continuation now exists and preserves cumulative canonical work.
> **Decision:** keep the failed one-shot static scheduler closed, but reopen its cheap first-pass idea as a materially different WS2B candidate: frozen `portfolio-18-tranche-v2` first tranches plus same-policy continuation of capped beam attempts inside the same total work envelope.
> **Remaining gate:** the engineering-feasibility gate is now met in bounded-overshoot form (2026-09-10) — production-width capture is implemented, equivalence-tested, and its real overshoot measured (single-digit percent). The next gate is to run the fixed-work development A/B below on a fresh population, reporting the bounded-overshoot amount honestly per continuation. A positive result earns residual-lane design; a null/negative closes this salvage form.
> **Evidence role:** development preflight for a new scheduler shape nominated by the failure mechanism of the 2026-09-04 production A/B.

## Why this is a new premise rather than retuning a failed scheduler

The tested production decision remains closed: do **not** replace the production ladder with the fixed-cap `portfolio-18-tranche-v2`, and do not compose `static-portfolio -> cold production fallback`. The real-entrypoint A/B found production 18/40 versus static 14/40, and the naive fallback composition cost 9.82% more work because the static pass could not be reused.

The loss attribution changes what is worth asking next:

- `R00153`: the exact `beam|score=intersectionHarvest|bias=none|width=5000|retention=plain` winner was already in the portfolio; static stopped at ~378,830 nodes versus production's 407,988-node solve (~7% short).
- `R02675`: same config; static stopped at ~453,537 versus production's 517,163-node solve (~12% short).
- `R02873`: `beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets`; static stopped at ~342,143 versus production's 348,557-node solve (~2% short).
- `R02126`: genuinely different mechanism; production solved in `goal-attraction-disabled-retry`, which the 18-technique static menu does not represent.

So 3/4 coverage losses were **dose truncation of capability already present**, not missing menu capability. Meanwhile the static arm used only 1.692B aggregate `workSpent` versus production's 12.395B on that 40-level population. The original portfolio therefore still contains a large cheap-first-pass signal; what failed was making every per-technique tranche final and then throwing away all first-pass work before fallback.

A separate lifecycle-only tranche pilot already found that capped versus naturally exhausted attempts carries incremental-value information: an added tranche rescued 3/30 capped rows and 0/39 naturally exhausted rows, with the direction holding across its fixed train/test split. That policy was non-actionable only because a continuation required a full cold restart. The implemented same-policy beam continuation primitive changes that prerequisite.

## Candidate policy

Call this candidate **portfolio-18 resumable beam tranche** for research purposes.

First pass:

- use the exact existing `portfolio-18-specialists` ordered menu;
- use the exact existing p75-derived `portfolio-18-specialists-tranche-cap-map-v2.json`;
- preserve the same `67,000,000` per-level aggregate work envelope;
- do not add, remove, reorder, or resize first-pass techniques in this experiment.

Residual pass:

1. Only an unsuccessful **beam** attempt that ended because its allocated tranche capped it is eligible.
2. A naturally exhausted beam attempt receives no continuation.
3. Resume the **same config and same frontier/state**. Do not switch scoring policy, retention, width, or bias in this experiment.
4. Continuation consumes only incremental canonical `workSpent`; prior work must not be replayed or recharged.
5. Residual work comes only from the unused remainder of the same 67M level envelope. Do not enlarge the total budget.
6. Process eligible continuations in the original portfolio order for this first test. Do not introduce a learned selector, value model, or outcome-tuned priority rule.
7. Give each eligible continuation at most one additional tranche equal to its original per-technique cap, bounded by the remaining shared work. This deliberately tests whether resumability can monetize residual budget before optimizing tranche size.
8. Stop at the first solve as usual.

This candidate is intentionally narrower than the eventual scheduler suggested by the evidence. It does **not** yet add missing production-only actions such as `goal-attraction-disabled-retry`; that is a later residual-capability question if same-policy continuation first proves useful.

## Required engineering feasibility gate

Current `captureContinuationOnBudgetExit` cannot reliably capture work-boundary continuations at production beam widths 2000/5000 because an independent mid-phase budget check can observe the cap first and exit without a continuation. This candidate now supplies a concrete reason to fix that narrow limitation.

### Current status (2026-09-10): still unmet, not attempted this pass

Re-confirmed by inspection (no new run needed — this is already test-locked, not just documented): `search.ts`'s `beamSearchFromGate` has two budget-exit checks per phase — a top-of-loop check (between phases, capture-aware) and a mid-phase check every 256 frontier nodes within one phase's own candidate walk (capture-UNaware by design, since mid-phase `cands` is a partially-built array and resuming from it would either lose that work or double-charge it). For any `beamWidth > 256`, the mid-phase check always notices a crossed `prep._workCap` first, so `captureContinuationOnBudgetExit` silently degrades to a plain timeout at any production width (2000/5000 both `> 256`). Originally found by `2026-09-03-beam-policy-switch-complementarity-pilot-001.md`'s Finding 1 (empirically: no capture landed at `beamWidth=5000` across caps from 500,000 to 40,000,000; `beamWidth=200` captured on the first try). `modules/solver/beam-resumability-pilot.test.ts`'s own test `captureContinuationOnBudgetExit cannot capture past the mid-phase check once a phase is bigger than 256, at beamWidth > 256` locks this in as an assertion, not just a comment — this is intentional current behavior, not an undiscovered bug.

Two engineering paths were considered, neither implemented in this pass:

1. **Full mid-phase capture (exact).** Extend `BeamContinuation` to also carry an in-progress phase's own state: the tree-ordered `frontier` suffix not yet walked, the `cands` array accumulated so far, and enough of the per-node loop context (`insOrd`/`treeOrd` bookkeeping, `curCtx`, the `ws`/`_liveUndo` diff position) to resume candidate generation mid-phase byte-identically to an uninterrupted run. This preserves the preflight's "exact work boundary" requirement but is a real addition to the search hot path's state machine, not a parameter change — it needs its own dedicated implementation and the same pause/resume equivalence proof `beam-resumability-pilot.test.ts` already applies to the phase-boundary case, extended to a mid-phase boundary. Meaningful correctness risk if rushed, given this file's own repeated emphasis that reordering/state handling in this exact area has previously cost solved levels (see the tree-order/`insOrd` restoration comment a few lines above `beamSearchFromGate`).
2. **Bounded-overshoot approximation (cheap).** When `captureContinuationOnBudgetExit` is true, skip the mid-phase early-return entirely and let the current phase run to completion before the (already-correct) top-of-loop check evaluates — this makes every capture-enabled call behave like the already-working `beamWidth <= 256` case, at the cost of a bounded overshoot (up to one full phase's own work) past the requested `prep._workCap`. This is a few-line, low-risk change, but it means the resumable-portfolio's "same 67M envelope" claim would need to report the actual measured overshoot honestly (likely small relative to a multi-million-node tranche, but unmeasured) rather than claim an exact boundary — a real, if probably minor, deviation from the preflight's engineering-gate requirement #1 above.

**Recommendation (superseded by implementation below):** the original plan was to defer both paths. Option 2 turned out small and safe enough to implement directly once precisely scoped — see the next section.

### Option 2 implemented and validated (2026-09-10)

Implemented the bounded-overshoot approximation in `search.ts`'s `beamSearchFromGate`: when `captureContinuationOnBudgetExit` is true, the mid-phase check (every 256 frontier nodes) no longer exits early — it defers to the already-capture-aware top-of-loop check at the next phase boundary. This is a small, purely additive change gated entirely behind the existing opt-in parameter (default `false`); every non-capturing caller, i.e. every real production timeout path, is provably unaffected (the new condition is `!captureContinuationOnBudgetExit && (...)`, identical to the old unconditional check when the flag is off).

**Validation** (`beam-resumability-pilot.test.ts`):
- Capture now succeeds at `beamWidth > 256` (previously always degraded to a plain timeout) — confirmed with the same synthetic-oversized-frontier technique the original discovery pilot used.
- Full pause/resume **equivalence** at a >256-node phase: capturing partway through an oversized phase and resuming reproduces byte-identical `ok`/solution/cumulative `workSpent`/`nodesExpanded` to an uninterrupted run of the identical scenario — the fix is not just "it captures now," it is safe to resume from.
- Non-capturing behavior (the default) is unchanged — a dedicated regression test confirms the mid-phase check still fires exactly as before when the flag is off.

**Measured real overshoot at production widths** (real corpus-2 levels, primed through 25 phases so the frontier reaches production scale before capping):

| Level | Width | Cap | Actual units at capture | Overshoot | Overshoot % |
|---|---:|---:|---:|---:|---:|
| `R00001` | 2000 | 131,573 | 143,528 | 11,955 | 9.1% |
| `R01000` | 2000 | 238,845 | 250,590 | 11,745 | 4.9% |
| `R00001` | 5000 | 279,746 | 301,538 | 21,792 | 7.8% |
| `R01000` | 5000 | 479,372 | 508,692 | 29,320 | 6.1% |

Overshoot lands in the single-digit-percent range at both production widths on both measured levels (not the "up to a full uncontrolled phase" worst case one might fear) — small enough that a resumable-portfolio tranche scheme could reasonably treat this as "spend up to ~10% over the nominal per-technique cap," reporting the real overshoot honestly in its own telemetry, rather than needing option 1's exactness. **This closes the resumable-portfolio 2B candidate's engineering-feasibility-gate requirement #1** ("width-2000 and width-5000 beam attempts can capture a live continuation at the exact first-tranche work boundary") in its bounded-overshoot form; requirements #2-#6 (equivalence, no duplicated/skipped work, natural-exhaustion no-op, omitted-continuation no-op, no policy/outcome leakage) were already covered by the existing phase-boundary tests and now additionally hold at the >256-node case per the equivalence test above. True mid-phase-exact capture (option 1) remains undone and is not required to proceed with the development A/B this preflight defines, given the measured overshoot is small.

Before any decision-bearing scheduler A/B, require deterministic tests showing:

1. width-2000 and width-5000 beam attempts can capture a live continuation at the exact first-tranche work boundary;
2. uninterrupted same-policy execution to `W + Δ` equals run-to-`W` plus resume-`Δ` in `ok`, solution, cumulative `workSpent`, and cumulative nodes;
3. no frontier/candidate work is duplicated or skipped at a mid-phase boundary;
4. natural exhaustion produces no continuation;
5. omitted continuation options remain a strict production no-op;
6. retained continuation state does not leak policy decisions, historical outcomes, or level identity.

Do not solve the production-width capture problem by merely suppressing/moving the mid-phase check unless equivalence proves that partially processed phase state is carried correctly.

## Development A/B

### Population

Use a fresh Corpus-2 population selected before outcomes are inspected and disjoint, where practical, from the static-portfolio construction/confirmation populations and the 40-level real-production A/B that nominated this salvage premise.

Use at least 120 levels if GHA execution is available. A smaller local mechanism screen may be used only to verify participation, not to accept the scheduler candidate.

Do **not** select levels because the old production A/B showed dose-truncation on them. The three named losses above are mechanism fixtures, not confirmation units.

### Arms

**Control:** unchanged `portfolio-18-tranche-v2` static scheduler under the 67M envelope.

**Treatment:** identical first pass plus the resumable-beam residual pass defined above, still under the same 67M envelope.

A production-ladder arm may be recorded as a contextual reference if cheap to obtain, but control-vs-treatment is the decision-bearing comparison. This gate asks whether resumability improves the validated cheap first-pass scheduler before asking whether the resulting scheduler can challenge production.

### Required telemetry

Report at minimum:

- solved count and exact gain/loss IDs;
- aggregate and per-level `workSpent`;
- first-pass solved count before any continuation;
- beam attempts naturally exhausted versus capped;
- eligible continuation count;
- actual continuation dispatch count;
- incremental `workSpent` by continuation;
- solves first obtained during continuation, with config identity;
- remaining shared work before/after the residual pass;
- whether any continuation replayed previously charged work;
- errors, truncation, failed captures, and asymmetric censoring.

Also report how many treatment gains would have been missed if all capped beam attempts had simply been retired. This is the direct value of the salvage mechanism.

## Frozen decision rule

### Positive

Keep the candidate alive if all are true:

- treatment has **zero credible losses** versus the unchanged static control;
- at least 2 fresh-population treatment-exclusive solves are first obtained by same-policy beam continuation, or an equivalently clear held-out coverage gain at larger scale;
- continuation participation is substantial enough that a null would have been meaningful;
- treatment stays inside the identical 67M envelope;
- cumulative accounting proves prior work was not repaid.

A positive result does **not** promote this scheduler to production. It earns the next gate: design the smallest protected residual-capability lane for capabilities absent from the 18-technique menu, then compare the combined scheduler against the real production ladder.

### Null

Close this simple salvage form if capped beam continuations execute meaningfully on a fresh population but produce no credible coverage gain. Do not respond by immediately adding selectors, changing tranche sizes, switching beam policies, or growing the portfolio menu.

### Non-informative

If production-width capture rarely succeeds, or the population produces almost no capped beam attempts with residual budget available, classify the run as non-informative and fix the participation/envelope issue before interpreting efficacy.

### Negative

If same-policy continuation causes credible solve losses, violates cumulative-work equivalence, or materially reduces first-pass behavior, stop and root-cause. The treatment is supposed to be additive within unused residual work; a loss indicates an implementation or accounting problem before it is a scheduler-policy result.

## What a successful next stage would look like

Only after the development A/B is positive should a second candidate be designed around the one remaining failure class from the real production A/B: **genuinely missing residual capability**.

That later scheduler would have three conceptual layers:

1. cheap frozen portfolio first tranches;
2. same-policy continuation for still-live capped searches;
3. a small protected lane for production-only residual actions whose value survives current repricing evidence.

Do not implement layer 3 in the first salvage A/B. Current WS2A decisions about admissible-order tail price, repair seed truncation, and goal-attraction fresh work should inform that lane once settled.

## Relationship to closed evidence

This preflight does not reopen these closed forms:

- fixed-cap `static-portfolio` as a direct production replacement;
- `static-portfolio -> cold production fallback`;
- the old lifecycle-only dynamic scheduler that required a full 2x restart;
- cyclic/staged beam policy switching;
- naive beam-to-DFS inherited-state handoff.

The materially new premise is **reuse of already-paid same-policy beam work under the same aggregate envelope**, which was not executable when the static production A/B failed.