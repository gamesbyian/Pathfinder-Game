# Beam policy-switch complementarity pilot (rung 2)

> **Status:** concluded-positive
> **Last evidence:** 2026-09-03 — two independent 30-level uniform corpus2 samples (60 levels total), current HEAD
> **Decision:** `intersectionHarvest`→`objectiveFirst` beam frontier inheritance (rung 2 of `docs/solver-search-resumability.md`'s research ladder: "same beam frontier, changed beam policy") shows a real, one-directional (never negative), but small effect: 2/60 combined sampled levels were solved ONLY by the resumed-handoff treatment — neither policy alone, nor a fresh-restart switch, solved them at the same shared work envelope — versus 0/60 solved only by the fresh-restart control. This is genuine complementarity signal, not yet a scheduling recommendation: the effect is rare (~3% of this hard uniform sample), measured on one profile pair/width/budget/corpus, and not cross-generator-confirmed.
> **Remaining gate:** an independent confirmation at larger population/different profile pairs would raise confidence; absent that, the next legitimate step per the research ladder is rung 3 (shared frontier among multiple beam policies) or a larger same-form replication — not yet a production-wiring question.
> **Evidence role:** development — value-of-information pilot on two independent seeded samples, not a confirmation-grade sweep.
> **Selection:** prespecified (population sampled before any outcome was seen; work-cap split and profile pair fixed before dispatch); the width/W1 calibration below was tuned against real natural-exhaustion behavior on a subset of sample 1 before sample 1 itself was scored, and reused unchanged for sample 2 — a legitimate one-time methods calibration, not outcome-selection, but disclosed here for transparency per the operating model's selection-disclosure rule.

## Why this check

`2026-09-03-beam-resumability-feasibility-pilot-001.md` (rung 1) proved a beam search can pause and resume itself under the SAME policy with exact equivalence to an uninterrupted run. `docs/solver-search-resumability.md`'s research ladder's next rung asks a different, more consequential question:

> Does policy B add more value when inheriting policy A's frontier than either A or B obtains by spending the same total work from the gate?

A positive answer would mean current beam "techniques" are not necessarily independent searches — some could be recast as **operators over a shared evolving search state**, opening staged beam policies (broad exploration → specialist exploitation) within one fixed work envelope, rather than always paying for independent portfolio attempts from scratch.

## Method

**Policies:** `SCORING_PROFILES.intersectionHarvest` (A) and `.objectiveFirst` (B) — the same two named, production-used beam scoring profiles referenced throughout `docs/solver-optimization-workstreams.md` (`beam:intersectionHarvest@beam5000` / `beam:objectiveFirst@beam5000`), holding `orderingBias=null` and `mechanicBucketRetention=false` fixed in every stage (a pure scoring-only switch, matching the doc's own "possible switches" list).

**Mechanism:** `beamSearchFromGate`'s rung-1 `resumeFrom` plus a new opt-in `captureContinuationOnBudgetExit` parameter (`modules/solver/search.ts`, this session), which attaches a resumable continuation at the existing `prep._workCap` exit instead of only at a chosen phase count — needed because rung 2's currency is a fixed **work** envelope, not a phase count.

**Four arms per level, one shared work envelope `W`, split `W1`/`W2=W-W1`:**
- **A-only@W** / **B-only@W** — each policy alone, the full envelope.
- **fresh A-then-B** — policy A for `W1` (paid, then discarded), policy B started FRESH FROM THE GATE for the remaining `W2`.
- **resumed A-then-B** (the treatment) — policy A for `W1`, then policy B resumes from A's actual paused frontier for `W2`.

**Population:** two independent uniform seeded samples of 30 corpus2 levels each (`scripts/stress/select-random-sample.mjs`, seeds `beam-resumability-rung2-2026-09-03` and `...-confirm-2026-09-03`, the second drawn with `--exclude-ids-from` the first to guarantee disjointness), per `docs/solver-scheduling-policy.md`'s "use `select-random-sample.mjs` ... for a portfolio-cardinality question not scoped to a particular mechanic/regime." All corpus2 levels are single-gate (verified directly against `data/stress/stress-levels-random.json` before writing the pilot script), so no multi-gate budget-splitting logic was needed. Script: `scripts/beam-policy-switch-complementarity-pilot.mjs`.

## Finding 1: `captureContinuationOnBudgetExit` needs `beamWidth <= 256` to ever fire in practice

The first run attempt (`beamWidth=5000`, matching production's `BEAM.WIDE`, work caps swept from 500,000 to 40,000,000) produced **zero captures** — every unsolved run reported a plain `out.timedOut=true`, never `out.pausedContinuation`. Root cause, confirmed with a direct debug harness against real corpus2 levels: `beamSearchFromGate` has a SEPARATE mid-phase budget check (`search.ts`, every 256 frontier nodes within one phase's own candidate walk) that evaluates unconditionally, independent of how large `prep._workCap` is. For any `beamWidth > 256`, once a phase's own frontier has grown past 256 nodes, that check is *always* the first of the two to notice a crossed cap — it simply checks far more often within a phase (every 256 nodes) than the top-of-loop check does between phases (once per up-to-`beamWidth`-node phase) — so `captureContinuationOnBudgetExit`'s top-of-loop capture never gets a turn. This is not a bug in the flag itself: a direct test with `beamWidth=200` (≤ 256) at the identical mechanism and cap values captured correctly on the first try. `modules/solver/search.ts`'s `captureContinuationOnBudgetExit` comment and two new regression tests in `modules/solver/beam-resumability-pilot.test.ts` now lock this in (one manufactures an oversized 300-node frontier via a synthetic `resumeFrom` to prove the mid-phase check wins deterministically, without depending on any specific level's organic branching).

Practical consequence for this pilot: real production widths (2000/5000) cannot be used with this mechanism as it stands; the pilot ran at `beamWidth=200` instead, which is narrower than production and changes absolute solve rates (though not, so far as tested, the qualitative complementarity question).

## Finding 2: at `beamWidth=200`, beam almost always exhausts naturally, not by budget

A direct uncapped survey of 10 sample-1 levels (both profiles, `beamWidth=200`) found natural exhaustion (`cands.length === 0` frontier collapse, not a budget/time cap) between **~68,000 and ~173,000** work units — this beam family reliably runs out of viable candidates on its own well before typical multi-hundred-thousand-to-million-scale work budgets, consistent with `2026-08-28-ew1-equal-work-technique-census-pilot.md`'s own finding ("every beam naturally exhausted below 10M work"). An initial pilot run using `W1 = W/2` (2.5–20,000,000) accordingly found **zero genuine "live" pauses** across 26 nominally-unsolved levels — `stage1.result === null` in every case, but via natural exhaustion, not the budget check, so the "resumed" arm silently degraded into an ordinary fresh-from-gate run (`armFresh.workSpent === armResumed.workSpent` exactly, every time) — a vacuous, not-actually-testing-anything comparison. Fixed by setting `W1=20,000` (well below the surveyed exhaustion floor) and `W=300,000`; the final runs confirm `liveHandoff=true` (a genuine top-of-loop capture, not natural exhaustion) on **60/60** sampled levels.

## Result

Two independent 30-level samples, `beamWidth=200`, `W1=20,000`, `W=300,000`:

| Sample | armA solved | armB solved | armFresh solved | armResumed solved | resumed-only wins | fresh-only wins |
|---|---:|---:|---:|---:|---:|---:|
| 1 (seed `...2026-09-03`) | 0/30 | 0/30 | 0/30 | 2/30 | 2 | 0 |
| 2 (seed `...confirm-2026-09-03`) | 2/30 | 2/30 | 2/30 | 2/30 | 0 | 0 |
| **Combined** | 2/60 | 2/60 | 2/60 | 4/60 | **2** | **0** |

Sample 2's 2 solves (`R02477`, `R02968`) were trivial co-solves — all four arms agree, so they discriminate nothing. Sample 1's 2 resumed-only wins (`R02124`, `R02714`) are the real finding: for both levels, A-only, B-only, and fresh-restart-switch ALL fail to solve within the full 300,000-work envelope, but resumed-switch solves using 125,223–192,670 work (comfortably inside the envelope). Every other level across both samples (56/60) went unsolved by all four arms — this population is hard for this technique pair at this budget/width regardless of allocation strategy.

Combined across both samples: **2/60 (3.3%) levels solved only by frontier inheritance, 0/60 solved only by the fresh-restart control, 0/60 net losses for the resumed treatment against any alternative.** The effect is real (reproduced in direction, not magnitude, across two independent samples) and one-directional, but small and inconsistent in incidence — closer in character to the dynamic-tranche-value pilot's "rescued 3/30 capped rows" finding than to a decisive win.

## Interpretation

This is a genuine, if narrow, positive answer to rung 2's causal question for this one profile pair: inheriting `intersectionHarvest`'s frontier sometimes lets `objectiveFirst` solve levels neither policy could solve alone at the same total work, and a fresh restart under `objectiveFirst` (paying the same total work without inheriting anything) cannot reproduce that rescue. This supports treating at least this specific technique pair as "operators over shared evolving search state" in the narrow sense the doc describes — but the effect size (a few percent of a hard uniform sample) is too small and too population-specific to justify any scheduling change from this evidence alone.

## Scope and what this does not show

- One profile pair (`intersectionHarvest`→`objectiveFirst`), one direction (not tested reversed), one `orderingBias`/retention combination, one width (200, narrower than production's 2000/5000 due to Finding 1), one `W1`/`W` split, corpus2 only.
- Not cross-generator-transferred (published/corpus1 untested).
- Small population (30+30); a rate this low needs a larger population or several more independent samples to bound confidently, per the operating model's "confirmation strength scales with selection pressure" and independent-unit guidance.
- Does not show which mechanism causes the rescue (a specific candidate/state `objectiveFirst` reaches only via `intersectionHarvest`'s culling history, vs. simply avoiding paying `objectiveFirst`'s own early exploration cost) — an unexplained-weakness investigation of the two rescued levels specifically, per `AGENTS.md`'s "investigate unexplained weakness before institutionalizing a workaround" rule, would be needed before trusting this as a designed mechanism rather than a lucky search-order artifact.

## Follow-on

Per `docs/solver-search-resumability.md`'s research ladder, rung 2 shows enough signal to not close the ladder, but not enough to skip ahead. Reasonable next steps, not started here:
1. A larger single population (100+ levels) or several more independent 30-level samples, same profile pair/width, to bound the true rescue rate instead of two small samples.
2. The reverse direction (`objectiveFirst`→`intersectionHarvest`) and at least one more profile pair, to check whether this is pair-specific or general.
3. If the rate holds up under (1)/(2), rung 3 (shared frontier among multiple beam policies, not just two) is the next rung on the ladder — do not skip to it on this evidence alone.
