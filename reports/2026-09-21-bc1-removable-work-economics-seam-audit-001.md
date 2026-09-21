# BC1 removable-work economics seam audit 001

> **Status:** active
> **Last evidence:** 2026-09-21 — source audit showed frozen frontier-prefix BC1 incidence cannot reconstruct downstream production work; existing continuation tools answer different questions.
> **Decision:** keep BC1 under WS2-CUT-BALANCE-PROJECTION and use a production-inert beam later-disposition shadow after ordinary hard-prune survival as the first honest economics microscope.
> **Remaining gate:** measure proof construction cost, later production disposition/descendant work, overlap with existing prunes, and valid/reference safety on multiple independent parents before any behavioral BC1 consumer.

## Question

Dynamic BC1 already has positive incidence. What is the smallest scientifically honest way to measure:

> when BC1 proves a state impossible, how much later production search would an actual safe consumer remove, net of proof construction cost and overlap with existing pruning?

## 1. What current BC1 evidence actually contains

`scripts/stress/cut-bridge-incidence.mjs`:

1. reads an already-frozen production-frontier population;
2. replays each retained prefix into canonical solver state;
3. calls `connectivityResearchSnapshot()`;
4. if ordinary connectivity passes, applies `findBridgeExcursionConflicts()`;
5. records bridge/conflict incidence.

This is valid evidence for the stated Stage-B denominator:

> BC1 conflicts among sampled frontier states where ordinary connectivity passes.

It does **not** preserve or execute the future production search from that sampled state.

Therefore the existing 22/24-parent, 105/263-state positive incidence cannot answer:

- how long that node survives afterward;
- which ordinary prune eventually kills it;
- how many descendants it generates;
- whether it would disappear at the next beam cull anyway;
- whether DFS/repair encounter the same proof;
- how much canonical `workSpent` lies below the proved-dead state.

## 2. Why the existing continuation tools do not magically fill the gap

The repo has useful continuation machinery, but its contracts differ.

### Beam continuation

The production/static-portfolio continuation path resumes a captured **beam continuation/frontier**. It is not an arbitrary single-prefix residual executor.

Using a whole captured frontier after labeling one member BC1-dead would mix:

- work attributable to the conflicted node;
- work from every unrelated frontier sibling;
- width/cull interactions after the checkpoint.

That cannot honestly price the single proof without additional lineage accounting.

### Repair completion from partial path

Lane-G tooling can reconstruct a prefix and invoke `searchCompletionFromPartialPath`.

That is a valid question about the repair completion operator.

It is not “what production beam/DFS would have spent below this BC1 state?” and must not be relabeled as such.

### Exact/reference prefix feasibility

An exact oracle can establish DEAD/LIVE semantics for a prefix.

BC1 already has a theorem/soundness burden of its own. Exact infeasibility confirms truth but still does not measure production work avoided.

## 3. Cheapest honest live seam

The first economics consumer should be **production-inert and method-specific**, not a generic residual executor.

Beam is the cleanest initial host because its search already has explicit generated/pruned/cull/retained stages and replay-complete research observation.

At a BC1-eligible beam node:

1. ordinary production hard prunes/connectivity run unchanged;
2. only if the node survives the ordinary hard-prune seam, compute BC1 in shadow;
3. if BC1 conflicts, assign a bounded shadow identity to that node/prefix;
4. production search continues unchanged;
5. use existing BeamResearch lineage/stage records to observe that exact prefix/descendants until they are:
   - hard-pruned later;
   - merged;
   - score-width culled;
   - bucket culled;
   - retained into subsequent generations;
   - or leave the bounded observation window.

This answers **prospective later-disposition overlap** without pretending to know counterfactual solve work yet.

## 4. Required Phase-1 records

For each shadow BC1 conflict:

- parent / gate / attempt / config identity;
- depth;
- canonical `workSpent` at proof;
- BC1 proof construction cost or calibrated proxy;
- exact prefix identity;
- compact BC1 conflict identity;
- next observed production disposition for that prefix;
- work distance from proof to that disposition;
- whether the disposition was an existing hard prune versus a lossy beam operation;
- whether descendants were generated before disposition;
- bounded descendant work attributable under an explicit lineage rule.

The report must separate:

### Immediate overlap

The same node would already be rejected by an ordinary rule at the same decision seam.

Expected incremental value: approximately zero.

### Later deterministic rejection

Production eventually proves the same branch impossible after more exact work.

This is strongest saved-work nomination evidence.

### Later lossy cull

Production removes it for width/merge/quota reasons.

BC1 may still save derivation work, but the branch was not guaranteed to survive; value is smaller and policy-dependent.

### Survives observation window

Potentially larger opportunity, but not itself a saved-work number.

## 5. Construction-cost accounting

Current incidence tooling pays for:

- connectivity snapshot materialization;
- reached multigraph construction;
- bridge search;
- excursion conflict evaluation.

A live production consumer cannot inherit “BC1 is cheap” from initial-state timing or offline incidence.

Phase 1 should separately record or calibrate:

1. ordinary connectivity work already paid at the host seam;
2. incremental graph-materialization work;
3. bridge/conflict work;
4. observer/lineage bookkeeping.

If most BC1 cost is rebuilding information production already computed but discarded, that itself is a work-elimination architecture finding: expose/reuse the existing reached relation rather than recompute it.

Do not call that a cache until the producer/consumer economics are measured.

## 6. Why not start with DFS or repair

Their branch/subtree attribution is less naturally retained today.

A DFS BC1 conflict may have a clean semantic “all work below this node is removable,” but measuring that production-inertly requires explicit entry/exit subtree accounting or paired replay.

Repair is incomplete/stochastic and has additional experience-cache semantics.

Beam already owns rich stage/lineage observation, so it is the smallest first economics microscope.

A positive beam result may later justify a DFS-specific shadow. A negative beam result does not semantically close DFS if the opportunity structure differs.

## 7. Phase-1 advance gate

A behavioral BC1 prune A/B is earned only if the shadow demonstrates on multiple independent parents:

- zero safety/reference alarms;
- conflicts after ordinary hard-prune survival;
- non-trivial later work/disposition distance;
- incremental value after same-seam and near-immediate ordinary-prune overlap;
- construction cost materially below the dominated work;
- observer fidelity/overhead sufficient for the claimed denominator.

Then implement the smallest BC1 consumer behind its existing WS2 authority and test at matched work.

## 8. Stop gate

Close the first beam consumer if:

- most BC1 conflicts are immediately or near-immediately removed by existing rules;
- conflicted nodes are mostly width/merge casualties before meaningful extra work;
- graph/proof construction costs approach or exceed attributable downstream work;
- lineage cannot attribute dominated work without broad tracing;
- observer reactivity prevents a representative denominator.

Do not respond to a stop by building a general residual executor.

## 9. Architectural result

The repo does **not** currently possess enough retained evidence to price dynamic BC1 saved work retrospectively.

It does possess the right primitives for a narrow prospective beam shadow:

- ordinary connectivity;
- pure BC1 theorem;
- BeamResearch stage/lineage records;
- canonical work meter;
- replay-complete prefix identity.

Therefore the next BC1 implementation should be a **beam later-disposition shadow owned by `WS2-CUT-BALANCE-PROJECTION`**, not a second BC1 queue, generic proof store, or synthetic continuation benchmark.
