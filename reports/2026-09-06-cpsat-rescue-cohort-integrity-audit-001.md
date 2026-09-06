# CP-SAT rescue cohort integrity audit 001

> **Status:** concluded-negative
> **Last evidence:** 2026-09-06 — the source report's claimed 13 distinct IDs conflicts with its 15 printed entries / 14 unique IDs; `R00720` independently satisfies the intended rescue predicate, so casual tail deletion is not a valid repair.
> **Decision:** quarantine the reported 13-level isolated-no-winner cohort until it is deterministically regenerated from authoritative inputs. Do not run selector/holdout analysis on the printed list.
> **Remaining gate:** deterministically regenerate both rescue cohorts from current capability data plus referee-valid hint provenance, with explicit uniqueness/count/predicate assertions, before any characterization or holdout work.
> **Scope:** the isolated-no-winner cohort reported by `2026-09-05-cpsat-full-probe-rescue-coverage-001.md`
> **Production impact:** none. This audit does not authorize production CP-SAT or new exact-search compute.

## Finding

The source report is internally inconsistent. It reports `isolated_no_winner_cpsat_count = 13` and says there are 13 distinct IDs, but its printed list contains 15 entries and 14 unique IDs:

`R00044, R00537, R00860, R00860, R02059, R02194, R02452, R02464, R02474, R02718, R02862, R03092, R03115, R03201, R00720`

`R00860` is duplicated. Deduplicating only that duplicate leaves 14 unique IDs, not 13. Therefore the numeric summary and enumerated cohort cannot both have been produced from the same clean set.

This is decision-bearing because the follow-up Workstream 5 gate proposes discovery/holdout analysis on this small labelled population. With only roughly a dozen positives, silently adding or removing one row can materially change apparent enrichment.

## Targeted validation of the suspicious tail entry

`R00720` is not safely dismissible as a transcription artifact. Current authoritative capability data marks it `productionSolved:false` and `isolatedOracleSolved:false`. Its retained random-hint provenance contains referee-accepted `cpsat-full-probe` solutions. It therefore satisfies the intended semantic shape of an exact rescue of a current native no-winner case.

That check is deliberately narrow. It proves only that the obvious-looking tail entry is real enough that the count/list mismatch cannot be repaired by dropping it. It does **not** establish that all remaining printed IDs satisfy the current predicate, nor that the correct cardinality is 14.

## Consequence

Treat the exact isolated-no-winner rescue count and membership as **unresolved**, not as 13 and not as 14, until regenerated. The broader observation that stored CP-SAT provenance contains useful native-residual rescues remains valid, but the small cohort is not safe as a modeling label set in its current reported form.

The separately reported 45 production-unsolved rescues are not disproved by this finding, but their count should be independently regenerated/checked before they are used as a discovery/holdout population. Do not infer integrity of that cohort merely because its count came from the same analysis.

## Cheapest repair gate

Regenerate both rescue cohorts in one deterministic local pass from the authoritative current inputs:

1. Enumerate the current Corpus-2 level IDs from `reports/stress/technique-niches/2026-09-03/level-capability.json`.
2. For each ID, read `data/stress/hints-random/<id>.json` and set the CP-SAT rescue label only from retained, referee-valid provenance attributable to `cpsat-full-probe` (or an explicitly documented current rename-equivalent).
3. Join that label to current `productionSolved` and `isolatedOracleSolved` values from the capability map.
4. Materialize sorted unique ID arrays for at least:
   - all CP-SAT-rescued levels;
   - CP-SAT-rescued + `productionSolved===false`;
   - CP-SAT-rescued + `isolatedOracleSolved===false`.
5. Assert before writing the result that each reported count equals the corresponding array length, every array is duplicate-free, every ID exists in the capability map, and every member satisfies its stated predicate.
6. Preserve the regenerated table or machine-readable artifact beside the report so future selector work does not depend on a hand-copied ID list.

No new solver dispatch is required. This is an evidence-join repair using data already in the repository.

## Gate after repair

Only after the assertions pass should `2026-09-05-cpsat-on-demand-rescue-gate-design.md` proceed to structural/lifecycle characterization and a predeclared holdout. If the regenerated cohort differs from the old claim, the regenerated artifact is authoritative and the old 13-row figure remains historical error evidence.

This repair is intentionally narrower than building a new analytical framework. The goal is to restore a trustworthy label set, then resume the already-designed cheap Workstream 5 falsification test.
