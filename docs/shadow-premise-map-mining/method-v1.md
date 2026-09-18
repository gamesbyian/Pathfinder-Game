# Blind shadow mining — frozen interrogation method v1

> **Method freeze:** substantive mining begins only after this file is committed.
>
> **Evidence boundary:** repository state at `e9601ffb8fa304d5ea91d054a9de6cb1bf8ff28e`.
>
> **Contamination note:** the frozen hardening support files exposed the names of a predeclared mining-lens set before this method was designed. This method therefore does not adopt or execute that set. The exposure is recorded in `contamination-log.md`.

## Design principle

Treat the fixed premise map as three simultaneously available objects:

1. a collection of claims/questions;
2. a record of how research state is encoded and justified;
3. a layered relational language connecting claims.

The shadow interrogation uses transformations of those objects rather than asking whether the map contains a predetermined class of gap.

Each pass must preserve its own observations before cross-pass synthesis. A later change to this method is post-hoc and must be logged.

---

## Pass A — failure-form compression

### Examines

Rewrite each proposition, where possible, into a neutral triplet:

`assumed condition → failure mode → solve/research consequence`.

Then group propositions that share a failure form even when their map domains, stages, or terminology differ.

### Could expose

- several named research questions that reduce to one deeper failure mechanism;
- the same hidden assumption recurring at distant solver loci;
- apparent diversity that is mostly vocabulary-level duplication;
- a small number of high-leverage causal forms underlying many propositions.

### Evidence that counts

A compression requires proposition text plus at least one corroborating field among evidence summary, solve-count link, relation context, or source-path family. Surface-word similarity alone does not count.

### False positives / artifacts

- generic phrases such as "can lose solves" can collapse unrelated mechanisms;
- later extension rows may be written at a more abstract level and therefore appear artificially compressive;
- propositions can legitimately share a failure form while demanding unrelated interventions.

### Representation dependence

Strongly dependent on how proposition wording and solve-count links were authored. Results must distinguish semantic compression from editorial compression.

---

## Pass B — verdict-reversal audit

### Examines

For each proposition with a nontrivial status/evidence state, ask:

1. what observation, architecture change, population change, or counterexample would reverse the practical interpretation of this row?
2. is that reversal condition represented in the row, a relation, or a nearby proposition?
3. is the status one-way, meaning the map explains why belief moved in one direction but not what would move it back?

### Could expose

- research conclusions that have no explicit reopening semantics;
- active premises whose evidence can accumulate but not discriminate;
- rows whose status is stronger than their reversible evidence model;
- latent conditioning variables needed to make a verdict operational.

### Evidence that counts

The row must have an interpretable status/evidence summary, and a claimed reversal or non-reversal must be traceable to explicit text or an explicit relation. Silence is recorded as encoding absence, not proof that the underlying research never considered it.

### False positives / artifacts

- some propositions are descriptive questions rather than verdict-bearing claims;
- source documents may contain reversal criteria omitted from the map;
- "open" can be deliberately noncommittal and need no reversal rule.

### Representation dependence

High. This pass primarily tests the map as an epistemic record, not the solver itself.

---

## Pass C — conjunctive consequence mining

### Examines

Find pairs or small sets of propositions that are independently represented but whose simultaneous truth would imply a qualitatively distinct research question or failure mode.

Candidate combinations must be motivated by at least one of:

- shared system locus with different claim types;
- explicit relation adjacency;
- shared mechanic/resource vocabulary;
- a common downstream solve-count consequence;
- one proposition changing the scope under which another is interpreted.

### Could expose

- research opportunities that live in interactions rather than individual premises;
- questions that become important only when two otherwise ordinary assumptions coexist;
- compound failure modes hidden by one-row-at-a-time representation;
- cases where separate mature ideas create an unrepresented interface problem.

### Evidence that counts

A conjunctive finding must cite the component proposition IDs and spell out the additional consequence that does not follow from either alone. Purely combinatorial pair generation is not evidence.

### False positives / artifacts

- combinatorial explosion;
- trivial restatements of explicit relations;
- pairings induced only by shared broad words such as "state" or "budget";
- combinations that are logically possible but operationally irrelevant.

### Representation dependence

Moderate. The pass is sensitive to proposition granularity and to which relation edges were encoded.

---

## Pass D — relation-grammar stress test

### Examines

Treat each typed relation as a sentence with semantics, then test whether the proposition texts support that sentence and whether relation composition yields coherent implications.

Inspect:

- relation types whose meanings change between relation-file generations;
- chains where A→B and B→C suggest a missing or invalid transitive reading;
- proposition-ID endpoints versus prose/concept endpoints;
- relation pairs that place one proposition in incompatible semantic roles;
- typed edges that make a stronger claim than the endpoint text warrants.

### Could expose

- hidden conceptual distinctions created by the relation language itself;
- weakly specified dependencies;
- cases where the graph says more or less than the proposition inventory;
- relation vocabulary that prevents certain reasoning from being expressed cleanly.

### Evidence that counts

Exact edge records plus endpoint proposition text. Composed implications must state whether transitivity is semantically justified or merely tempting.

### False positives / artifacts

- many relation types are intentionally non-transitive;
- v3 is explicitly a delta and may use vocabulary not intended as a normalized ontology;
- prose endpoints may deliberately represent concepts not promoted to proposition IDs.

### Representation dependence

Very high. Some findings may be about the graph encoding rather than the research space.

---

## Pass E — boundary-case inversion

### Examines

For propositions stated over a scope such as general, level, state, stage, invocation, population, distribution, or architecture epoch, construct the nearest meaningful boundary case:

- smallest scope where the claim could fail;
- largest scope where it might still hold;
- opposite/extreme operating condition;
- case where a hidden quantity is zero, exhausted, saturated, or multiply realizable.

Then check whether the map already distinguishes that boundary.

### Could expose

- scope transitions where a premise changes truth value;
- assumptions that are only meaningful away from edge conditions;
- missing "degenerate" cases that clarify the parent concept;
- propositions whose importance is driven by a narrow boundary regime rather than the nominal general case.

### Evidence that counts

The boundary case must be derivable from explicit scope, population, mechanic/resource, or proposition semantics. Invented implementation details do not count.

### False positives / artifacts

- mathematically neat extremes may be impossible in Pathfinder;
- broad population labels may not denote an ordered scope;
- the map may intentionally omit trivial or impossible edge cases.

### Representation dependence

Moderate to high, especially where scope metadata exists only in later extension generations.

---

## Pass F — generational encoding drift

### Examines

Compare the four proposition-file generations and three relation-file generations as successive representational layers, without interpreting chronology beyond what is encoded in the frozen object.

Track:

- fields introduced or removed;
- shifts in proposition granularity;
- changes from free-text adjacency to explicit typed relations;
- changes in what receives a proposition ID versus remaining prose;
- whether new representational capabilities coincide with new kinds of proposition.

### Could expose

- conceptual regions that became visible only after the map gained a way to encode them;
- findings whose apparent novelty may be representation-driven;
- systematic blind spots of the baseline schema;
- later propositions that should be interpreted as ontology effects rather than newly discovered solver facts.

### Evidence that counts

Schema and content differences visible inside the frozen files. This pass does not infer external development history or consult commits after the boundary.

### False positives / artifacts

- schema changes may reflect convenience rather than epistemic discovery;
- later files may simply contain topics investigated later;
- small extension sizes can exaggerate apparent distribution shifts.

### Representation dependence

This pass is explicitly about representation dependence.

---

## Execution discipline

For every pass:

1. preserve pass-specific observations in a separate artifact;
2. distinguish strong findings, tentative findings, and negative results;
3. cite proposition IDs, relation records, fields, or frozen source paths sufficient to reproduce the observation;
4. record plausible alternative interpretations;
5. label observations primarily as conceptual, evidence/epistemic, relation/representation, or mixed;
6. do not alter the fixed map;
7. do not compare against any other mining output.

## Synthesis rule

Cross-pass synthesis begins only after all six pass artifacts exist. A synthesis claim gains confidence when independently motivated passes converge on it, but convergence created by shared representation features must be discounted.

## Post-hoc rule

No component may be silently changed after substantive mining starts. Any added pass, changed criterion, or narrowed interpretation must be logged as `POST-HOC` with reason and effect.
