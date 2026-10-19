# PG-L independent actual dispatch and full-path overlap verification (2026-10-19)

> **Status:** concluded-positive
> **Last evidence:** 2026-10-19 — source-complete [24-parent actual production dispatch run 39103200622](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39103200622) and [nine-parent 1×/4× width5000 replay run 39103473669](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39103473669); tracked immutable machine evidence
> **Decision:** Independent 24-parent real production dispatch confirms 10 with both target scorers, nine at width5000; their isolated 1x full-path expansion overlap averages 0.99934 and 4x averages 0.81364, earning a read-only actual-invocation typed-fact opportunity probe, not a cache or solve claim.
> **Remaining gate:** Measure before-recomputation exact same-state, mechanic-sensitive fact reuse in the actual same-invocation dispatcher with work overhead and retained phase identity; only a source-positive and safe shared-fact consumer earns matched-total-250k cold A/B.
> **Research question:** `WS2-CROSS-ATTEMPT-BASIN-OVERLAP`
> **Evidence role:** discovery
> **Selection:** 24 independent source-only frozen Corpus-2 parents, excluding eight earlier PG-L parents; nine conditionally selected only after positive same-gate width5000 co-dispatch was observed
> **Population identity:** sha256:d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eedd0a27c7ffb
> **Selection history:** The 24 source IDs were frozen before dispatch outcomes by systematic source position with prior PG-L parent exclusions. The nine follow-up replay parents were selected **because** they showed both positive-work width5000 target actions, before knowing their cross-scorer overlap; conditional, not unconditional overlap prevalence.
> **Inference scope:** Observed production co-dispatch across 24 source-frozen parents and exact-path overlap in nine subsequent independent isolated width5000 replays, not actual cross-attempt reusable work or cold policy effect
> **Production effect:** none

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-10-19","decision":"Independent 24-parent real production dispatch confirms 10 with both target scorers, nine at width5000; their isolated 1x full-path expansion overlap averages 0.99934 and 4x averages 0.81364, earning a read-only actual-invocation typed-fact opportunity probe, not a cache or solve claim.","remainingGate":"Measure before-recomputation exact same-state, mechanic-sensitive fact reuse in the actual same-invocation dispatcher with work overhead and retained phase identity; only a source-positive and safe shared-fact consumer earns matched-total-250k cold A/B.","joins":{"researchQuestion":"WS2-CROSS-ATTEMPT-BASIN-OVERLAP","premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"discovery","scope":{"populationIdentity":"sha256:d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eedd0a27c7ffb","selection":"24 independent source-only frozen Corpus-2 parents, excluding eight earlier PG-L parents; nine conditionally selected only after positive same-gate width5000 co-dispatch was observed","inferenceScope":"Observed production co-dispatch across 24 source-frozen parents and exact-path overlap in nine subsequent independent isolated width5000 replays, not actual cross-attempt reusable work or cold policy effect"},"claimRefs":[],"sourceArtifacts":["reports/stress/pg-l-independent-dispatch-24-20261018-001.json","reports/stress/pg-l-independent-wide-overlap-20261018-001.json","scripts/stress/pg-l-independent-dispatch-run.mjs","scripts/stress/pg-l-independent-wide-overlap-shadow.mjs"],"successors":{"questions":["WS2-CROSS-ATTEMPT-BASIN-OVERLAP"],"artifacts":[]},"prospective":{"expectation":"Genuine production co-dispatch on some independent parents will expose recurring exact path expansions in matched-width isolated beam attempts.","surprise":"Eight of nine 1x conditional parents have identical entire processed-path sets across differently scored searches.","anomaly":"Source strict 250k production invocations frequently exceeded nominal work due to phase boundaries; do not treat them as exact equal-work 250k."}} -->

## Phase A: authentic production invocation participation

[Source 24-parent dispatch ledger](stress/pg-l-independent-dispatch-24-20261018-001.json), frozen roster at [population manifest](stress/pg-l-independent-dispatch-holdout-20261018-population.json). Production `createSolver().solveLevel`, no hints, one invocation per parent with 250k nominal strict-total canonical work and 250k nodes. Source GHA run 39103200622, immutable source SHA `b551a17be7bbd5755a7132de8047ce540a3e4e23`, run artifact 12126758325. This is not a 50M work campaign and phase-boundary work overshoots remain visible.

| Distinct source parents | Count |
| --- | ---: |
| Frozen and executed | **24 / 24** |
| Both objectiveFirst and intersectionHarvest positive-work beams in same call | **10** |
| Same call and both width5000 | **9** |
| Either one target scorer only | **0** |
| Neither target scorer | **14** |
| Referee-valid successful cold production invocations | **1** (`R03025`, at 11,182 work) |
| Errors / missing calls | **0** |

The one product control solve is already obtainable by the existing solver. It is **not a new solve enabled by this research**, and no prior all-history absence assertion is made. R03317 is the mismatch-width tenth participation case (objectiveFirst width2000 versus intersectionHarvest width5000), correctly excluded from the *same-width* next probe. Multiple action attempts within a level remain correlated; independent denominator is the **24 parents**.

## Phase B: source-matched, width5000 full-history overlap

[Saved 1×/4× overlap ledger](stress/pg-l-independent-wide-overlap-20261018-001.json) and [original complete raw artifact](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39103473669/artifacts/12127567546). Green run 39103473669 at source `5bb0b83e87ff817170f3fa2ba7b9bbe863be744e`, archive SHA256 `fac7728b4175a89948d44d2ee7c08bd29abf5d4848c193d45a2bd922fcbd1d2d`. Every trial used the actual production gate and two actual production profile names at width5000; the work caps were their observed positive production doses, then the *same source* doses multiplied by four. Retention in these **separate isolated replays** is deliberately plain and cannot be presumed identical to the production scheduler. The observer was inert: **18/18 OFF/ON pairs per dose** matched found/status/solution identity/work/nodes.

| Metric across 9 conditional parents | 1× actual profile dose | 4× |
| --- | ---: | ---: |
| Mean Jaccard of **exact entire processed parent paths** | **0.99934** | **0.81364** |
| Mean Jaccard after 8th move | 0.99928 | 0.81006 |
| Mean eight-move-prefix-set Jaccard (descriptive coarse marker) | 1.00000 | 1.00000 |
| Identical entire processed-path set across scorer pairs | **8 / 9** | **0 / 9** |
| Sum of canonical expansion work charged by both replays | 467,950 | 1,673,958 |
| Sum of per-path minimum matched expansion work | **233,926** | **735,227** |
| Matched-minimum fraction of all observed expansion work | **49.99%** | **43.92%** |

The *matched-minimum expansion work* means an exact same full path was independently expanded by both differently scored beams. It is an **overlap ceiling/proxy**, not a measured work reduction: a hypothetical reuse store still pays lookup, persistence, state validation, and possibly predecessor/phase coordination; source search order could change under any saved canonical work budget. Coarse eight-move hashes are **not** equivalent states, and no sound hard prune follows from a prefix collision. R02879 is the only 1× nonidentical full-set parent, still 0.994 exact Jaccard; at 4× every pair differs.

The observations establish a **real recurring participation opportunity** conditional on expensive width5000 co-dispatch (9/24 of the frozen parent denominator). They cannot estimate prevalence on all unseen generated levels, and the nine overlap pairs are selected *after* observing dispatcher routing. The original 8-parent PG-L pilot reported 3/8 co-dispatch; together these offer 13/32 combined observational opportunities, **not** an independent confirmation of saved work or solve gains.

## Next scoped intervention gate

1. Instrument the *real production invocation* with a decision-inert typed-fact observer that sees exact full path, derived mechanic state identity, gate and canonical charging for both width5000 scorer attempts in order. Reconstruct and compare the actual retention/phase windows; the previous separate replays do not establish chronological reusability.
2. Choose one cheap fact already computed during expansion (for example an exact deterministic successor/equivalent leaf expansion fact or a connectivity result keyed to its complete semantic prerequisites). A full-path identity may name an exact replay state, but never conflate cross-level paths, graph revisions, different mechanics, or query flags. Refuse unsupported keys.
3. First measure **earlier produced, later consumed, actually duplicate** facts and the maximum displaced native work, with no changes to solver outputs or work charging. Include memory/lookup cost and opportunity by independent parent.
4. Only if a bounded shared-fact cache can preserve exact solver behavior on matched work and provide a robust positive net opportunity should it enter a default-OFF full `solveLevel` 250k A/B, with independent cold-source confirmation and successful-solution referee checks. A standalone same-profile replay saving work or a compressed signature collision is not sufficient.

The three one-shot production census/overlap workflows can be removed after their source artifacts and tracked ledgers are preserved; keep self-test/reproduction scripts. No production routing/cache is authorized from Phase B alone.
