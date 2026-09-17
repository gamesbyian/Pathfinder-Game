# Phase 1 premise-map mining: snapshot, method, and boundaries

Status: complete
Date: 2026-09-17
Phase: 1 only
Snapshot: `solver-premise-map-v1-2026-09-17`
Snapshot commit: `e9601ffb8fa304d5ea91d054a9de6cb1bf8ff28e`

## Authority

This mining round is governed by:

- `docs/solver-premise-map-mining-preregistration.md` at the frozen snapshot;
- `docs/solver-premise-map-hardening.md` and `docs/solver-premise-map-hardening-overlay.json` at the frozen snapshot;
- `docs/solver-premise-map-snapshot-v1.json`;
- the Phase-1 execution discipline in `docs/solver-premise-map-mining-execution-plan.md` from PR #1849, which was still open when this run began.

The snapshot manifest freezes 142 propositions and 166 relations across four canonical premise files and three relation files. The snapshot's recorded hardening run `35269390179` passed and reported 20 isolated propositions, full inherited discovery-lineage coverage (142/142), six explicit tensions, four semantic-sibling families, seven implicit defaults, seven asymmetry families, and six ontology stress tests.

## Non-negotiable boundaries

This round does not:

- edit any frozen premise-map input;
- admit or use post-v1 premise candidates as mining input;
- update `docs/solver-optimization-current-queue.md` or any solver queue;
- begin the Phase-2 synthesis questions from the execution plan;
- recursively mine discoveries produced by M1-M12;
- collapse M11 into a weighted priority score;
- treat cross-lens replication as proof, priority, or a new premise.

Each lens was recorded independently before any cross-lens replication index was produced. Later lenses inspected the same frozen inputs and underlying pre-freeze source material as needed, but did not use earlier lens outputs as evidence or as a new search space.

## Evidence discipline

A Phase-1 finding records, where applicable:

1. frozen premise IDs and graph relations;
2. frozen source paths or hardening structures;
3. the observation made by the lens;
4. alternative interpretations;
5. confidence and conditioning variables;
6. a non-admission classification: `DESCRIPTIVE`, `CANDIDATE_NEW_PREMISE`, `RELATION_ONLY`, `SCOPE_SPLIT`, `STALE_AUTHORITY`, or `ONTOLOGY_ISSUE`.

`CANDIDATE_NEW_PREMISE` is only a mining-output classification. It does not create a premise ID and does not alter the frozen map.

## Lens execution order

M1 through M12 were run in preregistered order. The ordering was administrative, not inferential. A later lens did not inherit an earlier lens's discoveries.

The Phase-1 closeout verifies completion, records permitted cross-lens replication, states residual uncertainty, and demonstrates that the stop rule was respected. See `14-phase1-closeout.md`.
