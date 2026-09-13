# Solver archaeology: turn-landmark sequence structure

> **Status:** concluded-positive archaeology / changed-premise synthesis
> **Last evidence:** 2026-09-13 — July turn-landmark-dense diagnosis traced through routing, scoring, lower-bound, deadlock, witness-rank, and transposition descendants
> **Decision:** the historical turn-landmark-dense failure class should not be reopened as a missing archetype, local scorer, adjacent-turn deadlock prune, or naive MST bound. Its surviving value is evidence for a nonlocal completion-compatibility problem: long sequences of individually reasonable moves fail to preserve a globally coherent turn/geometry completion regime.
> **Remaining gate:** none for the historical treatment chain. Use this phenotype only as supporting evidence for current categorical completion-regime / joint-obligation microscopy; no new scalar bound or scorer is earned by this report.
> **Evidence role:** archaeology / premise synthesis
> **Selection:** complete July chain beginning with the six-member default-archetype turn-landmark-dense cluster and following every documented proposed successor.

## 1. The phenotype was real

Commit `c168e281d84ff1449544b48300fb1c1b7d9dd296` checked the full default-archetype unsolved population in its 100-level DFS-plain sample, not a selected subset.

All six shared the same broad signature:

- low intersection target (`reqInt` 1-3);
- small-to-medium grid;
- 14-22 combined adjacent-turn/decorative/surround/must-turn landmarks;
- turn-landmark coverage around 10-15% of the grid;
- default archetype rather than a specialized routing class.

That was legitimate evidence for a recurring phenotype. It was not yet evidence that the missing mechanism was routing.

## 2. Existing-technique routing was cleanly falsified

Commit `e579ee66534bf34c799b7883a86699ac3b76d8eb` bypassed the shared attempt ladder and gave every one of R02657-reduced's 16 existing attempt configurations its own full 8-second budget.

All 16 failed, each after roughly 20.8-29.7 million genuine explored nodes.

This is a strong clean negative for the cheap missing-archetype interpretation. Reordering or prioritizing the same techniques could not expose a hidden winner because no existing technique won even with dedicated attention.

**Closed form:** a new ATTEMPT_POLICY/archetype route over unchanged techniques.

## 3. A real local scoring asymmetry was fixed and still moved nothing

The next investigation found a genuine implementation asymmetry: `mustTurn` had explicit exit-direction guidance while `adjacentTurn`, despite sharing the same TurnDir semantics, had only distance/urgency guidance.

Commit `213625efb10cb21cc08dbce815ac3cba38009591` implemented `SCORE_ADJ_TURN_EXIT_GUIDANCE` by mirroring the established must-turn pattern and carefully matching the before/after-apply calling convention.

Result: **0/6** target levels newly solved. The code was reverted.

This is useful because the treatment was not a toy perturbation. It repaired a real representational asymmetry and was still irrelevant to the phenotype.

**Closed form:** local adjacent-turn exit-direction scoring as the missing capability.

## 4. The obvious joint lower bound was weaker, then negligible at real states

The chain then moved to the remaining suggested lever: a stronger admissible bound over multiple adjacent-turn obligations.

Commit `a769104937d5a75939f535dc2c5e209be907242a` compared a naive MST-style combined bound against the existing max-based `adjTurnLowerBound` at gate states. The proposed joint bound was actually **30-64% smaller** on all five tested levels because its globally optimistic goal leg outweighed the improved multi-object connection cost.

The report did not stop at the gate-state counterexample. Commit `3fc75af56d866751579956b0d958af3483420fcf` replayed withheld witnesses through real search state and sampled 183 mid-search states across four levels.

The MST term beat the existing bound only **5/183** times, all on one level, and by at most two steps on puzzles with required lengths in the 80s-100s. It was a no-op on three of four levels and negligible on the fourth.

**Closed form:** naive single-linkage MST + optimistic goal-leg strengthening for adjacent-turn obligations.

This does not prove every possible joint turn-obligation bound is useless. It does mean the natural scalar/tour refinement was explicitly tested at the states where it would need to matter and failed to add information.

## 5. A sound local deadlock predicate had essentially zero support

Commit `5088d5535d5a1665fa4636b31f4d8c70abb677af` generalized the existing must-turn deadlock proof to adjacent-turn: an unsatisfied adjacent-turn object is dead only when every valid adjacent turning cell has exhausted both edge axes.

This was deliberately conservative and sound. It was wired through DFS, beam, and repair via the shared prune gauntlet.

Commit `ac6682487671fab33a6fc3f51ddde025d2c4880b` then measured it on six structurally diverse levels, including levels chosen to favor the condition.

Result: **zero fires across approximately 88.7 million evaluations**, negligible cost, zero solvability effect. It was reverted.

**Closed form:** local axis-exhaustion deadlock reasoning over adjacent-turn objects.

## 6. The strongest control: local move ranking was already good

Commit `33a49b2711a69fd043e193dcd4f3e455a51eb05c` revisited witness divergence using each level's real attempt-policy profile rather than a generic default.

On 18 fresh levels (10 DFS-plain, 8 repair-close), the real-profile discrepancy stayed within a few percent of the generic baseline. More importantly, the witness's correct next move had `maxStepRank` only **2-3 on every level under every profile tested**, with no exceptions.

So the search was not routinely making grotesquely bad local choices. Correct continuations were already near the top of the local ordering.

The historical report's sharper diagnosis is still valuable: **long sequences of individually reasonable choices did not compound into valid completions often enough.**

That is a qualitatively different problem from a local scorer being wrong.

## 7. The tempting “massive reconvergence” escape hatch was an illusion

The very next investigation, commit `1f704675d5f0b94a02e22c4f691578af733fb764`, appeared to find a huge explanation: 92-99% duplicate DFS visits under a compact state signature.

Later sound-key archaeology corrected that result. The compact signature omitted future-relevant visited/edge/history state and manufactured apparent equivalence. With future-complete identity, recurrence collapsed to roughly 0.5-16%, usually around 1-2%, and later beam sound duplicate elimination was approximately 0.019%.

Therefore the turn-landmark phenotype cannot be explained away as a giant ordinary transposition opportunity either.

## 8. What survives from the chain

The July programme progressively removed the obvious explanations:

| hypothesis | result |
|---|---|
| missing routing/archetype over existing techniques | clean negative; 16/16 dedicated configs failed |
| local adjacent-turn exit guidance missing | clean negative; 0/6 |
| naive multi-turn MST lower bound | clean negative at gate and 183 real states |
| adjacent-turn local deadlock pruning | sound but zero fires in ~88.7M evaluations |
| generic local move ordering deficit | contradicted; correct moves rank near top |
| massive sound state reconvergence | later falsified as under-keyed equivalence |

The residue is not a specific untried algorithm. It is a **representation-level premise**:

> The solver can repeatedly choose locally plausible moves while destroying a globally compatible sequence of turn, arrival/exit, crossing, and path-history commitments long before a simple local deficit exposes the damage.

This is precisely the kind of failure that scalar obligation counts or local urgency can miss. Two states may have similar remaining turn counts and similarly attractive immediate moves while differing categorically in which joint completion geometries remain realizable.

## 9. Relation to current authority

This archaeology does **not** reopen turn-landmark work as a standalone workstream. Current authority already closes nearby scalar future-feasibility accretion and generic scorer proliferation.

Instead it strengthens two existing premises:

1. **categorical completion regimes:** LIVE and DEAD states may differ in the kind of completion still geometrically realizable, not merely the amount of obligation remaining;
2. **joint/dependency-conditioned obligations:** turn satisfaction depends on coupled arrival/exit and path-history choices whose useful causal interface may be much smaller than the whole path but much richer than one scalar bound.

If a current exact-labelled microscope happens to include turn-heavy specimens, this historical chain is a reason to inspect qualitative turn-completion compatibility rather than invent another urgency weight.

## Bottom line

The turn-landmark-dense cluster was not a forgotten easy win. It was a compact historical experiment in which Pathfinder successively ruled out routing, local scoring, the obvious joint bound, a sound local prune, and generic ordering failure.

What remained was the hard part: preserving a globally coherent completion through many locally acceptable decisions. That is useful archaeology because it points away from another patch and toward the current categorical/joint-completion representation question.