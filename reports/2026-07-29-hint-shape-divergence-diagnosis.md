# Diagnosing the no-provenance/with-provenance path-shape divergence: no fixable scoring gap found (2026-07-29)

## What this is

Follow-up to the earlier same-day path-geometry comparison (per-level Mann-Whitney U tests on
`witnessDescriptors`, ~89 significant level×metric pairs at p<0.01 against ~4.5 expected by chance):
published levels whose no-provenance hints (predating the provenance schema) differ geometrically
from their with-provenance hints, on levels that are otherwise mostly simple and open. That
comparison established the divergence is *real* but left open *why* — whether it reflects a genuine
scoring bug actively steering the cold production search away from a region of valid solution-space
(the R02248 pattern: one term, disabled, unlocks the missed shape), or something else.

This report runs that differential diagnosis on three representative levels, using a new tool
(`scripts/stress/hint-divergence.mjs`) that replays a target hint path through the real search-core
(`getNeighbors`/`scoreAndSort`/`applyMove`) under the level's own actually-resolved winning attempt
profile and template — not the generic `POLICY_PROFILES.default` baseline `witness-divergence.mjs`
uses for corpus-wide comparability. This is the gap the 2026-07-17 taxonomy correction already
flagged as more informative than the common-baseline replay for a genuinely deep single-level dive.

**Result: no fixable scoring gap found.** Three representative levels, three different mechanisms,
none resembling R02248's signature. No scoring change is proposed from this evidence.

## Method

For each level: identify its cold `dfs`/`beam` production winner from hint provenance (technique,
profile, template — excluding hint-guided/witness entries), match it against the level's own current
`getAttemptConfigs()` to recover the exact scoring profile and template object, then replay the
"moderate middle" no-provenance target path (the no-provenance hint closest to that group's own
median turn rate — the same selection used in the earlier geometric comparison) through
`scoreAndSort` at every step, recording the target move's rank among the greedy-scored candidates.
Then: (a) a per-flag `SCORE_*` ablation sweep (18 flags, one disabled at a time, complete
non-sparse config) to find which term, if any, is the dominant driver of the discrepancy — the exact
R02248 methodology; (b) the same replay under every other profile with the template removed
entirely, to separate "the template's own bonus term explains the gap" (expected — see below) from
"free scoring also can't find this shape" (would be the interesting finding).

## Results

| Level | Cold winner | Baseline discrepancy | Steps | /step | Dominant flag (delta) |
|---|---|---|---|---|---|
| P00133 | `perimeterSweep`/`perimeterCCW` | 53 | 82 | 0.65 | `SCORE_TEMPLATE_BONUS` (−9) |
| P00068 | `perimeterSweep`/`cornerHarvest` | 7 | 27 | 0.26 | none (`SCORE_TEMPLATE_BONUS` +4, i.e. it *helps*) |
| P00004 | `nearClosureRescue`/none | 16 | 29 | 0.55 | none (max \|delta\| = 2, `SCORE_GOAL_ATTRACTION`) |

**P00133** shows a real, isolated, explainable driver — but it's not a bug. The attempt that won is
*template-forced* to `perimeterCCW`, whose `SCORE_TEMPLATE_BONUS` term exists specifically to reward
perimeter-adherence. Removing it drops discrepancy from 53 to 44; every untemplated profile
(`default`, `objectiveFirst`, `intersectionHarvest`, `knotBuilder`, `perimeterSweep` itself run
without a template) independently lands at 43–44 regardless of profile weight tuning. The template
is doing exactly its documented job; scoring elsewhere is not the obstacle, and 44/82 ≈ 0.54
discrepancy/step is well within normal search reach — nothing like R02248's "beyond the LDS ladder"
scale.

**P00068 and P00004 show no dominant driver at all.** Every flag's ablation delta is within ±2 of a
small baseline (7 and 16 respectively); `SCORE_TEMPLATE_BONUS` on P00068 *increases* discrepancy when
removed, the opposite direction from P00133. There is no consistent culprit across the three levels —
the mechanism (when one is identifiable at all) is level-specific.

## What this means

The path-shape divergence found earlier is real, but **it is not evidence of a fixable scoring gap**.
None of the three representatives shows R02248's signature (one term, large isolated effect,
reproducible across corroborating siblings) — the standard this codebase requires before proposing a
scoring change (CLAUDE.md: "no fix may be a per-level tweak," feature-keyed and verified). Three
different, mostly-small-magnitude mechanisms is the opposite of that signature. Per the same
discipline that justified *not* shipping the archetype-reorder experiment earlier today
(`2026-07-29-archetype-routing-ab-refuted.md`), the responsible conclusion here is **don't propose a
scoring change from this evidence** — manufacturing a "fix" for a pattern this heterogeneous risks
exactly the self-defeating-on-a-rare-case failure mode CLAUDE.md's own scoring gotcha warns about.

**The mechanism that best explains what IS observable**: the production ladder stops at the first
successful attempt. On a level like P00133 that solves quickly via a cheap, rigid template, no
untemplated/free-scoring attempt ever runs, so the hint corpus for that level never benefits from
whatever alternate shape those profiles might have found — not because they *couldn't* (discrepancy
under them is comparable to or better than the template's own), but because the ladder never asks. On
P00068/P00004 this doesn't apply as cleanly (small discrepancy regardless, or already untemplated),
consistent with the earlier finding that the geometric shift has no single universal direction across
levels.

**This reframes the finding's practical scope.** It is a hint-corpus-diversity observation on solved,
mostly-simple published levels — relevant to player-facing hint variety (`docs/hint-curation.md`'s
existing concern) — not evidence bearing on corpus-2's genuinely *unsolved* population. The "ladder
stops at first success" mechanism is structurally irrelevant to a level where nothing succeeds in the
first place; there is no "first success" to stop at. Nothing in this diagnosis should be read as
explaining any of corpus-2's 1095 unsolved levels.

## What this does support

The diversity gap this reframes as real (a solved level's hint corpus underrepresenting valid
solution-shape diversity) is already being addressed by exactly the tooling used to generate the
no-provenance hints being diagnosed here in the first place: `hint-workbench.mjs`'s
`enumerate-targeted`/`ablation-full` presets, run this session against all 160 published levels
(healing 969 previously-unattributed hints — see the two `2026-07-29-*heal*` commits). No new
mechanism is needed to capture this diversity; it already exists and was actively run today. What
doesn't exist, and isn't proposed here, is baking that diversity search into the cold production
ladder itself — the evidence doesn't support that being worth the added cost given no capability gap
was found.

## New tool

`scripts/stress/hint-divergence.mjs` — generalizes `witness-divergence.mjs`'s replay technique to (a)
any known hint on a published level rather than a stress-corpus hidden witness, and (b) the level's
own actually-resolved winning profile/template rather than the generic default baseline, with a
built-in per-flag `SCORE_*` ablation sweep. Reusable for any future "why does the search never find
shape X" investigation without rebuilding this scaffolding from scratch.

## Recommendation

Do not pursue a scoring change from this investigation. Redirect remaining solver-improvement effort
to the higher-evidence, still-untested lever from the same day's corpus-2 work: the fragile/robust
family-variant split on turn-constraint load (`docs/solver-development-roadmap.md`'s own
highest-priority diagnostic, not yet run this session) — turn load remains the strongest measured
discriminator of corpus-2 unsolvability (d = 0.750) with no main-loop policy representation at all,
and unlike this investigation, that population is the one where a real capability gap plausibly
exists.

## Verification

Read-only diagnostic tool and investigation; no solver code changed. All three levels' results
reproduced identically via the checked-in `scripts/stress/hint-divergence.mjs` against the earlier
scratch-script findings. `check:lint` passes.
