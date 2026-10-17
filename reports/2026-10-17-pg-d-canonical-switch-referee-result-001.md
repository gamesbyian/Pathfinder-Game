# PG-D canonical-referee trail-switch differential result 001

> **Status:** concluded-positive
> **Last evidence:** 2026-10-17 — [successful run 39078826165](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39078826165), exact head `ad45eab14aa87682e8ac41bceb736c400dd75037`, referee/independent trail comparison complete.
> **Decision:** One-sided canonical referee differential accepted all 1,020 all-ordinary paths, including 957 crossing/revisit witnesses, with 0 static false rejects and 0/1,020 negative-control mismatches; 935 nonordinary routes explicitly abstained. This earns a bounded representation correctness bridge but no pruning consumer.
> **Remaining gate:** Find one referee/exact-backed real search prefix with a switch-derived necessary impossibility not already caught by the present parity/connectivity/BC1 gauntlet and with measurable downstream work; otherwise close incremental route consumer as redundant. Do not build a frontier/ZDD engine from whole-solution consistency alone.
> **Research question:** `WS2-TRAIL-SWITCH-FEASIBILITY`
> **Evidence role:** discovery
> **Selection:** Deterministic first-N corpus-order development slice with up to first three existing hint paths per board; each path revalidated by the independent canonical referee before static assessment.
> **Population identity:** All 160 published levels and first 500 Corpus-2 levels by file order (660 parents), up to three stored-hint candidates per board: 1,955 native-referee-approved paths, 1,020 all-ordinary transitions and 935 nonordinary/portal paths unsupported by this reduction.
> **Inference scope:** Necessary edge-simple straight-through switch-route invariant on existing accepted whole solutions with ordinary moves only; no prevalence, new DEAD-prefix pruning, work saving or production cold-solve benefit.
> **Production effect:** none.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-10-17","decision":"One-sided canonical referee differential accepted all 1,020 all-ordinary paths, including 957 crossing/revisit witnesses, with 0 static false rejects and 0/1,020 negative-control mismatches; 935 nonordinary routes explicitly abstained. This earns a bounded representation correctness bridge but no pruning consumer.","remainingGate":"Find one referee/exact-backed real search prefix with a switch-derived necessary impossibility not already caught by the present parity/connectivity/BC1 gauntlet and with measurable downstream work; otherwise close incremental route consumer as redundant. Do not build a frontier/ZDD engine from whole-solution consistency alone.","joins":{"researchQuestion":"WS2-TRAIL-SWITCH-FEASIBILITY","premiseRefs":["P032","P157","P163","P198","P204"],"measurementOpportunity":null},"evidenceRole":"discovery","scope":{"populationIdentity":"All 160 published levels and first 500 Corpus-2 levels by file order (660 parents), up to three stored-hint candidates per board: 1,955 native-referee-approved paths, 1,020 all-ordinary transitions and 935 nonordinary/portal paths unsupported by this reduction.","selection":"Deterministic first-N corpus-order development slice with up to first three existing hint paths per board; each path revalidated by the independent canonical referee before static assessment.","inferenceScope":"Necessary edge-simple straight-through switch-route invariant on existing accepted whole solutions with ordinary moves only; no prevalence, new DEAD-prefix pruning, work saving or production cold-solve benefit."},"claimRefs":[],"sourceArtifacts":["reports/stress/pg-d-canonical-trail-switch-referee-20261017-001.json","scripts/stress/pg-d-canonical-referee-trail-switch.mjs"],"successors":{"questions":["WS2-TRAIL-SWITCH-FEASIBILITY","WS2-TOPOLOGY-COMPLETION-REGIME-SUCCESSOR"],"artifacts":[]},"prospective":{"expectation":"Ordinary complete Pathfinder routes should be edge-simple with degree-four straight H/V pairing and no independent unused switch strands.","surprise":"The property survives 1,020 actual referee-approved routes including 957 paths revisiting at least one vertex, with 935 other paths properly excluded.","anomaly":"Initial one-shot run rejected self-test argument handling before scientific evaluation; corrected second run is the sole decision-bearing evidence."}} -->

## Source identity and methodology

The pre-registered [PG-D differential](2026-10-17-pg-d-canonical-switch-referee-preflight-001.md) used the maintained `readLevelCorpusDocumentWithHints` and `prepareLevelForSolver` boundaries, then the actual `validateCanonicalPath` PLAY referee on every selected retained solution path. All accepted paths with entirely unit-orthogonal moves were projected into a **separate** graph-based edge subset verifier. The candidate switch-route can accept a path only when:

- every ordinary edge is used at most once;
- the gate and goal have degree one, and other visited vertices have degree two or four;
- every degree-four vertex pairs two horizontal and two vertical edges into two straight passages;
- tracing those pairings from the gate reaches the goal and consumes **all** selected edges, rather than accidentally admitting an extra disconnected switch-strand cycle.

The verifier is source-distinct from the native PLAY referee: it does not call the legal-move or per-axis transition evaluator for its accepted-path classification. All 935 accepted paths with non-ordinary transitions, including portal jumps, are marked `UNSUPPORTED`; they are not false prunes. Another 1,020 repeated-edge deliberate mutations are checked with both models as negative controls. A source hash identifies each corpus; cases and examples are captured in the [machine ledger](stress/pg-d-canonical-trail-switch-referee-20261017-001.json).

The original 903 tiny restricted-model matches remain independently documented in [the toy report](2026-10-15-trail-transition-system-prior-art-and-toy-falsifier.md); these **new** counts refer only to actual referee-validated game paths.

## Measured result

| Measure | Published (160 levels) | Corpus-2 first 500 | Total |
|---|---:|---:|---:|
| Existing candidate hint paths passing native referee | 473 | 1,482 | **1,955** |
| Fully ordinary transitions, all passing static switch-route | 374 | 646 | **1,020** |
| Referee-accepted paths with unsupported non-ordinary transitions | 99 | 836 | **935** |
| Fully ordinary paths with at least one crossing/revisit | 314 | 643 | **957** |
| Static false rejects among the 1,020 accepted ordinary paths | 0 | 0 | **0** |
| Deliberate ordinary edge-reuse controls rejected by both methods | 374 | 646 | **1,020** |
| Negative-control disagreements | 0 | 0 | **0** |

All 660 selected boards had at least one recorded hint path. None of the first three supplied paths per board failed canonical validation. The Corpus-2 subset is file-order selected, not sampled independently to estimate population rates. Even within a board, multiple saved paths can share trajectory features; **1,020 paths are not 1,020 independent puzzle parents**.

Green run: [39078826165](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39078826165), source head `ad45eab14aa87682e8ac41bceb736c400dd75037`, artifact `12118370698` (`pg-d-referee-trail-switch-20261017`, ZIP digest `sha256:b9e76e8c1bde7ed2b6874f5be28b02227a7c69087c91b9c06d2551a22b8b8716`). Source corpora SHA-256 and ordinary/crossing/unsupported examples are in the machine evidence. The initial run 39078716122 never reached the scientific test because the self-test mistakenly demanded an `--out` argument; it cannot be used as evidence of success or failure.

## What has and has not been earned

This result provides **a one-sided, actual-game necessary invariant** on existing complete portal-free trajectories, including unusually strong exposure to true crossings. It is stronger than a same-implementation internal test, because the graph-set/pairing evaluator and game-state referee are independently implemented. It does **not** establish exact equivalence of every abstract SAT route to a legal Pathfinder solution, handle portal jumps or prove soundness for every possible future branch. It also does not show that the current solver misses this condition: dynamic move legality already rejects repeated axis entries, and existing BC1 connectivity/bridge-volume inference may subsume useful instances.

The next meaningful test is a **decision-bearing real prefix**, not another sweep of already accepted paths. On a previously frozen exact LIVE/DEAD contrast, discover a current-input **necessary** switch-route consequence that rejects an exactly DEAD branch left viable by the present hard-prune gauntlet, without rejecting a known LIVE sibling. It must be observable before the later wasted search work, price its construction cost, and retain unsupported/unknown as abstention. The retained topology-fork and PG-N exact-fate collision corpora offer starting *case identities*, but no hint, label, ancestor geometry or preselected solver outcome may become a cold runtime signal.

No new cold solve is claimed; no existing production solver, flags, budgets, hint storage or schedule changed. Retire the completed one-shot workflow before integrating this evidence.
