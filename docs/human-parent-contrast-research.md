# Human/editor-parent controlled contrasts

> **Status:** current research-resource contract.
> **Role:** purpose-built causal/transfer families from human/editor-authored parents.
> **Priority authority:** [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md).
> **Family semantics:** [`variant-level-research.md`](variant-level-research.md).
> **Evidence roles:** [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md).

This resource formalizes a third level-construction regime already latent in `family-generate.mjs`:

> **human/editor parent -> controlled transformation -> referee-certified solvable descendant**

It complements, rather than replaces, the two procedural stress construction families:

- witness-first random: stochastic witness -> mechanics/puzzle;
- topology composition: synthetic macro topology -> route/modules -> puzzle;
- human/editor contrast: externally designed puzzle/topology -> controlled mutation -> certified descendant.

The point is not to create another giant corpus. The point is to manufacture a small clean contrast when a ranked solver question is blocked by weak natural comparisons, or to challenge a selected treatment on human-origin structure that the procedural generators do not represent well.

## Front door

Use:

```bash
node scripts/human-parent-contrast-pilot.mjs \
  --question=<stable-question-id-or-short-description> \
  --evidence-role=development \
  --parent=<published-level-id> \
  --mode=<family-generate-mode> \
  [family-generate options]
```

The wrapper delegates all mutation mechanics, witness preservation/transformation, schema/referee validation, fingerprint deduplication, and variant provenance to `scripts/family-generate.mjs`. It adds the research contract that the generic family generator cannot infer:

- the question being tested;
- development/confirmation/transfer role;
- parent exposure status;
- the parent family as the independence unit;
- temporary output by default under `tmp/human-parent-contrasts/`; and
- a research-context sidecar recording the interpretation boundary.

For confirmation or transfer, the wrapper requires `--parent-exposure=locked-untouched`. That assertion is a preregistration claim, not proof. If the parent or its descendant outcomes influenced treatment design, reclassify that family as development evidence.

`data/levels.json` is the default parent source because it supplies human/editor-authored published structure and stored valid hints. A custom human/editor source is fine when its provenance and exposure state are explicit. Merely pointing the wrapper at a stress corpus does not create human-origin or distributionally independent evidence.

## What makes an accepted descendant

The underlying family generator requires a stored hint or stress witness, reconstructs the puzzle around that path, and accepts a descendant only when the preserved or transformed witness remains referee-valid. It also schema-checks, fingerprints, deduplicates, and records generation provenance.

The production solver is not used to decide which descendants survive. Never add solve/no-solve, runtime, technique winner, or desired failure mode to the generation acceptance rule. If solver outcomes choose generated rows, those rows are selected development material, not prospective confirmation/transfer.

The inherited witness means only:

> this descendant has at least one known valid solution.

It does **not** establish solution uniqueness, solution-space rigidity, basin count, topology of every solution, or any other unsupported whole-solution-space property. Use solution-profile or exact/reference tooling when the research claim needs those facts.

## Transformation palette

Current `family-generate.mjs` modes already cover useful controlled interventions:

| Mode | Best use |
|---|---|
| `local-mutant` | Move one eligible object while preserving inventory; clean local causal contrasts. |
| `density-sweep` | Add/remove blocks without moving other objects; open-space, coverage and obstruction response. |
| `symmetry` | Isomorphic representation/orientation sensitivity. |
| `swap` | Exchange two object positions; placement/order effects with fixed inventory. |
| `group-reshuffle` | Re-place one mechanic family while preserving its count. |
| `constrained-shuffle` | Stronger same-inventory perturbation across movable mechanics. |
| `re-embed` | Hold relative puzzle structure fixed while changing grid embedding/open area. |

Prefer the smallest intervention that can answer the question. A broad constrained shuffle is a poor causal instrument when one-object relocation or a block delta can isolate the premise.

If a ranked question repeatedly needs a missing intervention, add the smallest sound operator to `family-generate.mjs`; do not create a second mutation engine.

## Independence and denominators

The independent unit is normally the **parent family**, not the descendant row. Ten descendants from one published parent are ten controlled observations around one independent parent, not ten independent levels.

For any decision-bearing campaign:

1. state the number of parents and descendants separately;
2. keep siblings from one parent in the same discovery/confirmation partition;
3. analyze parent-level consistency or use parent-clustered uncertainty when making across-level claims;
4. preserve parent source/content fingerprint, transformation, seed, and run provenance;
5. do not let prolific/easy-to-mutate parents dominate a generalization claim;
6. record whether the parent was already inspected, tuned against, or otherwise spent.

A family can provide excellent within-parent causal evidence even when it is unusable as independent transfer evidence.

## When this resource earns generation

Existing family data remains the first stop for questions it can answer. Generate new human-parent contrasts only when at least one of these is true:

- the existing family library lacks the needed human/editor parent source or transformation;
- a live hypothesis needs a clean controlled contrast that natural stress rows do not supply;
- a selected treatment needs human-origin transfer/challenge evidence and suitable parent families can remain locked;
- a mechanism requires a mechanic omitted by topology composition, but human/editor parents represent it;
- a current failure cliff needs independent-parent recurrence or a held-out-parent prediction.

Before more than a tiny pilot, record the unanswered question, operator, parent count, descendant count, analysis, stop rule, expansion rule, exposure/holdout plan, and how pseudo-replication will be handled. This is the same generation discipline as [`variant-level-research.md`](variant-level-research.md), applied to this source regime.

Stop when the generated contrasts cannot change a ranked solver decision. Do not bulk-generate descendants merely to make the resource look comprehensive.

## Routing into current solver research

This apparatus is supporting evidence. It does not outrank a live gate and must not turn every solver experiment into a family-generation detour.

| Research line | Use |
|---|---|
| **WS2 Class 2 must-turn economics** | Do not interrupt the frozen eligible-population economics A/B. If the treatment earns promotion/generalization scrutiny, use independent human-parent must-turn families as structural transfer/challenge evidence. |
| **WS2 Class 4 portal allocation** | Do not interrupt the dead-last canary/allocation gate. If portal coarse-state exposure survives, human/editor portal parents are a valuable transfer source because topology-composition v0.1 omits portals. |
| **WS2 Class 5 acquisition** | Natural exact-labelled evidence remains primary. If a well-defined topological/feasibility premise is blocked by lack of clean contrasts, generate controlled human-parent families that perturb the implicated topology, then exact-label the relevant states. Generated witnesses nominate live paths but may not stand in for LIVE/DEAD exact adjudication. |
| **WS1 automatic selection** | After existing families nominate a structural signal, use independent human-parent families to test whether legal descriptor/action-value relations survive a different parent ecology before strong/global selector claims. |
| **WS4 beam retention / representation sensitivity** | Generate matched parent descendants around a solve cliff, track known-live lineage survival, require recurrence across independent parents and held-out-parent prediction before intervention. |
| **WS6 repair reachability** | Move or reorder obligations while preserving solvability to isolate which early/interior commitments make append-only continuation irrecoverable. |
| **WS0 restart/randomization / basin overlap** | Use controlled descendants to test whether restart value or basin separation is structurally stable rather than one-row seed luck. |
| **WS7 architecture/speed** | Validation/scaling laboratory only after a speed mechanism is independently earned; do not generate levels to justify speculative optimization. |
| **WS5 exact/reference** | Use small descendant neighborhoods to cheaply exact-label causal boundaries and translate exact truth into runtime hypotheses. |

The same routing applies to deferred future-work items such as future-intersection feasibility, cross-attempt basin overlap, dependency-conditioned repair descent, partial-order/commuting excursions, richer static selectors, counterfactual displaced-capability recurrence, and representation-sensitivity lineage survival.

## Claim language

Use precise language:

- “held across descendants of three published parents” = controlled human-origin family evidence;
- “replicated across 20 whole human/editor parents” = stronger parent-level generalization evidence;
- “confirmed on locked human/editor parents” = sample-independent confirmation only if those parents were truly untouched for the decision;
- “transferred to locked human/editor parents” = distributionally different source evidence within the represented human/editor parent population;
- “generalizes to unseen Pathfinder levels” still requires broader evidence than descendants of any one parent source.

Human origin is valuable independence from procedural construction grammar. Mutation descendants remain conditioned on the chosen parents, available stored witnesses, operator eligibility, and referee-preserving acceptance. Keep those selection channels visible.
