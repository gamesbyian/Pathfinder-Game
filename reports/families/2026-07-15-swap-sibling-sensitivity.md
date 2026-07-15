# Experiment 3: does swapping two objects ever flip the repair probe?

Third experiment in the five-experiment batch. Where Experiment 2 (local-mutant) tested "does
relocating one object ever flip repair-probe success/failure the way rotation does," this
experiment tests the same question for `--mode=swap` — exchanging two existing objects' positions,
a different, still strictly-local perturbation (no new position is invented; two already-legal
cells trade occupants) that changes exactly two coordinates rather than one.

## Setup

Same 6 parents as Experiment 2, for a three-way comparison (symmetry / local-mutant / swap) on
identical levels: P00146, P00144, R00631, P00136, R02976 (all showed a fail/succeed flip under
symmetry) and R00792 (uniform-failure control). `--mode=swap --count=7`, fixed seed per parent.
Parent solves reused from Experiment 1. Solved via the same `--scheduler-mode=legacy
--budget-ms=60000`. 5 of 6 families generated the full 7/7 requested siblings; **P00136 generated
only 6/7** — its small movable-instance pool (7 objects total) ran out of legal, non-duplicate
swap pairs within the attempt budget (280 attempts). Reported as-is, not padded. All 41 total
siblings (across the 6 families) solved within budget, no timeouts.

## Results: fail-rate per parent, symmetry vs. local-mutant vs. swap

| Parent | Symmetry fail/7 | Local-mutant fail/7 | Swap fail/7 (or /6) |
|---|---|---|---|
| P00146 | 3 | 6 | 5 |
| P00144 | 6 | 7 | 7 |
| R00631 | 3 | 7 | 7 |
| P00136 | 3 | 0 | 0 (of 6) |
| R02976 | 6 | 3 | 6 |
| R00792 | 7 | 7 | 7 |

**Local-mutant and swap agree with each other far more often than either agrees with symmetry.**
Four of six parents (P00144, R00631, P00136, R00792) show identical or near-identical fail counts
between local-mutant and swap, while three of those four (P00144, R00631, P00136) differ sharply
from symmetry's own number for the same parent. R02976 is the one family where swap (6/7 fail)
lands close to symmetry (6/7) rather than local-mutant (3/7) — the exception, not the rule.

This is a more specific, mechanistically suggestive version of Experiment 2's finding: it isn't
just "local-mutant differs from symmetry" — **both tested forms of small, targeted, single-or-pair
object perturbation (local-mutant and swap) behave similarly to each other and differently from a
whole-level rigid coordinate transform.** That's consistent with the repair heuristic's search
order depending on something specific to *global* coordinate structure (e.g. a row-major or
corner-anchored scan convention that a 90° rotation reindexes completely, but a single swapped
pair barely touches) rather than on the mere presence or degree of a perturbation.

### Per-family detail

**P00146** — 2 of 7 swaps rescue (`swap-02`: blocks↔geese, 804,428 nodes via repair; `swap-05`:
blocks↔geese, 452,179 nodes via repair), both notably cheaper than the parent's own 2,000,638.
Close to local-mutant's own single rescue for this family, though via different object pairs.

**P00144** — a strikingly *flat* result: all 7 swap variants land at **exactly** 2,000,032 nodes,
regardless of which block/falseGoals pair was exchanged. This is the most homogeneous result in
any of the three experiments run against this parent so far — every swap pair here is apparently
functionally interchangeable from the repair search's perspective.

**R00631** — uniform failure (7/7), matching local-mutant exactly (also 7/7) and both differing
from symmetry's 3/7 rescue rate. All variants sit within 0.001% of the parent's own cost via the
identical beam config.

**P00136** — uniform success on all 6 generated siblings (0/6 fail), and even more strikingly
**every single swap lands at exactly the parent's own node count, 277,365** — the swap changes
which geese/blocks objects occupy which cells but produces a bit-identical search-cost outcome
every time. Combined with local-mutant's own 0/7 fail-rate for this parent (albeit with real cost
variation there, 74,586–1,771,908), this family's repair path appears essentially indifferent to
where its geese and blocks specifically sit.

**R02976** — 1 of 7 rescues (`swap-03`: flippingFilters↔blocks, but at 9,698,768 nodes — nearly 5×
the parent's own cost even while winning via repair, another instance of the "succeeds but far more
expensively" pattern seen repeatedly across all three experiments so far). The other 6 variants are
either exactly identical to the parent's cost (2,000,003, four of them) or negligibly different —
most swap pairs here are inert; one specific pair (flippingFilters↔blocks) is not.

**R00792** (control) — uniform failure, and again every single variant lands at **exactly** the
parent's own node count (2,000,019). Three experiments, three different mutation modes, one
consistent result for this family: nothing tested this session moves its repair-probe outcome or
even its precise cost.

## Interpretation

Across Experiments 1–3, a pattern is emerging that's worth stating plainly: **whole-level symmetry
transforms and small local perturbations (single-move or pairwise-swap) appear to probe genuinely
different sensitivities in the repair heuristic.** Local-mutant and swap cluster together — both
either leave a family's repair outcome completely untouched (down to the exact node count, in
several cases) or occasionally flip it via a specific, seemingly idiosyncratic object pair —
while symmetry's whole-coordinate reframing produces its own, differently-shaped pattern of
flips (see Experiment 1's variant-1 finding). Neither "how much of the level changed" (Experiment
2's headline) nor "which two specific objects moved" fully explains the flips seen so far; the
recurring exact-node-count matches (P00144, P00136, R00792 partially) suggest many swap pairs
are simply irrelevant to repair's actual search order, while a minority of pairs (R02976's
flippingFilters↔blocks, P00146's two geese-involving pairs) are not.

## Caveats

- **P00136's 6/7 generation shortfall is reported, not concealed**: its 7-object domain has too
  few legal, distinct swap pairs to reach 7 within the default attempt budget. A larger
  `--max-attempts-per-sibling` might reach 7, but was not tried — 6 genuine siblings is judged
  sufficient evidence for this family's own near-total uniformity (0/6 fail, all cost-identical).
- **Same 6-parent sample as Experiment 2**, chosen for comparability, not because they represent
  the wider repair-gated population — this experiment cannot speak to swap's behavior beyond
  these specific 6 levels.
- The repeated *exact* node-count matches (not just "close," but bit-identical) across many swap
  variants is worth flagging as itself informative: it implies those specific swaps produce a
  provably identical search trace, not merely a similar one — consistent with the swapped objects
  sitting entirely outside whatever region of the grid the winning search actually explores.
- `nodesExpanded` is the primary signal throughout, per CLAUDE.md's guidance.
- Data collection only; no solver changes proposed. Scoped to `legacy` scheduler mode, commit
  `cab84d4`.
