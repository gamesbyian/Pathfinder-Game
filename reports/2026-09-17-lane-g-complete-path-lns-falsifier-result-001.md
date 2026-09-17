# Lane G complete-path LNS cheapest-falsifier result 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-17 — stage 1 (2,235 pairwise distances across 25 levels, zero new solver compute, pure re-analysis of committed hint data) and stage 2 (3 independent construction attempts against the same 25-level sample), current HEAD.
> **Decision:** the cheapest-falsifier's prerequisite question is answered positively: independently-discovered real accepted solutions for the same level already cluster fairly tightly (median Jaccard distance 0.11 over their visited-cell sets — roughly 89% cell overlap on average). The actual question ("does a naive, non-solving relaxed candidate land close to a real solution") is **not answered** — every tested naive construction method (goal-distance-greedy to completion, a two-phase wander-then-seek variant with backtracking, and the same without backtracking) either produces a candidate so much shorter than `requiredLength` that any comparison is meaningless, or fails to reach the goal at all (0/25 completions in the final, most careful attempt). This is the same construction-method limitation already found blocking the fresh sibling harvest (Lane B) and Lane D question 1, now converging a third time: naive/cheap heuristic path construction cannot reliably complete a full Pathfinder path once `requiredLength` materially exceeds the shortest path, which is the common case.
> **Remaining gate:** stage 2 cannot be answered cheaply. It is blocked on the same production-search-quality constructor already identified as a cross-cutting handoff for Lanes B and D — not a new or Lane-G-specific gate. Full LNS implementation is not earned; the prerequisite (stage 1) is positive but insufficient alone per the falsifier's own bar.
> **Evidence role:** cheapest-falsifier execution, per `docs/solver-future-work.md`'s complete-path LNS entry ("run only the bounded cheapest falsifier before implementation").
> **Population identity:** 25 levels seeded-sampled from `data/stress/stress-levels-random.json` levels with >=5 stored hints (1,552/1,700 eligible), up to 15 hints per level also seeded-sampled. No new labelling; no CP-SAT/exact compute at any stage.

## Why this ran

Per the reconciled queue (`docs/solver-optimization-workstreams.md` Lane G), the complete-path LNS falsifier is explicitly framed as cheap and implementation-free: "test whether plausible relaxed complete paths are structurally/edit-distance close enough to accepted solutions to make local surgery credible" before building any LNS machinery.

## Stage 1: solution-manifold tightness (zero new compute)

**Method:** for each sampled level, computed pairwise Jaccard distance (`1 - |A∩B|/|A∪B|` over each path's visited-cell set) among up to 15 seeded-sampled real accepted solutions, pure re-analysis of already-committed `data/stress/hints-random` data.

**Result:** 2,235 pairs across 25 levels. Overall median Jaccard distance **0.111** (p10=0.022, p90=0.287, min=0, max=0.495). Per-level medians ranged from 0 (two levels had a pair of essentially cell-identical solutions) to 0.292. This is a real, if not extreme, clustering signal: on average, two independently-discovered valid solutions for the same level share roughly 89% of their visited cells.

**Interpretation:** this is a *necessary* precondition for LNS credibility (if real solutions were scattered arbitrarily relative to each other, no relaxed candidate could reliably land near any particular one), and it holds. It is not sufficient: a naive construction method could still fail to land anywhere near this manifold.

## Stage 2: naive relaxed-candidate distance to nearest real solution

**Method (attempt 1):** the same seeded goal-distance-guided, intersection-averse legal walk used to construct the fresh Class-5 sibling harvest, run to completion (stop at goal) instead of a fixed depth fraction. **Result:** 25/25 reached the goal, but candidate lengths were 2-28 cells against required lengths of 60-128 — the walk simply takes the shortest path and stops, since nothing in the heuristic values path length. Nearest-solution distances were uniformly large (median 0.883) purely because the candidates are drastically shorter, not because they are structurally close-but-different. This comparison is not meaningful and was discarded before drawing any conclusion from it.

**Method (attempt 2):** two-phase walk — the goal is blocked as a candidate move until the path length is within goal-distance of `requiredLength` ("wander"), then unblocked ("seek"), using recursive backtracking DFS. **Result:** reach rate collapsed to 5/25 (20%). Root cause: the shared node-budget counter, once exhausted mid-search, causes every remaining recursive call to fail, which backtracking then unwinds **all the way to the empty path** rather than keeping the best partial progress — most runs collapsed to `candidateLen=1`. For the 5 levels that did complete near the target length, nearest-solution distance was better than attempt 1 (median 0.296, roughly 70% cell overlap) but the population is too small and the method too broken to draw a population-level conclusion.

**Method (attempt 3, final):** the same two-phase wander/seek design, but a plain non-backtracking greedy loop (naive candidate construction should be cheap, not a combinatorial search) that stops honestly at a true dead end rather than unwinding. **Result: 0/25 levels reached the goal.** Every walk dead-ended (no legal move available) partway through the wander phase, at lengths ranging 4-74 against targets of 60-128. A pure greedy walk, even with mild intersection tolerance, reliably paints itself into a corner well before covering the required extra length beyond the shortest path.

## Interpretation

Stage 2's three independent attempts each fail for a different, informative reason, but the common thread is the same one already surfaced twice this session: **naive/cheap heuristic path construction is not capable of reliably producing a full, target-length Pathfinder path**, independent of whether backtracking is used. This is now a 3-for-3 convergence (fresh sibling harvest's depth-fraction walk in `reports/2026-09-17-fresh-dead-sibling-harvest-result-001.md`; Lane D's population being limited to already-existing exact-labelled states rather than fresh Class-5 pairs; and this falsifier's stage 2) on the same missing capability.

## What this earns

- **Stage 1 is a real, standalone positive** worth preserving as capability-memory evidence: real solutions for one level cluster with median ~89% cell overlap. This is informative for any future work touching solution diversity, canonicalization, or "how much do valid completions vary" questions, independent of LNS.
- **Stage 2 does not clear the falsifier's bar**, but not because relaxed candidates were shown to be *far* from real solutions — because no cheap method tested could construct a fair candidate to measure at all. This is a **method-limited inconclusive**, not a clean negative: LNS's premise is neither confirmed nor falsified by stage 2.
- **No LNS implementation is earned.** Per the falsifier's own contract, implementation requires the falsifier to show credibility; a method-limited inconclusive does not clear that bar even though stage 1 was positive.

## Next gate

Stage 2 needs either (a) the same production-search-quality constructor already deferred as a cross-cutting handoff for Lane B and Lane D question 1 (in which case Lane G's stage 2 should simply be re-run once that constructor exists, reusing its output as the "relaxed candidate" directly), or (b) a materially different, still-cheap proxy for "structural closeness to a solution manifold" that does not require constructing a complete path at all (e.g., comparing REAL solutions' own early-prefix divergence patterns, which stage 1's machinery could already support with a small extension). Recorded as blocked on the same handoff rather than inventing a fourth bespoke construction attempt.

## Artifacts

- `scripts/stress/lane-g-solution-manifold-tightness.mjs` — stage 1, zero new compute
- `scripts/stress/lane-g-relaxed-candidate-distance.mjs` — stage 2 (final non-backtracking version; earlier attempts' code is not separately preserved, only their results/reasoning above)
- `reports/stress/lane-g-solution-manifold-tightness-2026-09-17.json` — stage 1 full results
- `reports/stress/lane-g-relaxed-candidate-distance-2026-09-17.json` — stage 2 final-attempt results (0/25 reach rate)
