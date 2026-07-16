# Experiment 3: does swapping two objects ever flip the repair probe?

**Update (2026-07-16, read this first):** the elite-splice bug (see Experiment 1's own
2026-07-16 update) affected this experiment too. Re-tested all 6 parents with the fixed solver:
fail-rates dropped sharply almost everywhere (P00146 5→0, R00631 7→1, P00136 0→0, R02976 6→0),
**except R00792, which remains fully uniform-failure (7/7) under swap specifically** — unlike
under local-mutant (Experiment 2's update) or symmetry, where it partially broke. See the
"Update (2026-07-16)" section at the end.

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

---

## Update (2026-07-16): re-run after fixing the repair-search elite-splice bug

Same root cause as Experiment 1's own 2026-07-16 update (`e6a9cb9` fix, `7c59c4a` retry-width
re-tune). Re-solved all 6 parents and their swap families with the current solver
(`--scheduler-mode=legacy --budget-ms=60000 --save-hints`).

### Fail-rate (repair fails to win), before vs. after

| Parent | Old swap fail/7 (or /6) | New swap fail/7 (or /6) |
|---|---|---|
| P00146 | 5 | **0** |
| P00144 | 7 | **0** |
| R00631 | 7 | **1** (swap-06 only) |
| P00136 | 0 (of 6) | 0 (of 6, unchanged — already uniform-success) |
| R02976 | 6 | **0** |
| R00792 (control) | 7 | **7 (unchanged)** |

Interesting side note on P00144 and P00136: every swap sibling for each now converges to
*exactly* the same node count (P00144: 1,255,730 nodes on all 7; P00136: 7,286 nodes on all 6,
matching the parent's own count exactly). Not investigated further here, but noted in case it
indicates the swap pool for these two levels is small enough that the search converges on
effectively the same solution route regardless of which two objects were exchanged.

### R00792 is the one control that still fully holds

Of the three modes now re-tested (symmetry, local-mutant, swap — see Experiment 1's and 2's own
2026-07-16 updates), **swap is the only one where R00792 remains completely uniform-failure
(7/7)**, exactly matching its original role as this investigation's fixed point. Local-mutant
broke it (4/7 now succeed) and symmetry broke it partially (3/7 fail, was 7/7) — so R00792 should
now be treated as "a stable non-repair-success control under swap specifically," not a
mode-independent one.

### What this means for the report above

The original conclusion ("swap and local-mutant track each other, both differ sharply from
symmetry") is harder to evaluate now that most of the differentiation has collapsed — 4 of 6
parents show 0 fails under swap post-fix (were 0, 5, 6, 7 before), leaving R00631 (1/7, down from
7/7) and R00792 (7/7, unchanged) as the only two parents with any fail signal left to compare
directionally. The comparison this report drew is still directionally sound as a historical
account of the pre-fix solver, but the magnitude and much of the cross-mode contrast it rested on
is gone in the current solver.
