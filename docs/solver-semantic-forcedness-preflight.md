<!-- agent-context-budget: warn=7000 max=9500 -->
# Semantic forcedness / hidden branching preflight

> **Status:** preregistered contingent opportunity-sizing question with production-inert capture/reconcile tooling implemented; no population dispatch or production change authorized.
> **Date:** 2026-09-21.
> **Priority authority:** `solver-optimization-workstreams.md`.
> **Method authority:** `solver-research-operating-model.md`.
> **Closest active work:** `WS2-FORCED-WORK-CAPTURE-ECONOMICS` on PR #1952. Its 25.33% literal one-successor work ceiling now outranks this more expensive semantic census.
> **Question class:** per-instance relational feasibility / bounded information acquisition.
> **Production effect:** none.

## Question

Production search often sees more than one successor after ordinary hard pruning.

But syntactic branching and semantic branching are not the same thing.

The question is:

> **When ordinary production pruning leaves multiple successors, how often is exactly one of those successors actually completable?**

Call such a state **semantically forced** for this experiment.

This is intentionally different from PR #1952's one-successor question:

- #1952 measures **syntactic forcedness**: ordinary hard pruning already leaves one successor.
- This preflight measures **hidden semantic forcedness**: ordinary hard pruning leaves >=2 successors, but exact completion feasibility says only one child remains LIVE.

A high hidden-forcedness work share would mean the solver is spending branch-search work where a stronger bounded inference procedure could, in principle, replace choice with propagation.

A low share would close a broad family of "forced future" ideas before any new propagation/query machinery is built.

## Why ask this now?

Recent audits established several constraints:

- level ingestion and `prepLevel` are too cheap to matter on hard solves;
- repeated exact proof reuse can have high recurrence but negligible removable work;
- exact micro-queries can be strong forensic discriminators yet fail at a real production decision seam;
- dynamic BC1 remains promising specifically because it may eliminate downstream work;
- current research should therefore measure **perfect-information removable-work ceilings before implementation**.

PR #1952 applies this discipline to literal one-successor chains.

This preflight extends the same discipline one semantic step:

> how much current work is attributable to branching that is not mathematically real?

## Semantic contract

For one parent state after the ordinary hard-prune pipeline:

- let the surviving child set be `C`, with `|C| >= 2`;
- ask exact/reference prefix-feasibility independently for every child;
- classify each child as `LIVE`, `DEAD`, or `UNKNOWN`;
- the parent is **exactly semantically forced** only when:
  - exactly one child is `LIVE`;
  - every other child is `DEAD`;
  - there are zero `UNKNOWN` children.

Other outcomes:

- >=2 LIVE: genuinely branching;
- 0 LIVE and all DEAD: semantically dead parent that existing pruning missed;
- any UNKNOWN: unresolved, never counted as forced;
- correctness/referee alarm: invalidate that observation.

This is oracle/reference evidence only. It grants no production authority.

## Existing execution substrate

No new exact solver is needed.

The existing workflow:

`.github/workflows/cpsat-explicit-prefix-reference.yml`

already accepts generic cases of the form:

```json
{
  "levelId": "...",
  "prefix": [...],
  "child": ...
}
```

and:

- runs the existing `cpsat-reference-probe.py`;
- validates every reported LIVE witness with the native PLAY referee;
- preserves DEAD / LIVE / UNKNOWN rather than converting timeout to negative;
- supports broad sharding across independent cases;
- checks population integrity.

The acquisition/reconciliation loop is now implemented on this branch without changing solver internals:

- `scripts/stress/semantic-forcedness-capture.mjs`
- `scripts/stress/semantic-forcedness-lib.mjs`
- `scripts/stress/semantic-forcedness-reconcile.mjs`
- focused synthetic test: `scripts/stress/semantic-forcedness-lib-node-test.mjs`

Package commands:

```bash
npm run research:semantic-forcedness-capture -- ...
npm run research:semantic-forcedness-reconcile -- ...
npm run test:semantic-forcedness
```

The capture uses the existing `includeParentExpansionWork` BeamResearch seam, retains only bounded eligible 2-4-child parent groups, and emits every surviving child as a generic explicit-prefix case. The reconciler joins the reference rows back to parent states and computes the preregistered classifications/rates. It treats missing/UNKNOWN/alarm-bearing child evidence as unresolved.

PR #1952 already consumes the same beam research parent-expansion seam for a different question. Do not modify or depend on its implementation details; reconcile its final frozen parent population before dispatching this experiment.

After #1952 lands, extend or reuse that seam in the smallest separate extractor.

## Population

Do not begin with the entire current residual.

Use the exact frozen parent sample from PR #1952 if it lands unchanged:

`reports/stress/forced-work-prevalence-sample-2026-09-21.json`

This preserves comparability between syntactic and semantic forcedness without selecting parents on the new outcome.

First pilot:

- maximum **16 independent parent levels** from the frozen sample;
- select them mechanically by existing frozen sample order or a prespecified seeded subset;
- within each parent, sample at most **5 multi-successor parent states**;
- require `2 <= survivingChildCount <= 4` for the first pilot;
- sample parent states without using any exact child labels;
- exact-label **every** surviving child of each selected state.

Maximum first-pilot case count:

```
16 parents * 5 parent states * 4 children = 320 exact prefix cases
```

This is intentionally small enough for the existing sharded CP-SAT workflow.

Do not expand merely because cases are available.

## Parent-state selection

The selection must be made from production-inert beam parent-expansion observations.

Preferred eligibility:

1. parent was actually retained and expanded by the unchanged beam search;
2. ordinary hard-prune pipeline leaves 2-4 surviving children;
3. child paths are legal native prefixes;
4. parent is not already a solution;
5. exact-reference model supports the level mechanics;
6. wall deadline did not censor the source beam run.

Within eligible states, use a deterministic rule independent of exact outcomes, for example:

- first eligible state in each of five depth quantile bands; or
- seeded uniform sample of up to five eligible states per parent.

Freeze the rule before child labels are opened.

Do not choose "interesting-looking" branch points after seeing LIVE/DEAD labels.

## Primary oracle-ceiling measurements

For every resolved parent state report:

- surviving child count after ordinary hard prune;
- exact LIVE / DEAD / UNKNOWN counts;
- semantic classification:
  - semantically forced;
  - genuinely branching;
  - semantically dead;
  - unresolved;
- canonical parent-expansion `workSpent`;
- downstream retained-child work if already available without broad new tracing;
- parent depth / remaining length / relevant mechanic tags for descriptive concentration only.

Aggregate at two levels.

### State prevalence

```
semanticallyForcedResolvedStates / allResolvedMultiSuccessorStates
```

This answers whether hidden forcedness exists.

### Work-weighted oracle ceiling

```
sum(parentExpansionWork at semantically forced states)
/
sum(parentExpansionWork at all observed multi-successor states)
```

This is still only a lower-resolution ceiling.

A perfect free oracle could eliminate branch competition below these states, but cannot necessarily remove the parent expansion itself because child generation/state transition may still be needed.

Therefore report this separately from any later descendant-work estimate.

## Secondary measurement: missed-dead parents

A multi-successor parent for which every child is exact-DEAD is also informative.

It means:

> ordinary production reasoning passed the parent, generated multiple apparently viable children, but exact completion says the whole parent was already dead.

Count this separately.

Do not merge it with semantic forcedness.

If common, it nominates stronger pruning rather than forced propagation.

## Critical follow-up only if the first pilot is positive

If semantic forcedness is nontrivial, the next question is not immediately "run CP-SAT during search."

First determine **where the information could come from cheaply**.

For positive states, compare the exact forced child/dead siblings against existing legal current-input facts:

- hard-prune reason margins;
- distance/lower-bound slack;
- obligation feasibility;
- cut/BC1 relations;
- topology/interface facts;
- mechanic-specific forced-neighbor structure;
- score/ranking only as a soft baseline.

Ask whether an already-existing cheap exact/safe reason could have distinguished the children.

Only if no existing reason explains the effect should a new bounded relational query be nominated.

## Admission bands

These are opportunity-sizing gates, not production thresholds.

### Clear negative

Close this semantic-forcedness form if the resolved pilot shows:

- <5% semantically forced states **and**
- <2% work-weighted parent-expansion share **and**
- no recurring independent-parent stratum with materially higher incidence.

Reason: even perfect exact knowledge would have too little target surface to justify new query/propagation machinery.

### Weak / diagnose

Continue only with concentration analysis or one independent replication if:

- 5-20% semantically forced states; or
- 2-10% work-weighted share; or
- result is strongly concentrated in one mechanic/depth regime.

Do not implement.

### Headroom positive

Earn a second-stage economics/consumer study if:

- >=20% of resolved multi-successor states are semantically forced across multiple independent parents; or
- >=10% of observed multi-successor parent-expansion work lies at semantically forced states; or
- smaller aggregate prevalence exposes a recurring high-cost stratum with a large downstream branching reservoir.

A positive here still does **not** authorize exact queries in production.

It only establishes that hidden branching is a real work reservoir.

## Cost interpretation

The CP-SAT cost is **measurement cost**, not a proposed production cost.

D1 already demonstrated why this distinction matters: an exact relational query can be scientifically useful and operationally absurd.

The first pilot asks only whether the target phenomenon exists at enough scale to justify searching for a cheaper current-input consequence.

If the answer is positive, the production question becomes:

> what is the cheapest sound approximation/projection that captures a useful fraction of the exact oracle?

If the answer is negative, stop.

## Relationship to current work

### PR #1952 forced-work prevalence

Complementary.

- #1952: one surviving child after existing hard pruning.
- This preflight: multiple surviving children, exactly one exact-LIVE.

Do not merge the hypotheses or thresholds.

#1952 is now strongly positive: one-successor parents carry 25.33% of measured parent-expansion work on its frozen 64-parent sample. Therefore literal forced-work capture/economics outranks this experiment.

Reopen this semantic census after that successor is disposed, or earlier only if its capture study shows the literal reservoir is mostly unavoidable while hidden semantic branching remains decision-relevant.

### PR #1954 pre-winner action selection

Different computational unit.

- #1954 asks whether whole solver actions before the winner can be avoided.
- This preflight asks whether individual branch decisions inside one search are fake choices.

A positive in either does not imply the other.

### Lane D / per-instance relational feasibility

This experiment is a direct **oracle-ceiling** descendant of the broader Lane-D premise, but does not reopen D1's failed production ranking consumer.

D1 asked whether one particular future-intersection exact query disagreed with beam retention. It did not.

This experiment asks a more primitive question before choosing any query vocabulary:

> does exact completion feasibility reveal enough hidden forcedness at all?

If not, there is no reason to invent another per-instance query language for this purpose.

### Dynamic BC1

BC1 is an example of a potential cheap exact reason that might explain some semantically forced/dead states.

Do not delay BC1's already-earned economics experiment for this work.

## Implementation sequence if the pilot is eventually run

1. Wait for #1952 to land or otherwise reconcile with its final frozen parent population.
2. Run the committed production-inert capture tool on at most 16 parents / 5 eligible states per gate/population rule.
3. Commit/freeze the emitted generic child-prefix `cases` document before exact labels are opened.
4. Dispatch <=320 cases through `cpsat-explicit-prefix-reference.yml`.
5. Reconcile with `research:semantic-forcedness-reconcile`.
6. Report parent-level clustering, state prevalence, work-weighted ceiling, UNKNOWN rate and correctness alarms.
7. Stop or nominate one narrower follow-up according to the frozen bands.

Do not add:
- a production micro-query;
- a new exact engine;
- branch pruning;
- forced-move behavior;
- a generic relational-query API;
- a learned classifier;
during this opportunity-sizing phase.

## Reopen / close semantics

A negative closes only:

> hidden semantic forcedness among 2-4-successor beam states in the measured current-residual regime.

It does not close:

- literal one-successor forced chains;
- dynamic BC1;
- semantic dead-parent detection;
- DFS-specific hidden forcedness;
- relational feasibility for other consumers such as repair or decomposition.

A positive earns only a cheaper-consequence search and downstream-work economics study.

## Why this question is worth asking

Most solver research asks:

> which branch should we search first?

This asks whether, at some substantial fraction of difficult branch points:

> **there was never really a choice.**

If the answer is yes at meaningful work share, that is exactly the sort of search elimination that can speed large batches.

If the answer is no, we can stop romanticizing "forced future" machinery and put the compute elsewhere.
