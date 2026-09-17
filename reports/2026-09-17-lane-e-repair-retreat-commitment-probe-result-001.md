# Lane E repair-retreat commitment probe result 001

> **Status:** inconclusive
> **Last evidence:** 2026-09-17 — exact CP-SAT bisection (0 abstains, 0 correctness alarms) on B2's 2 qualifying dead/live-sibling pairs, current HEAD.
> **Decision:** the observer procedure works cleanly (finds the exact point of no return along a dead trajectory via monotone CP-SAT bisection), but on the only 2 cases B2's population supports, the true point of no return sits 1-2 moves from the *end* of the trajectory — a regime where "roll back a short distance from the end" and "find the compact causal commitment" make the same prediction. Neither case tests the harder, more discriminating regime `solver-dependency-defined-revision-preflight.md` actually cares about (a point of no return far from the end, near the naive divergence point). The critical move in both cases is a plain, non-mechanic-obligation move (not must-pass/must-cross/portal/revisit), which is suggestive but not statistically meaningful at n=2.
> **Remaining gate:** the available exact-labelled population (B2, same-parent dead/live pairs with a literal shared prefix) is exhausted at 2 usable pairs. A materially larger or more diverse population is needed before this line can produce a real discriminating verdict either way — most plausibly the same production-search-quality sibling constructor already blocking Lanes B/D1/G2.
> **Evidence role:** Lane E's required first bounded observer, per `solver-dependency-defined-revision-preflight.md` ("use already exact-labelled repair-retreat/LIVE-DEAD cases before generating new data"). Also a legitimate reopening of H3 (`reports/2026-09-17-h3-repair-commitment-interface-result-001.md`, closed-negative on Card-E's *proxy*-labelled population) on a materially different, *exact* CP-SAT-labelled population, per H3's own reopening clause.
> **Population identity:** B2's 28-state/14-parent exact-labelled set (`reports/stress/h1-event-feasibility-queries-2026-09-16.json`). Of 14 parents, only 2 (`S00001`, `S00048`) have a same-parent dead/live pair sharing a literal common prefix of >=8 cells; both were tested. No new labelling — bisection reuses the already-audited monotone `--prefix` CP-SAT technique.

## Why this ran

Per the reconciled queue's remaining order, Lane E is next after Lane C/D. Its preflight asks whether hard failures are governed by a compact set of earlier commitments rather than rollback distance, and requires using already exact-labelled repair-retreat/LIVE-DEAD cases before any new data generation. B2 is the only currently available population meeting that bar, and it happens to contain same-parent dead/live pairs that literally share a prefix (identical cells) before diverging — exactly the shape Lane E's questions need ("which earlier decision points first create each divergent commitment").

This also legitimately reopens H3 (closed negative on Card-E's 156-row *proxy*-labelled population, where remaining length dominated with Cohen's d=-1.81): H3's own reopening clause explicitly allows "a different repair-retreat population (not Card-E's)." B2 qualifies — it is exact CP-SAT-labelled, not a bounded-node-budget proxy — and this report's method (within-trajectory bisection) is also a different, more causal design than H3's cross-sectional feature-correlation approach.

## Method

For each B2 parent with a same-parent dead/live pair sharing a literal common prefix (identical `[x,y]` cells) of at least 8 steps: the dead state's full stored prefix is a monotone CP-SAT-infeasible trajectory (`repair-retreat-binary-search.mjs`'s monotonicity argument, `reports/2026-08-12-repair-retreat-cpsat.md`: a prefix with no exact completion stays infeasible for every deeper prefix along the same trajectory). Binary search over prefix depth, using `cpsat-reference-probe.py --prefix`, finds the exact boundary: `low` = deepest still-feasible depth, `high` = shallowest infeasible depth (`high = low + 1`). Every `live` verdict is referee-validated (`Solver.validateCandidatePath`) before being trusted. The critical move (`path[high]`) is then classified into a commitment family (must-pass, must-cross, portal-jump, revisit/intersection, or plain) by replaying the trajectory through the native solver.

Only 2 of B2's 14 parents have a qualifying pair; both were tested (`S00030`/`R00104`, used throughout Lane D1-D2, have a common prefix of only 1 — they diverge essentially at the gate and carry no "how much later than naive divergence" question to ask).

## Result

| Level | Elite length | Naive first divergence | Point of no return | Rope beyond naive divergence | Rollback distance from end | Critical move family |
|---|---:|---:|---:|---:|---:|---|
| `S00001` | 27 | 17 | feasible@24 / infeasible@25 | 8 | 2 | plain |
| `S00048` | 24 | 14 (10 vs. 2nd sibling) | feasible@22 / infeasible@23 | 9 | 1 | plain |

0 abstains, 0 correctness alarms across both bisections (7 CP-SAT queries total).

## Interpretation

**The procedure works.** Bisection cleanly and exactly locates the point of no return in both tested cases, directly answering Lane E's question 3 ("can the relevant commitment be detected before the terminal near-miss?") in the affirmative as a *procedure* — a sound, referee-validated, deterministic way to find it exists and is cheap enough to run (7 queries, none needing the full 120s budget except two abstains-avoided reruns).

**Neither case discriminates the core hypothesis.** Lane E's premise contrasts "a compact earlier commitment" against "geometric rollback distance." In both tested cases, the point of no return sits only 1-2 moves from the very *end* of the dead trajectory (`rollbackDistanceFromEnd` = 2, 1) — far *later* than the naive first-divergence-from-a-live-sibling point (8-9 moves of "rope" the naive divergence point would have wrongly written off as already-dead). This means simple backward rollback from the end and "find the exact causal commitment" make the *same* prediction here: both point to the last 1-2 moves. This is the "easy" regime the preflight's own historical framing already describes ("some elites were exact-repairable after only 1-2 rollback steps"), not the harder, discriminating regime ("other cases implicated much earlier structural choices") that would actually separate the two hypotheses. Two data points, both landing in the easy regime, cannot support or refute the premise.

**The critical move is not a named mechanic obligation, in both cases.** Neither critical move touches must-pass, must-cross, a portal jump, or creates a new intersection — both are plain geometric moves. This is consistent with (though far too small a sample to confirm) a topological/connectivity-style causal factor — closer to Lane F item 3's "topology per-instance microscope" or Lane A's separator work than to a discrete mechanic-obligation commitment family. Worth flagging as a possible cross-lane connection, not claiming as a finding.

## What this earns

Earned:
- A validated, reusable, cheap (CP-SAT-bisection, not brute enumeration) procedure for finding the exact point of no return along any exact-labelled dead trajectory — directly reusing already-audited tooling (`repair-retreat-binary-search.mjs`'s monotonicity argument), extended here to B2's sibling-divergence population specifically.
- Two new, referee-sound exact data points for the "sometimes only 1-2 rollback steps needed" bucket the preflight's own historical framing already names, now with exact CP-SAT backing rather than historical anecdote.

Not earned:
- Any verdict on Lane E's actual discriminating question. Per the preflight's stop rules, this is not "the first actionable causal point is usually indistinguishable from ordinary rollback distance" either (2 points is not "usually"), so this does not close the premise. It is a genuine population-limited inconclusive, not a disguised negative.
- A revision prototype. No advancement gate is cleared (a compact causal interface was found, but on a share of failures too small to call "non-trivial," and it did not demonstrate being more actionable than rollback distance since both coincide here).

## Next gate

B2's common-prefix population is exhausted (2/14 parents qualify at the >=8 threshold; both tested). Expanding this line needs either fresh matched same-parent dead/live Class-5 pairs with a longer shared prefix and a point of no return that lands *earlier* than near the end — the discriminating case — which is the same production-search-quality sibling constructor already blocking Lanes B, D1, and G2. Lowering the common-prefix threshold below 8 was considered and rejected: a shorter shared prefix gives even less room for the "much earlier structural choice" case to appear.

## Artifacts

- `scripts/stress/lane-e-repair-retreat-commitment-probe.mjs`
- `reports/stress/lane-e-repair-retreat-commitment-probe-2026-09-17.json` — full bisection traces and critical-move classification
