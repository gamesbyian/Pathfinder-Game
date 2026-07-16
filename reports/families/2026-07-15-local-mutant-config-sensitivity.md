# Experiment 2: does a single local mutation ever flip the repair probe, like rotation does?

**Update (2026-07-16, read this first):** the elite-splice bug (see Experiment 1's own
2026-07-16 update) affected this experiment too — every fail-rate below was measured against
the broken solver. Re-tested all 6 parents with the fixed solver: fail-rates dropped sharply
almost everywhere (P00146 6→0, P00144 7→1, P00136 0→0, R02976 3→0), but the R00792 control —
used specifically because it should be mutation-invariant — is **no longer invariant**: 4/7
local-mutant siblings now solve via repair where none did before. See the "Update (2026-07-16)"
section at the end.

Second experiment in a batch of five run against `docs/sibling-cousin-system.md`'s sibling/cousin
generation modes, following Experiment 1 (symmetry-sibling orientation bias,
`2026-07-15-symmetry-orientation-bias.md`). That investigation established: for repair-gated
levels, whole-level rotation/reflection can flip whether `orchestration.ts`'s early repair probe
succeeds or fails, changing solve cost by up to several hundred×. This experiment asks a narrower,
mechanistic question: **is that sensitivity a property of *any* perturbation to the level, or
specifically of the whole-level coordinate reframing a rotation performs?** `--mode=local-mutant`
is the smallest possible perturbation the generator supports — one object relocated, exact witness
path preserved, everything else byte-identical — making it the natural contrast case.

## Setup

Reused 6 parents already fully characterized under symmetry in Experiment 1, for direct
same-level comparison: 5 that showed a genuine fail/succeed flip under rotation (P00146, P00144,
R00631, P00136, R02976) plus 1 uniform-failure control (R00792, which never flips under rotation
either). `--mode=local-mutant --count=7` (matching symmetry's per-family sibling count) with a
fixed generation seed per parent. Parent solves reused directly from Experiment 1 (same levels, no
resolve needed). Solved via `portfolio-solve-sweep.mjs --scheduler-mode=legacy --budget-ms=60000`.
All 6 families generated 7/7 siblings; all 42 solved within budget, no timeouts.

## Results: fail-rate (repair-probe fails to win) per parent, symmetry vs. local-mutant

| Parent | Symmetry fail/7 (Experiment 1) | Local-mutant fail/7 | Direction |
|---|---|---|---|
| P00146 | 3 | 6 | local-mutant *more* failure-prone |
| P00144 | 6 | 7 | roughly the same (both near-uniform fail) |
| R00631 | 3 | 7 | local-mutant *more* failure-prone |
| P00136 | 3 | 0 | local-mutant *less* failure-prone (uniform success) |
| R02976 | 6 | 3 | local-mutant *less* failure-prone |
| R00792 | 7 | 7 | same (both uniform fail — the control held) |

**No consistent direction.** Local-mutant is more disruptive than symmetry for two parents, less
disruptive for two others, and indistinguishable for two (one of which, R00792, was specifically
chosen as a control precisely because it should be mutation-invariant — and it was, under both
modes). This is itself the primary finding: **a single local mutation and a whole-level rotation
are not interchangeable proxies for "how much the level changed" as far as the repair probe is
concerned.** Whatever makes rotation flip repair's success/failure for a given family does not
transfer cleanly to "any perturbation, however small" — it must depend on something rotation does
specifically (a full coordinate reframing) that a one-object move does not.

### Per-family detail

**P00146** — one genuine local-mutant rescue: `F00146-lm-04` (moving a `mustPass` from (5,6) to
(7,4)) flips to `dfs:repair:repair` at 1,157,344 nodes (vs. the parent's 2,000,638). The other 6
variants stay in the beam-fail regime, alternating between `objectiveFirst@beam5000` and
`intersectionHarvest@beam5000(diverse)` — a config swap among failing variants, the same
non-repair-related config instability seen in several Experiment 1 families.

**P00144** — no local-mutant rescue at all (0/7), but one variant (`F00144-lm-01`, moving a block)
produces the most extreme cost outlier in this experiment: 50,061,711 nodes via `dfs:intersectionHarvest`
— a plain-DFS technique that appears nowhere else in either this experiment or Experiment 1, 25×
the parent's own cost, while still never touching repair. A single misplaced block can apparently
change *which* non-repair technique the ladder falls back to, not just how expensive the winning
one is.

**R00631** — 0/7 local-mutant rescues, despite symmetry rescuing this family 3/7 times (Experiment
1). All 7 variants sit tightly around the parent's own cost (2,000,003–2,000,031 nodes) via the
identical `beam:intersectionHarvest@beam5000(diverse)` config — the most stable, least
perturbation-sensitive result of any family in this experiment.

**P00136** — the opposite extreme: all 7 local-mutant variants succeed via repair (0/7 fail),
where symmetry had 3/7 fail. Cost varies substantially (74,586–1,771,908 nodes) but never
approaches the ~2,000,000-node ceiling associated with a failed probe — local mutation seems to
leave this family's repair-friendly structure fully intact regardless of which single object moves.

**R02976** — the richest family in this experiment: 4 of 7 variants rescue (`lm-03`, `05`, `06`,
`07`), more than symmetry's 1/7 for the same parent. `lm-06` is a striking outlier even among the
rescues: 47,599,797 nodes via `dfs:repair:repair` (136 s wall time) — repair *wins* here, just at
roughly 24× the parent's own cost, the same "succeeds but wildly expensive" pattern R03015 showed
under symmetry in Experiment 1, now reproduced under a completely different mutation mode.

**R00792** (control) — uniform failure under local-mutant, exactly as under symmetry. All 7
variants land within 0.002% of the parent's own node count via the identical
`beam:intersectionHarvest@beam5000` config, regardless of which decorative/geese/block object
moved. This family's difficulty appears genuinely structural, not orientation- or
placement-sensitive by any mode tested so far.

## Interpretation

The clean negative-then-positive result: there is no "local-mutant is safer" or "local-mutant is
riskier" rule relative to symmetry — direction and magnitude both vary by family, sometimes
sharply (P00136: 3/7→0/7; R00631: 3/7→7/7). Combined with Experiment 1's own finding that most
repair-gated families are orientation-invariant regardless of mode, the emerging picture is that
repair-probe sensitivity is a property of the *specific* transform applied to a *specific* level's
structure, not a general "fragility score" that scales with how much of the level changed. A
single relocated object can occasionally destabilize repair as much as a full rotation (R02976's
`lm-06`) or leave it completely untouched (R00792, R00631) — cite the feature regime and the
specific mode, never "this level is fragile" as a standalone property.

## Caveats

- **Small sample, same 6 parents as Experiment 1** — chosen for direct comparability, not because
  they're representative of the wider repair-gated population. A systematic local-mutant sweep
  across the same 22-38-family scale as Experiment 1's symmetry work has not been done.
- **Different domains per mode**: local-mutant's movable-instance count and eligible-cell pool
  differ from symmetry's (which touches every object at once), so "7 siblings" does not sample the
  same underlying space in the two modes — the comparison is about outcome rates, not a controlled
  like-for-like resampling.
- `nodesExpanded` is the primary signal throughout, per CLAUDE.md's guidance; wall-clock roughly
  agrees except at the low end (sub-second differences are dominated by fixed overhead).
- Data collection only; no solver changes proposed. Scoped to `legacy` scheduler mode, commit
  `e9be9be`.

---

## Update (2026-07-16): re-run after fixing the repair-search elite-splice bug

Same root cause as Experiment 1's own 2026-07-16 update: `repair-search.ts`'s elite-splice pool
was silently dead for this entire investigation (fixed in `e6a9cb9`; retry width re-tuned in
`7c59c4a`). Re-solved all 6 parents and their local-mutant families with the current solver
(`--scheduler-mode=legacy --budget-ms=60000 --save-hints`).

### Fail-rate (repair fails to win), before vs. after

| Parent | Old local-mutant fail/7 | New local-mutant fail/7 |
|---|---|---|
| P00146 | 6 | **0** |
| P00144 | 7 | **1** (lm-07 only) |
| R00631 | 7 | **1** (lm-04 only) |
| P00136 | 0 | 0 (unchanged — already uniform-success) |
| R02976 | 3 | **0** |
| R00792 (control) | 7 | **3** (lm-01/02/03 still fail; lm-04–07 now succeed) |

Every family except the already-uniform P00136 shows a sharply lower fail-rate. R02976 also
still carries a genuine outlier: `F02976-lm-06` solves via repair at 33,973,687 nodes / 106s —
smaller than the pre-fix figure (47,599,797 nodes / 136s) but still the same "solves, just
absurdly expensively" pattern from the original report, not eliminated by the fix.

### The R00792 control no longer holds

This is the most important change for this report specifically. R00792 was chosen and used
throughout Experiments 1–3 *because* it appeared mutation-invariant — a fixed point to check the
other findings against. Post-fix, local-mutant partially breaks that: `F00792-lm-04` through
`lm-07` now solve via repair (27K–3.1M nodes) where all 7 previously failed uniformly. The parent
itself is unaffected (still fails, 4,000,021 nodes via beam — consistent with symmetry's re-test,
see below), so this isn't the parent becoming easier in general; it's specifically that some
local mutations now let repair succeed where the identity orientation still can't.

For completeness, R00792's *symmetry* siblings were also re-solved this update (not just
local-mutant): 3/7 now fail (was 7/7) — so the control isn't invariant under symmetry either
anymore. Its swap siblings (see Experiment 3's own update) remain fully uniform-failure (7/7),
so R00792 is now a control that holds under swap specifically but not the other two modes — a
narrower, still-useful fixed point, not a fully dead one.

### What this means for the report above

The original conclusion — "no consistent direction, local-mutant is not a interchangeable proxy
for symmetry" — is still directionally true (the two modes still don't move in lockstep), but
the *magnitudes* above are stale, and the R00792 control's own invariance claim needs to be
narrowed to "holds under swap, not under symmetry or local-mutant" going forward. Anything in
this report that treats R00792 as a stable baseline should be re-read with that caveat.
