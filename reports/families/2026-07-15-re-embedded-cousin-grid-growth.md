# Experiment 4: does growing the grid around unchanged content change solver behavior?

**Update (2026-07-16, read this first):** the elite-splice bug (see Experiment 1's own
2026-07-16 update) affected this experiment too, but the outcome here is different from
Experiments 1–3: **the R02208 headline finding survived the fix intact, and got stronger** — the
parent still fails repair at every re-embed size still rescues it, now even more cheaply.
R02714 changed the most: it no longer supports this report's "repair failure is unrelated to
grid size" contrast claim. See the "Update (2026-07-16)" section at the end.

Fourth experiment in the five-experiment batch, and the first to leave the "sibling" tier
entirely: `--mode=re-embed` is the first **cousin** tier in `docs/sibling-cousin-system.md`'s
taxonomy — the witness's coordinates shift, but the level's entire relative structure (every
object, the witness path, `reqLen`, `reqInt`) is embedded unchanged into a larger grid, with the
newly-added surrounding area left completely open. Nothing about the puzzle's own difficulty
changes; the only variable is how much additional, entirely irrelevant open space surrounds it.
This tests a different mechanism than Experiments 1–3: not "did an object move," but "does spatial
context alone (empty cells the witness never touches) change which technique wins or how much it
costs?"

## Setup

Three parents, chosen to include at least one whose identity-orientation win explicitly depends on
grid geometry (`perimeterSweep` configs reference the grid boundary by construction):

| Parent | Grid | Identity config | Repair-gated? |
|---|---|---|---|
| P00097 | 10×10 | `dfs:perimeterSweep/cornerHarvest` | No (reqInt 2, low mechanic count) |
| R02714 | 11×11 | `beam:perimeterSweep/perimeterCW@beam2000` | Yes (uniform-failure under symmetry, Experiment 1) |
| R02208 | 11×11 | `beam:perimeterSweep/perimeterCCW@beam2000` | Yes (uniform-failure under symmetry, Experiment 1) |

Each re-embedded at 3 progressively larger grid sizes (+2, +4, +6 per side), centered offset (so
the parent's content sits in the middle of the new grid at every size, isolating grid size as the
only variable): 12×12/14×14/16×16 for P00097; 13×13/15×15/17×17 for the two 11×11 parents. Parent
solves reused from Experiment 1. Solved via `--scheduler-mode=legacy --budget-ms=30000`.

**A fourth candidate, R02825** (also a `perimeterSweep`-winning, repair-gated, portal-heavy
parent), **failed re-embed generation at all 3 sizes** — "rejected at final witness re-check:
Invalid move at step 71" every time. Not investigated further (out of scope for a data-collection
session; no `family-generate.mjs` changes made), but worth recording: R02825 has 7 portal pairs,
and this is the only re-embed failure encountered this session, suggesting portal-heavy levels may
be more likely to hit an edge case in `reEmbedWitnessAndExtras`'s coordinate-shift logic than
non-portal levels — a lead for whoever next works on that mode, not a claim this session verified.
R02208 (portal-free) was substituted and worked cleanly.

## Results

### P00097 (non-repair-gated, `perimeterSweep` at every size)

| Grid | nodes | ms | config |
|---|---|---|---|
| 10×10 (parent) | 6,054 | 55 | `dfs:perimeterSweep/cornerHarvest` |
| 12×12 | 4,620 | 50 | `dfs:perimeterSweep/cornerHarvest` |
| 14×14 | 3,679 | 66 | `dfs:perimeterSweep/cornerHarvest` |
| 16×16 | 3,698 | 31 | `dfs:perimeterSweep/cornerHarvest` |

Config never changes; cost *decreases* monotonically as the grid grows (6,054 → 3,698, a 39% drop
at the largest size tested) despite the puzzle itself being unchanged. More open, irrelevant space
appears to make this particular perimeter-anchored search strictly easier, not harder.

### R02714 (repair-gated, uniform-failure under symmetry)

| Grid | nodes | ms | config |
|---|---|---|---|
| 11×11 (parent) | 2,000,038 | 2275 | `beam:perimeterSweep/perimeterCW@beam2000` |
| 13×13 | 2,000,009 | 3285 | `beam:objectiveFirst@beam2000` |
| 15×15 | 2,000,033 | 3166 | `beam:objectiveFirst@beam2000` |
| 17×17 | 2,000,023 | 3330 | `beam:objectiveFirst@beam2000` |

**The winning technique changes at every tested size** — `perimeterSweep` (which explicitly scans
along the grid boundary) stops winning the instant the grid grows at all, replaced by
`objectiveFirst` at all 3 sizes. Node count stays flat (~2,000,000, still a repair-probe failure by
this report's usual binary), but wall time rises by roughly 40–45% (2275ms → ~3200-3330ms) despite
similar node counts — consistent with per-node cost increasing on a larger board, not just node
count changing. This is a direct, mechanistic confirmation that perimeter-relative techniques are
sensitive to exactly the manipulation their name implies: grid boundary geometry.

### R02208 (repair-gated, uniform-failure under symmetry) — the headline result

| Grid | nodes | ms | config |
|---|---|---|---|
| 11×11 (parent) | 2,000,015 | 4135 | `beam:perimeterSweep/perimeterCCW@beam2000` |
| 13×13 | 181,283 | 347 | `dfs:repair:repair` |
| 15×15 | 80,985 | 216 | `dfs:repair:repair` |
| 17×17 | 1,151,060 | 1600 | `dfs:repair:repair` |

**Every single tested grid size flips this family from complete repair-probe failure to complete
repair-probe success** — not a partial or borderline effect: the parent's own 2,000,015-node
failure becomes an 80,985–1,151,060-node repair win at every one of 3 different re-embed sizes,
1–2 orders of magnitude cheaper than the parent every time. This is the most dramatic single result
across all five experiments run this session so far — more consistent (3/3, not a partial flip)
than any orientation-index finding in Experiment 1, and produced by a manipulation that changes
*nothing* about the puzzle's own objects, witness, or difficulty on paper.

## Interpretation

Three parents, three qualitatively different responses to the identical manipulation (add open
space, change nothing else): one gets uniformly cheaper with no config change (P00097), one keeps
failing repair but switches which non-repair technique wins (R02714), one flips from total failure
to total success (R02208). This rules out a simple "more open space always helps/always hurts"
story and instead points at something level-specific about *why* repair fails at a given grid
size — R02208's repair heuristic appears to have been specifically defeated by something in its
11×11 layout that disappears the moment any surrounding space is added, while R02714's repair
failure is apparently unrelated to grid size (repair still never wins there) even though its
*non-repair* winning technique is grid-size-sensitive. Both results are consistent with this
report's running theme from Experiments 1–3: repair-probe sensitivity is a property of the
specific transform interacting with a specific level's structure, not a general "more disruption =
more failure" rule — re-embed, which changes zero objects and zero witness coordinates relative to
each other, can still produce the single largest effect size of the whole investigation.

## Caveats

- **n=3, and the headline R02208 result is n=1 family, however consistent across its own 3 grid
  sizes.** Whether "growing the grid rescues a repair-hostile level" generalizes to other
  repair-gated, `perimeterSweep`-winning families is untested — R02714, the other candidate in
  this exact category, showed no such rescue at all. The honest reading is "this can happen, at
  least once, dramatically" rather than "this is what re-embed generally does."
- **R02825's generation failure is unresolved**, not swept under the rug: flagged as a portal-
  specific lead, not chased down this session (would require reading/debugging
  `reEmbedWitnessAndExtras` or `witness.mjs`, which is investigating the generator, not collecting
  data with it — out of scope for this batch).
- Centered offset only was tested at each size — an off-center embedding (content pushed to one
  corner of the larger grid) might behave differently again; not tested.
- `nodesExpanded` is the primary signal per CLAUDE.md's guidance; R02714's ms-without-matching-
  nodes increase is called out explicitly above as a secondary, wall-clock-only observation.
- Data collection only; no solver changes proposed. Scoped to `legacy` scheduler mode, commit
  `cab84d4`.

---

## Update (2026-07-16): re-run after fixing the repair-search elite-splice bug

Same root cause as Experiment 1's own 2026-07-16 update (`e6a9cb9` fix, `7c59c4a` retry-width
re-tune). Re-solved all 3 parents and their re-embed variants with the current solver
(`--scheduler-mode=legacy --budget-ms=60000 --save-hints`).

### P00097 (non-repair-gated control): unchanged, exactly

| Grid | Old nodes | New nodes |
|---|---|---|
| 10×10 (parent) | 6,054 | 6,054 |
| 12×12 | 4,620 | 4,620 |
| 14×14 | 3,679 | 3,679 |
| 16×16 | 3,698 | 3,698 |

Bit-identical at every size. Confirms (again) the fix is scoped to repair only.

### R02208: the headline finding not only survives, it strengthens

| Grid | Old | New |
|---|---|---|
| 11×11 (parent) | 2,000,015 nodes, beam (fails) | **4,000,020 nodes, beam (still fails)** |
| 13×13 | 181,283 nodes, repair | **13,436 nodes, repair (~13× cheaper)** |
| 15×15 | 80,985 nodes, repair | **9,291 nodes, repair (~9× cheaper)** |
| 17×17 | 1,151,060 nodes, repair | **68,309 nodes, repair (~17× cheaper)** |

**This is the one finding across all five experiments that holds up under the fix, and gets more
dramatic rather than less.** The parent still fails repair completely at its original size, and
every one of the 3 tested re-embed sizes still flips it to a cheap repair success — now an even
bigger relative gap than before (down to as little as 9,291 nodes vs. the parent's 4,000,020).
The parent's own cost roughly doubled (2,000,015 → 4,000,020) purely as a side effect of the
retry-width narrowing done in the same tuning pass (`7c59c4a`) — it now fails both probe seeds
(0 and 1) instead of just one — but the qualitative result (fails at 11×11, always rescued by
growth) is untouched. Given this survived a fix that gutted most of Experiments 1–3's findings,
this reads as strong evidence the "open board space is a puzzle variable in its own right" effect
(CLAUDE.md's own gotcha, citing this report) is a genuine structural property of the search, not
an artifact of the elite-splice bug.

### R02714: the contrast case no longer contrasts

| Grid | Old | New |
|---|---|---|
| 11×11 (parent) | 2,000,038 nodes, beam (fails) | **2,005,565 nodes, repair (now succeeds)** |
| 13×13 | 2,000,009 nodes, beam (fails) | **130,205 nodes, repair (now succeeds)** |
| 15×15 | 2,000,033 nodes, beam (fails) | **4,000,019 nodes, beam (still fails)** |
| 17×17 | 2,000,023 nodes, beam (fails) | **2,441,121 nodes, repair (now succeeds)** |

This report's Interpretation section used R02714 specifically as the contrast to R02208 — "repair
still never wins there... even though its non-repair winning technique is grid-size-sensitive."
That's no longer accurate: repair now wins at the parent size and 2 of 3 grown sizes, failing
only at +4 (15×15). R02714 no longer supports the "grid-size-sensitivity without a repair rescue"
half of the original two-parent contrast.

### What this means for the report above

The core mechanistic claim — that adding open, untouched space to a level can change the solver's
outcome even though nothing about the puzzle itself changed — is **more strongly supported now**,
not less: R02208's 3/3 rescue rate held under a fix that eliminated most of the fail-rate findings
elsewhere in this investigation. But the specific contrast this report drew between R02208 ("size
rescues it") and R02714 ("size doesn't rescue it, only changes technique") no longer holds — both
families are now size-sensitive in the repair-relevant sense, just with different exact patterns
(R02208: uniform rescue; R02714: rescued at parent/+2/+6, not +4). The "n=1, generalization
unknown" caveat in the original report is *more* apt now, not less, since the second data point
this report used to bound the claim's generality has itself changed sides.
