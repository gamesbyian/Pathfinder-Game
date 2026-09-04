# Gate 0D: refreshed production-boundary/exposure join

> **Status:** concluded-positive
> **Last evidence:** 2026-09-04 — join of `reports/stress/capability-runs/33824275953/per-level-{corpus1,corpus2}.json` (2026-09-04, level-blind production sweep) against `reports/stress/technique-niches/2026-09-03/level-capability.json`'s isolated-oracle winners
> **Decision:** among current production misses with a comparable isolated winner, the missing-exposure share has fallen substantially since the 2026-08-25 post-976 rejoin: **rescuer-never-offered 45/122 (36.9%)** vs. **offered-but-outcome-unresolved 77/122 (63.1%)**, compared to the earlier 73/139 (52.5%) not-offered / 66/139 (47.5%) offered split. Missing exposure is still real and non-trivial — `repair|score=repair|guidance=turn-biased` is the single largest concrete gap (13 levels) — but it is no longer the majority explanation for the comparable-capability residual.
> **Remaining gate:** none for this join at this data source's resolution. A depth/work-resolved split of the 77 "offered-but-outcome-unresolved" rows into starved / censored-too-shallow / comparable-depth-still-fails needs per-attempt `nodesExpanded`/`workSpent` at population scale, which no currently available production evidence source carries; that is new evidence to generate, not a rejoin, and is explicitly not run here.
> **Evidence role:** development — a join of two already-collected evidence artifacts, no new dispatch

## Evidence-comparability check (why this source, not another)

`docs/tooling-catalog.md` and this handoff both require verifying that chosen production evidence is actually comparable to the refreshed census before joining, rather than defaulting to whatever lifecycle-telemetry artifact happens to be newest.

Candidates considered:

- `reports/stress/capability-runs/33588487486/` (2026-09-02, `lifecycle_telemetry=true`): its own `gha-source-run.json` records commit `a3a7bb109b8212bd8e3afe37b09bcfcd2d74abcf`, which **does not resolve in this repository's local git history** (`git cat-file -t` fails). Its code-identity relationship to the census commit cannot be verified from this checkout.
- `reports/stress/capability-runs/33824275953/` (2026-09-04, `lifecycle_telemetry=false`, the most recent full-corpus level-blind sweep on `main`): its commit `1b7353955cf67df93cd35a8083546adfc670ad94` **does resolve**, and `git merge-base --is-ancestor` confirms the census commit (`277ca21be521bb7e03c268666ad868ad963f2cb5`) is an ancestor of it — i.e. this production run is strictly later than the census, not a divergent/unrelated commit. The only `modules/solver/` file touched between the two commits is `search.ts` (118 lines), entirely from three commits (`b51e60b2`, `83af7cad`, `243e7b54`) adding the already-documented **opt-in, default-off** beam pause/resume feasibility pilot (`docs/solver-optimization-workstreams.md`'s own account: "resumeFrom/pauseAfterPhases (default off, zero effect on existing callers)"). No default-path production behavior changed between census-time and this production run.

`33824275953` is used. As a direct empirical check on how much this matters in practice: its 1,700-level corpus-2 solved set is **byte-identical** to `33588487486`'s (975/975, zero levels differ either direction) despite being an independent dispatch two days apart — real-world confirmation that this join is not sensitive to which of the two nearby runs is chosen.

`failedStrategies` (a per-level list of every distinct config identity string production attempted) is available in this run despite `lifecycle_telemetry=false`; per-attempt `nodesExpanded`/`workSpent` depth is not, which bounds how finely this join can classify — see "Method and taxonomy" below.

## Method and taxonomy

The handoff's target classification is: production-miss + isolated rescuer; rescuer never offered; offered but zero-work/starved; offered and censored too shallow; offered at comparable depth/work but still fails; action/context not represented by isolated T1; non-comparable/unknown.

This evidence source's `failedStrategies` records **which config identities were attempted**, not per-attempt depth/work, so the three depth-resolved buckets (starved / censored-too-shallow / comparable-depth-fails) cannot be told apart from each other here — collapsing them without saying so would be false precision, which the handoff explicitly asks to avoid. This report therefore uses the coarser, honest split the data actually supports:

- **production miss + isolated rescuer** = the comparable population (isolated-oracle-solved misses);
- **rescuer never offered** = no isolated winning config appears in `failedStrategies`;
- **offered but outcome unresolved** = at least one isolated winning config was attempted and still failed — covers starved/censored-shallow/comparable-depth-fails together, explicitly not further split;
- **action/context not represented by isolated T1** = misses with zero isolated winners (607/729) are excluded from the comparable population entirely, matching the original report's own "no observed base winner" treatment — not classified as "rescuer never offered" (that would overstate exposure claims for levels that may have no known rescuer, or a production-only rescuer of the kind `2026-09-04-production-solved-no-isolated-winner-35-cohort-anatomy.md`-style analysis addresses separately for the reverse cohort — see Gate 0E).

Steps: (1) production misses = `ok: false` rows from both corpora (729/1,802); (2) isolated winners = `solvingActions` for levels with `isolatedOracleSolved: true` (122/729 comparable); (3) for each comparable miss, check membership of every isolated winning config identity string against `failedStrategies` (both already canonical-keyed, per this session's Gate 0A/0B/0C work — no legacy-string translation needed); (4) classify.

## Result

| | 2026-08-25 (`32835403128`×`32240161854`) | 2026-09-04 (`33824275953`×`33717910218`) |
|---|---:|---:|
| total misses | 724 | 729 |
| comparable (has ≥1 isolated winner) | 139 (19.2%) | 122 (16.7%) |
| rescuer never offered | 73 (52.5% of comparable) | **45 (36.9% of comparable)** |
| offered (starved + adequate, or outcome-unresolved) | 66 (47.5% of comparable) | **77 (63.1% of comparable)** |

The comparable-population share (16.7% vs. 19.2%) is close. The internal split moved substantially: **rescuer-never-offered fell from a majority to a minority**, while offered-but-unresolved grew to nearly two-thirds.

**Top rescuer-never-offered configs** (by level count):

| levels | config |
|---:|---|
| 13 | `repair\|score=repair\|guidance=turn-biased` |
| 6 | `beam\|score=intersectionHarvest\|bias=none\|width=5000\|retention=mechanic-buckets` |
| 6 | `repair\|score=repair\|guidance=must-turn-biased` |
| 5 | `beam\|score=intersectionHarvest\|bias=none\|width=5000\|retention=plain+coarse-state-near-tie-retention-off` |
| 5 | `beam\|score=objectiveFirst\|bias=none\|width=5000\|retention=plain+coarse-state-near-tie-retention-off` |
| 4 | `beam\|score=objectiveFirst\|bias=none\|width=5000\|retention=mechanic-buckets` |
| 4 | `beam\|score=knotBuilder\|bias=none\|width=2000\|retention=plain` |
| 4 | `admissible-order\|tieBreak=mustCrossFirst\|lds=off` |
| 4 | `admissible-order\|tieBreak=nearClosureRescue\|lds=off` |

`repair|score=repair|guidance=turn-biased` is the single largest concrete rescuer-never-offered config (13 levels) — a distinct repair guidance from the `must-turn-biased`/`standard` guidances the current `early-repair-search`/`repair-fallback` production tiers actually run. This is a genuine menu gap, not a starvation/depth artifact, since it never appears in `failedStrategies` at all. The rest of the list is dominated by wide `beam` `mechanic-buckets`/ablation-combination variants and the non-default `admissible-order` tie-break profiles — consistent with, not contradicted by, this session's `2026-09-04-production-ladder-marginal-value-tail-audit-001.md` finding that those tie-break profiles carry real but rare/expensive value.

## Interpretation

The 2026-08-25 rejoin's headline ("missing exposure is still real... a measurable capability seam") remains directionally true but weaker in magnitude: most of the comparable residual is now "offered but outcome unresolved" rather than "never offered." If missing exposure is pursued as a scheduler intervention target, `repair|score=repair|guidance=turn-biased` is the strongest concrete current candidate, distinct from the 2026-08-25 report's own top nomination (a diverse/mechanic-bucket beam, now mostly folded into `portfolio-18-specialists`'s kept specialists).

## What this does not establish

- No depth/work-resolved split of the 77 "offered but outcome unresolved" rows; the earlier 2026-08-25 starvation finding (median depth ratio 0.30, a 21-cell near-boundary subset within 10% of historical depth) is neither confirmed nor refuted here.
- Development join across two already-collected artifacts, not independent confirmation.
- The 607/729 misses with zero isolated winners are excluded, matching the original method; they are not evidence that production lacks any rescuer, only that this specific bounded isolated T1 census found none.

## Reproduction

```js
const niches = JSON.parse(readFileSync('reports/stress/technique-niches/2026-09-03/level-capability.json'));
const prodRows = [
  ...JSON.parse(readFileSync('reports/stress/capability-runs/33824275953/per-level-corpus1.json')).rows,
  ...JSON.parse(readFileSync('reports/stress/capability-runs/33824275953/per-level-corpus2.json')).rows,
];
// for each ok:false row with a niche row where isolatedOracleSolved, check whether any
// niche.solvingActions member appears in row.failedStrategies; classify accordingly.
```

Not committed as a script since it has no other planned use (per this line's own precedent in `2026-09-03-portfolio-18-specialists-rare-capability-retention-audit.md`); every number above is directly re-derivable from the two cited already-committed artifacts.
