# PG-J exact P00137 prefix-state hard-prune microscope 003 (2026-10-18)

> **Status:** concluded-negative
> **Last evidence:** 2026-10-18 — source-identified [one-shot run 39177416485](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39177416485), exact execution SHA `0b68beaf7e4cf23df0fec9fbd073ab8e4297e22e`
> **Decision:** All four frozen P00137 exact-reference prefixes replay legally through the canonical solver move state and all tested gauntlet stages; no recorded LIVE or DEAD prefix is rejected, and each opposing-fate pair has identical remaining length, objective masks and must-pass/must-cross lower bounds. Existing full prefix-state bounds do not discriminate these selected DEAD futures.
> **Remaining gate:** A materially new path-history-sensitive necessary condition must separate at least one existing exact-DEAD P00137 prefix from its paired LIVE witness, preserve known valid paths, and exhibit nontrivial retained descendant-work opportunity before a solver consumer or cold A/B.
> **Research question:** `WS2-TOPOLOGY-COMPLETION-REGIME-SUCCESSOR`
> **Evidence role:** forensic
> **Selection:** all four selected original P00137 exact prefixes, including two LIVE and two DEAD, at depths 9 and 10; not a representative puzzle sample
> **Population identity:** All four exact-reference P00137 prefixes from frozen topology-fork original/extension/replication source corpus data/levels.json, one independent human parent.
> **Inference scope:** current-source canonical prefix replay on the existing exact-fate counterexamples, not exhaustive proof of search loss, broad work opportunity, or production gain
> **Production effect:** none

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-negative","lastEvidenceDate":"2026-10-18","decision":"All four frozen P00137 exact-reference prefixes replay legally through the canonical solver move state and all tested gauntlet stages; no recorded LIVE or DEAD prefix is rejected, and each opposing-fate pair has identical remaining length, objective masks and must-pass/must-cross lower bounds. Existing full prefix-state bounds do not discriminate these selected DEAD futures.","remainingGate":"A materially new path-history-sensitive necessary condition must separate at least one existing exact-DEAD P00137 prefix from its paired LIVE witness, preserve known valid paths, and exhibit nontrivial retained descendant-work opportunity before a solver consumer or cold A/B.","joins":{"researchQuestion":"WS2-TOPOLOGY-COMPLETION-REGIME-SUCCESSOR","premiseRefs":["P198","P204"],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":"All four exact-reference P00137 prefixes from frozen topology-fork original/extension/replication source corpus data/levels.json, one independent human parent.","selection":"source-frozen, exact-fate-selected P00137 opposite-fate pair at two consecutive raw depths; four legal prefixes, one independent level","inferenceScope":"canonical prefix replay and existing hard-prune nonrejection on one selected historical human parent; no cold production solves or generalization"},"claimRefs":[],"sourceArtifacts":["reports/stress/pg-j-p00137-authoritative-mechanic-replay-20261018.json","scripts/stress/pg-j-exact-prefix-mechanic-replay.mjs"],"successors":{"questions":["WS2-TOPOLOGY-COMPLETION-REGIME-SUCCESSOR"],"artifacts":[]},"prospective":{"expectation":"Existing mechanic-aware hard-prune or obligation lower bound might already distinguish the exact DEAD from LIVE counterpart","surprise":"All 38 prefix transitions are legal and pass gauntlet, with exactly matched objective lower bounds in each opposing-fate pair","anomaly":null}} -->

## Method and exact source

After the geometry-only [PG-J 002](2026-10-18-pg-j-residual-leaf-goal-interface-result-002.md) retained an opposing-fate `P00137` signature collision, this cheapest *mechanic-authentic* replay asks whether an **existing** solver rule already rejects the DEAD path history without rejecting the corresponding exact-LIVE history.

The bounded `scripts/stress/pg-j-exact-prefix-mechanic-replay.mjs` reads **all four** P00137 prefixes from the three original/extension/replication oracle-provenance files and the canonical `data/levels.json`, asserting both two LIVE and two DEAD labels and the original zero reference alarms. Each prefix is replayed from the gate using actual `createState`, `getNeighbors`, `applyMove` (with real portal detection), `getRealLengthFromState`, `mustPassLowerBound`, `mustCrossLowerBound`, and diagnostic `evaluatePrunedMove` with connectivity enabled. Exact labels are attached **after** the state replay, not used to select moves or gate semantics. No historical hints or saved solutions are exposed to a cold production solver.

Execution source: `0b68beaf7e4cf23df0fec9fbd073ab8e4297e22e`; [run 39177416485](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39177416485), artifact ID `12155295541`. Original ZIP SHA256 `0b3e9ef18180def935816b9675ec4e679804b0883cc28505261a698e9c299473`; `verdict.json` SHA256 `e2d54f7fdc0090cb9aca516b72827edab35c74655182a66d69f9b1763c133c64`. Compact checked provenance and per-case values are preserved in [machine summary](stress/pg-j-p00137-authoritative-mechanic-replay-20261018.json). Full 38-transition event evidence remains in the Actions artifact, and the one-shot workflow was retired after successful execution.

## Exact resulting contrast

| Pair | Exact result | Remaining steps | MP lower bound | MC lower bound | Full prefix legal? | Any gauntlet rejection? |
| --- | --- | ---: | ---: | ---: | --- | --- |
| B9 original | LIVE | 24 | 13 | 13 | yes | no |
| B9 alternate | DEAD | 24 | 13 | 13 | yes | no |
| B10 original | LIVE | 23 | 11 | 12 | yes | no |
| B10 alternate | DEAD | 23 | 11 | 12 | yes | no |

Both pairs also agree on the exact current endpoint, real counted length, zero incurred intersections, `mustCrossMask=1`, `mpVisitedMask=0`, no used flippers and zero portal jumps. All 38 replayed moves were enumerated by canonical `getNeighbors`. All 38 artificial per-step post-move prune evaluations returned `pass`, with no recorded rejection stage. These evaluations were performed retrospectively at *every* path transition; they do not establish what a live beam would have chosen to visit, nor its precise scheduling of connectivity checks.

The important distinction is **prefix-state source equivalence under the inspected scalar bounds**, not equivalence of full states. Their occupied cells and previously used edge axes differ. Thus no result here establishes that the two prefixes share possible futures. Quite the opposite: the source CP-SAT reference records **opposite exact completion fate**. A key that forgets history merges an actually impossible continuation with a feasible one.

The test **closes** the easy explanation “existing hard-prune machinery already separates this P00137 fork and only the reporting abstraction was defective.” It does **not** prove the solver lacks any imaginable cheap history-aware necessary condition; nor does failure to reject one exact-DEAD prefix demonstrate a correctness defect. Sound pruning is permitted to be incomplete.

## Decision and next smallest falsifier

Do **not** add another lossy articulation/leaf/distance scalar, emit a global DEAD key, expand a generic graph decomposition engine, or lower fidelity requirements to claim a gain. The next effort would need a *specific mechanically valid* admissible consequence conditioned on used axes/edges or accumulated path commitments, beyond current static MP/MC lower bounds. Candidate derivations must preserve all four source prefix outcomes (and additional accepted paths), and a read-only beam/repair observer must first show significant downstream parent work under the candidate's exact real-search trigger regime. No CP-SAT rerun is necessary for these already exact-labelled cases.

The reported canonical work of 117 and 130 for depth-9/depth-10 offline repeated prune probes is **measurement overhead**, not a production solve cost or estimated savings. The historical P00137 exact cohort contains **one independent parent**. Nothing here establishes a new cold solve, a 250k-budget improvement, or permission for production hard pruning.
