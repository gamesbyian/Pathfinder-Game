# Minimal DEAD-core / minimum-relaxation pilot 001

> **Status:** inconclusive
> **Last evidence:** 2026-09-17 — 15-query single-commitment relaxation diagnosis over the 4 exact-DEAD B2 states, current HEAD.
> **Decision:** discovery-only. 3/4 independent DEAD states admit a clean single-commitment minimal core (relaxing exactly one pending obligation flips the state to CP-SAT-feasible); the fourth (`R00104`) does not, among the obligation types tested. The causal commitment's *type* does not recur cleanly (2 `mustCross`, 1 `mustPass`). This is real signal that small causal cores often exist and are cheap to find, but the population (4 states, all from the already-mined B2 set) is too small to support a recurrence verdict either way.
> **Remaining gate:** a fresh, larger exact-labelled DEAD population (not the already-spent B2 set) before deciding whether commitment-type recurrence holds, cores stay small at scale, and — only if both hold — whether a core "rejects other DEAD siblings while sparing LIVE siblings" (untested here). No runtime machinery (conflict-driven pruning/nogoods) is earned by this pilot alone.
> **Evidence role:** discovery. Population and relaxation set were fixed from H1's already-committed pending-obligation enumeration before any relaxation query ran, but the population itself (4 states) is exhaustive of what B2 offers, not a fresh sample, and was already used to inform the H1 result.
> **Population identity:** the 4 exact-DEAD states in the already-committed B2 set (`S00001:top-rank1`, `S00030:top-rank1`, `S00048:top-rank1`, `R00104:top-rank1`) — no new exact labelling.
> **Inference scope:** establishes only that cheap single-commitment relaxation is a viable diagnostic technique here and that it is not vacuous (it found real, small, size-1 cores on 3/4 cases). It does not establish a recurring commitment type, does not test joint/size-2+ cores, does not test the "spares LIVE siblings" half of the moonshot's own falsifier, and does not bound prevalence on the residual population.

## Why this ran

Per `docs/solver-optimization-workstreams.md`'s current premise execution order, item 3 ("if exact-DEAD contrasts remain causally opaque, run minimal DEAD-core / minimum-relaxation diagnosis") follows H1's closed-negative result (`reports/2026-09-17-h1-event-feasibility-result-001.md`), which left the DEAD states' causal structure unexplained (H1 tested individual-event *realizability*, not *why* a DEAD state is dead). `reports/2026-09-16-assumption-breaking-solver-development-moonshots-001.md`'s Moonshot A names the concrete falsifier: "On a frozen exact-labelled sibling set, ask whether DEAD states admit small recurring cores and whether those cores reject other DEAD siblings while sparing LIVE siblings. If cores are large, parent-specific, or non-recurring, stop before runtime machinery."

## What was implemented

**`--relax=<json {"mustCross":[[x,y],...],"mustPass":[[x,y],...]}>`** added to `scripts/stress/cpsat-reference-probe.py`: drops the named individual cells' own hard constraint (the `visits[c]==2` must-cross requirement, or the `y[c]==1` must-pass requirement) while leaving every other cell of that mechanic, and every other mechanic, exactly as required. This is strictly narrower than the file's existing `--no-mustcross` (which drops the *whole* must-cross family) — it exists to ask "does completion become possible if only this one commitment is relaxed," not "is must-cross involved at all." Validated via `--check-witness`: relaxing a cell a known witness already satisfies anyway leaves the witness `OPTIMAL`, exactly as required (relaxation can only add feasibility, never remove it).

**`scripts/stress/dead-core-relaxation-diagnosis.mjs`**: for each of the 4 DEAD B2 states, extracts its pending must-cross axes and must-pass cells from H1's already-frozen query population (`reports/stress/h1-event-feasibility-queries-2026-09-16.json`) and runs one `--relax` query per pending obligation (15 total). A relaxed witness is *expected* to fail the real referee whenever the relaxation genuinely mattered — the original state is already known exact-DEAD, so any witness satisfying the relaxed model must violate the relaxed-away constraint, or the state could not have been DEAD. Referee rejection under relaxation is therefore treated as confirmation, not a correctness alarm; only a relaxed witness the *real* referee would accept anyway is flagged as an alarm (none occurred).

## Result

| State | Relaxed and flips to feasible | Relaxed and stays DEAD |
|---|---|---|
| `S00001:top-rank1` | `mustCross(6,9)` | `mustPass(6,8)` |
| `S00030:top-rank1` | `mustCross(8,6)` | `mustCross(5,7)`, `mustPass(13,2)`, `mustPass(11,10)`, `mustPass(11,12)` |
| `S00048:top-rank1` | `mustPass(8,15)` | `mustCross(10,8)`, `mustCross(9,6)`, `mustPass(9,5)` |
| `R00104:top-rank1` | *(none)* | `mustCross(8,6)`, `mustPass(3,6)`, `mustPass(8,5)`, `mustPass(9,3)` |

15 queries, 0 correctness alarms. 3/4 states admit a **single-commitment minimal core**; `R00104` needs either a joint (size ≥2) relaxation or a commitment type this pass did not test (`reqLen`/`reqInt` exactness were deliberately excluded as global parameters rather than per-obligation "commitments" in the moonshot's sense).

## Interpretation

This is genuinely informative and not vacuous: 75% of tested DEAD states reduce to one decisive obligation, found with a single cheap CP-SAT solve per candidate. But the moonshot's own bar for advancing toward runtime machinery needs the core's *type* to recur in an interpretable way and needs the "spares LIVE siblings" half tested — neither holds yet at this sample size (2 `mustCross` + 1 `mustPass` hit is not a clean type signal with n=3, and the LIVE-sibling side was not run). Per the operating model's "use the smallest evidence that can decide the next gate," this pilot has *earned* a larger population, not runtime machinery: it is not the "large/non-recurring" pattern that would justify stopping outright, nor is it a confirmed recurring relation that would justify building a conflict-driven pruning mechanism.

## Next gate

A fresh, independently-labelled DEAD population (not the already-mined B2 set) is needed before this can resolve either way — the current 4-state population is exhausted. The current Class-4/Class-5 residual (`docs/solver-optimization-workstreams.md`'s production boundary refresh) is the natural source for a new B2-style sibling harvest if this line is picked back up, sized from that population's own opportunity rate rather than reusing this pilot's outcomes to choose which states to label next (that would be selection on the dependent variable). Until then, this is discovery evidence only, not a decision-bearing result.
