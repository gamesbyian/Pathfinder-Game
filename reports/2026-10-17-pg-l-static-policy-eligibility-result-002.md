# PG-L production policy eligibility and isolated-overlap transfer gate 002

> **Status:** concluded-positive
> **Last evidence:** 2026-10-17 — successful [read-only GitHub Actions run 39095663299](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39095663299) on source commit `c6527f04f2c9be6749bfe5767c2e93d1b5c84eea`, strict eight-parent policy coverage and self-test passed.
> **Decision:** both `objectiveFirst` and `intersectionHarvest` scorer families are *offered by the static production attempt policy* on **8/8** frozen parents, but **0/8** offers the original PG-L width-500 beam configuration. Every parent offers an unbucketed beam for each profile at **width 2,000 or 5,000**, often alongside other mechanic-bucket entries. Therefore the isolated 29.14% overlap cannot be read as an in-production shared-work opportunity.
> **Remaining gate:** observe real scheduled and executed action identities, width, retention mode and work spent within the **same cold invocation** on fixed control-miss and solved-control parents before even pricing an expensive shared-work fact or consumer. Static menu eligibility is not runtime participation; future tests must use production-matched width and canonical work.
> **Research question:** `WS2-CROSS-ATTEMPT-BASIN-OVERLAP`
> **Evidence role:** discovery
> **Selection:** identical eight frozen outcome-blind selected parents as PG-L-001, no oracle or hint access.
> **Population identity:** Eight frozen outcome-blind Corpus-2 parent levels R02781, R02676, R02929, R02579, R02024, R02857, R02037, R03004, selected under PG-L-001 seed pathfinder-pg-l-action-overlap-cold-8-20261017-001 from Corpus SHA-256 d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb.
> **Inference scope:** static current feature-policy configuration only, not actual scheduler dispatch, independent search outcome or work savings.
> **Production effect:** none.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-10-17","decision":"All eight fixed PG-L parents statically offer objectiveFirst and intersectionHarvest unbucketed beam actions, but none offers the source-experiment width 500; actual options are width 2000/5000 and some mechanic-bucket variants. Eligibility is not dispatch, overlap transfer or saved work.","remainingGate":"Check real same-invocation launch and canonical budget/work dose for each current configured scoring/width/retention pair on a frozen unsolved-plus-solved-control cohort before any cross-action work-reuse premise or matched-work consumer.","joins":{"researchQuestion":"WS2-CROSS-ATTEMPT-BASIN-OVERLAP","premiseRefs":["P067","P080","P081"],"measurementOpportunity":null},"evidenceRole":"discovery","scope":{"populationIdentity":"Eight frozen outcome-blind Corpus-2 parent levels R02781, R02676, R02929, R02579, R02024, R02857, R02037, R03004, selected under PG-L-001 seed pathfinder-pg-l-action-overlap-cold-8-20261017-001 from Corpus SHA-256 d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb.","selection":"all eight parent IDs fixed in PG-L-001 before any policy-list observation; no outcome or hint inputs to attempt configuration","inferenceScope":"static current production policy configuration inclusion only, not actual action dispatch or work economics"},"claimRefs":[],"sourceArtifacts":["reports/stress/pg-l-static-policy-eligibility-20261017-001.json","scripts/stress/pg-l-static-policy-eligibility.mjs"],"successors":{"questions":["WS2-CROSS-ATTEMPT-BASIN-OVERLAP"],"artifacts":[]},"prospective":{"expectation":"If both named action families are absent from real attempt menus, no production co-dispatch comparison is plausible.","surprise":"All eight offer both scoring families but none at experimental width 500; actual beams are width 2000/5000 and several mechanic-bucket retention variants.","anomaly":null}} -->

## Rejoined source and invariants

The source [PG-L-001](2026-10-17-pg-l-canonical-action-overlap-result-001.md) measured true processed *full-prefix* history overlap between two isolated width-500 scoring actions (mean 0.2914 exact Jaccard) with strict 16/16 collector-on/off work/outcome parity. PG-L-002 asks the cheapest prerequisite for any production transfer: whether the real level-feature policy offers **both named scorers on the same frozen parents**, and at the same width/mode as the experimental treatment.

The read-only analyzer uses the maintained `getConfiguredAttemptConfigs(level)` API with its production-default ablation normalization, the immutable Corpus-2 source and exactly the eight parent IDs from the PG-L-001 machine ledger; it asserts first prepared gates still match. It examines ordered attempt *configurations*, not search work. It correctly distinguishes `beam`, `dfs`, `repair`, `admissible-order`, ordering-biased attempts, and mechanic-bucket retention instead of conjoining all uses of a scorer name into a fake same-action identity. Its synthetic identity test passed before the main readout.

## Measured static policy exposure

| Measure | Result |
|---|---:|
| Source-blind independent parent levels checked | **8** |
| Parent menus containing both beam scorer families | **8 / 8** |
| Menus containing an unbucketed instance of both | **8 / 8** |
| Menus containing both *exact PG-L-001 width-500* beams | **0 / 8** |
| Absent `objectiveFirst` scorer entirely | **0** |
| Absent `intersectionHarvest` scorer entirely | **0** |
| Actual production execution of both attempts | **not measured** |
| New cold solves | **0** |

The actual offered unbucketed widths are 2,000 or 5,000, with some parents also offering 5,000-wide mechanic-bucket alternatives. Per-parent policy ordering, width, retention identity, prepared gate, and full SHA-256 source identity are retained in the [machine policy ledger](stress/pg-l-static-policy-eligibility-20261017-001.json), and the run artifact `12124646106` preserves the exact source-checked execution output.

A static policy list is only an *upper bound on possible participation*: the solver may stop after a preceding winner, never reach the late beam under the global work/deadline budget, use a different gate, or skip a candidate in orchestration. Furthermore, an actual 2,000-/5,000-wide search with bucket retention may explore a very different exact-parent set than isolated 500-wide beams. Both issues must be checked *before* a cross-action reuse consumer can be judged valuable or safe.

## Next bounded falsifier

Collect actual within-invocation attempt records, with scorer identity **and** width/mode/gate/work, on a fresh fixed current-miss + solved-control population. Start by querying existing canonical attempt traces rather than re-solving; if execution logs lack those fields, identify precisely which absent telemetry fields require a read-only observer. Only if some invocations actually execute both comparable actions and substantial repeated expensive **sound** fact derivations occur should a cheap pre-derivation key or work-neutral consumer be designed. Coarse first-eight-step trajectory overlap and whole-prefix path hashes are not automatically certificate keys.

This closes static menu opportunity sizing positively but does **not** reopen the negative cross-level shared-certification or broad restart forms. It does not authorize a new cache, pruning rule, scheduler adjustment, independent cold A/B or additional large solver campaign.

Reproduce without starting a solve:

```bash
node scripts/run-bundled.mjs scripts/stress/pg-l-static-policy-eligibility.mjs -- --self-test
node scripts/run-bundled.mjs scripts/stress/pg-l-static-policy-eligibility.mjs -- --out=tmp/pg-l-policy-eligibility.json
```

The disposable one-shot workflow is removed from the integration branch after its committed machine verdict and artifact are preserved.
