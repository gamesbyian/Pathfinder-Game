# WS2 post-refresh residual atlas rebuild and first bounded capability-memory census 001

> **Status:** concluded-negative
> **Last evidence:** 2026-09-12 — production boundary refresh (run `34674256538`, then reconfirmed identically by lifecycle-telemetry run `34683011115`), residual atlas rebuild against the new 652-miss boundary, and the first bounded capability-memory census using the portal-coarse-state-merge closed-negative historical signature as its sole candidate.
> **Decision:** the census finds **no material complementarity worth escalating**: the one available candidate's 137 current-residual nominations sit almost entirely (114/137, 83%) inside class 4 (already flagged as having *some* historical candidate) and contribute **zero** nominations to class 5, the 440-level (67.5% of residual) no-known-candidate bucket. Cross-referencing further shows this single candidate alone accounts for 114/125 (91%) of class 4's entire membership — class 4 is not diverse evidence, it is substantially *this one* historical experiment. This does not change WS2's existing acquisition-vs-composition emphasis: class 5 remains the real unexplained residual and the priority target for first-loss/family/reference work, not composition of existing capability.
> **Remaining gate:** add further candidate sources (goal-attraction guidance-distance global-swap, repair turn-bias, class-1 compact beam-menu evidence) only if a cheap, exact gain/loss ID list can be recovered for each; do not manufacture a permanent candidate panel. Otherwise, close this census as low-yield per its own prespecified advancement rule and return to the existing first-priority residual program.
> **Evidence role:** WS2 next-gate execution (boundary refresh -> atlas rebuild -> bounded census). No solver-policy change; no production routing change.

## 1. Production boundary refresh

Dispatched `solver-stress-refresh.yml` on `main` at `51715da5d` (the commit that folds `PRUNE_MC_PORTAL_FORCED_NEIGHBOR` into production default-on — see [`the flag fix`](2026-09-11-joint-obligation-mc-portal-ab-001-preflight.md)). Run [`34674256538`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34674256538) completed clean:

**100/102 Corpus 1 + 1,048/1,700 Corpus 2 — 652 Corpus-2 misses**, down from the prior 671. This run did not collect `lifecycle_telemetry`, which the atlas rebuild's lifecycle-failure-map join requires (confirmed directly: running `scripts/stress/lifecycle-failure-map.mjs` against its `solver-corpus2-latest.json` fails with `missing stageLifecycle ... run the sweep with --lifecycle-telemetry`). Dispatched a second run, [`34683011115`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/34683011115), with `lifecycle_telemetry=true`. It reproduced the **identical** boundary (100/102 + 1,048/1,700), confirming the boundary is stable across two independent non-deterministic runs at this commit, and this run's artifacts are what the rest of this report uses.

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

Class 3 grew in both absolute count and share (36 -> 48, 5.4% -> 7.4%) despite the overall residual shrinking — a real, if small, shift worth a future look (are these newly-comparable-work-failed levels genuinely harder now, or reclassified from class 4/5 by the same evidence refresh?), but not pursued further in this report.

## 3. First bounded capability-memory census

Per [`the closeout's own prespecification`](2026-09-11-capability-memory-next-gate-closeout-001.md), used the current residual as baseline and started with one of its named candidate-evidence sources: the **portal coarse-state merge** A/B — "a large closed-negative survivor-policy contrast" ([`preflight`](2026-09-09-portal-coarse-state-merge-ab-001-preflight.md), 158 gains / 12 losses, exact IDs already itemized in that report). Built `tmp/capability-memory-manifest.json` (historical-signature mode; not committed — regenerate from the preflight's own ID lists) and ran:

```
node scripts/solver-capability-memory.mjs --manifest=tmp/capability-memory-manifest.json \
  --out=tmp/capability-memory.json --summary-out=tmp/capability-memory.md
```

**Result:** 137 of the candidate's 158 historical gains intersect the current 652-level residual — **21.0% union coverage** by this one candidate. Zero confirmed current-baseline gains (expected for a historical-signature candidate with no protocol-compatible current rows; this is nomination evidence only).

**Cross-referencing the 137 nominations against the rebuilt atlas's own class membership** (zero new compute — a direct join of the census's own `currentResidualNominationIds` against the atlas's `rows`):

| atlas class | nominated by this candidate | class total | coverage |
|---|---:|---:|---:|
| 1 (not offered) | 6 | 22 | 27% |
| 2 (offered/starved) | 4 | 17 | 24% |
| 3 (reached/failed) | 13 | 48 | 27% |
| 4 (historical candidate) | 114 | 125 | **91%** |
| 5 (no known candidate) | **0** | 440 | **0%** |

## Interpretation

Two things follow directly from the cross-reference, without needing a second candidate to compare against:

1. **Class 4 is not diverse evidence.** A class defined as "has *some* historical production-context candidate" turns out to be 91% attributable to a *single* named, already-rejected experiment. Before this census, class 4's 125 levels read as "125 independent pieces of historical promise." After it, they read as "one already-explained mechanism (and a small remainder of ~11 other candidates) that already failed promotion for a real reason (12 known-live losses via merge-key collision)." That does not mean these 114 levels are unsolvable — it means whatever caused them to need this exact policy is now a *specific, named, already-diagnosed* mechanism question, not an open one.
2. **Class 5 gained nothing.** Zero of the candidate's 137 nominations land in the 440-level (67.5%) no-known-candidate bucket — the class this whole program's acquisition emphasis already targets. A closed-negative composition-side policy contributing zero coverage there is exactly the "no material complementarity" advancement outcome the closeout prespecified, for this specific candidate.

Per the closeout's own advancement rules, this is closest to **"no material complementarity"** for the tested candidate specifically (not the whole census — only one source was tested) combined with a genuine, incidental **"policy-specific basin, already explained"** finding for class 4. Neither result licenses composition/allocation work from this candidate, and neither changes the acquisition-vs-composition emphasis: **class 5 remains the priority**, exactly as the existing WS2 program already holds.

## Advancement

This is not a closed census — it is one candidate out of the closeout's suggested list. The remaining named sources (goal-attraction guidance-distance global-swap, repair turn-bias, class-1 compact beam-menu evidence, displaced winners from accepted changes) were not included here because a cheap, exact, itemized gain/loss ID list was not readily available for each within this pass's scope (the turn-bias thread in particular spans several corrective reports with a non-trivial final attribution, per `reports/2026-07-23-turnbias-corpus2-ab-validation.md`). Per the closeout's own budget discipline ("omit any source whose protocol/current-row meaning is not comparable enough for the question"), this report does not force those in speculatively.

**Next gate:** add one further candidate only if its exact gain/loss IDs can be recovered as cheaply as this one was (a direct report grep, not a rerun), and specifically check whether any candidate reaches into class 5 — that is the one result that would change this census's conclusion. Absent that, this line returns to the existing first-priority residual program (first-loss/family/reference work targeting class 5) rather than continuing capability-memory mining for its own sake.

## Artifacts

- `tmp/post-1048-residual-atlas.json` — full rebuilt atlas (not committed; regenerate via the command above against run `34683011115`).
- `tmp/capability-memory-manifest.json`, `tmp/capability-memory.json`, `tmp/capability-memory.md` — census inputs/outputs (not committed; regenerate from the portal-coarse-state-merge preflight's own itemized IDs).
- `reports/stress/capability-runs/34674256538/`, `reports/stress/capability-runs/34683011115/` — the two refresh runs' committed per-level/summary artifacts.
