<!-- agent-context-budget: warn=8000 max=10500 -->
# Research question intake and routing

> **Purpose:** pre-ID front door for a new research idea or question raised in conversation or during investigation.
> **Authority:** routing/method only. This document does not own question state, execution priority, evidence truth, deferred work, or research-system debt.
> **Handoff:** solver-science questions that survive intake enter the existing question/dossier/workstream machinery; research-system questions route to their existing methodological, architectural, hygiene, or dated-audit owner.

Use this when the question does **not yet have a stable research-question ID**, or when it is unclear whether the idea is actually one question.

Known-ID solver questions skip this front door and start with:

`npm run research:dossier -- --question-id=<id>`

## Goal

Turn conversational curiosity into the smallest useful scientific object without:

- taking the speaker's wording as a finished hypothesis or durable name;
- creating a queue item before checking whether the repo already answers it;
- turning one idea into an architecture project;
- buying solver/reference compute before checking retained evidence and answerability;
- collapsing distinct interpretations too early;
- keeping every interesting thought as durable repository state.

The intake flow is:

`raw question -> decision consequence -> expand -> contextualize -> rivals/inverse -> collapse -> answerability -> discriminator -> observability -> route`

Stop as soon as the question is already answered or no decision-changing ambiguity remains.

## 1. Preserve the raw question, but do not canonize its wording

Keep the user's/agent's original wording in working notes so the intent is not lost.

Then restate the underlying uncertainty without assuming the nouns, mechanism, causal direction, or proposed implementation are correct. Before a conversational phrase becomes a filename, command, schema field, registry ID, or durable term, apply [naming and vocabulary](naming-and-vocabulary.md): name the decomposed concept by current role/meaning, not by memorable phrasing or experiment origin.

## 2. State the decision consequence

Ask first:

> **What would we do differently if this ambiguity resolved one way rather than the other?**

Possible consequences include:

- choose or reject a solver intervention;
- change allocation/order/retention;
- investigate a missing capability;
- remove avoidable work;
- alter representation or search object;
- add/fix instrumentation or retention;
- narrow/close/reopen a premise;
- change research-system procedure or authority;
- conclude that no action is earned.

If no plausible answer changes a research or implementation decision, treat the idea as explanatory curiosity unless later evidence gives it consequence. Do not manufacture a queue item.

## 3. Expand before contracting

Ask:

> **What materially different scientific questions are hiding inside this sentence?**

Expand only along dimensions that could change the answer or next action. Common solver lenses:

- **incidence/prevalence:** does the phenomenon occur, and on what denominator?
- **capability:** can the solver derive/do the needed thing at all?
- **exposure/allocation:** is existing capability offered, reached, participating, and sufficiently dosed?
- **decision value:** does the fact distinguish choices production currently treats alike?
- **economics:** how much canonical work is actually removable/displaced after costs?
- **representation/inference/composition/persistence/action/revision/communication/search object/information:** use the [capability-invention vocabulary](solver-capability-invention-program.md) when a miss suggests absent reasoning.
- **implementation cost:** is the opportunity algorithmic `workSpent`, wall time, memory, serialization, replay, or bookkeeping?
- **correctness/soundness:** can the proposed consumer act without changing valid capability?
- **generalization:** is the claim local, population-bound, parent/family-bound, same-source, or transferable?

Do not assume local forcedness implies global determinism, isolated capability implies production value, incidence implies removable work, a negative treatment disproves its premise, or wall-time cost equals canonical work.

For research-system questions, expand along the smallest relevant lenses:

- **discoverability/routing:** does the repo know something agents cannot reliably find?
- **authority/representation:** can current owners express the distinction without duplicate or misleading truth?
- **observability/identifiability:** could the system have seen and discriminated the phenomenon?
- **retention:** was decision-bearing information discarded, downgraded, or ephemeral?
- **join/provenance/integrity:** can evidence actually be combined under compatible identity?
- **lifecycle/propagation:** do changed results reach questions, premises, queues, reopen hooks, and consumers?
- **decision quality:** does the system route attention to the right next discriminator?
- **operational economics:** are agent attention, CI, storage, documentation, or compute costs avoidable?
- **epistemic coverage/reflexivity:** are current instruments/ontologies suppressing questions they cannot easily express?

These are lenses, not a new research-system taxonomy or registry.

## 4. Contextualize against current knowledge before promotion

Use cheap discovery before broad reading or new acquisition.

For solver-science questions:

1. Query likely concepts:
   `node scripts/research-status-index.mjs --compact --query=<term>`
2. Check current priority/state in [solver optimization workstreams](solver-optimization-workstreams.md).
3. Check [solver future work](solver-future-work.md) for explicit deferred/reopen forms.
4. If a stable question ID emerges, switch to:
   `npm run research:dossier -- --question-id=<id>`
5. Use the dossier's stable relations, evidence refs, premises, measurement opportunities, candidate assets/joins, populations, and acquisition recommendation. Lexical hints remain discovery only.
6. Query tools/assets only as needed:
   `node scripts/tooling-census.mjs --compact --query=<term>`
   `node scripts/research-asset-query.mjs --query=<term>`

For research-system questions, start with:
`npm run research:system-inventory -- --view=brief`
then inspect the relevant current owner, recent audit/report, tooling/workflow, [inference-audit framework](solver-research-inference-audit-framework.md), or [periodic hygiene](periodic-repository-hygiene.md) as appropriate.

Classify the relation to existing work:

- **already answered**;
- **same question / existing owner**;
- **sibling or narrower descendant**;
- **reopen of a tested/closed form with materially new premise**;
- **already deferred with a reopen condition**;
- **genuinely new live ambiguity**;
- **interesting but not decision-bearing**.

Do not create a new ID merely because the wording is new.

## 5. Generate rivals and one useful inverse

State the strongest decision-relevant rival explanations. Do not require an exhaustive ontology.

Examples:

- capability absent vs present but unoffered/unreached/underdosed;
- premise false vs implementation form bad;
- search quality vs representation/retention failure;
- algorithmic work vs implementation overhead;
- local forcedness vs whole-frontier determinism;
- broad effect vs selected/residual-conditioned effect;
- real negative vs instrumentation/execution failure.

Also state the nearest **useful inverse** when it exposes directional bias: add/remove, starvation/overexposure, DEAD/LIVE slack, universal/per-instance, failure/success, invention/obsolescence.

The inverse is a bias check or rival nomination, not queue entitlement.

## 6. Collapse to the live ambiguity

After contextualization, remove branches that existing evidence already resolves.

A surviving question should be expressible in the existing question-contract shape:

- **live ambiguity:** which materially different interpretations remain?
- **discriminating observable:** what smallest observation separates them?
- **outcome interpretation:** what would each meaningful result imply?

For a solver question that is promoted, use the ordinary stable question authority rather than inventing a parallel intake record.

## 7. Classify answerability before buying compute

Prefer the cheapest truthful route:

1. **Already answered** — report the answer; repair stale routing/state if the repo would mislead the next agent.
2. **Existing-data analysis** — answer with retained evidence or a valid new join/reducer.
3. **New instrumentation, no new solver compute** — add/extend production-inert telemetry, reducer, or persistence when existing executions can expose the discriminator.
4. **Bounded solver/reference acquisition** — only after existing evidence/instrumentation cannot decide the gate.
5. **Currently unidentifiable** — record the blocker or reopen condition; do not simulate certainty with a larger sweep.

For a known/promoted solver question needing acquisition:

`npm run research:acquisition-preflight -- --question-id=<id>`

Then use opportunity sizing/population/evaluation machinery before broad compute.

## 8. Prove observability before interpreting a null

Co-design discriminator and observability. Check only the axes needed for this decision:

- eligibility/applicability;
- opportunity/headroom;
- reach;
- participation/exposure/dose;
- measurement support;
- execution fidelity/comparability;
- coverage/censoring;
- independent unit/population identity;
- observer reactivity where relevant.

If the discriminator cannot be exposed by the proposed population or instrument, change the discriminator or classify the question as blocked. Do not scale an unobservable question.

## 9. Route the surviving object, not the brainstorming tree

### Solver-science disposition

- **existing question:** use its dossier/owner;
- **new active question:** add it to the ordinary question authority and attach it to the appropriate current workstream only if it has earned execution;
- **valuable but premature:** use the ordinary deferred-question/future-work route with an explicit reopen condition and acquisition need;
- **tested form already closed:** link/narrow; do not create a duplicate question;
- **answered immediately:** no new durable question required.

Execution priority remains solely in [solver optimization workstreams](solver-optimization-workstreams.md).

### Research-system disposition

Do **not** put general research-system questions into the solver-science question registry merely to gain an ID.

- local correctness/plumbing defect -> fix + regression;
- recurring repository/agent entropy -> [periodic repository hygiene](periodic-repository-hygiene.md);
- durable methodological lesson -> [solver research operating model](solver-research-operating-model.md);
- structural ownership/debt -> owning architecture/debt authority;
- bounded unresolved investigation -> dated audit/report with decision, remaining gate, and explicit successor routing;
- repeated correctness-critical semantic invariant -> extend/extract a shared primitive only after the ordinary repeated-consumer evidence threshold is met;
- unearned abstraction -> leave unbuilt.

## 10. Conversational behavior

The intake is primarily an agent reasoning discipline, not paperwork.

When a user introduces a new idea/question:

- do not force them to formulate a hypothesis, population, or experiment contract;
- do not immediately ask for clarification when the repo can disambiguate the idea itself;
- surface useful decomposition/context back to the user when it changes the meaning or reveals a more promising question;
- answer immediately from existing evidence when possible;
- preserve their intent while being willing to reject their proposed mechanism/name;
- if investigation is earned, carry the question into the existing research system rather than leaving the conclusion only in chat.

A strong intake should make **fewer** new queue entries while producing better questions.

## Compact working note

This is optional scratch structure, not a registry/schema:

```text
RAW:
DECISION:
EXPANSION:
EXISTING CONTEXT / NEAREST OWNER:
RIVALS + USEFUL INVERSE:
SURVIVING AMBIGUITY:
ANSWERABILITY: answered | existing-data | instrument-only | bounded-compute | blocked
SMALLEST DISCRIMINATOR:
OBSERVABILITY:
DISPOSITION / OWNER:
```

Delete or collapse the scratch note after routing. Durable state belongs to its existing owner.
