# PG-L real same-invocation beam co-dispatch canary 003

> **Status:** concluded-positive
> **Last evidence:** 2026-10-17 — correctly classified [run 39098769642](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39098769642), source `7a50f1beaec6df7ba7868890a792b1b8550136b7`, artifact 12125203170. Original 39098565429 kept as unmodified raw attempt ledger for independent verification.
> **Decision:** Static offering did not imply dispatch. Three of eight frozen independent parents actually execute both objectiveFirst and intersectionHarvest beam scorers with **positive measured work** under a single 250,000-unit base-work canary. The other five have zero positive-work beam attempts. This is real action co-participation on the three, not measured prefix-history overlap at production width, nor proof that any cross-attempt reuse would pay.
> **Remaining gate:** align the exact executed width, gate, stage, retention and work for those three active parents; reuse the read-only full-prefix overlap collector at actual configured widths only if work economics indicate a cheaper sound shared fact. Preserve five nonparticipating parents as negative controls, do not enlarge the campaign or claim 29% width-500 overlap transfers.
> **Research question:** `WS2-CROSS-ATTEMPT-BASIN-OVERLAP`
> **Evidence role:** discovery
> **Selection:** the identical frozen eight parent levels from PG-L 001/002; zero access to hints or historical wins during cold invocation.
> **Population identity:** R02781, R02676, R02929, R02579, R02024, R02857, R02037, R03004; Corpus-2 SHA256 d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb.
> **Inference scope:** canonical production attempt execution at the deliberately bounded 250k base work / node canary on eight selected development parents; no full-budget inference and no measured live cross-beam state overlap.
> **Production effect:** none.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-10-17","decision":"Three of eight frozen parents executed both target beam scorer families with positive canonical work within one bounded invocation; five did not execute either beam scorer at this dose. Only co-dispatch, not same-prefix double work, is established.","remainingGate":"Measure full-state parent overlap at actual width/mode only for the three demonstrated co-executing parents, with five nonparticipants as controls, and price shared sound facts before any consumer.","joins":{"researchQuestion":"WS2-CROSS-ATTEMPT-BASIN-OVERLAP","premiseRefs":["P067","P080","P081"],"measurementOpportunity":null},"evidenceRole":"discovery","scope":{"populationIdentity":"R02781, R02676, R02929, R02579, R02024, R02857, R02037, R03004; Corpus-2 SHA256 d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb.","selection":"same frozen 8 PG-L 001/002 parent levels; no outcomes or hints used during solver attempts","inferenceScope":"actual bounded co-dispatch identity and positive canonical-work observation only; no prefix overlap or savings proof"},"claimRefs":[],"sourceArtifacts":["scripts/stress/pg-l-actual-dispatch-canary.mjs"],"successors":{"questions":["WS2-CROSS-ATTEMPT-BASIN-OVERLAP"],"artifacts":[]},"prospective":{"expectation":"Both statically available beam scorer families may execute on some ordinary parents.","surprise":"Only three of eight offer simultaneous observed positive-work participation within the canary; five spent their 250k work without any target beam dispatch.","anomaly":"First readout used configKey-only classification, although canonical telemetry stores scoringProfileId/beamWidth without configKey on most attempts; corrected from unaltered raw attempt records and rerun with field-based classification."}} -->

## Actual telemetry, not static menu

The current attempt orchestration returns `SolveResult.attempts` with authoritative `scoringProfileId`, `beamWidth`, `workSpent` and `gateKey`. A source-real first pass emitted the full per-attempt records (artifact `12126075511`, 719 total attempt records); its summary incorrectly classified all target beams as absent because it required optional `configKey` to contain `beam`. This was a **readout/classification bug**, not a change in the solver: raw attempt records preserve independent scorer, positive beam width and positive work. The corrected evidence script keys beam execution on precisely those three runtime fields and was independently rerun green as [39098769642](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39098769642). It does not alter the search. Machine source-bound result: [PG-L actual dispatch](stress/pg-l-actual-dispatch-250k-20261017-001.json).

| Parent | Actual positive-work beams, any scorer | ObjectiveFirst | IntersectionHarvest | Both co-executed |
|---|---:|---:|---:|---|
| R02781 | 4 | 1 | 1 | **yes** |
| R02676 | 0 | 0 | 0 | no |
| R02929 | 0 | 0 | 0 | no |
| R02579 | 4 | 1 | 1 | **yes** |
| R02024 | 0 | 0 | 0 | no |
| R02857 | 0 | 0 | 0 | no |
| R02037 | 4 | 1 | 1 | **yes** |
| R03004 | 0 | 0 | 0 | no |

Across eight independent parents, three had co-dispatch, five did not. The source attempts all ended bounded without a cold success: a mix of node-budget-reached and work-budget-reached, zero attempt-error. The base nominal budget was 250k work, `strictTotalWorkBudget=true`, 250k nodes and a 600,000ms safety deadline. Canonical work includes atomic overshoot across the sample (252,890 to 287,327 total per invocation); report *actual* work, not a falsely exact 250k dose. These selected development parents do not support population prevalence.

## Interpretation

PG-L-001's isolated width-500 exact-prefix Jaccard of 0.2914 is **not** portable to the current menu, which offers width 2,000/5,000 and multiple mechanic retention modes. PG-L-002 showed both scorers statically listed on all eight parents. PG-L-003 supplies the missing actual launch evidence: *there are three real same-invocation scorer pairs worth profiling*, not eight, at this canary budget. The separate positive-work attempts may spend very different budgets, gates or retention; total attempt-record counts of 719 include retries/zero-work records and are not independent evidence of beam overlap.

Do not promote a shared transposition/cache or claim solver savings on this observation. A consumer needs a cheaper *sound* reusable fact available before a duplicate expensive computation and a fixed-work cold A/B. The smallest next test is production-matched, same-gate, same-invocation passive prefix collision/overlap observation on the three witnessed co-dispatch parents, followed by proof/economic evaluation, not a wider action reordering campaign. Historical hints are not admissible cold selectors.
