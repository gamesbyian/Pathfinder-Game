# Lane D residual-interface commutativity result 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-17 — 12,277-candidate splice-and-validate observer across 25 levels/up to 20 accepted hint paths each (native PLAY referee, 0 unknowns, 0 CP-SAT compute), current HEAD.
> **Decision:** obligation-multiset equality alone is confirmed **not** sufficient evidence of commutativity (86.5% of candidates fail overall), but genuine per-instance commutativity is real and substantial once segment length is controlled: 46.6% of length-matched candidate pairs (1,453/3,121) splice into a fully legal alternate solution. Every recorded failure is either a geometric/adjacency move-legality break (50.9% of all candidates) or a path-length mismatch (35.6%) — zero failures were attributed to a lost must-pass/must-cross/turn/surround obligation, because the substitution preserves the same obligation-cell visits by construction. This is the exact decision-bearing measurement `reports/2026-09-13-solver-archaeology-residual-interface-retry-lineage-008.md` found had never been run.
> **Remaining gate:** this experiment used only already-LIVE accepted solutions substituting against each other; it does not yet test whether a legal commuting swap can rescue a DEAD near-miss (Lane D's own LIVE/DEAD-discrimination framing, or Lane E's dependency-defined revision question). That is the natural next gate, not a new one.
> **Evidence role:** confirmation of `solver-per-instance-relational-feasibility-preflight.md`'s question 3, and closure of the specific unmeasured gap named by `reports/2026-09-13-solver-archaeology-residual-interface-retry-lineage-008.md` ("whether the swapped/reordered path remains legal ... which mechanics invalidate the commutativity assumption").
> **Population identity:** 25 levels seeded-sampled from `data/stress/stress-levels-random.json` with >=8 stored hints, up to 20 hints per level. No new labelling; validation is the native solver's own PLAY referee (`validateCandidatePath`), not CP-SAT — deterministic, 0 unresolved verdicts.

## Why this ran

Per the reconciled queue's remaining single-agent order (D3 -> C -> E -> F2/F3), Lane D question 3 is next: "for candidate disjoint/weakly-coupled obligation excursions, actually swap/reorder them and evaluate legality plus future completion feasibility/state consequences. Obligation-multiset equality alone is not evidence of commutativity."

The residual-interface tooling (`scripts/stress/research-analysis-lib.mjs`'s `mineResidualInterfaces`) already detects `commutingCandidate` pairs — two segments between the same entry/exit interface with the same obligation multiset in a different order — but archaeology (2026-09-13) found the actual decision-bearing measurement was never built: nothing had ever taken those candidates and checked whether the swap stays legal. This closes that specific, previously-flagged gap.

## Method

For each sampled level: replay every accepted hint path through the native solver (`SOLVER_TESTING_API`) to tag each step with its running intersection count and an obligation label (`mustPass`/`mustCross`/none). Feed the annotated paths into `mineResidualInterfaces` to find `commutingCandidate` segment pairs sharing an entry/exit interface. For each candidate pair `(a, b)`, splice `b`'s segment into `a`'s own full accepted path at the shared interface (`a`'s prefix + `b`'s segment + `a`'s suffix), then validate the resulting full path with `modules/domain/path-validator.ts`'s `validateCandidatePath` — the same native PLAY referee used as ground truth throughout this session, not an approximation. Zero CP-SAT queries.

## Result

| | Count | Legal after splice | Rate |
|---|---:|---:|---:|
| All commuting candidates | 12,277 | 1,653 | 13.5% |
| Length-matched (`a.length === b.length`) | 3,121 | 1,453 | **46.6%** |
| Length-mismatched | 9,156 | 200 | 2.2% |

Failure categories (of 10,624 illegal splices): **geometric/adjacency (invalid move)** 6,247 (58.8%); **path-length mismatch** 4,377 (41.2%). Zero must-pass/must-cross/turn/surround failures.

16/25 levels had zero commuting candidates in this sample (obligation-order diversity across a level's own accepted solutions at a shared interface is not universal); the other 9 ranged from 38 to 5,374 candidates, with legal rates from 0% up to 37.7% (`R02975`: 983/2,606).

## Interpretation

**Commutativity is real, not an artifact of loose obligation-multiset matching.** Restricting to length-matched pairs — the cleanest test, since a length mismatch trivially breaks `requiredLength` regardless of route quality — very close to half of all candidates (46.6%) produce a fully legal alternate solution. That is a strong, decision-bearing positive on the archaeology's exact open question.

**What breaks commutativity is ordinary move legality, not obligation loss.** Every failure traces to either the spliced route being geometrically illegal at some specific step (obstacles, adjacency, filter/turn-state continuity between the swapped segment's specific entry direction and its neighbors) or a length mismatch between the two segments. No obligation is ever silently dropped by a swap — the substituted segment visits the identical must-pass/must-cross cells by construction of the interface-matching bucket key. This is a materially more precise finding than "commutativity sometimes holds": the obligation layer is not what's fragile here.

## What this earns

Earned:
- The specific decision-bearing measurement archaeology found missing, now run: real, referee-sound, 0-unknown legality rates for commuting candidates, with failure causes attributed to specific mechanics (geometric legality, length), not left as an opaque "sometimes."
- A precise reduction: commutativity is best tested length-matched first (~2.5x higher yield than the raw pool), since length mismatch is a confound, not part of the geometric-commutativity question.
- Unusually good economics relative to the rest of Lane D: this uses only the native solver's own O(path length) PLAY referee, no CP-SAT — an order of magnitude cheaper per query than Lane D questions 1-2's approach, and fully deterministic (no `UNKNOWN`/timeout budget to manage).

Not earned:
- A tie to LIVE/DEAD fate. This experiment substituted among already-LIVE accepted solutions; it says commuting swaps often preserve legality among solutions that already work, not that a commuting swap can rescue a DEAD near-miss. That causal question belongs to Lane E's dependency-defined revision line, or a direct follow-on reusing this same splice-and-validate machinery against DEAD-state prefixes.
- A production prototype. No consumer was implemented; the natural one (an in-search move-ordering/diversity operator, or a targeted repair operator for Lane E) is a genuinely promising next step given the economics, but untested.

## Next gate

Reuse this exact splice-and-validate machinery against exact-labelled DEAD near-miss prefixes (Lane E's population) instead of only LIVE-vs-LIVE accepted solutions: does substituting a commuting segment from a sibling solution ever turn a DEAD prefix's completion legal? That is the natural bridge from this result into Lane E's dependency-defined revision question, not a new bespoke experiment.

## Artifacts

- `scripts/stress/lane-d-residual-interface-commutativity.mjs`
- `reports/stress/lane-d-residual-interface-commutativity-2026-09-17.json` — full per-level, per-candidate results
