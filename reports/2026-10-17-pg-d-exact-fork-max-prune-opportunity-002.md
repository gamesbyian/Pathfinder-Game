# PG-D exact topology-fork maximal-prune opportunity census 002

> **Status:** inconclusive
> **Last evidence:** 2026-10-17 — [green run 39079609236](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39079609236), exact head `4a12f5268196cab5c1741a74e4745b1cb152d34f`, 13 supported prefixes, 0 replay/soundness alarms.
> **Decision:** Maximum per-step current hard-pruning passes both exact-DEAD P00009 prefixes and matching exact-LIVE siblings, leaving two same-endpoint/depth mixed-fate groups on ONE independent portal-free parent. Two P00148 exact-DEAD prefixes are already rejected by PRUNE_SURROUND_LB at raw depth 8. No LIVE prefix was falsely rejected. This nominates a nonredundant decision opportunity, not an earned switch theorem or treatment.
> **Remaining gate:** At P00009's two literal LIVE/DEAD prefix groups, test the smallest sound CURRENT-STATE flipper-aware trail/switch necessary discriminator beyond existing hard prunes and estimate actual retained descendant work; abstain on unsupported mechanics and require independent parent confirmation before any cold A/B. Do not build a full ZDD/search-object engine from these selected examples.
> **Research question:** `WS2-TRAIL-SWITCH-FEASIBILITY`
> **Evidence role:** forensic
> **Selection:** Existing exact-labelled topology-fork sets in full, deduplicated by corpus+level+full path, prior to reading gauntlet results; portal-bearing levels entirely abstain regardless of label. This is intentionally retrospective enriched evidence, not outcome-blind generalization.
> **Population identity:** All 28 retained CP-SAT topology-fork observations in three exact-labelled reports (25 distinct board+prefix identities across seven independent published parents), with portal-bearing boards excluded from the ordinary-route test; 13 supported distinct prefixes across four parents.
> **Inference scope:** Optimistic all-steps connectedness/full-gauntlet opportunity census on already-labelled selected prefixes, not new switch-only proof, normal production scheduled exposure, population prevalence, or cold solve gain.
> **Production effect:** none.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"inconclusive","lastEvidenceDate":"2026-10-17","decision":"Maximum per-step current hard-pruning passes both exact-DEAD P00009 prefixes and matching exact-LIVE siblings, leaving two same-endpoint/depth mixed-fate groups on ONE independent portal-free parent. Two P00148 exact-DEAD prefixes are already rejected by PRUNE_SURROUND_LB at raw depth 8. No LIVE prefix was falsely rejected. This nominates a nonredundant decision opportunity, not an earned switch theorem or treatment.","remainingGate":"At P00009's two literal LIVE/DEAD prefix groups, test the smallest sound CURRENT-STATE flipper-aware trail/switch necessary discriminator beyond existing hard prunes and estimate actual retained descendant work; abstain on unsupported mechanics and require independent parent confirmation before any cold A/B. Do not build a full ZDD/search-object engine from these selected examples.","joins":{"researchQuestion":"WS2-TRAIL-SWITCH-FEASIBILITY","premiseRefs":["P032","P157","P163","P198","P204"],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":"All 28 retained CP-SAT topology-fork observations in three exact-labelled reports (25 distinct board+prefix identities across seven independent published parents), with portal-bearing boards excluded from the ordinary-route test; 13 supported distinct prefixes across four parents.","selection":"Existing exact-labelled topology-fork sets in full, deduplicated by corpus+level+full path, prior to reading gauntlet results; portal-bearing levels entirely abstain regardless of label. This is intentionally retrospective enriched evidence, not outcome-blind generalization.","inferenceScope":"Optimistic all-steps connectedness/full-gauntlet opportunity census on already-labelled selected prefixes, not new switch-only proof, normal production scheduled exposure, population prevalence, or cold solve gain."},"claimRefs":[],"sourceArtifacts":["reports/stress/pg-d-exact-fork-max-gauntlet-20261017-001.json","reports/stress/class5-topology-fork-exact-labels-2026-09-16.json","reports/stress/class5-topology-fork-extension-exact-labels-2026-09-17.json","reports/stress/class5-topology-fork-replication-exact-labels-2026-09-16.json"],"successors":{"questions":["WS2-TRAIL-SWITCH-FEASIBILITY","WS2-TOPOLOGY-COMPLETION-REGIME-SUCCESSOR"],"artifacts":[]},"prospective":{"expectation":"Existing maximal current hard pruning may leave genuinely opposite-fate ordinary-prefix states for a future switch necessary-condition proof.","surprise":"Both P00009 DEAD prefixes survive maximal scheduled checks, whereas P00148 DEAD prefixes are already pruned by surround-bound and thus cannot count as new capability.","anomaly":"Initial machine summary mislabeled any live survivor's parent as a full contrasted-pair survivor; corrected run 39079609236 requires both LIVE and DEAD cases to pass in the same matched group."}} -->

## Why this was worth running

[PG-D 001](2026-10-17-pg-d-canonical-switch-referee-result-001.md) proved that the independent ordinary edge-set/switch-route structure accepted all 1,020 actual referee-approved whole routes it was exposed to. It **did not** prove there are early DEAD prefixes for which the structure reveals a novel current-input contradiction.

A useful immediate discriminator is therefore to ask: of the historically proved LIVE/DEAD topology forks, which remain indistinguishable by current *already-shipped* necessary checks at their actual states? Existing exact labels nominate the forensic test and must never leak into a cold solver; the ordinary-only consumer must abstain on any puzzle with portals, including portal boards whose *current prefix* has not yet jumped.

The single-purpose [read-only script](../scripts/stress/pg-d-exact-fork-max-gauntlet.mjs) loads three complete frozen CP-SAT reference tables. It asserts their alarms=0, reconciles 28 source rows into 25 unique paths (three identical aliases), replays every supported prefix using current canonical solver state transitions, and calls the **shared hard-prune pipeline with connectivity=true after every move**. That is a deliberately *stronger schedule* than many actual search stages execute and is used only to bound remaining opportunity. It also reads existing BC1 and BC1-VX structural facts, reporting those descriptively without changing the verdict.

## Observations

| Measure | Source-matched result |
|---|---:|
| Exact-labelled source rows / distinct full prefixes / independent parents | 28 / 25 / 7 |
| Portal-bearing puzzle prefixes excluded | 12 |
| Supported, replayable portal-free full prefixes / independent parents | 13 / 4 |
| Supported exact LIVE / DEAD labels | 9 / 4 |
| LIVE prefixes rejected at any replay step | **0** |
| DEAD prefixes rejected by maximal current gauntlet | **2 / 4** |
| DEAD prefixes never rejected, even with connectivity at every step | **2 / 4** |
| Exactly matched opposite-fate endpoint+depth groups where **both** sides pass | **2 groups, one parent: P00009** |
| Correctness/replay/input alarms | **0** |

Two important pairwise contrasts are direct rather than extrapolated:

| Board / exact cases | LIVE (current gauntlet) | DEAD (current gauntlet) | Structural details |
|---|---|---|---|
| P00009 at endpoint (7,7), raw depth 5 | `P00009-w1-A1-B5-original` PASS | `P00009-w1-A1-B5-alternate` PASS | No portal; BC1 bridge and vertex conflict both false; `strandedFresh` 1 vs 3 but neither is a proven reject |
| P00009 at endpoint (7,6), raw depth 6 | `P00009-w1-A0-B6-original` PASS | `P00009-w1-A0-B6-alternate` PASS | No portal; BC1 bridge and vertex conflict both false; `strandedFresh` 1 vs 7 but neither is a proven reject |
| P00148 at endpoint (2,4), raw depth 10 | one LIVE PASS | two DEAD already REJECT | Both DEAD were rejected by `PRUNE_SURROUND_LB` at raw depth 8, so a later trail predicate would be redundant |

P00009's source mechanics matter. It is 7×7, requires 30 ordinary steps and two intersections, includes nine blocks and four flipping filters, and has **no portals**. Consequently ordinary edge/axis switch constraints remain a sound geometric skeleton, but a useful future impossibility discriminator may need flipper-history conditions; switch connectivity alone is not guaranteed to discriminate the two observed fates. P00148 is a 5×5 landmark-bearing board with no portals; its DEAD branches are already excluded by normal surround reasoning.

The supported four-parent / thirteen-prefix set contains many originally selected repeated paths, so **independence is four parents overall and just one parent with paired opposite-fate survivors**. Neither two contrasts nor 13 path rows establish prevalence or independent confirmation.

## Controls and provenance

Decision-bearing green [run 39079609236](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39079609236), source `4a12f5268196cab5c1741a74e4745b1cb152d34f`, raw artifact `12117574028` `pg-d-exact-fork-max-gauntlet-20261017`, ZIP digest `sha256:064e25b2b83d7c699ae23ae10cb5b089ccdea46a1a54071e3ee32ab8f559b5b3`. Full per-prefix gauntlet and BC1/vertex diagnostics, all unsupported-case IDs, selection and reference source file SHA-256 values are in [the machine verdict](stress/pg-d-exact-fork-max-gauntlet-20261017-001.json).

Earlier successful observer [39079475792](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39079475792) had identical underlying 13 prefix observations but its summary erroneously named P00148 as a *paired-fate survivor* because only the LIVE counterpart passed. The corrected run requires **both** a LIVE and DEAD matching endpoint/depth group to pass and correctly names **P00009 alone**. Do not promote the old broad summary.

## Stop and successor

This was **an exposure survey, not a switch-family success**. A hypothetical exact SAT/ZDD recomputation is not justified just because the existing prunes miss two known DEAD prefixes; other coupled mechanics may explain impossibility and a sound cheap current-state test may not exist.

The smallest useful next test is a bounded model of ordinary H/V switch transitions **plus the four flipping-filter state constraints** on P00009's two fixed pairs, checked against the canonical referee and existing gauntlet. It should seek a necessary `NO` for each DEAD while abstaining or remaining feasible for each LIVE, without using the retained exact labels to derive its runtime facts. If no such sound extra inference appears, stop this P00009 formulation rather than expanding a solver architecture. A positive development witness would still require separate independent parents, actual search participation and saved-work economics before a production A/B. No new cold solve or production code resulted here.

The one-shot experiment workflow is retired before evidence integration; this reproducible observer remains offline-only.
