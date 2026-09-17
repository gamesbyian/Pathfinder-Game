# Lane F3 topology fork population expansion result 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-17 — fresh construction-admissibility survey + exact CP-SAT labelling (0 abstains, 4/4 referee-valid) on 2 new parent families, current HEAD.
> **Decision:** expanding the topology fork pilot's population from 10 to 14 pairs (5 to 7 independent parent families, 4 to 8 discordant pairs) both strengthens and meaningfully corrects `reports/2026-09-17-lane-f3-topology-cheap-side-descriptor-result-001.md`'s finding. The "perfectly reliable when untied" claim still holds (8/8, unchanged) but now visibly has **zero discordant-case coverage** -- every one of the 9 discordant decisive-puncture rows in the combined population has a tied closest point, so the sound subset has never actually been tested on a decision-relevant case. The tied-case reliability figure, previously too small to trust (2/4, chance-level), is now much better supported: 7/9 (77.8%) on discordant rows, a real signal above chance, not the near-coin-flip the original 4-pair discordant sample suggested.
> **Remaining gate:** none for this specific correction. A materially larger population (beyond what a second construction-admissibility survey pass can cheaply supply) would be needed to test whether an untied discordant case can ever occur, or whether ties are structurally coupled to genuine side-flips (plausible: a route that truly wraps around an obstacle is exactly the geometry that produces equidistant near-puncture points).
> **Evidence role:** direct follow-up to Lane F3's own two named next-gate items (a larger population to measure tied/untied coverage; a tie-aware refinement) plus a check of Lane E's own named next step (reusing the commutativity-splice machinery against Lane E's DEAD population) -- all three run this session as bounded, cheap continuations of already-merged work.
> **Population identity:** 4 new candidate pairs from 2 newly-admissible parents (`P00009`, `P00148`), found via the same read-only construction-admissibility survey the original pilot used, run against the 6 remaining `confidence:certain` human parents it had not yet tried plus the 24-parent balance never surveyed before (`data/levels.json`, `class5-topology-fork-construct.mjs`, unmodified). Combined with the original 10-pair population for a 14-pair/7-parent total.

## Why this ran

Three follow-ups were available directly from this session's own just-merged work, each cheap enough to check before treating the queue as exhausted:

1. Lane E's own report and the D3 commutativity-splice report both named "reuse the splice-and-validate machinery against Lane E's DEAD population" as the natural next step.
2. Lane F3's report named two next-gate options: (a) a tie-aware refinement of the cheap descriptor, (b) a larger population to measure the untied/tied coverage split more precisely.

## Result 1: commutativity splice against Lane E's DEAD population -- infeasible, not merely negative

Mining `commutingCandidate` segment pairs (`mineResidualInterfaces`, the same tool Lane D3 used) between each B2 dead state and its same-parent live siblings, across all 4 parents that have any dead state, found **zero** dead-live commuting candidates. B2's dead and live sibling prefixes from the same parent essentially never pass through the same two cells in the same order-reversible way needed to define a shared interface -- the population (4 dead states total) is too small and too structurally divergent for this specific test, not merely uninformative. No further action; this closes the specific idea, not the broader Lane E/D3 connection (recorded in `docs/solver-dependency-defined-revision-preflight.md`).

## Result 2: tie-aware local-arc refinement -- no improvement, and why

Extending the cheap descriptor from a single closest point to a signed-angle sum (proper `atan2`-based, exact) over the *contiguous run of tied-closest points* (rather than one arbitrary tie-break) produces **identical** agreement to the simple version on both the original population (20/26) and the expanded one (25/31, 7/9 discordant). Inspecting the still-failing cases: the tied-closest run spans 60-80% of the segment's own length for the hardest failures -- there is no genuinely "local" window to restrict to; the near-puncture region *is* most of the path. No further refinement of this family is warranted without effectively reconstructing the full observer.

## Result 3: population expansion -- new admissible parents, correcting the earlier discordant-reliability read

Re-running the pilot's own construction-admissibility survey (read-only, no solver/label involvement, per the preflight's guardrails) against the 24 `confidence:certain` human parents not yet tried found 2 newly admissible: `P00009` (2 pairs) and `P00148` (2 pairs). Exact-labelling all 4 (`cpsat-explicit-prefix-reference.mjs`, unchanged): **all 4 are discordant** (live original / dead alternate), 0 abstains, all 4 live witnesses referee-valid.

Combined population: 14 pairs, 7 independent parent families, 8 discordant pairs across 4 discordant families (up from 4/2) -- comfortably clears the original pilot's own earned bar with room to spare.

Re-running the cheap side descriptor (`lane-f3-topology-cheap-side-descriptor.mjs`, now parameterized to accept an arbitrary population) on the combined 14-pair set:

| | Original (10 pairs) | Combined (14 pairs) |
|---|---:|---:|
| Decisive-puncture agreement | 20/26 (76.9%) | 25/31 (80.6%) |
| Discordant-pair agreement | 2/4 (50.0%) | 7/9 (77.8%) |
| Untied rows | 8/8 (100%) | 8/8 (100%, unchanged) |
| Tied rows | 12/18 (66.7%) | 17/23 (73.9%) |
| **Untied AND discordant rows** | 0 | **0** |

The critical new fact only the larger population exposes: **all 9 discordant decisive-puncture rows are tied** -- none of `P00009`/`P00148`'s 4 new discordant pairs contributed an untied row either. The original report's "sound when untied" claim is unchanged and still holds with zero counterexamples, but it was never actually load-bearing for a LIVE/DEAD-relevant case, and now that is visible rather than merely unconfirmed. What *did* need the larger sample: the tied-discordant reliability figure was statistically indistinguishable from a coin flip at n=4 (2/4); at n=9 it is a real, better-than-chance signal (7/9), though still meaningfully short of sound.

## What this earns

Earned:
- A materially stronger topology-fork population (14 pairs/7 families/8 discordant, vs. the original pilot's already-earned 10/5/4) at zero additional risk -- construction-admissibility selection never touches a solver outcome or label, per the preflight's own guardrails, so this is not selection pressure toward a favorable result.
- A corrected, more precise characterization of the cheap descriptor: sound-when-untied is real but currently untested on any decision-relevant case; tied-case reliability is real signal (77.8%, not 50%) but not sound.
- Two cleanly closed follow-up ideas (commutativity splice on Lane E's population; tie-aware arc refinement), each cheap to rule out and now recorded so a future session does not re-derive the same dead ends.

Not earned: a production consumer for either the cheap descriptor or the commutativity/revision lines: the same conclusions as the original F3 and Lane E reports stand, now on firmer population footing for F3 specifically.

## Artifacts

- `reports/stress/class5-topology-fork-extension-candidates-2026-09-17.json`, `reports/stress/class5-topology-fork-extension-exact-labels-2026-09-17.json` -- the 2 new parents' 4 pairs and their exact labels
- `reports/stress/class5-topology-fork-analysis-2026-09-17.json` -- combined 14-pair join (reproduce: `node scripts/stress/class5-topology-fork-analysis.mjs --candidates=reports/stress/class5-topology-fork-candidates-2026-09-16.json,reports/stress/class5-topology-fork-replication-candidates-2026-09-16.json,reports/stress/class5-topology-fork-extension-candidates-2026-09-17.json --labels=reports/stress/class5-topology-fork-exact-labels-2026-09-16.json,reports/stress/class5-topology-fork-replication-exact-labels-2026-09-16.json,reports/stress/class5-topology-fork-extension-exact-labels-2026-09-17.json --out=reports/stress/class5-topology-fork-analysis-2026-09-17.json`)
- `reports/stress/lane-f3-topology-cheap-side-descriptor-extended-2026-09-17.json` -- combined-population descriptor re-analysis (reproduce: `node scripts/stress/lane-f3-topology-cheap-side-descriptor.mjs --candidates=reports/stress/class5-topology-fork-candidates-2026-09-16.json,reports/stress/class5-topology-fork-replication-candidates-2026-09-16.json,reports/stress/class5-topology-fork-extension-candidates-2026-09-17.json --analysis=reports/stress/class5-topology-fork-analysis-2026-09-17.json --out=<out>`)
- `scripts/stress/lane-f3-topology-cheap-side-descriptor.mjs` -- now accepts `--candidates`/`--analysis` for an arbitrary population instead of a hardcoded pair
- New parent survey used `scripts/stress/class5-topology-fork-construct.mjs --parents=<24 remaining confidence:certain human parent ids> --max-pairs-per-board=2 --max-total-pairs=48`, unmodified
