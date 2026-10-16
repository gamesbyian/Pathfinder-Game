# PG-H: deeper-prefix exact-observability pilot 002

> **Status:** active
> **Last evidence:** 2026-10-16 — initial [PG-H 001](2026-10-16-pg-h-semantic-forcedness-reference-pilot-001.md) found 2 proven semantically forced states in one parent, but 38/45 shallow-prefix CP-SAT queries UNKNOWN at 20 seconds.
> **Decision:** measure cheap, read-only depth-conditioned reference opportunities before paying more for exact oracle classification.
> **Remaining gate:** confirm that deeper eligible prefixes exist on the same eight frozen parents; freeze selected depth, count, and work before dispatching exact labels.
> **Research question:** `WS2-SEMANTIC-FORCEDNESS`
> **Evidence role:** discovery
> **Selection:** the same eight preselected parents from run 38977850830; states selected solely by current-solve depth, not known solutions or CP-SAT outcomes.
> **Population identity:** same hashed eight Corpus-2 parents and 500k-work width-500 objectiveFirst capture as PG-H 001; exact new cases/depth identities are frozen by the new read-only run.
> **Inference scope:** reference-query **tractability opportunity**, not semantic-forcedness prevalence, newly solved levels, or solver policy.
> **Production effect:** none.

## Why this is worth a cheap diagnostic

The first pilot selected the **first two** post-prune multi-successor parents on each of the eight levels. All 16 lay at depth 0 or 1. That yielded two strong hidden-forcedness existence witnesses (R00242), but 38/45 CP-SAT child queries abstained. Buying 320 more similarly shallow exact queries would be poor evidence economics.

The existing capture already observes *every eligible multi-successor parent state* along its bounded real beam search and knows each group's prefix depth before any exact reference label. Add an explicit `--selection=deepest` option that selects the two deepest eligible groups per gate; ties retain source generation order. The default `first` behavior is unchanged and tested.

No solver search ordering, budget, level selection, hint access or production policy changes. This intervention shifts only **which already-observed states become reference questions**. It is deliberately a development-only measurement-design adaptation informed by the initial 84% UNKNOWN result.

## Frozen pilot

- Independent parents: `R00242,R02941,R03030,R02405,R01229,R02307,R02561,R02240`, identical to PG-H 001.
- Same `objectiveFirst` beam width 500, 500,000 canonical work per gate, 600,000 ms wall safety, 2–4 hard-prune surviving successors and two selected groups per gate.
- One new dimension: `--selection=deepest`, ordered by descending prefix depth and earliest observed tie.
- First run is **capture only**, with max 320 child cases. Record each selected depth, observed eligible group count, work and exact prefix IDs. No exact oracle yet.
- If the selected depth distribution remains at 0–1 or produces few informative cases, stop; don't increase exact compute.
- If prefixes are materially deeper, run a small **matched 20-second-per-child CP-SAT query** on the frozen new cases and score its resolution/coverage against the original 7/45 answered child cases, without treating between-depth groups as exchangeable.
- Any discovered LIVE or DEAD fact is offline/reference evidence only; production cold-solving needs a cheap current-input inference and matched-work A/B.

Temporary workflow `.github/workflows/pg-h-deep-capture-20261016.yml` is a one-shot readout, retired before integration. The pilot creates no persistent hint or corpus mutations.
