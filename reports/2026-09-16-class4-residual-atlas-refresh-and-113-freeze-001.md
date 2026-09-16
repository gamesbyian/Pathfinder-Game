# Class-4 residual atlas refresh and 113-row population freeze 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-16 — reconstruction of `analyze-post-1029-residual-atlas.mjs` against the frozen `34683011115` baseline/lifecycle/census inputs, but current `data/stress/hints-random`
> **Decision:** the class-4/class-5 split drifted (hint-provenance freshness, not a new solve), but the actionable 113-row intersection with the closed portal-coarse-merge treatment's referee-valid gain set is unchanged. Freeze `data/stress/ws2-class4-allocation-113-ids.txt` (113 ids) as the population for the earned Class-4 allocation run.
> **Remaining gate:** run/measure the frozen 113-row population (control/treatment) and analyze with the same identity contract the canary used.
> **Evidence role:** residual-freshness reconciliation before a decision-bearing population dispatch, per `solver-research-operating-model.md`'s freshness rule and `solver-capability-memory.md`'s "refresh residual-derived views... before reusing class counts."

## Why this ran

Materializing the earned Class-4 113-row allocation population (docs/solver-optimization-workstreams.md gate 1) requires reproducing the 2026-09-13 freshness replay's reconstruction: intersect the corrected residual atlas's class-4 bucket against the closed portal-coarse-merge treatment's committed 158-id referee-valid gain set (`data/stress/portal-coarse-state-merge-gain-referee-check-001-ids.txt`).

Between that report and today, this session dispatched the routine control-flag `solver-stress-refresh.yml` refresh (run `35043165547`, to source current-code `class2ControlEligibility` for the separate Class-2 gate). That refresh's default `--save-hints` behavior rewrote ~1,200 files under `data/stress/hints-random/` with fresh provenance, which is one of `analyze-post-1029-residual-atlas.mjs`'s inputs. Rerunning the exact reconstruction command from the freshness replay report (unchanged baseline/lifecycle/census — all pinned to historical run `34683011115`/`33717910218`, only `hints-random` current) no longer reproduces the previously-quoted `22/39/37/123/431` class split.

## Result

Fresh reconstruction: `22/39/37/159/395` (total residual still exactly `652`; classes 1-3 unchanged; 36 rows moved from class 5 to class 4 because current hint provenance now shows a historical production-context candidate for them). This is a **residual reclassification drift from hint-provenance freshening**, not a new production solve and not a changed baseline — `34683011115` remains the correct historical production-boundary reference.

Intersecting the new class-4 bucket (159 rows) against the same frozen `portal-coarse-state-merge-gain-referee-check-001-ids.txt` (158 ids) still yields **exactly 113 rows**, split `88` intersection-heavy / `11` multi-portal / `14` must-cross-heavy — identical to the freshness replay's reported stratification, and containing all 8 previously-sampled freshness rows. The specific population this experiment needs is robust to the drift; the raw class-4/class-5 counts quoted elsewhere are not.

## Disposition

- Updated `docs/solver-optimization-workstreams.md`'s production-boundary paragraph to the fresh `22/39/37/159/395` split (previously `22/39/37/123/431`).
- Froze the population as `data/stress/ws2-class4-allocation-113-ids.txt` (113 ids, newline-separated, sorted).
- No solver-policy or premise change; this is bookkeeping hygiene the freshness discipline in `solver-capability-memory.md` requires before reusing class counts for a new dispatch.

## Next gate

Run the frozen 113-row population, control (`STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY`) vs. treatment (+`_TREATMENT`), at the same production-shaped envelope and resolved-identity contract as the passed canary. Measure participation, referee-valid gains, additive `workSpent`, wall cost, and any unexpected collateral before considering default-on promotion.
