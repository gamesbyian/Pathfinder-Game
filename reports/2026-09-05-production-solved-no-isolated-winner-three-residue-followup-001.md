# Production-solved / no-isolated-winner three-row residue follow-up

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — direct reinspection of persisted per-level hint provenance for `R03195`, `R02452`, and `R02887`, the three rows left unresolved by the 35-row cohort anatomy.
> **Decision:** two of the three rows are no longer unexplained native capability. `R02452` and `R02887` both have current-revision, unguided, unforced standard-repair successes, including attempt-0 solves inside the relevant 48.24M-work repair envelope. Their exclusion from the earlier 25-row census-coverage bucket is a provenance-schema/flag boundary: the valid records predate the later `context.isolatedTechnique` marker. `R03195` remains genuinely unresolved at the current production/census envelope.
> **Evidence role:** local provenance reconciliation; no new dispatch.

## Starting point

`2026-09-04-census-cross-evidence-35-cohort-anatomy.md` reduced the apparent 35-level production-solved / no-isolated-T1-winner cohort to:

- 25 census/current-run coverage mismatches;
- 7 production context/retry/flag variants;
- 3 unresolved IDs: `R03195`, `R02452`, `R02887`.

The earlier pass deliberately required the newer `context.isolatedTechnique` flag when assigning a persisted native solve to the census-coverage bucket. Re-reading the complete provenance histories shows that this flag boundary is too strict for the remaining question, because older valid native solves can have all the behavior needed to establish ordinary isolated capability without carrying that later metadata field.

## R02452: ordinary repair capability already persisted

`data/stress/hints-random/R02452.json` contains repeated unguided `pathfinder-solver` repair successes on the current level revision `v2:de70170c...` with no forcing enabled.

Most importantly, an attempt-0 standard repair solve recorded on 2026-08-08 has:

- technique/profile: `repair` / `repair`;
- forcing: all disabled/default;
- `usedExistingHints: false`, `hintGuided: false`;
- `workSpent: 389,525`;
- `workBudget: 48,240,000`;
- termination: `solved`.

There are also repeated same-revision standard-repair successes across earlier/later solver revisions. This is far inside the relevant repair work envelope and does not depend on a special production-only ablation or hint-guided path.

**Disposition:** no longer an unexplained production-only capability row. Treat it as a census/provenance-coverage mismatch whose decisive native evidence predates the `isolatedTechnique` flag convention.

## R02887: same provenance-boundary mechanism

`data/stress/hints-random/R02887.json` likewise contains an unguided, unforced standard-repair attempt-0 success on the current level revision `v2:1ba2cd91...`:

- technique/profile: `repair` / `repair`;
- forcing: all disabled/default;
- `usedExistingHints: false`, `hintGuided: false`;
- `workSpent: 7,909,553`;
- `workBudget: 48,240,000`;
- termination: `solved`;
- found 2026-08-06.

A second standard-repair success is present on the same revision as well.

**Disposition:** no longer an unexplained production-only capability row. As with `R02452`, the earlier unresolved classification reflects a metadata-era boundary, not absence of native isolated-like capability.

## R03195: remains open

`data/stress/hints-random/R03195.json` does contain real native solver rescues on the current revision, but the available native records found in this re-check are late `beam|intersectionHarvest|width=5000|diverseBeam=true` successes with `workSpent: 110,780,231` against a recorded 67,000,000 work budget. They therefore do not establish capability inside the current fixed-work envelope.

The earlier lifecycle evidence also classified this level as `node-budget-reached`, with no current stage-attributed win available in that telemetry run.

**Disposition:** keep `R03195` as the sole unresolved residue. A future re-check should ask specifically which current production action solves it inside the production envelope and why that action is absent from or unsuccessful in the isolated census. Do not rerun analysis on the other 34 members of the original cohort.

## Methodological lesson

`context.isolatedTechnique` is useful positive provenance, but its absence is not evidence that an older solve was context-dependent. For legacy records, classify the behavior directly when the relevant fields are available:

- same current level revision;
- native solver technique;
- no existing hints / no hint guidance;
- no special forcing/ablation;
- attempt and work usage compatible with the candidate isolated action;
- solve accepted into persisted hint provenance.

This prevents a schema-adoption date from masquerading as a capability boundary.

## Updated cohort accounting

For the original 35-row production-solved / no-isolated-T1-winner cohort, the smallest unexplained residue is now **1/35**, `R03195`.

The previous 25/7/3 taxonomy remains historically useful for the stricter flag-based audit, but current planning should not carry `R02452` or `R02887` forward as open solver questions.