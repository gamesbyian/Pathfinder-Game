# PG-D ordinary flipper-route necessary-condition screen 003

> **Status:** concluded-negative
> **Last evidence:** 2026-10-18 — green read-only [run 39108935695](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39108935695) at source `dd13ba054264af55182aa513108efbb748dfa539`, artifact `12129448017`, exact source hashes and full 13-case ledger preserved in [machine verdict](stress/pg-d-flipper-automaton-relaxation-20261018-001.json).
> **Decision:** Neither the history-free flipper automaton nor its frozen-used-axis refinement rejects any of four reference-DEAD portal-free prefixes; both preserve all nine LIVE controls. The tested P00009 mixed-fate contrasts remain indistinguishable to these abstract route-existence screens, so stop this exact formulation.
> **Remaining gate:** Do not repeat a memoryless flipper-route or frozen-history route-existence test unchanged. A new PG-D premise needs a cheap sound inference involving dynamic future edge-axis use, required intersections and/or combined flipper obligations, plus measured post-prefix work and independent-parent opportunity before any production consumer.
> **Research question:** `WS2-TRAIL-SWITCH-FEASIBILITY`
> **Evidence role:** forensic
> **Selection:** Frozen complete topology-fork source tables, literal path deduplication and portal-only support abstention; no sample chosen based on flipper screen outcomes. P00009's two exact mixed-fate contrasts had been selected before this test.
> **Population identity:** All 28 retained CP-SAT topology-fork observations in three exact-labelled reports (25 unique board+prefix identities), with 12 portal-bearing prefixes excluded and 13 ordinary prefixes across four independent parents tested; four P00009 matched LIVE/DEAD cases define two development contrasts.
> **Inference scope:** Read-only, over-permissive finite-state flipper/axis route-existence screens at exact remaining ordinary length, with optional immutable used-axis restrictions from the existing prefix; no inference about more expressive path-history predicates, production work savings, independent prevalence or cold solves.
> **Production effect:** none.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-negative","lastEvidenceDate":"2026-10-18","decision":"Neither the history-free flipper automaton nor its frozen-used-axis refinement rejects any of four reference-DEAD portal-free prefixes; both preserve all nine LIVE controls. The tested P00009 mixed-fate contrasts remain indistinguishable to these abstract route-existence screens, so stop this exact formulation.","remainingGate":"Do not repeat a memoryless flipper-route or frozen-history route-existence test unchanged. A new PG-D premise needs a cheap sound inference involving dynamic future edge-axis use, required intersections and/or combined flipper obligations, plus measured post-prefix work and independent-parent opportunity before any production consumer.","joins":{"researchQuestion":"WS2-TRAIL-SWITCH-FEASIBILITY","premiseRefs":["P032","P157","P163","P198","P204"],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":"All 28 retained CP-SAT topology-fork observations in three exact-labelled reports (25 unique board+prefix identities), with 12 portal-bearing prefixes excluded and 13 ordinary prefixes across four independent parents tested; four P00009 matched LIVE/DEAD cases define two development contrasts.","selection":"Frozen complete topology-fork source tables, literal path deduplication and portal-only support abstention; no sample chosen based on flipper screen outcomes. P00009's two exact mixed-fate contrasts had been selected before this test.","inferenceScope":"Read-only, over-permissive finite-state flipper/axis route-existence screens at exact remaining ordinary length, with optional immutable used-axis restrictions from the existing prefix; no inference about more expressive path-history predicates, production work savings, independent prevalence or cold solves."},"claimRefs":[],"sourceArtifacts":["reports/stress/pg-d-flipper-automaton-relaxation-20261018-001.json","reports/stress/pg-d-exact-fork-max-gauntlet-20261017-001.json","scripts/stress/pg-d-flipper-automaton-relaxation.mjs"],"successors":{"questions":["WS2-TRAIL-SWITCH-FEASIBILITY","WS2-TOPOLOGY-COMPLETION-REGIME-SUCCESSOR"],"artifacts":[]},"prospective":{"expectation":"Adding global-flipper-use parity and the path's existing consumed-axis resource constraints might eliminate an exact-DEAD P00009 route unavailable to scalar goal/parity/BC1 pruning.","surprise":"Neither relaxation rejected a DEAD case; the two raw-depth-six exact siblings share the same position, incoming axis, flipper mask and counted remaining steps, so the history-free automaton literally cannot differentiate them.","anomaly":null}} -->

## Why this test, and what it does not do

[PG-D 002](2026-10-17-pg-d-exact-fork-max-prune-opportunity-002.md) found exactly two P00009 matched, opposite-fate LIVE/DEAD prefix groups that **all survive the entire present hard-prune gauntlet with connectivity evaluated at every step**. P00009 is a 7×7 portal-free board with four flipping filters, two required intersections and 30 counted moves. The source prefixes and exact fates were frozen by the older CP-SAT topology-fork experiments, not generated for this automaton.

The new independent offline observer uses existing `prep.staticNeighborKeys` for each ordinary move. It tests exact remaining number of moves until reaching the goal, incoming H/V direction, and the real global flipping-filter used-mask and orientation rule, including straight travel through each flipper and prohibition of a repeated flipper visit. It **deliberately forgets new future edge-axis consumption, path visits, crossing/intersection count and outstanding coupled obligations**. Therefore any true continuation is included among the abstract routes, but a route reported possible is not a real solution.

A second strictly stronger arm also forbids future entry via any target-axis bit **already consumed in the original search prefix**. Real axis-use bits never become unconsumed, so this is an admissible restriction. It still forgets **future** axis consumption. Both arms are candidate necessary-condition screens, not exact search or potential automatic hard prunes until a useful `NO` appears. All portal-bearing levels abstain.

## Independent reference check

The run reconciled three retained CP-SAT tables: **28 exact-labelled source rows, 25 distinct prefixes, three identical aliases**. Twelve portal-bearing prefixes abstained. Of the **13 replay-valid ordinary prefixes from four independent parent puzzles**, nine are exact LIVE and four are exact DEAD. The observer replays all supported inputs through the production `createState/getNeighbors/applyMove` transitions and raises an alarm if either over-permissive screen rejects any known LIVE prefix.

| Measure | History-free flipper DP | Frozen original axis history + flipper DP |
|---|---:|---:|
| Supported exact LIVE | 9/9 still abstractly completable | 9/9 |
| Supported exact DEAD rejected | **0/4** | **0/4** |
| P00009 matched exact DEAD rejected | **0/2** | **0/2** |
| Replay/soundness alarms | 0 | 0 |

P00009's four cases, using terminal abstract-state count as a descriptive measure (not independent solution paths):

| Original exact prefix | Oracle | Raw depth | Entry axis | History-free terminal states | Frozen-axis terminal states |
|---|---|---:|---|---:|---:|
| `P00009-w1-A1-B5-original` | LIVE | 5 | H | 10 | 10 |
| `P00009-w1-A1-B5-alternate` | DEAD | 5 | V | 10 | 6 |
| `P00009-w1-A0-B6-original` | LIVE | 6 | V | 10 | 10 |
| `P00009-w1-A0-B6-alternate` | DEAD | 6 | V | 10 | 5 |

All four have a zero flipper-used mask at capture. The depth-six LIVE and DEAD states have **identical endpoint, incoming axis, remaining move count and flipper-used mask**. A route-existence algorithm whose only changing state is those variables must return the same answer for them; this is a state-identity limitation, not an empirical guess. When the prior edge-axis mask is included, the answers differ in counts, but both are still `possible`. Future axis mutations and intersections are exactly the resource-history dimensions still missing.

In the three other ordinary parent puzzles, the same screens also rejected none of the two exact-DEAD cases (P00148), which existing `PRUNE_SURROUND_LB` already rejects earlier, or any LIVE controls. The 13-case negative cannot be generalized into a claim that *all* flipping-filter deductions are useless or that the P00009 prefixes are feasible.

## Interpretation, no further waste

This closes **two** cheap, explicitly defined route-existence formulations on the selected already-unpruned forensic opportunity. It does not close the larger path-history / switch-composition question. A proper next discriminator must use more than a static flipper-parity DP and should be checked against the **actual stage's work incurred beyond the prefix**, not arbitrary parent cost or a CP-SAT label alone.

Before any solver change or new oracle spend, demand a cheap current-state necessary violation that (1) rejects at least one genuinely new exact-DEAD prefix without rejecting exact LIVE controls, (2) has a bounded derivation/lookup cost, and (3) saves significant measured **retained descendant** work. Broaden to independently frozen parent levels only if that targeted test is nonredundant. Retain this script as a reproducible read-only research contract; delete its one-shot workflow after result capture. Neither result earns new cold solves, a flipper prune or a general ZDD/frontier engine.

Reproduce locally:

```bash
node scripts/run-bundled.mjs scripts/stress/pg-d-flipper-automaton-relaxation.mjs -- --self-test
node scripts/run-bundled.mjs scripts/stress/pg-d-flipper-automaton-relaxation.mjs -- --out=tmp/pg-d-flipper/decision.json
```
