# Repair-turn-biased T1-census misclassification fix and corrected residual atlas 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-12 — investigating the bounded capability-memory census's `repair|score=repair|guidance=turn-biased` historical-signature candidate found that its "historical" nominations are not historical at all: they are current-run T1 census wins (`reports/stress/technique-census/33717910218/combined-cells.json`, the exact census the residual atlas already joins) that `scripts/stress/analyze-post-1029-residual-atlas.mjs`'s own `isBaseT1()` filter was silently excluding from `t1Wins` accounting.
> **Decision:** `isBaseT1()`'s `!row.variantLabel` condition is a data-pipeline bug, not a real "exclude modified conditions" signal. The atlas fix remains valid and moves the current 652-miss residual from `22/17/48/125/440` to **`22/39/37/123/431`** without new solving. **Correction:** this report's original prose summary of the downstream six-source capability-memory union as `65/652` was arithmetically impossible and used one shortened/misidentified repair source name. Existing-data reconstruction in [`2026-09-12-capability-memory-union-reconciliation-001.md`](2026-09-12-capability-memory-union-reconciliation-001.md) recovers the exact six-source union as **179/652**, distributed **14 / 28 / 21 / 116 / 0** across classes 1–5. The class-5 zero-reach conclusion survives; class 4 instead reopens for a cheap freshness test because 116/123 rows are nominated by the panel.
> **Remaining gate:** none for the T1-classification bug. The bounded class-5 complementarity question is closed under these six sources. The newly recovered class-4 freshness gate is owned by `docs/solver-optimization-workstreams.md`.
> **Evidence role:** data-pipeline correctness fix plus corrected capability-memory evidence. No solver-policy change; no production routing change.

## Why now

`solver-optimization-workstreams.md`'s WS2 next gate asked to recover exact gain/loss IDs for a small number of materially distinct prespecified sources left open by [`the first census candidate`](2026-09-12-ws2-post-refresh-residual-atlas-and-capability-memory-census-001.md). Pursuing the repair turn-bias source is what surfaced the bug.

## How the bug was found

`reports/2026-09-05-repair-family-internal-ranking-001.md` reports `repair|score=repair|guidance=turn-biased` solving 184 levels in a 2026-09-03 isolated census, sourced from `reports/stress/technique-niches/2026-09-03/level-capability.json`'s per-level `solvingActions` arrays (itself derived from `combined-cells.json` under the same census run `33717910218` the current atlas uses). Extracting those 184 exact IDs and intersecting them with the current 652-miss residual nominated 25 rows, 9 of them in class 5 under the then-buggy atlas. That was surprising enough to check directly: does `guidance=turn-biased` actually win these same 9 levels in the census the atlas itself already joins?

Directly querying `combined-cells.json` for these exact 9 `(levelId, corpus2)` pairs under `techniqueKeys: ["repair|score=repair|guidance=turn-biased"]` confirmed `ok: true, refereeValid: true, tier: "T1"` for all 9, with `techniqueKeys.length === 1`, `flagExperiment: null`, `pairLabel: null`, `ablation: null`. Every condition `isBaseT1()` checks except one was satisfied: `variantLabel: "repair|score=repair|guidance=turn-biased"`, self-referential and matching its own technique key exactly. That single field was silently zeroing out `t1WinsByLevel` for the entire action: all 936 corpus-2 `guidance=turn-biased` T1 cells carry a non-null `variantLabel` and none were entering `t1Wins`.

## Root cause

`scripts/build-technique-census-plan.mjs`'s `T1_PROMOTED_VARIANTS` array holds 7 entries. Six apply a real ablation (`{enable:[...], disable:[...]}`) on top of a base technique key already in `ALL_TECHNIQUE_KEYS`, so they are genuine non-default conditions and are correctly excluded from "known T1 candidate" accounting by the already-present `!row.ablation` check alone. The seventh, `guidance=turn-biased`, has `ablation: null`. That file's own comment explains why: the flag it would nominally gate (`STRATEGY_REPAIR_TURN_BIAS`) is verified inert at this call site (`attempt-dispatch.ts` reads `repairTurnBiased` straight off the `AttemptConfig`, never consulting `prep._cfg`). `pushCell()` stamps `variantLabel: variant.label` on every `T1_PROMOTED_VARIANTS` entry uniformly, so the one clean entry inherited the same convenience marker as the six real ablations. The atlas/exposure scripts' `!row.variantLabel` condition could not tell those semantics apart.

## Fix

Removed the `!row.variantLabel` clause from `isBaseT1()` in all three scripts that share it (`scripts/stress/analyze-post-1029-residual-atlas.mjs`, `scripts/stress/analyze-current-missing-attempt-exposure.mjs`, `scripts/stress/analyze-equal-work-census.mjs`), keeping `!row.ablation`, the field that actually carries "this cell tests a non-default condition." Verified this changes nothing for the six real ablation entries and only affects `guidance=turn-biased`. Each site now carries a comment recording why `variantLabel` alone is unsafe as an exclusion signal.

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

All 9 newly-non-class-5 rows land in class 2 (`familyReached: true, dispatched: false` for the `guidance=turn-biased` win specifically). Production's repair family ran on these levels but never tried this exact guidance config. This is not new solver capability; the census already knew these levels were solvable by an existing technique. It corrects which bucket they belong in.

Class 5 remains the overwhelming majority and the first-priority acquisition frontier, but the corrected atlas also makes the class-2 composition/exposure population explicit.

## Bounded capability-memory census: corrected exact reconstruction

The first version of this report summarized a six-source union as `65/652`. That number is invalid: portal coarse-state merge by itself has 137 current-residual nominations, so a union containing it cannot contain only 65 rows. A temporary PR-only existing-data reconciliation rebuilt all six source sets through `solver-capability-memory-lib.mjs`, recovered exact technique-niche action identities from the committed artifact, and joined the nominations to the corrected atlas. No solver campaign was run.

| source | demonstrated historical IDs | current-residual nominations | unique within panel | class 1 | class 2 | class 3 | class 4 | class 5 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| portal coarse-state merge referee-valid gain set | 158 | **137** | 128 | 6 | 9 | 9 | **113** | 0 |
| `repair|score=repair|guidance=turn-biased` isolated capability | 184 | **25** | 18 | 0 | 25 | 0 | 0 | 0 |
| `beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets` | 713 | **9** | 5 | 8 | 0 | 1 | 0 | 0 |
| `beam|score=objectiveFirst|bias=none|width=5000|retention=mechanic-buckets` | 705 | **5** | 3 | 3 | 0 | 2 | 0 | 0 |
| goal-attraction-disabled promoted gain set | 3 | **0** | 0 | 0 | 0 | 0 | 0 | 0 |
| displaced losses, `34531412380` → `34683011115` | 16 | **16** | 12 | 0 | 1 | 12 | 3 | 0 |
| **six-source union** | — | **179** | — | **14** | **28** | **21** | **116** | **0** |

The exact source identities and recomputation are preserved in [`2026-09-12-capability-memory-union-reconciliation-001.md`](2026-09-12-capability-memory-union-reconciliation-001.md).

Two interpretations follow and must remain separate:

1. **Class 5:** zero of the six materially distinct sources reach any of the 431 class-5 rows. That bounded complementarity question closes negative and reinforces the current acquisition priority.
2. **Class 4:** 116/123 rows are nominated by the panel, with portal coarse-state merge alone nominating 113/123. The globally enabled coarse-state treatment remains closed negative because it lost 12 control solves and has a hard `R01273` regression, but its positive capability signature is too concentrated to discard. Per the capability-memory contract, class 4 now owes a cheap current-code freshness replay before deeper acquisition work is spent there.

The repair source here is ordinary **turn-biased** guidance. It is distinct from the separate seven-level **must-turn-biased** late-repair seam recovered by the class-1/2/3 rejoin. Do not merge those questions by name.

## Advancement

The bounded capability-memory census closes the question "does known capability reach class 5?" as **no** for these six sources. It does **not** close capability composition across the whole residual. The corrected aggregate instead creates a class-4 freshness trigger while leaving class 5 as the true acquisition frontier.

The 25 current residual nominations from ordinary turn-biased repair are already inside the corrected atlas and are governed by the dedicated class-1/2/3 exposure/reach analysis rather than a new standalone turn-bias experiment. `STRATEGY_REPAIR_TURN_BIAS` remains closed negative in its tested matched-work population form.

## Artifacts

- `scripts/stress/analyze-post-1029-residual-atlas.mjs`, `scripts/stress/analyze-current-missing-attempt-exposure.mjs`, `scripts/stress/analyze-equal-work-census.mjs` — `isBaseT1`/equivalent filter fixed: drop `variantLabel`, keep `ablation`.
- `tmp/post-1048-residual-atlas-fixed.json` — corrected atlas, regenerable via the command above.
- [`2026-09-12-capability-memory-union-reconciliation-001.md`](2026-09-12-capability-memory-union-reconciliation-001.md) — exact six-source recomputation and downstream class-4 trigger.
