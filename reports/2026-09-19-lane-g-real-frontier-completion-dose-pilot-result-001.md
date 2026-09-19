# Lane G real-frontier completion dose pilot result 001

> **Status:** concluded — method-limited negative on tested dose range, not a feasibility proof.
> **Last evidence:** 2026-09-19 — two matched tiers (2,000,000 and 16,000,000 close-gap node budget) over the identical frozen 45-attempt population.
> **Decision:** completing real production beam-search frontier partials via the existing `searchCompletionFromPartialPath` repair operator produced **0/45 referee-valid solves at both a 2M and a 16M close-gap node ceiling**, with the outcome shape (which attempts fail vs. exhaust) **identical** across an 8x budget escalation. This is not proof that these partials are infeasible, but it rules out "just needs a bit more dose" as the explanation and is direct evidence against Lane G's premise that a relaxed real-search partial is cheaply/locally repairable.
> **Remaining gate:** none newly opened. Lane G's "fair full candidate from frozen real-search partials" gate (`docs/solver-optimization-workstreams.md`) remains unmet; complete-path LNS is not earned. A further order-of-magnitude dose escalation is not recommended without a materially different reason to expect it would convert zero solves into a nonzero rate.
> **Evidence role:** cheapest-next-step execution of Lane G's queued gate; not a solver efficacy result (zero solves changes nothing about the production ladder).
> **Population identity:** 15 levels seeded-sampled from the current Corpus-2 residual (`reports/stress/capability-runs/35066677597/per-level-corpus2.json`), seed `lane-g-residual-frontier-completion-pilot-2026-09-19`, x3 depth fractions (0.7/0.8/0.9) x1 random frontier pick per (level, depth) = 45 attempts, identical across both tiers (same seed → same picks).

## Why this ran

Per `docs/solver-optimization-workstreams.md`, Lane G's remaining gate was: "a fair full candidate from frozen real-search partials, then distance/local-repairability. Rich capsules may supplement, not replace, the specialist sampler. No LNS earned." `scripts/stress/lane-g-residual-frontier-completion-pilot.mjs` (added in PR #1907, not yet run) implements exactly this: pause `beamSearchFromGate` at a real production-search checkpoint (a fraction of `requiredLength`) on a currently-**unsolved** level, pick a real frontier state, and attempt to complete it with the solver's own existing `searchCompletionFromPartialPath` repair operator — no naive/greedy construction (already shown method-limited three separate ways in `reports/2026-09-17-lane-g-complete-path-lns-falsifier-result-001.md`), no comparison to a known solution (none exists for these unsolved levels). Either the referee validates a completed path, or it does not.

## Method

1. **Tier 1:** `node scripts/run-bundled.mjs scripts/stress/lane-g-residual-frontier-completion-pilot.mjs -- --sample-size=15 --depth-fractions=0.7,0.8,0.9 --picks-per-level=1 --pick=random --out=reports/stress/lane-g/residual-frontier-completion-pilot-2026-09-19.json` (script defaults: width=2000, profile=intersectionHarvest, budget-ms=60000, close-gap-node-budget=2,000,000).
2. **Tier 2:** identical invocation with `--close-gap-node-budget=16000000` (8x), same seed → identical 45 (level, depthFraction, pick) selections by construction, output `reports/stress/lane-g/residual-frontier-completion-pilot-16m-2026-09-19.json`.

No exact/CP-SAT compute; no production routing change; referee validation (`Solver.validateCandidatePath`) is the sole solve criterion.

## Result

| | Tier 1 (2M) | Tier 2 (16M) |
|---|---:|---:|
| `completion-failed` (hit close-gap node ceiling) | 34/45 | 34/45 |
| `exhausted-before-checkpoint` (beam itself never reached the pause depth) | 11/45 | 11/45 |
| `COMPLETION-SOLVED` / referee-valid | 0/45 | 0/45 |

Every one of the 34 `completion-failed` rows terminated at **exactly** the tier's node ceiling in both tiers (34/34 both times) — none exhausted naturally. The 11 `exhausted-before-checkpoint` rows are a beam-search-stage phenomenon (the frontier pause point was never reached at the given depth fraction/width/budget) and are structurally unaffected by the close-gap budget, so their count is unchanged by construction.

Candidate lengths at the frontier-pause point (fixed by construction, not a function of close-gap budget) ranged widely, including several close approaches: e.g. R02397 reached 129/142 (91%), 115/142 (81%), 100/142 (70%) required length at its three depth fractions; R02018 reached 111/137 (81%); R00765 reached 95/104 (91%). These are the partial *lengths before completion is attempted*, not progress made during completion — the script does not currently record intra-completion progress, only pass/fail at the ceiling, which is a real limitation of this instrumentation for future dose studies (see "What this does not establish" below).

**The outcome shape is bit-for-bit identical between the 2M and 16M tiers** — same 34 rows fail, same 11 exhaust before checkpoint, verified by direct comparison of both result files (matching on level/depthFraction/pickIndex).

## Interpretation

An 8x close-gap node budget escalation produced **zero** change in outcome on this population. This is meaningfully different from (and stronger than) a single-tier "0/45, all censored" result: it directly tests and rejects the simplest dose hypothesis ("the ceiling is just a little too low") over a full order-of-magnitude-adjacent range, without yet proving infeasibility (an even larger escalation, or the specialist sampler's own techniques, might still close some of these gaps).

Per this repo's standing evidence discipline (`docs/solver-failure-evidence-research-integration-plan.md` section 7.1: "do not relabel it positive because progress... moved"; section 7.2: distinguish censored from exhausted), this remains **censored, not falsified** in the strict sense — every completion-failed row is still at its ceiling, not naturally exhausted, at both tiers. But the complete non-response to an 8x escalation is itself the decision-relevant fact for Lane G's actual question, which is not "is this technically feasible at unbounded budget" but "is a relaxed real-search partial *cheaply, locally* repairable enough to make LNS credible." An operator that needs at least >16M nodes (when the levels' whole-solve node ceilings are themselves commonly 20-50M) to possibly close a 10-30% length gap is not evidence of cheap local surgery, independent of whether it eventually succeeds at some much higher budget.

## What this does not establish

- **Not a feasibility proof.** No row was shown infeasible; every failure is still budget-censored at both tested tiers.
- **Not a clean falsification of Lane G's premise**, only of the "modest dose escalation" sub-hypothesis. A qualitatively different completion strategy (not just more nodes under the same operator) is not ruled out.
- **Does not indict the specialist frontier sampler or repair operator themselves** — both are existing, previously-validated production machinery, used unmodified.
- **No solve was found or lost.** This is zero-solve-delta process evidence, not a production outcome.

## What this earns

- Lane G's "fair full candidate from frozen real-search partials" gate is **not met**: 0/45 across two tiers spanning an 8x budget range is not a fair full candidate by the falsifier's own bar.
- **No LNS implementation is earned**, consistent with `docs/solver-optimization-workstreams.md`'s standing rule.
- A further blind dose escalation (e.g. another 8x to ~128M) is **not recommended** as the next step without a new reason to expect a different response shape — the identical-outcome result argues against "more of the same" being informative. If Lane G is revisited, the next cheapest step should be either (a) a materially different repair strategy/seam, or (b) treating this as confirmation that Lane G stays closed pending the same "production-search-quality constructor" handoff already flagged as blocking Lane B and Lane D question 1 (see `reports/2026-09-17-lane-g-complete-path-lns-falsifier-result-001.md`'s "Next gate" section) — this pilot removes the last cheap unexplored option (real partials instead of naive construction) without changing that shared blocker.

## Artifacts

- `scripts/stress/lane-g-residual-frontier-completion-pilot.mjs` (pre-existing, unmodified; PR #1907)
- `reports/stress/lane-g/residual-frontier-completion-pilot-2026-09-19.json` — Tier 1 (2M) full results
- `reports/stress/lane-g/residual-frontier-completion-pilot-16m-2026-09-19.json` — Tier 2 (16M) full results
