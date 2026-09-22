<!-- agent-context-budget: warn=7500 max=9500 -->
# Research question intake and routing

> **Purpose:** pre-ID front door for a new research idea/question raised in conversation or investigation.
> **Authority:** routing/method only. It owns no question state, priority, evidence truth, deferred work, or research-system debt.
> **Handoff:** surviving solver-science questions enter existing question/workstream machinery; research-system questions route to existing method, architecture, hygiene, or dated-audit owners.

Use this when there is **no stable research-question ID yet**, or when it is unclear whether the idea is actually one question. Known-ID solver questions start with:

`npm run research:dossier -- --question-id=<id>`

## Core flow

`raw question -> decision consequence -> expand -> contextualize -> rivals/inverse -> collapse -> answerability -> discriminator -> observability -> route`

Stop as soon as existing evidence answers the question or no decision-changing ambiguity remains.

### 1. Preserve intent, not accidental terminology

Keep the original wording in working notes, then restate the uncertainty without assuming its nouns, mechanism, causal direction, or proposed implementation are correct. Conversational wording is provisional: before it becomes a filename, command, schema field, registry ID, or durable term, apply [naming and vocabulary](naming-and-vocabulary.md).

### 2. State the decision consequence

Ask:

> **What would we do differently if this ambiguity resolved one way rather than the other?**

Possible consequences: choose/reject an intervention, change allocation/order/retention, investigate a missing capability, remove work, alter representation/search object, fix instrumentation/retention, narrow/close/reopen a premise, improve research procedure, or conclude no action is earned.

If no plausible answer changes a decision, do not manufacture a queue item.

### 3. Expand before contracting

Ask:

> **What materially different scientific questions are hiding inside this sentence?**

Expand only along dimensions that could change the answer or next action. Useful solver lenses include:

- incidence/opportunity denominator;
- capability versus exposure/allocation/dose;
- decision value versus descriptive correlation;
- canonical-work economics versus wall-time/implementation overhead;
- representation, inference, composition, persistence, action, revision, communication, search object, or information ([capability invention](solver-capability-invention-program.md));
- soundness/capability preservation;
- local versus population/family/transfer scope.

Do not assume incidence implies removable work, local forcedness implies global determinism, isolated capability implies production value, or a negative treatment disproves its premise.

For **research-system** questions, use only relevant lenses: discoverability/routing; authority/representation; observability/identifiability; retention; join/provenance integrity; lifecycle/propagation; decision quality; operational economics; epistemic coverage/reflexivity. These are lenses, not a second registry.

### 4. Contextualize before promotion

For solver-science questions:

1. `node scripts/research-status-index.mjs --compact --query=<term>`
2. inspect current [workstreams](solver-optimization-workstreams.md) and [future work](solver-future-work.md);
3. if a stable ID emerges, switch to `research:dossier`;
4. when the ambiguity crosses question/premise/evidence/asset boundaries or needs a reverse lookup, use `npm run research:query -- --entity=<type:id>` or a semantic view such as `--view=impact`, `--view=answerability`, or `--view=coverage`; use `npm run research:queryability-audit` when the question is whether the research system can answer a class of queries at all;
5. query tools/assets only as needed with `tooling-census --compact --query=<term>` and `research-asset-query.mjs --query=<term>`.

For research-system questions, start with:

`npm run research:system-inventory -- --view=brief`

then inspect the relevant owner, recent audit, [inference-audit framework](solver-research-inference-audit-framework.md), or [periodic hygiene](periodic-repository-hygiene.md).

Classify the idea as: **already answered; existing question/owner; sibling/narrower descendant; materially new reopen; already deferred; genuinely new ambiguity; or non-decision-bearing curiosity.**

Do not mint a new ID merely because the wording is new.

### 5. State rivals and one useful inverse

Name the strongest decision-relevant rivals, for example:

- capability absent vs present but unoffered/unreached/underdosed;
- premise false vs tested implementation bad;
- search quality vs representation/retention failure;
- algorithmic work vs implementation overhead;
- broad effect vs selected/residual-conditioned effect;
- scientific negative vs execution/instrumentation failure.

Also state the nearest useful inverse when it exposes directional bias: add/remove, starvation/overexposure, DEAD/LIVE slack, universal/per-instance, failure/success, invention/obsolescence. The inverse is a bias check, not queue entitlement.

### 6. Collapse to a live ambiguity

Remove branches already resolved by existing evidence. A surviving solver question should fit the existing question-contract shape:

- **live ambiguity**: which materially different interpretations remain?
- **discriminating observable**: what smallest observation separates them?
- **outcome interpretation**: what would each meaningful result imply?

Promoted questions use the ordinary question authority. Do not create an intake registry.

### 7. Classify answerability before compute

Prefer the cheapest truthful route:

1. **already answered**: answer it and repair stale routing/state if needed;
2. **existing-data analysis**: retained evidence or a valid new join/reducer;
3. **instrument-only**: new/extended production-inert telemetry, reduction, or persistence without new solver acquisition;
4. **bounded compute**: solver/reference acquisition only after cheaper routes cannot decide;
5. **blocked/unidentifiable**: record the blocker/reopen condition instead of buying a larger sweep.

For a promoted solver question, keep two machine dimensions separate:

- **workstream Gate class** owns the immediate operational route: `existing-data`, `instrument-only`, `bounded-compute`, `design`, `implementation`, `blocked`, `reopen-only`, `method`, `subsumed`, or `service`;
- **question acquisitionNeed** owns population/generation acquisition semantics when that question contract requires them.

Do not infer one from the other. If the question becomes an executable workstream, set/update its Gate class whenever the immediate gate changes.

For a promoted solver question needing acquisition:

`npm run research:acquisition-preflight -- --question-id=<id>`

Then use opportunity sizing/population/evaluation machinery before broad compute.

### 8. Prove observability before treating a null as evidence

Check only the axes required by the discriminator: eligibility/applicability, opportunity/headroom, reach, participation/exposure/dose, measurement support, execution fidelity/comparability, coverage/censoring, independent unit/population identity, and observer reactivity where relevant.

If the proposed population/instrument cannot expose the discriminator, change the discriminator or mark the question blocked. Do not scale an unobservable question.

### 9. Route the survivor

**Solver science**

- existing question -> its dossier/owner;
- new active question -> ordinary question authority; workstream only if execution is earned;
- valuable but premature -> deferred/future-work route with explicit reopen condition;
- tested form already closed -> link/narrow, do not duplicate;
- answered immediately -> no durable question required.

[Solver optimization workstreams](solver-optimization-workstreams.md) remains the only execution-priority owner.

**Research system**

Do not place general research-system questions in the solver-science registry merely to gain an ID.

- local defect -> fix + regression;
- recurring repo/agent entropy -> [periodic hygiene](periodic-repository-hygiene.md);
- durable methodological lesson -> [research operating model](solver-research-operating-model.md);
- structural ownership/debt -> owning architecture/debt authority;
- bounded unresolved investigation -> dated audit/report with decision, remaining gate, successor routing;
- repeated correctness-critical semantic invariant -> shared primitive only after the ordinary repeated-consumer threshold;
- unearned abstraction -> leave unbuilt.

## Conversational behavior

Do the intake work for the user rather than asking them to formulate a hypothesis/contract. Surface decomposition when it changes the meaning or reveals a stronger question. Answer immediately from existing evidence when possible. Preserve intent while rejecting accidental mechanism/naming assumptions. If investigation is earned, route it into the repo rather than leaving the conclusion only in chat.

A strong intake should usually create **fewer, better** queue entries.

## Optional scratch note

Not a schema or registry:

```text
RAW:
DECISION:
EXPANSION:
EXISTING CONTEXT / OWNER:
RIVALS + USEFUL INVERSE:
SURVIVING AMBIGUITY:
ANSWERABILITY: answered | existing-data | instrument-only | bounded-compute | blocked
SMALLEST DISCRIMINATOR:
OBSERVABILITY:
DISPOSITION / OWNER:
```

Delete/collapse scratch after routing. Durable state belongs to its existing owner.
