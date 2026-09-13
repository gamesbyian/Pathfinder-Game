# WS2 post-refresh residual atlas rebuild and first bounded capability-memory census 001

> **Status:** superseded
> **Last evidence:** 2026-09-12 — this first-candidate snapshot was superseded later the same day by the T1-census semantic fix and completed bounded capability-memory census in [`2026-09-12-repair-turn-biased-t1-census-misclassification-001.md`](2026-09-12-repair-turn-biased-t1-census-misclassification-001.md).
> **Decision:** preserve this report as the historical first-candidate step only. Its `22/17/48/125/440` atlas and open-census interpretation are obsolete. The corrected atlas is `22/39/37/123/431`, and the completed six-source census reaches zero class-5 rows.
> **Remaining gate:** none here. Current execution priority and any new capability-memory reopen condition live in `docs/solver-optimization-workstreams.md` and the superseding report.
> **Evidence role:** historical intermediate in the WS2 boundary/residual rebuild and bounded capability-memory census. No solver-policy change; no production routing change.

This report remains useful for the portal-coarse-state-merge first-candidate join and for the workflow lesson that the first 1,048-solve refresh lacked required lifecycle telemetry. Do not use its cohort counts or remaining-gate text as current authority.

## 1. Production boundary refresh

Dispatched `solver-stress-refresh.yml` on `main` at `51715da5d` (the commit that folds `PRUNE_MC_PORTAL_FORCED_NEIGHBOR` into production default-on — see [`the flag fix`](2026-09-11-joint-obligation-mc-portal-ab-001-preflight.md)). Run [`34674256538`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34674256538) completed clean:

**100/102 Corpus 1 + 1,048/1,700 Corpus 2 — 652 Corpus-2 misses**, down from the prior 671. This run did not collect `lifecycle_telemetry`, which the atlas rebuild's lifecycle-failure-map join requires (confirmed directly: running `scripts/stress/lifecycle-failure-map.mjs` against its `solver-corpus2-latest.json` fails with `missing stageLifecycle ... run the sweep with --lifecycle-telemetry`). Dispatched a second run, [`34683011115`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34683011115), with `lifecycle_telemetry=true`. It reproduced the **identical** boundary (100/102 + 1,048/1,700), and this run's artifacts are what the rest of this report uses.

The duplicate full refresh exposed a workflow-contract defect rather than solver nondeterminism: ordinary canonical refreshes were allowed to omit lifecycle telemetry even though the standard downstream residual-atlas path requires it. The workflow is being hardened separately so future ordinary refreshes default to lifecycle-complete evidence and fail in the cheap planning job before fan-out if that invariant is disabled. Specialized deterministic/A-B runs may still opt out when lifecycle evidence is not part of their question.

## 2. Residual atlas rebuild

```
node scripts/run-bundled.mjs scripts/stress/analyze-post-1029-residual-atlas.mjs -- \
  --baseline=reports/stress/capability-runs/34683011115/per-level-corpus2.json \
  --lifecycle=reports/stress/capability-runs/34683011115/lifecycle-failure-map-corpus2.json \
  --census=reports/stress/technique-census/33717910218/combined-cells.json \
  --hints-dir=data/stress/hints-random \
  --out=tmp/post-1048-residual-atlas.json
```

No new solving; this rejoins already-registered evidence exactly as the prior 671-miss atlas did, against the new run's own per-attempt dispatch log and lifecycle telemetry, the existing frozen T1 census, and the hint-provenance store.

| class | label | count (2026-09-11, /671) | count (2026-09-12, /652) |
|---|---|---:|---:|
| 1 | known rescuer not offered | 26 (3.9%) | 22 (3.4%) |
| 2 | known rescuer offered but not reached/starved | 21 (3.1%) | 17 (2.6%) |
| 3 | known rescuer reached, comparable work failed | 36 (5.4%) | 48 (7.4%) |
| 4 | no T1 winner but historical production-context candidate | 143 (21.3%) | 125 (19.2%) |
| 5 | no known admissible/T1 candidate | 445 (66.3%) | 440 (67.5%) |

By routing regime (primary class 1-5): `intersection-heavy` 528 total (19/11/38/98/362), `multi-portal` 64 total (1/5/2/12/44), `must-cross-heavy` 51 total (1/0/8/15/27), `general` 9 total (1/1/0/0/7).

Class 3 grew in both absolute count and share (36 -> 48, 5.4% -> 7.4%) despite the overall residual shrinking. That is a real shift worth a bounded follow-up, but it is not interpreted further here.

## 3. First capability-memory candidate

Per [`the closeout's own prespecification`](2026-09-11-capability-memory-next-gate-closeout-001.md), used the current residual as baseline and started with one of its named candidate-evidence sources: the **portal coarse-state merge** A/B — "a large closed-negative survivor-policy contrast" ([`preflight`](2026-09-09-portal-coarse-state-merge-ab-001-preflight.md), 158 gains / 12 losses, exact IDs already itemized in that report). Built `tmp/capability-memory-manifest.json` (historical-signature mode; not committed — regenerate from the preflight's own ID lists) and ran:

```
node scripts/solver-capability-memory.mjs --manifest=tmp/capability-memory-manifest.json \
  --out=tmp/capability-memory.json --summary-out=tmp/capability-memory.md
```

**Result:** 137 of the candidate's 158 historical gains intersect the current 652-level residual — **21.0% nomination coverage** by this one candidate. Zero confirmed current-baseline gains are claimed; this is historical nomination evidence only.

| atlas class | nominated by this candidate | class total | coverage |
|---|---:|---:|---:|
| 1 (not offered) | 6 | 22 | 27% |
| 2 (offered/starved) | 4 | 17 | 24% |
| 3 (reached/failed) | 13 | 48 | 27% |
| 4 (historical candidate) | 114 | 125 | **91%** |
| 5 (no known candidate) | **0** | 440 | **0%** |

## Interpretation

Two candidate-specific conclusions are justified:

1. **Class 4 is much less diverse than its raw count suggested.** One already-rejected experiment alone nominates 114/125 rows. Those levels are therefore largely a named historical mechanism basin rather than 125 unrelated pieces of evidence.
2. **Portal coarse-state merge adds no class-5 reach.** None of its 137 current-residual nominations land in the 440-level no-known-candidate bucket, so this specific closed-negative policy gives no reason to shift effort away from class-5 acquisition.

What is **not** justified in this historical snapshot is a census-wide "no material complementarity" conclusion. Complementarity is inherently comparative, and at this point only one candidate had been evaluated. The superseding report later completed the bounded multi-source census after correcting the T1 classification semantics.

## Historical advancement state

At the time of this snapshot the bounded census remained open but subordinate. That gate is now closed by the superseding report. Do not rerun the remaining-source recovery described in earlier revisions of this report.

## Artifacts

- `tmp/post-1048-residual-atlas.json` — historical pre-fix atlas output (not committed; the corrected command/result is in the superseding report).
- `tmp/capability-memory-manifest.json`, `tmp/capability-memory.json`, `tmp/capability-memory.md` — first-candidate inputs/outputs (not committed; regenerate from the portal-coarse-state-merge preflight's itemized IDs if this historical step must be reproduced).
- `reports/stress/capability-runs/34674256538/`, `reports/stress/capability-runs/34683011115/` — the two refresh runs' committed per-level/summary artifacts.
