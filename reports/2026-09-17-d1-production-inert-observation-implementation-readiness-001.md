# D1 production-inert observation implementation readiness 001

> **Status:** active
> **Last evidence:** 2026-09-17 — branch implementation on top of the canonical-work correction from PR #1867.
> **Decision:** the D1 gate now has a two-phase execution path that freezes real beam decisions and eligibility before exact annotation. No D1 result is visible to search. The next legitimate action is a bounded development canary, not an independent pilot.
> **Remaining gate:** execute the canary below, inspect parity/eligibility/query support/work attribution, and only then decide whether an independent multi-parent pilot is warranted.

## What is implemented

### Capture phase

`npm run solver:capture-d1-decisions`:

- runs an observer-OFF beam control;
- reruns the same beam attempt with research observation enabled;
- hard-fails any path, node-count, or canonical-`workSpent` parity change;
- records actual cull ranked pools and retained/culled candidates through the shared decision-observation contract;
- freezes D1 eligibility before any exact label/query is available;
- records exact one-generation canonical expansion work for retained candidates when observed in the next frontier expansion;
- uses parent level as the independent unit;
- verifies the selected beam tuple is present in the current production attempt policy for the parent;
- is intentionally development-only because isolated beam execution does not reproduce full orchestration reach/allocation.

The frozen eligibility predicate is:

1. an actual beam cull decision occurred;
2. candidate rank lies within the fixed `beamWidth ± cutoffRadius` window;
3. the candidate still has a positive remaining intersection deficit;
4. the candidate path contains at least one nontrivial already-visited cell that can be individually pinned for a revisit query;
5. the same decision contains at least one eligible retained and one eligible culled candidate.

This is a decision-opportunity predicate, not a LIVE/DEAD classifier.

### Annotation phase

`npm run solver:annotate-d1-decisions`:

- consumes only the frozen capture artifact;
- reconstructs exactly the predeclared candidate path and eligible revisit cells;
- asks the existing CP-SAT explicit-prefix probe whether each individual revisit can still be realized;
- referee-validates every claimed feasible witness;
- records `NONZERO` when at least one pinned revisit is soundly feasible;
- records `ZERO` only when every eligible pinned revisit is exactly infeasible;
- records `UNKNOWN` for timeout/abstention/incomplete support;
- records exact-query wall time only as information-production cost;
- never equates oracle wall time with solver `workSpent`;
- refuses post-capture decision caps for `independent-confirmation` evidence.

## Immediate expansion-work semantics

The branch adds an opt-in beam-research field only.

For each incoming frontier node, canonical work is sampled **after** replaying that node into the mutable beam working state and again after evaluating/generating its one-generation children. The difference is therefore the work causally charged to that node's immediate expansion, excluding tree-order replay/reposition overhead.

This is intentionally a bounded lower-horizon economics measure. It does not claim all later descendant work belongs uniquely to the retained candidate.

## Stage-1 development canary

Use `R03147` only as development/schema material, consistent with the existing preflight.

First inspect the currently configured beam choices for the development parent:

```text
npm run solver:capture-d1-decisions -- --levels=R03147 --list-configured-beams
```

Choose one returned tuple and capture a deterministic bounded slice:

```text
npm run solver:capture-d1-decisions -- --levels=R03147 --evidence-role=development --profile=<profile> --width=<width> --mechanic-bucket-retention=<true|false> --cutoff-radius=2 --pause-after-phases=<N> --out=/tmp/d1-r03147-capture.json
```

Annotate at most the first three already-frozen eligible decisions:

```text
npm run solver:annotate-d1-decisions -- --input=/tmp/d1-r03147-capture.json --time-limit=45 --max-eligible-decisions=3 --out=/tmp/d1-r03147-annotated.json
```

The cap is permitted only because this is a development canary. It must not be used to make a D1 prevalence or confirmation claim.

## Canary acceptance

Stage 1 passes only if:

- OFF/ON path parity is exact;
- OFF/ON node count is exact;
- OFF/ON canonical `workSpent` is exact;
- at least one real cull decision is reconstructed with rank, cutoff, intersection state and retain/reject outcome;
- the fixed eligibility predicate can be evaluated without oracle results;
- eligible retained candidates either have measured immediate expansion work or an explicit reason they were never expanded before termination;
- exact annotation yields only `ZERO`, `NONZERO`, or neutral `UNKNOWN`;
- every `NONZERO` claim has a referee-valid witness;
- exact-query cost is recorded separately from solver work;
- no production policy/ranking/retention surface reads any D1 annotation.

A canary with zero eligible decisions is a valid tooling result but does not justify changing the predicate after seeing D1 outcomes. The next step would be to reconsider the predeclared opportunity population or execution family using only pre-annotation facts.

## Independent-pilot boundary

Do not start Stage 2 merely because the tooling works.

Before an independent pilot, this implementation needs one more execution-layer extension: D1 observation must be attached to full production orchestration, or joined to authoritative stage-reach/allocation telemetry strongly enough to establish that the observed beam decisions were actually reached under the production budget ladder. Only then should the program select multiple parents deterministically, exclude prior D1 development parents, freeze the exact population/protocol, annotate all frozen eligible decisions, and cluster inference by parent.

The Stage-2 advancement question remains the one in `docs/solver-d1-production-inert-evidence-preflight.md`: whether D1 repeatedly disagrees with real production retention near the cutoff and whether the resulting capability/work envelope can plausibly pay for the information.

## What this branch does not do

- no live D1 ranking;
- no D1 pruning;
- no proxy fitting;
- no orchestration-reach claim;
- no independent-support claim;
- no claim that one-generation expansion work equals full descendant work;
- no automatic Stage-2 expansion.
