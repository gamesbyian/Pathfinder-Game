# Solver premise-map replication and path-dependence plan

> **Status:** **COMPLETED / RETIRED (2026-09-17).** Construction, blind mining, reconciliation, and post-replication disposition are closed; see [`reports/premise-map-replication/03-post-replication-decision-record.md`](../reports/premise-map-replication/03-post-replication-decision-record.md). The conditional fourth-cell reopen lives in [`solver-future-work.md`](solver-future-work.md); do not restart this plan wholesale.
> **Date:** 2026-09-17
> **Purpose:** estimate how much of the premise-map program's conceptual output depends on (A) how the repository was conceptualized into a map and (B) how a fixed map was interrogated.
> **Boundary:** this is not a continuation of M1-M12 mining and does not mutate frozen v1, v2 admissions, or the live solver queue.

## Why this exists

The premise-map program now has two separable sources of path dependence:

1. **Map-construction dependence** — whether the conceptualization process determines what premises, boundaries, decompositions, and relations appear in the map.
2. **Map-mining dependence** — given a fixed map, whether the interrogation process determines which higher-order insights are discovered.

These are different variables and should be isolated rather than collapsed into one broad "independent redo".

The useful experimental matrix is:

| Map representation | Original mining lineage | Independent mining lineage |
| --- | --- | --- |
| Canonical frozen v1 | already executed in #1850 -> #1851 -> #1852, with #1853 as one bounded downstream descendant | **missing; execute next** |
| Independently reconstructed peer map | not currently justified for symmetry alone | **conditional later, only if disagreement earns it** |

The separate independent repository reconstruction that later fed merged PR #1834 supplies most of the raw archaeology needed to test the construction axis, but it stopped as an investigation notebook rather than becoming a genuine peer map.

## Frozen reference lineage

Replication must compare against exact objects, not moving branch names or summaries.

### Canonical map input

- snapshot id: `solver-premise-map-v1-2026-09-17`
- snapshot manifest: `docs/solver-premise-map-snapshot-v1.json`
- snapshot commit: `e9601ffb8fa304d5ea91d054a9de6cb1bf8ff28e`
- proposition count: 142
- relation count: 166

The snapshot is the sole map input for the independent-mining track.

### Original mining lineage

At creation of this plan the lineage is open and stacked, not merged to `main`:

- Phase 1 PR #1850, head `25e080981f306b7a07465871db7f5bac58e3cb58`
- Phase 2 PR #1851, head `3c9a0edb78bebe049c4c128b907a5456508a767c`
- Phase 3 PR #1852, head `a8a3cfd1097439013f881c27dd6b7b9c660520dc`
- bounded descendant PR #1853, head `824c2ab563e0a1a1cc05e034200d1e275a6861c9` at plan creation

The still-open execution-plan PR #1849 has head `0f04b1235d208a76377bfe86166723f52b9e9973`.

These objects are comparison material only for the replication tracks. They are not allowed inputs to blind discovery.

### Independent reconstruction source

The historical quarantined branch is:

- `chatgpt/independent-premise-space-2026-09-17`

Its later canonical reconciliation is merged in #1834, but that reconciliation must not be used as the independent map-builder's discovery seed. The peer-map track should resume from the pre-reconciliation independent work and underlying repository evidence, not from the canonical deltas P197-P200 or the merged reconciliation report.

## Experimental principle

The two replication tracks isolate one variable at a time.

### Track A — independent map construction

**Question:** if the same underlying Pathfinder repository is conceptualized independently, does a materially similar conceptual object emerge?

Complete the quarantined independent reconstruction into a genuine peer conceptual map.

The map-builder may use:

- solver source and historical code;
- git history;
- old and current research documents that predate or are logically upstream of the recent canonical premise-map program;
- experiments and reports;
- scripts and research tooling;
- corpora and generator definitions;
- current solver-research authorities where those authorities are part of the underlying repository evidence.

The map-builder must not use:

- the canonical premise inventory or premise IDs;
- the canonical ontology as a decomposition template;
- canonical relation files or topology;
- M1-M12;
- Phase-2 synthesis questions;
- Phase-1/2/3 mining outputs;
- P201-P206 or v2 admission logic;
- #1853 findings;
- canonical-vs-independent reconciliation conclusions from #1834.

The target is not "find extra premises". It is a peer conceptual object complete enough to compare:

- conceptual coverage;
- boundaries between premises;
- decomposition and aggregation choices;
- abstraction levels;
- relation types and graph topology;
- treatment of negative results and implicit defaults;
- representation of open questions;
- treatment of evidence, authority, scope, and time;
- conceptual regions that exist only in one representation.

The peer map does not need to share canonical vocabulary, IDs, dimensions, or file formats. Forcing schema compatibility before reconciliation would destroy the independence being tested.

### Track B — independent mining of canonical frozen v1

**Question:** holding the map fixed, does a materially similar set of higher-order discoveries emerge from an independently invented interrogation method?

Give a fresh investigator exactly the frozen v1 map input and enough generic instructions to understand the task.

The shadow miner must not receive:

- M1-M12 or their names/descriptions;
- Phase-1 outputs;
- Phase-2 synthesis questions;
- S2-Cxx candidates;
- Phase-3 reconciliation/admission decisions;
- P201-P206;
- v2;
- #1853 or its downstream result;
- any prior list of "holes" in M1-M12;
- this plan's later reconciliation findings.

The shadow miner should design and freeze its own interrogation scheme before recording substantive findings. That scheme can be iterative internally, but changes made after findings appear must be logged as post-hoc rather than silently folded into the original method.

Its output should preserve:

- method conception and frozen interrogation scheme;
- per-method findings before synthesis;
- provenance back to frozen-v1 objects;
- alternative interpretations;
- negative findings;
- uncertainty;
- any observations that the fixed representation itself seems awkward or insufficient.

## Contamination model

Independence is defined by **information exposure**, not by branch name, session name, or model identity.

A fresh session that is told the conclusions of #1850-#1853 is contaminated even if it uses different wording. A continuing session can preserve useful methodological hygiene without being intellectually independent if it has already inspected canonical answers.

### Allowed shared methodological hygiene

Both blind tracks may inherit generic process rules such as:

- verify repository state rather than trusting prose;
- record exact commits and source provenance;
- distinguish observation from interpretation;
- preserve alternative explanations;
- avoid silently promoting local evidence to global claims;
- log post-hoc method changes;
- keep discovery output separate from admission and queue decisions;
- avoid recursive self-mining before closeout;
- distinguish independent evidence units from duplicated rows/documents.

These are experiment-quality controls, not conceptual hints.

### Forbidden conceptual leakage

Do not tell blind investigators:

- which conceptual regions the canonical map found important;
- which synthesis ideas survived or failed;
- which ontology dimensions proved fruitful;
- which premises were later admitted;
- which downstream hypothesis #1853 falsified;
- where canonical mining appeared weak;
- what a prior investigator expects the blind pass to rediscover.

Even a high-level statement such as "look harder at cross-stage interfaces" is a discovery hint if it came from the canonical lineage.

## Meta-audit of original mining-method expressiveness

A separate, non-blind investigator may inspect the existing mining machinery and ask an abstract question:

> What classes of inference can the preregistered mining machinery express well, weakly, redundantly, or not at all?

This audit is allowed to inspect M1-M12 and the execution-plan machinery, but it must remain quarantined from the shadow miner until the shadow-mining investigation is closed.

The audit should characterize capabilities rather than enumerate missing answers. Useful dimensions include:

- local vs relational vs global graph reasoning;
- discovery of missing nodes vs missing edges vs missing dimensions;
- contradiction-conditioned inference;
- temporal/epoch sensitivity;
- causal vs correlational structure;
- representation-dependent blind spots;
- ability to detect emergent multi-premise structures;
- dependence on pre-existing ontology labels;
- whether lenses privilege density, asymmetry, explicit relations, or known sibling structures;
- whether inference requires facts absent from frozen v1.

The purpose is to understand the instrument, not to seed the replication.

## Stage sequence

### Stage 0 — freeze boundaries and manifests

Before blind work:

1. record exact canonical-v1 input;
2. record exact original-mining reference heads;
3. preserve the independent reconstruction source branch;
4. create separate quarantine briefs/manifests for Track A and Track B;
5. record forbidden sources explicitly;
6. record the current session as contaminated for blind execution because it has inspected canonical outputs.

No blind investigator should need to infer these boundaries from conversation history.

### Stage 1A — finish independent peer-map construction

Resume the independent reconstruction without canonical-map exposure and produce a closed peer map plus a construction report.

Required closeout properties:

- sufficiently broad source coverage to support comparison;
- internal relation/dependency representation of some form;
- explicit unresolved/ambiguous regions;
- provenance;
- no canonical reconciliation during construction;
- no queue handoff.

### Stage 1B — shadow-mine canonical frozen v1

In a separate blind context:

1. inspect only the frozen v1 object and generic task brief;
2. invent and freeze an interrogation method;
3. run it;
4. preserve method-specific findings separately;
5. synthesize only after the independent pass is closed;
6. do not inspect M1-M12 or canonical outputs before closeout.

### Stage 1C — mining-method expressiveness audit

Run independently of 1B. It may use canonical mining machinery but must not communicate identified strengths/holes to the shadow miner.

### Stage 2 — seal blind investigations

Before revealing comparison material:

- record final heads/commits;
- verify changed-file boundaries;
- make method changes and known contaminations explicit;
- state what each track did not inspect;
- declare both blind discovery phases closed.

No retroactive patching after answers are revealed.

### Stage 3A — map-vs-map reconciliation

Compare canonical v1 with the independently reconstructed peer map.

Do not reduce equivalence to premise-ID or wording matches. Compare at least:

- conceptual regions present in both;
- regions present only in one;
- split vs lumped concepts;
- abstraction-level differences;
- premise boundaries;
- relation types;
- graph topology and load-bearing nodes;
- implicit-default treatment;
- evidence/authority/scope treatment;
- open-question representation;
- ontology escapees and difficult-to-place material.

Classify divergence without immediately editing either map.

### Stage 3B — mining-vs-mining reconciliation

Compare original mining of canonical v1 with shadow mining of the same frozen object.

Distinguish:

- independently rediscovered underlying insight;
- equivalent insight organized differently;
- original-only discovery;
- shadow-only discovery;
- method-generated artifact;
- representation-limited observation;
- unresolved equivalence.

Again, compare semantic discoveries rather than phrase matches.

### Stage 4 — cross-reconcile discrepancy sets

Only after 3A and 3B are complete, ask how the two dependence axes interact.

Examples:

- Does a shadow-only mining insight correspond to a region the independent map represents more naturally?
- Does an original-only insight disappear when both representation and interrogation differ?
- Do independently constructed maps and independently conceived mining methods converge on the same conceptual region despite no shared discovery path?
- Is an apparent mining-method miss actually caused by awkward canonical representation?
- Is an apparent construction difference irrelevant because both mining approaches recover the same higher-order conclusion?

This stage should produce a **provenance-of-disagreement model**, not a new idea backlog.

Useful outcome classes include:

1. robust to representation and interrogation;
2. robust to representation but interrogation-sensitive;
3. representation-sensitive but recoverable once represented;
4. canonical-lineage dependent;
5. independent-construction-only conceptual material;
6. unresolved because representation and interrogation changed together.

## The missing fourth cell

Do **not** automatically run original or shadow mining over the independent map merely to make the matrix symmetrical.

The extra cell is earned only when Stages 3-4 expose a material ambiguity that cannot otherwise be resolved.

Examples of legitimate triggers:

- a large conceptual region exists only in the independent map and its downstream salience is unknown;
- a shadow-only insight appears tightly coupled to canonical ontology;
- map-vs-map disagreement and mining-vs-mining disagreement point in opposite directions;
- the same semantic claim cannot be aligned across representations without testing translation.

The fourth cell should answer a specific discrepancy, not satisfy aesthetic symmetry.

## Queue and map admission firewall

Replication findings must not immediately mutate:

- frozen v1;
- v2;
- the canonical premise inventory;
- the live solver queue;
- production behavior.

Only after cross-reconciliation may a separate decision pass ask whether anything warrants:

- a future map-version admission;
- a bounded additional mining round;
- the fourth experimental cell;
- a solver-research premise/falsifier;
- a queue handoff;
- no action.

This prevents "would be useful work" from feeding backward into judgments of conceptual equivalence and salience.

## Success criterion

The program succeeds even if it discovers no new premise.

Its primary deliverable is evidence about the **reliability of the premise-map idea-generation process itself**:

- which conclusions survive different cartographers;
- which survive different prospectors;
- which depend on one intellectual lineage;
- and which disagreements are attributable to representation versus interrogation.

A finding independently recovered across both axes is unusually strong evidence of conceptual salience. A finding present only in canonical construction -> original mining is not thereby false, but it should carry an explicit path-dependence warning until independently supported.

## Immediate execution order

1. Commit this plan as the non-blind coordination authority.
2. Create Track-A and Track-B quarantine briefs with exact allowed/forbidden inputs.
3. Create a separate expressiveness-audit artifact and execute that audit without exposing it to Track B.
4. Launch blind Track A from the preserved independent reconstruction lineage.
5. Launch blind Track B from frozen canonical v1.
6. Do not begin reconciliation until both blind tracks are closed.
