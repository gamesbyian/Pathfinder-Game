# Hint-provenance evidence-relevance audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-11 — all published, Corpus 1, and Corpus 2 hint sidecars at `00ed6d541aecdeadbcd6340fd556e6ab5ca39d85`.
> **Decision:** require query-dependent applicability and dependency-aware aggregation. Preserve every referee-valid path and historical event; do not use stored provenance as current-revision capability/performance evidence without matching context.
> **Remaining gate:** replay-witness identity and all-known-basin/exposure work remain separate bounded analyses. No broad solver campaign is justified.
> **Evidence role:** exhaustive existing-data audit and tooling correctness; no new solving.

## Question and method

The audit treated a hint path's historical validity separately from what its discovery event can support now. It inspected the canonical schema/legacy upgrade and semantic-event dedup, origin/facet/cold-admissibility taxonomy, hint query and workbench surfaces, solution profiles, representative selection, first-hint replay tools, variant-parent replay, census/lifecycle joins, the post-1,029 residual atlas, and the current workstream authority.

The executable audit was:

```sh
node scripts/run-bundled.mjs scripts/stress/hint-provenance-evidence-report.mjs -- \
  --corpus=all --current-solver-version=00ed6d541aecdeadbcd6340fd556e6ab5ca39d85
```

It loaded 1,962 levels and classified all 266,923 hints / 675,233 stored events. Unattributed paths are included for atlas/oracle use but not invented as historical events. Event identity was checked through the canonical persistence identity. No age cutoff was used: distrust follows producer, hint contamination, isolation, missing work/config metadata, family dependence, or a concrete solver-revision mismatch.

## Smallest sound semantic model

Origin and overlapping facets remain the descriptive axes. A new query axis asks one of five purposes and returns `admissible`, `context-bound`, or `inadmissible` with a reason:

| Purpose | Admissible meaning |
|---|---|
| `positive-oracle` | the containing hint is referee-valid; provenance does not weaken the live path |
| `solution-atlas` | valid path geometry, including variant-derived/context-bound origins |
| `current-production-capability` | strict cold Pathfinder event at the explicitly named current solver revision |
| `technique-performance` | never established by a positive-only hint event alone; a matching isolated event with comparable `workSpent` is context-bound input that still needs the originating run's failures/denominator |
| `longitudinal-process` | dated, versioned, attributed discovery history |

This is deliberately not persisted as a global flag: the answer depends on the query and current comparison revision. `provenanceDependencyStratum` separately groups repeated Pathfinder config/regime/context events and all variant replays sharing a family/parent. It is a conservative aggregation unit, not a claim that different strata are statistically independent.

## Measured scale

### Origins and context

| Origin | Events | Share |
|---|---:|---:|
| variant-parent replay | 348,784 | 51.65% |
| Pathfinder solver | 324,888 | 48.11% |
| external constraint solver | 1,458 | 0.22% |
| construction witness | 102 | 0.02% |
| other | 1 | <0.01% |

Variant replay is therefore a majority of event volume, not independent confirmation of parent capability. The former 79.7% result described an earlier 172,604-hint snapshot; the current all-corpus event-grain result does not contradict it and supersedes it for current volume claims.

Overlapping Pathfinder facets include 144,242 isolated-technique events, 101,941 randomized events, 98,140 `usedExistingHints` events, 61,770 directly hint-guided events, and 1,047 retry-tier events. There were 6,071 paths with no provenance. Zero semantic duplicate events were found, so persistence dedup is working and no destructive rewrite is warranted.

### Purpose-dependent applicability

Because a path can have multiple events, these are event counts except where noted:

| Purpose | Admissible | Context-bound | Inadmissible | Interpretation |
|---|---:|---:|---:|---|
| oracle / atlas | 681,304 observations* | 0 | 0 | all 266,923 paths remain usable |
| current production capability | 0 | 82,495 | 598,809* | 57,497 nominally cold events are legacy-context-ambiguous; 24,998 have explicit context but no declared current-equivalent revision; randomization remains orthogonal because seeded repair can be production behavior |
| technique performance | 0 | 144,242 | 537,062* | 24 events carry isolation + version/config + `workSpent`; even under a comparable-version declaration they remain positive-only success/cost observations until joined to the originating run denominator |
| longitudinal process | 324,311 | 350,922 | 6,071* | unknown-version legacy/replay records remain context-bound history |

\* Oracle/atlas and the inapplicable totals include one synthetic unattributed observation for each of 6,071 valid paths without provenance; the stored-event denominator itself remains 675,233. The exact machine-readable per-corpus reason counts are reproducible from the CLI rather than checked in as a 9 MB derived artifact.

Dependency collapse is computed within each hint/path, then summed; a global set would incorrectly merge the same configuration across unrelated levels. Overall, 681,304 atlas/oracle observations collapse to 499,008 within-path strata (1.37:1), affecting 27,161 hints. Per-corpus ratios are 1.32:1 published, 1.43:1 Corpus 1, and 1.37:1 Corpus 2; the collapse affects 3,885, 3,754, and 19,522 hints respectively. These strata are still conservative configuration/family groupings, not independent experimental units. Raw rediscovery volume must not be ranked as agreement strength.

Recorded build diversity is real rather than mere age: published provenance spans 176 version values, Corpus 1 spans 53, and Corpus 2 spans 166; unknown versions account for 350,922 events. No event carries the audited current commit. Exact commit mismatch is intentionally a conservative comparability boundary, **not proof of a material solver change**: callers may supply an audited `comparableSolverVersions` set when code/config/scheduler/work semantics are shown equivalent. Without that audit, old clean production solves remain strong longitudinal nominations but cannot by themselves demonstrate today's production capability, difficulty, budget requirement, or scheduler reach. This audit found no cohort that provenance alone could prove stale; it found cohorts whose current interpretation is unresolved because the required equivalence evidence is absent.

## Consumer findings and fixes

1. **Representative selection was materially misleading.** It used raw `provenanceEntries` and counts of origins/configs/versions as tie-breaks. A large dependent replay cloud could outrank one clean applicable discovery. Selection now accepts an explicit purpose/current version, filters applicability, compares dependency strata, and has a replay-cloud regression test.
2. **Solution profiles had two taxonomies.** The legacy library still forced exhaustive, randomized, guided, isolated, and production concepts into one precedence bucket even after origin/facet separation landed. It now delegates its compatibility exports to the shared origin taxonomy. Generated libraries stamp their schema/taxonomy, and comparison rejects an unstamped legacy library as stale even when hint counts match; without that check old bucket contents would silently acquire the new labels. Old artifacts retain historical labels until regenerated.
3. **Hint query inherited the legacy classifier.** It now queries the shared origin taxonomy directly, preventing modality from silently replacing producer identity.
4. **The evidence report stopped too early.** It reported origin/facets and strict/narrow cold classes but not question-specific applicability, solver-regime mismatch, or dependency collapse. It now emits all three.
5. **Random seed alone cannot classify production relevance.** A follow-up initially removed seeded events and moved 35 repair-only rows from class 4 to class 5. Inspection showed all affected events were `repair` discoveries, including production attempt indices and production repair forcing. That blanket filter was rejected. A clean existing-data rerun gives 204 historical production-context candidates / 384 no-known-rescuer rows; exhaustive enumeration is excluded, while randomization stays an orthogonal facet. This four-row drift from the earlier report is a rerun reconciliation, not an effect attributed to seed semantics.
6. **The query tool could describe cold classes but not ask an evidence question.** `hint-query` now accepts `--purpose`, `--applicability`, and an explicit solver/comparable-version set; its compact rows expose applicability reasons and within-path strata. Capability queries without a comparison regime fail closed.
7. **Winning-path analysis still consumed array position zero.** Unlike path-identity-bound CP-SAT replay, this local-rank analysis has no upstream witness-label contract. It now requests one deterministic `solution-atlas` representative and records that selection purpose instead of silently treating persistence order as representative.
8. **Source-stratified profiles exposed origin/facets but still consumed every hint implicitly.** The generator now declares and records an evidence purpose, filters paths through the shared hint-level predicate, records pre/post applicability counts, and requires an audited comparable-version set for a non-empty current-capability profile. The default remains explicit atlas use, where every referee-valid path belongs.
9. **Enumeration and randomization are not equivalent.** Exhaustive enumeration is excluded from production capability. A random seed is retained as a facet because production repair itself is seeded; producer, isolation, hint context, technique, and attempt metadata must decide whether a particular randomized event is production-relevant.
10. **Legacy missing booleans were silently read as modern `false`.** Across the store, 505,993 provenance events omit at least `isolatedTechnique`; specifically 57,497 events previously classified strict-cold lack that field, while only 24,998 strict-cold events carry complete capability context. The canonical strict/narrow classifier now returns `unknown` instead of `cold-capability` when a would-be cold event lacks any capability boolean; explicitly guided or isolated events retain those known classes. Flat legacy upgrades can also synthesize false context values while retaining an unknown solver version, so the historical production-context predicate additionally requires a known version. This changes the residual atlas materially to 143 explicit historical candidates / 445 no-admissible-rescuer rows.
11. **Three current path analyses still used persistence position zero without a path-identity contract.** Residual-separator census, portal-parity census, and must-cross crossing-slack analysis now request the shared `solution-atlas` representative and stamp that selection policy in their artifacts. Path-identity-bound prune-gap/CP-SAT replay remains intentionally unchanged.

The solution-profile correction is material, not nomenclature-only. Replaying the retired precedence classifier over all 675,233 events produced `production-solver=88,305`, `isolated-technique=134,642`, `randomized-enumeration=40,171`, `prefix-anchored-completion=61,770`, and `other=350,243`. The orthogonal taxonomy reports 324,888 Pathfinder-origin events and 348,784 variant-parent replays, with modalities retained separately. Thus the old “production-solver” bucket represented only 27.2% of Pathfinder-origin history and hid most variant replay under `other`; old per-source profile comparisons cannot be relabeled or compared numerically to new origin buckets.

## Audited negative findings

- Canonical merge/reconcile normalization preserves paths and semantically deduplicates events without collapsing legitimate rediscovery; zero duplicates were found. No hint deletion or migration is justified.
- Strict cold classification already excludes external, variant, inherited/transformed witness, isolated, directly guided, and `usedExistingHints` contexts. The defect was downstream interpretation of “cold sometime” as “current,” not those exclusions.
- Player hint curation is geometry/coverage-facing and intentionally ignores research provenance; applying capability filters there would be wrong.
- Corpus witness validation's first path is a solvability witness, not a capability inference, so provenance filtering would add no value.
- Offline replay/prune-gap tools cannot blindly swap their first witness for a representative path because upstream CP-SAT labels may be path-identity-bound. The September 9 witness-identity gate remains valid.
- Census and lifecycle artifacts are direct run evidence. The dangerous join is using historical hint existence to fill missing cells or imply current reach; the current atlas code uses strict cold history only as an explicit fallback class, now relabeled.

## Concrete misleading cases

- Twenty variant-child rediscoveries replayed to one parent are twenty valid historical events and one useful family-dependent stratum, not twenty independent confirmations and never a current cold production rescue.
- An isolated solve without `workSpent` can establish that a path was found under that historical setup, but nodes across different techniques cannot support a performance ranking.
- Even an isolated solve with `workSpent` is selected-on-success evidence. It can contribute a successful-discovery cost observation, but cannot establish solve rate, relative performance, rarity, or failure behavior without the originating run's complete attempted population.
- A clean Pathfinder event at an old revision shows historical production-context discovery. It does not preserve its old implication about current difficulty, budget, rarity, or scheduler capability after scoring, scheduler, representation, and work-accounting changes.
- An unattributed legacy path remains valid oracle/atlas material after referee validation while supplying zero capability, performance, or detailed process evidence.

## Consequences and remaining uncertainty

No queue ordering changes. The observer-only joint-obligation pilot and bounded all-known-basin analysis remain the highest-value next work against the corrected 445-level no-admissible-rescuer population. The audit invalidates raw event-count ranking and legacy absent-as-false interpretation without manufacturing a change from age or random seeds.

Uncertainty remains where legacy events lack version/work/run identity, whether two nominal config strata share hidden dependence, and whether historical candidates still reproduce on current code. Resolve those only for a bounded, decision-relevant cohort with current cold replay under a fixed work envelope. Broad GHA solving is not justified: the immediate semantic questions were answered from existing data, and replay-witness identity plus bounded basin analysis should precede any campaign.
