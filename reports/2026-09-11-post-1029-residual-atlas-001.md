# Post-1,029 residual atlas 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-11 — full per-level rejoin of the 671 current Corpus-2 misses (production baseline `34531412380`) against the frozen base-T1 isolated census `33717910218`, this exact run's own per-attempt dispatch log, per-level lifecycle reach/starvation telemetry, structural/routing features, and hint-store provenance.
> **Decision:** portal-bearing structure dominates the residual (497/671, 74.1%) and is concentrated in the two largest failure classes (class 4 and class 5), confirming portal coarse-state-merge salvage (gate 2) as the correct next-highest-value target — the atlas does not reveal a clearly better opportunity. It also surfaces one small, cheap, well-evidenced WS1 action-selection candidate (26 "known rescuer not offered" levels, dominated by two recurring never-offered beam configs) worth a small matched-work test once gate 2 concludes, and confirms allocation/starvation is a minority failure mode (only 21/671 levels, 3.1%), materially weakening the case for spending the next population-scale run on admissible-order repricing (gate 3) ahead of representation/search-policy work.
> **Remaining gate:** none for this atlas itself. Feeds gate 2 (already independently scoped) and nominates a small gate-1b WS1 menu-expansion candidate; gate 3 remains conditional per the workstream authority.
> **Evidence role:** research prioritization / development rejoin, no new solving

## Method

Reused `scripts/stress/analyze-current-missing-attempt-exposure.mjs` for the attempt-config x routing-regime rejoin, then wrote `scripts/stress/analyze-post-1029-residual-atlas.mjs` to produce the required per-level five-class breakdown, since no existing tool performed that exact join. Both scripts perform **no new solving**; every input is an already-registered research asset:

- `reports/stress/capability-runs/34531412380/per-level-corpus2.json` — production baseline, and (load-bearing) this exact run's own per-attempt `failedStrategies` dispatch log, which gives ground-truth "was this literal attempt-config identity actually dispatched in production" without reconstructing it from the static ladder plan;
- `reports/stress/capability-runs/34531412380/lifecycle-failure-map-corpus2.json` — per-level `reachedTechniques`/`starvedTechniques` for the repair/admissible-order retry tiers, whose offered-ness is not a single fixed base-T1 identity (seed/tiebreak vary per dispatch);
- `reports/stress/technique-census/33717910218/combined-cells.json` — frozen base-T1 isolated-technique census (development evidence, correctly not treated as a current-head oracle);
- `data/stress/hints-random/<id>.json` — hint/provenance store, cross-checked through the canonical `classifyProvenanceClass`/`cold-capability` predicate in `scripts/stress/provenance-classes.mjs` (not re-derived) for the no-T1-winner reconciliation gate;
- `data/stress/stress-levels-random.json` plus `SOLVER_TESTING_API.classifyRoutingRegime`/`getAttemptConfigs` for structural features, routing regime, and literal beam/dfs ladder-plan membership.

Per-level classification logic (`scripts/stress/analyze-post-1029-residual-atlas.mjs`):

- **beam/dfs wins:** offered-ness is literal `getAttemptConfigs()` ladder-plan membership (matches production's actual static-config menu). Offered + dispatched (found in `failedStrategies`) but still failed -> class 3. Offered but never dispatched this run -> class 2. Not on the ladder at all -> class 1.
- **repair/admissible-order wins:** offered-ness uses the matching lifecycle `reachedTechniques`/`starvedTechniques` stage set (`repair-fallback`, `early-repair-search`, `late-repair-search`, `late-repair-multiseed-retry`, `repair-elite-prefix-dfs-retry` for repair; `admissible-order-fallback`, `admissible-order-alternate-tiebreak-retry` for admissible-order), since these retry tiers dispatch many seed/tiebreak variants under one stage rather than one fixed identity.
- **no T1 winner:** cross-checked against the level's hint store for any `cold-capability`-admissible provenance entry (a genuine non-isolated, non-hint-guided Pathfinder solve recorded at some point, under any config). Present -> class 4. Absent -> class 5.
- Each level gets one **primary class** by priority 1 > 2 > 3 > 4 > 5 (a level with any never-offered rescuer is always counted there first), plus non-exclusive "any-rescuer membership" counts since a level can carry multiple winning configs in different states.

An initial version of the script mapped beam/dfs offered-ness to the same lifecycle-stage-reach test used for repair/admissible-order. That collapsed class 1 to zero, because `main-ladder` is reached on essentially every miss — reach of the *general* ladder stage is not evidence that a *specific* static beam/dfs config was ever planned. Switching beam/dfs to literal ladder-plan membership (the same test `analyze-current-missing-attempt-exposure.mjs` already uses) fixed this; the final run recovers 26 genuine never-offered cases. This is recorded so a future rerun does not reintroduce the same collapse.

## Five-class breakdown (671 misses, primary class; partition sums to 671)

| # | Class | Primary | Any-rescuer membership |
|---|---|---:|---:|
| 1 | known rescuer not offered | **26** | 26 |
| 2 | known rescuer offered but not reached or materially starved | **21** | 24 |
| 3 | known rescuer reached with comparable work but failed | **36** | 52 |
| 4 | no T1 winner but another historical/provenance rescuer exists | **200** | 200 |
| 5 | no known rescuer after cross-evidence reconciliation | **388** | 388 |

Class 4's provenance-rescuer technique families: beam 108, repair 72, admissible-order 10, admissible-order-fallback-labelled 5, dfs 5 — i.e. production-context evidence (different seeds/gates/tiebreaks/widths than the frozen T1 matrix tests) accounts for nearly a third of the residual once reconciled, exactly the failure mode the workstream authority warned not to miscount as "no known rescuer."

68/671 misses (10.1%) have low-multiplicity T1 capability (<=2 isolated winners); these cluster in classes 1-3 disproportionately (repricing/exposure fixes on a thin-margin winner) and deserve protection in any future specialist-retention or repricing decision.

## Structural overlap (portal / must-cross / intersection-heavy)

| Class | n | portal-bearing | must-cross-bearing | intersection-heavy routing | must-cross-heavy routing | multi-portal routing | triple-overlap* |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 26 | 13 (50%) | 4 | 22 | 2 | 1 | 0 |
| 2 | 21 | 15 (71%) | 8 | 15 | 0 | 5 | 5 |
| 3 | 36 | 27 (75%) | 19 | 29 | 5 | 2 | 10 |
| 4 | 200 | 173 (86.5%) | 126 | 154 | 22 | 23 | 87 |
| 5 | 388 | 269 (69.3%) | 224 | 325 | 23 | 34 | 130 |
| **all** | **671** | **497 (74.1%)** | **381** | **545** | **52** | **65** | **232** |

\* triple-overlap = portal-bearing AND must-cross-bearing AND `intersection-heavy` routing regime — the same cohort predicate used by the 2026-09-09 joint-obligation handoff, recomputed at the current 671-miss boundary (was 278/725 pre-restoration; now 232/671, 34.6%, still the single largest structural concentration in the residual).

Portal-bearing levels are the dominant structural signature of the residual at every class, and are especially concentrated in class 3 (75%) and class 4 (86.5%) — the two classes where a genuine capability/attempt exists but production either loses it in search or never captures it under the tested config identity. This is exactly the population the portal coarse-state-merge mechanism acts on, and it materially strengthens (does not merely fail to contradict) the case for gate 2 as the next-highest-value target: **the atlas does not reveal a clearly better opportunity**, so the workstream's default ordering (gate 2 before gate 3) stands.

## Class 1 detail: 26 "known rescuer not offered" levels

These are the sharpest, cheapest finding in this atlas: a base-T1 isolated census winner exists whose exact attempt-config identity is **not present in the current production ladder plan at all** (not merely unreached this run). Two recurring beam configs dominate:

- `beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets` (7 of the 26: R00118, R02615, R02216, R03260, R02988, R02896, R03261)
- `beam|score=objectiveFirst|bias=none|width=5000|retention=mechanic-buckets` (R00320, R01613, R02229, R00355)

Both are `width=5000`/`mechanic-buckets`-retention beam configs, concentrated on `intersection-heavy` routing (22/26) with modest portal incidence (13/26) — i.e. this is predominantly a non-portal, action-selection/menu-expansion finding, not a portal mechanism question. It is real new WS1 evidence but is an order of magnitude smaller than the portal salvage line's frozen +158/-12 upside, so it does not reorder the queue; it is recorded here as the next small, well-scoped WS1 candidate once gate 2 concludes. Per standing rules, any pursuit of it must still price it as a menu addition under `workSpent`, not free additive budget, and must be tested as a matched-work confirmation on its own small population before any promotion.

## Class 2/3 detail: allocation is a minority failure mode

Only 21 levels (3.1%) are class 2 (offered/eligible but not reached or materially starved) and 36 (5.4%) are class 3 (reached with comparable work but genuinely failed). Combined, allocation/exposure-adjacent failure accounts for **57/671 (8.5%)** of the residual — a materially smaller share than the structural/representation-dominated classes 4+5 (588/671, 87.6%). Class 3 is dominated by `repair|score=repair|guidance=standard`/`must-turn-biased` (most rows) and `admissible-order|tieBreak=*` — i.e. these are cases where production's own repair/admissible-order retry tiers ran a comparable config and still lost, consistent with a search-policy or representation gap inside those tiers rather than missing dispatch.

This directly informs gate 3: the workstream's own caution that the `admissible-order-fallback` "work-starved" telemetry label is misleading (`2026-09-10-ws1-existing-data-exposure-classification-001.md`) is corroborated here at the per-level, cross-evidence-reconciled level — genuine allocation failure is a small, already-bounded slice of the residual. **If gate 2's portal salvage closes (positive or negative), the atlas does not make admissible-order repricing the obvious next population-scale spend**; representation/search-policy work inside the class-3/class-5 population (dominated by portal and repair-tier structure) has higher expected value per the structural-overlap table above.

## What this does not establish

- Does not itself change any production routing, pruning, or search-policy behavior.
- Does not re-derive or re-litigate the closed resumable-tranche, repair-late-probe-seed, or global portal-coarse-state-merge dispositions.
- Class 4's provenance rescuers are **offline diagnostic evidence only** (per `docs/solver-optimization-workstreams.md`'s standing rule) — they are not production routing inputs and must not be read as same-level hints in any policy change.
- Low-multiplicity/never-offered counts here supersede the stale pre-1,029 family/attribution counts; do not carry forward the former 725-miss or 396-cohort figures now that this atlas exists.

## Artifacts

- [`reports/stress/residual-atlas/2026-09-11-post-1029-671/atlas.json`](stress/residual-atlas/2026-09-11-post-1029-671/atlas.json) — full per-level rows (671), five-class counts, structural overlap, routing-regime cross-tab, low-multiplicity list.
- [`reports/stress/residual-atlas/2026-09-11-post-1029-671/missing-attempt-exposure.json`](stress/residual-atlas/2026-09-11-post-1029-671/missing-attempt-exposure.json) — the underlying attempt-config x routing-regime rejoin from `analyze-current-missing-attempt-exposure.mjs`.
- `scripts/stress/analyze-post-1029-residual-atlas.mjs` — the new reusable per-level five-class join tool (reruns cleanly against a future capability/census refresh).
