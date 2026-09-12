# Repair-turn-biased T1-census misclassification fix and corrected residual atlas 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-12 — investigating the bounded capability-memory census's `repair|score=repair|guidance=turn-biased` historical-signature candidate found that its "historical" nominations are not historical at all: they are current-run T1 census wins (`reports/stress/technique-census/33717910218/combined-cells.json`, the exact census the residual atlas already joins) that `scripts/stress/analyze-post-1029-residual-atlas.mjs`'s own `isBaseT1()` filter was silently excluding from `t1Wins` accounting.
> **Decision:** `isBaseT1()`'s `!row.variantLabel` condition is a data-pipeline bug, not a real "exclude modified conditions" signal — `T1_PROMOTED_VARIANTS` stamps `variantLabel` on every promoted entry purely as bookkeeping, independent of whether the cell tests a real non-default condition; six of its seven entries also carry a real, non-null `ablation` and are correctly excluded on that basis alone, but the seventh, `repair|score=repair|guidance=turn-biased`, has `ablation: null` (confirmed clean/unmodified) and was wrongly excluded on `variantLabel` alone. Fixed in the three scripts sharing this filter by dropping the `variantLabel` check and relying on the already-present `ablation` check. Rebuilding the residual atlas against the unchanged `34683011115` production run with the fixed script moves 9 levels out of class 5 and reclassifies all 25 turn-biased-nominated residual rows: class counts on the current 652-miss residual go from `22/17/48/125/440` to **`22/39/37/123/431`** (class 1 unchanged; 2 +22; 3 −11; 4 −2; 5 −9) — a pure reclassification of already-registered evidence, no new solving, no production change.
> **Remaining gate:** the 9 newly class-2 levels (`R01551, R02170, R02185, R02567, R02751, R02781, R02842, R02897, R03331`) are a concrete, small WS1 action-selection nomination — `repair|score=repair|guidance=turn-biased` has a real, referee-valid isolated win but production's repair family reached these levels without ever dispatching this exact config (`dispatched: false`, `familyReached: true`). This is composition, not acquisition: it does not need new capability, only correct exposure of an existing one. Not implemented here — see "Next" below.
> **Evidence role:** data-pipeline correctness fix plus bounded capability-memory census completion (5/5 prespecified sources now evaluated). No solver-policy change; no production routing change.

## Why now

`solver-optimization-workstreams.md`'s WS2 next gate asked to "recover exact gain/loss IDs for a small number of materially distinct prespecified sources (goal-attraction guidance, repair turn-bias, compact class-1 beam evidence, protocol-compatible displaced winners)" left open by [`the first census candidate`](2026-09-12-ws2-post-refresh-residual-atlas-and-capability-memory-census-001.md). Pursuing the "repair turn-bias" source is what surfaced the bug.

## How the bug was found

`reports/2026-09-05-repair-family-internal-ranking-001.md` reports `repair|score=repair|guidance=turn-biased` solving 184 levels in a 2026-09-03 isolated census, sourced from `reports/stress/technique-niches/2026-09-03/level-capability.json`'s per-level `solvingActions` arrays (itself derived from `combined-cells.json` under the same census run `33717910218` the current atlas uses). Extracting those 184 exact IDs and intersecting them with the current 652-miss residual (via `scripts/solver-capability-memory.mjs`, historical-signature mode) nominated 25 rows, 9 of them in class 5 — the *first* source tested across two census candidates to reach class 5 at all (portal-coarse-state-merge reached zero). That was surprising enough to check directly: does `guidance=turn-biased` actually win these same 9 levels in the census the atlas itself already joins?

Directly querying `combined-cells.json` for these exact 9 `(levelId, corpus2)` pairs under `techniqueKeys: ["repair|score=repair|guidance=turn-biased"]` confirmed `ok: true, refereeValid: true, tier: "T1"` for all 9, with `techniqueKeys.length === 1`, `flagExperiment: null`, `pairLabel: null`, `ablation: null` — every condition `isBaseT1()` checks except one: `variantLabel: "repair|score=repair|guidance=turn-biased"` (self-referential, matching its own technique key exactly). That single field was silently zeroing out `t1WinsByLevel` for the entire action: **all 936 corpus-2 `guidance=turn-biased` T1 cells** carry a non-null `variantLabel` (596 solved per the technique-capability summary), none of which were ever entering `t1Wins`.

## Root cause

`scripts/build-technique-census-plan.mjs`'s `T1_PROMOTED_VARIANTS` array holds 7 entries. 6 apply a real ablation (`{enable:[...], disable:[...]}`) on top of a base technique key already in `ALL_TECHNIQUE_KEYS` — genuine non-default conditions, correctly excluded from "known T1 candidate" accounting by the already-present `!row.ablation` check alone. The 7th, `guidance=turn-biased`, has `ablation: null` — that file's own comment explains why: the flag it would nominally gate (`STRATEGY_REPAIR_TURN_BIAS`) is verified inert at this call site (`attempt-dispatch.ts` reads `repairTurnBiased` straight off the `AttemptConfig`, never consulting `prep._cfg`), so setting it "would have implied the toggle does something here; it doesn't." This entry is only in `T1_PROMOTED_VARIANTS` (rather than `ALL_TECHNIQUE_KEYS`, alongside `must-turn-biased`) because it "does not exist without its own flag" *at the ladder-eligibility-enumeration level* — a bookkeeping distinction with no bearing on whether the resulting T1 cell is a clean base-technique dispatch. `pushCell()` stamps `variantLabel: variant.label` on every `T1_PROMOTED_VARIANTS` entry uniformly, so this one clean entry inherited the same marker as the six real ablations, and the atlas/exposure scripts' `!row.variantLabel` condition — written before this promotion, or without accounting for it — could not tell them apart.

## Fix

Removed the `!row.variantLabel` clause from `isBaseT1()` in all three scripts that share it (`scripts/stress/analyze-post-1029-residual-atlas.mjs`, `scripts/stress/analyze-current-missing-attempt-exposure.mjs`, `scripts/stress/analyze-equal-work-census.mjs`), keeping `!row.ablation` — the field that actually carries "this cell tests a non-default condition." Verified this changes nothing for the six real ablation entries (still excluded via `ablation`) and only affects `guidance=turn-biased`. Each site now carries a comment recording why `variantLabel` alone is unsafe as an exclusion signal.

## Corrected atlas

```
node scripts/run-bundled.mjs scripts/stress/analyze-post-1029-residual-atlas.mjs -- \
  --baseline=reports/stress/capability-runs/34683011115/per-level-corpus2.json \
  --lifecycle=reports/stress/capability-runs/34683011115/lifecycle-failure-map-corpus2.json \
  --census=reports/stress/technique-census/33717910218/combined-cells.json \
  --hints-dir=data/stress/hints-random \
  --out=tmp/post-1048-residual-atlas-fixed.json
```

| class | label | before fix | after fix |
|---|---|---:|---:|
| 1 | known rescuer not offered | 22 (3.4%) | 22 (3.4%) |
| 2 | known rescuer offered but not reached/starved | 17 (2.6%) | 39 (6.0%) |
| 3 | known rescuer reached, comparable work failed | 48 (7.4%) | 37 (5.7%) |
| 4 | no T1 winner but historical production-context candidate | 125 (19.2%) | 123 (18.9%) |
| 5 | no known admissible/T1 candidate | 440 (67.5%) | **431 (66.1%)** |

All 9 newly-non-class-5 rows land in class 2 (`familyReached: true, dispatched: false` for the `guidance=turn-biased` win specifically) — production's repair family ran on these levels but never tried this exact guidance config. This is **not** new solver capability; the census already knew these levels were solvable by an existing technique. It corrects which bucket they belong in.

**This does not change the program's priority order.** Class 5 remains the overwhelming majority (66.1%, down from 67.5%) and the first-priority acquisition target stands. It does mean the "no known candidate" denominator for acquisition-side sizing is 431, not 440, and adds 22 rows to class 2 (composition/exposure territory) that were previously misclassified into 4/5 (acquisition territory).

## Bounded capability-memory census: completed (5/5 prespecified sources)

With the atlas fixed, `guidance=turn-biased`'s own contribution is no longer external "historical" evidence — it's now correctly inside the atlas's own primary classification, so it drops out of the capability-memory census as a separate candidate. That leaves the census's remaining named sources. All were extracted directly from already-committed artifacts, no new solver compute:

| source | extraction | current-residual nominations | class-5 reach |
|---|---|---:|---:|
| portal-coarse-state-merge (prior candidate) | [`preflight`](2026-09-09-portal-coarse-state-merge-ab-001-preflight.md) itemized IDs | 137 | **0** |
| `repair\|guidance=must-turn-biased` (isolated, 2026-09-03) | `solvingActions` join, `technique-niches/2026-09-03/level-capability.json` | 21 | **0** |
| `beam\|intersectionHarvest\|width=5000\|retention=mechanic-buckets` (isolated) | same artifact | 9 | **0** |
| `beam\|objectiveFirst\|width=5000\|retention=mechanic-buckets` (isolated) | same artifact | 5 | **0** |
| goal-attraction-disabled-retry dev A/B | [`preflight`](2026-09-02-goal-attraction-disabled-retry-fresh-work-pool-development-ab-preflight.md) (`+1/-0`, already `PROMOTED` and folded into this baseline) | 0 | **0** |
| displaced losses, `34531412380` → `34683011115` (accepted-change churn) | diff of the two runs' committed `per-level-corpus2.json` (`+35/-16`) | 16 | **0** |

Union across all six: 65/652 (10.0%), entirely inside classes 1-4. **Zero of six materially distinct sources reach class 5.** Regenerate via:

```
node scripts/solver-capability-memory.mjs --manifest=tmp/capability-memory-manifest-003.json \
  --out=tmp/capability-memory-003.json --summary-out=tmp/capability-memory-003.md
```
(manifest not committed; rebuild from the itemized sources above — each is a short, deterministic re-extraction from a committed artifact.)

## Advancement

Per the census's own advancement rules, this closes the bounded capability-memory census as **no material class-5 complementarity** across every prespecified source. Do not reopen it without a materially new candidate source; it is not a standing panel. Class-5 acquisition work (first-loss/family/reference/exact-adjudication) remains the sole first-priority line — this census consistently finds that composition of already-known techniques does not touch class 5, which is itself useful negative evidence: class 5's "no known candidate" status is not an artifact of under-mining existing techniques, reinforcing that real new capability is needed there.

**Next (not implemented here):** the 9-level `repair-turn-biased`-offered-but-not-dispatched nomination is a small, well-scoped WS1 candidate — check whether `attempts.ts`'s `predictLikelyBiasedRepairTechnique` heuristic (which picks `mustTurnBiased` vs `turnBiased` as primary by a `requiredIntersections` threshold, with the other as fallback) is choosing wrong on these 9, or whether the fallback attempt is starved before it can run. This is composition work, independent of and parallel to class-5 acquisition; do not let it block the first-priority line.

## Artifacts

- `scripts/stress/analyze-post-1029-residual-atlas.mjs`, `scripts/stress/analyze-current-missing-attempt-exposure.mjs`, `scripts/stress/analyze-equal-work-census.mjs` — `isBaseT1`/equivalent filter fixed (drop `variantLabel`, keep `ablation`).
- `tmp/post-1048-residual-atlas-fixed.json` — corrected atlas (not committed; regenerate via the command above).
- `tmp/capability-memory-manifest-003.json`, `tmp/capability-memory-003.json/.md` — full 6-source census (not committed; regenerate from the itemized sources in the table above).
