# Capability-memory manifest hardening 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-13 — regenerated `tmp/post-1048-residual-atlas-fixed.json` from committed inputs, exactly reproduced the corrected residual atlas (652 residual, classes `22/39/37/123/431`), and rebuilt a durable, machine-checked `solver-capability-memory.mjs` manifest for 5 of the 6 sources named in [`2026-09-12-capability-memory-union-reconciliation-001.md`](2026-09-12-capability-memory-union-reconciliation-001.md).
> **Decision:** the prose-reconstructed six-source union (179/652) is not independently re-derivable from committed artifacts alone, because that report's own runs (`34728842684`/`34728960554`) never committed their manifest/result. This report closes that specific gap for 5 of the 6 sources by committing a regenerable manifest + result at `reports/stress/capability-memory-manifests/2026-09-13-five-source-partial-union/`. The reconstructed 5-source union is **167/652 (25.6%)**, matching `179 - 12` exactly — 12 is the "production-boundary displaced solved-set losses" source's own reported unique-nomination count, the one source this report could not relocate an exact ID list for within budget.
> **Remaining gate:** none of the three live WS2 gates depend on this. This is pure research-control-plane hardening (AGENTS.md fallback item 6: "improve the smallest research-control-plane weakness that has recently caused wasted compute or false conclusions").
> **Evidence role:** durability/integrity fix. No solver-policy change, no new experiment.

## Why this was worth doing now

The union-reconciliation report explicitly flagged this exact gap in its own "Research-system failure mode" section: a correct source-by-source table was reconstructed once, but "even when each source has a legitimate provenance record, a summary can still become scientifically unsafe if source-set identity and set algebra are reconstructed in prose rather than mechanically sealed in the durable result," and recommended that "future capability-memory closeouts that cite a union should preserve or regenerate the machine-readable candidate manifest/result." Nobody had done that yet; the temporary PR-only workflow that ran the original reconstruction (`tmp-seven-day-capability-reconcile.yml`) was already removed per the ledger ("Remove consumed capability reconciliation workflow"), so the exact source IDs existed only as prose in one report.

## What was reconstructed and verified

Regenerated the atlas directly (no solver run):

```
node scripts/run-bundled.mjs scripts/stress/analyze-post-1029-residual-atlas.mjs -- \
  --baseline=reports/stress/capability-runs/34683011115/per-level-corpus2.json \
  --lifecycle=reports/stress/capability-runs/34683011115/lifecycle-failure-map-corpus2.json \
  --census=reports/stress/technique-census/33717910218/combined-cells.json \
  --hints-dir=data/stress/hints-random \
  --out=tmp/post-1048-residual-atlas-fixed.json
```

Reproduced exactly: residual 652, classes `22/39/37/123/431` — matching the corrected atlas report bit-for-bit.

Five of the six named sources were re-extracted from committed artifacts and encoded as `solver-capability-memory.mjs` historical-signature candidates:

| source | gainIds | lossIds | re-extracted from |
|---|---:|---:|---|
| portal coarse-state merge referee-valid gain set | 158 | 12 | `data/stress/portal-coarse-state-merge-gain-referee-check-001-ids.txt` (already committed) + loss list in `2026-09-09-portal-coarse-state-merge-ab-001-preflight.md` |
| repair turn-biased isolated capability | 184 | 0 | `solvingActions` join over `reports/stress/technique-niches/2026-09-03/level-capability.json` |
| intersectionHarvest mechanic-bucket beam | 713 | 0 | same technique-niche file |
| objectiveFirst mechanic-bucket beam | 705 | 0 | same technique-niche file |
| goal-attraction-disabled promoted gain set | 3 | 0 | `2026-09-05-goal-attraction-disabled-retry-fresh-work-pool-confirmation-002-preflight.md` (`R01124`, `R02020`, `R02060`) |

All five reproduce the union-reconciliation report's own per-source demonstrated/nomination counts exactly (158/137, 184/25, 713/9, 705/5, 3/0).

**Not reconstructed:** the "production-boundary displaced solved-set losses" source (16 demonstrated, 16 current-residual nominations, 12 unique) — no committed artifact identifying the exact 16 level IDs was located within this task's budget. This is the entire gap between this report's 167-row union and the original 179-row union; the arithmetic (`179 - 12 = 167`) is consistent with that source contributing exactly its reported unique share and nothing else.

Regenerate/verify at any time with:

```
node scripts/solver-capability-memory.mjs \
  --manifest=reports/stress/capability-memory-manifests/2026-09-13-five-source-partial-union/manifest.json \
  --summary-out=/tmp/capmem-summary.md
```

## Outstanding

If the sixth source's exact ID list is later relocated (or regenerated from whatever before/after production-baseline pair produced it), add it to the manifest as a sixth candidate and confirm the union returns to 179 — the library's own `union.nominated` field and this report's arithmetic check both make a silent miscount immediately visible, which is the whole point of committing this as data instead of prose.
