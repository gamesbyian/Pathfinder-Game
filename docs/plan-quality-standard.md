# Plan quality standard

Status: **current planning authority**.

Use this document when creating, revising, or auditing a substantial implementation, migration, research-infrastructure, CI, data, workflow, or repository-wide plan.

The goal is not prettier plans. The goal is to make incomplete plans difficult to call complete.

A good plan must be grounded in current repository truth, challenge its own premises, account for every affected contract and authority, define executable closure evidence, and finish by reconciling the splash zone it creates.

For a substantial plan, create a sibling quality manifest named `<plan-basename>.quality.json` and validate it with:

```sh
npm run plan:quality -- --plan=docs/example-plan.md
```

The manifest is not a second plan. It is the machine-readable closure contract for the questions prose is bad at enforcing.

Every tracked `*.quality.json` manifest is also validated automatically by the permanent `test:plan-quality` Node contract. The census is derived from Git-tracked files rather than the physical worktree, so sparse CI cannot silently omit a manifest from validation. A manifest must be the sibling of its tracked plan and pass the same structural validator used by `plan:quality`.

## 1. Why this standard exists

Several major Pathfinder programs have produced the same failure shape:

- an apparently complete plan accurately described the central change but under-specified consumers, transports, workflows, persisted data, compatibility readers, current authorities, or runtime topology;
- implementation then went green locally or under ordinary CI while maintained execution paths remained broken;
- later hostile audits found omissions after rows/phases/programs had already been called complete;
- post-implementation repair had to update queue state, registries, contracts, docs, workflow ownership, historical/current-state boundaries, generated artifacts, or tests that the original plan had not treated as part of closure.

The naming-cleanup retrospective is the strongest historical example. Phases 1-7 repeatedly left behind broken consumers, stale transports, generated-data mismatches, sibling workflow/API omissions, plain-Node failures, editor regressions, worker forwarding gaps, and compatibility leaks despite green local validation. Later phases showed that even strengthened execution could still miss sparse-checkout topology, workflow argument semantics, raw historical joins, current-authority drift, and semantic access hidden behind normalized objects.

The Hint evidence consolidation repeated the lesson at a different scale. Its hostile closeout disproved a prior completion claim and found remaining writers, v4-blind consumers, persistence-state errors, stale control-plane documentation, incomplete guards, workflow invalidation gaps, and post-closeout research-semantics drift. The plan itself had to be retrospectively strengthened so that "all", "maintained", "canonical", and "complete" meant mechanically owned populations and executable proofs.

The CI speed program supplies the complementary positive habit: measure first, keep a current authority, explicitly preserve the protected contract, separate hypotheses from accepted changes, close negative branches, and require production-shaped evidence rather than declaring success from one favorable run.

This standard extracts those habits into one reusable planning contract.

## 2. When a plan needs the full standard

Use the full standard and quality manifest when work has any of these properties:

- crosses more than one architectural boundary;
- changes a schema, persisted format, identity, vocabulary, workflow contract, compatibility surface, or public/internal API used by multiple consumers;
- changes research evidence, provenance, registries, queue semantics, or solver-research infrastructure;
- changes CI topology, validation ownership, workflow triggers, caches, or evidence publication;
- migrates or bulk-edits tracked data;
- spans multiple PRs/phases;
- could leave current docs, tools, workflows, generated data, or queue state stale after implementation;
- contains phrases such as "all", "every", "canonical", "maintained", "complete", "fully migrated", "single authority", or "no remaining".

A small local code change does not need ceremony merely because a plan could be written for it.

## 3. Planning sequence

A substantial plan is not ready for implementation until it has passed the following sequence.

### 3.1 Start from current repository truth

Record the current `main` reconciliation point.

Inspect the current implementation and current authorities before relying on reports, old plans, branch names, or PR prose. Historical material is evidence, not current truth.

Use repository discovery rather than memory alone:

- current owning docs and schemas;
- package aliases and maintained commands;
- tooling census and lifecycle registries;
- workflow lifecycle/README material;
- research asset/resource registries where applicable;
- current solver queue/future-work authorities where applicable;
- actual producers, transports, consumers, persistence boundaries, and generated artifacts.

If GitHub/code search or another discovery mechanism is unavailable or incomplete, the plan must say what substitute census was used. An empty search result is never evidence of absence when indexing is known to be incomplete.

### 3.2 Challenge the question before solving it

Before specifying implementation, ask whether the stated task is the right problem boundary.

The plan must record at least:

- the motivating symptom or request;
- the underlying question(s) or premise(s);
- plausible alternate explanations or framings;
- the smallest discriminator that would falsify or materially redirect the plan;
- whether existing evidence already answers part of the question;
- whether the proposed work is solving a root cause, a symptom, or an organizational inconvenience;
- what should explicitly *not* be built if a simpler existing structure can absorb the need.

For solver/research work, this includes asking whether the premise has already been tested under a materially equivalent form, whether the population/opportunity actually exists, and whether a queue item is being expanded without earned evidence.

For migration/infrastructure work, this includes asking whether the apparent new abstraction duplicates an existing authority, codec, registry, lifecycle owner, query surface, transaction boundary, or shared helper.

### 3.3 Inventory prior art inside the repository

Before inventing a mechanism, search for structures that can be reused or adapted.

Typical reusable patterns include:

- canonical normalizer + single-write compatibility boundary;
- lifecycle registries and machine inventories;
- source-run / manifest identity;
- shared codecs and storage facades;
- transaction/receipt patterns;
- query/index surfaces;
- execution records and ledgers;
- impact classifiers and validation registries;
- central harvest/publish lanes;
- historical-reader adapters;
- existing experiment/research contracts.

The plan must state whether each major new mechanism is:
- reuse;
- extension;
- deliberate parallel concept with a stated semantic distinction; or
- genuinely new because no current owner fits.

"Create a new X" is not decision-complete until the nearest existing analogues are named and dispositioned.

### 3.4 Build the impact map from contracts, not filenames

For every changed concept, trace its full live path.

At minimum classify:

- definitions/types/schemas;
- producers/writers;
- transports/serialization;
- workers/subprocesses/backends;
- consumers/readers;
- persistence/stores;
- browser/UI/application state if applicable;
- CLI/package aliases;
- workflows and triggers/path filters;
- generated artifacts and indexes;
- tests/validators/ratchets;
- compatibility/historical readers;
- current docs/ADRs/agent routing;
- registries/catalogues/lifecycle metadata;
- research query/resource/asset contracts;
- solver queue/future-work consequences.

A file list may be useful implementation detail, but it is not an impact map.

Every live surface gets one disposition: changed, intentionally unchanged, compatibility-only, historical/frozen, superseded, or not applicable.

### 3.5 Model execution topology

A plan must identify where the real behavior runs.

Distinguish, where relevant:

- local full checkout;
- sparse checkout / repository-object reads;
- Node vs tsx vs bundled/Vite execution;
- browser execution;
- worker/raced/direct solver paths;
- Firestore emulator/persistence boundary;
- GitHub Actions job/shard/combine/harvest paths;
- cached vs cold topology;
- partial-failure and retry paths.

Tests that run under a different topology are supporting evidence, not closure evidence for topology-specific behavior.

### 3.6 Define compatibility and historical behavior explicitly

When old and new forms coexist, the plan must name:

- compatibility owner;
- accepted historical forms;
- canonical internal representation;
- canonical write form;
- normalization boundary;
- downstream readers/joins that must operate on normalized semantics;
- retirement condition, when one exists.

Do not treat compatibility as string replacement. Parsing, normalization, joining, grouping, deduplication, discovery, persistence, rendering, and dispatch can each reintroduce mixed-era bugs.

### 3.7 Specify data migration as a proof obligation

For bulk or persisted-data changes, the plan must mechanically define the input universe and prove:

- discovered store/artifact population;
- before/after record counts where meaningful;
- semantic equivalence or intentional semantic delta;
- identity/join preservation;
- path/referee/validity disposition where relevant;
- idempotency;
- retry/interruption behavior;
- backwards readability where required;
- exact historical items intentionally left untouched.

Hand-enumerated inputs are not sufficient for a claim such as "full corpus" unless a mechanical owner proves the enumeration complete.

## 4. Solver queue and research-system impact

Every substantial plan must answer whether it changes the solver research program, even if the answer is "no".

Audit at least:

- `docs/solver-optimization-workstreams.md`;
- `docs/solver-future-work.md`;
- relevant specialist research docs;
- research question/status relations;
- research assets/resource contracts;
- experiment/result/source-run schemas;
- workflow lifecycle and evidence publication;
- capability/evidence/query surfaces.

For each affected queue item, classify the effect:

- blocks;
- unblocks;
- changes evidence quality;
- changes acquisition cost;
- changes available observations;
- retires a workaround;
- invalidates old evidence;
- changes no priority/state but changes the recommended mechanism.

Infrastructure plans must not silently reprioritize research. Conversely, infrastructure completion must not leave queue entries asking for work that the plan just completed.

## 5. Definition of done

A plan is not decision-complete if its definition of done is only prose.

Each completion claim must map to at least one explicit proof in the quality manifest.

Accepted proof classes are:

- `command` — deterministic repository command with expected success/property;
- `test` — named test or test family;
- `guard` — permanent invariant/ratchet with adversarial coverage;
- `census` — mechanically derived population with zero/unclassified threshold;
- `workflow` — production-shaped GHA/topology execution with exact semantic assertion;
- `artifact` — generated manifest/report/migration record with machine-checkable fields;
- `query` — machine query proving state/relationship/population;
- `manual-evidence` — allowed only when no mechanical proof is technically possible, with explicit reason and bounded observation.

Pure statements such as "verify all consumers are updated" are not closure evidence.

A definition of done should generally include:

1. implementation behavior;
2. migration/compatibility behavior;
3. negative/adversarial cases;
4. real execution topology;
5. population completeness;
6. current-authority/documentation reconciliation;
7. queue/research-system reconciliation;
8. final current-main hostile reconstruction.

## 6. Guards must prove their own coverage

If a plan relies on a new permanent guard, ratchet, detector, or ownership check, the plan must specify:

- what bypass/failure class it prevents;
- at least one adversarial or equivalent-form self-test;
- what files/authorities invalidate it in scoped CI;
- whether it runs in the real topology where the invariant matters;
- how additions to the guarded population are discovered.

A lexical grep that catches today's syntax is not automatically an architectural guard.

## 7. Phase design

Use phases to separate evidence and risk, not merely to divide a large patch.

Each phase needs:

- entry assumptions;
- exact scope;
- affected contracts/systems;
- implementation outputs;
- compatibility state before and after;
- proof-bearing exit criteria;
- rollback/recovery considerations when stateful;
- what later phases are forbidden from assuming until this phase closes.

Prefer serial, merge-verified batches when overlapping migrations would make authority ambiguous.

Do not begin the next dependent phase because local checks are green. The previous phase closes only when its current-head evidence is complete and the recorded state matches repository truth.

## 8. The splash-zone closeout

Every substantial plan ends with an explicit splash-zone phase.

The splash zone is everything that may now be stale because the implementation changed the repository's truth, even if it was not edited during the main implementation.

Reconstruct this from current repository state, not from the implementation diff.

Audit:

- current architecture/reference docs;
- agent routing and developer references;
- package commands and examples;
- workflow comments, inputs, triggers, lifecycle metadata, and discoverability docs;
- data/resource/asset/schema registries;
- query surfaces and index semantics;
- current generated artifacts and receipts;
- compatibility/historical interpretation docs;
- solver queue and future-work entries;
- research-system contracts and evidence doctrine;
- tests/guards that still encode the old model;
- one-shot or campaign scaffolding that should now retire;
- stale plans/handoffs that should be marked completed, historical, superseded, or archived.

Historical reports should remain historically accurate. Update current authorities and new outputs; do not rewrite the past merely to use today's vocabulary.

The plan is not complete while current repo guidance teaches the pre-plan architecture.

## 9. Independent hostile closeout

For high-risk or cross-cutting plans, final closeout should be a fresh reconstruction, preferably from fresh context.

The auditor should assume the implementation's completion claim is false until current repository evidence proves otherwise.

The audit must not use the implementation diff, PR body, phase reports, or quality manifest as the primary inventory. Those are claims to test.

Reconstruct at least:

- producer population;
- consumer population;
- workflow population;
- persistence/store population;
- compatibility/historical-reader population;
- current-authority population;
- registry/queue/resource consequences.

Discrepancies become implementation work, not "follow-up" merely because they were found after the nominal final phase.

## 10. Common planning failure modes

Treat these as hostile-audit prompts.

- Definition-centric planning: owner changed, consumers forgotten.
- File-centric planning: filenames enumerated, semantic operations not traced.
- Green-CI optimism: validation graph differs from execution graph.
- Prose completeness: "all" has no machine population owner.
- Compatibility leakage: dual-read becomes dual-write or raw historical joins survive.
- Sibling omission: worker/raced/alternate-engine/package/workflow identity assumed covered by a nearby row.
- Topology substitution: local/full-checkout test stands in for sparse/GHA/browser/emulator behavior.
- Guard theater: detector exists but equivalent syntax bypasses it or scoped CI does not select it.
- Bulk-migration hand enumeration: migration succeeds over the listed subset while undiscovered stores remain.
- Current-authority drift: code is right while architecture, agent docs, examples, ADRs, registries, or query docs remain wrong.
- Queue drift: completed infrastructure is still listed as future solver work, or changed evidence availability is not reflected.
- Historical rewrite: frozen evidence is edited instead of teaching current readers how to interpret it.
- Phase inflation: phases contain too much unrelated work to audit independently.
- Branch authority ambiguity: stacked/superseded branches make completion unreconstructable.
- One-lucky-run completion: timing/performance plans close from a favorable sample rather than bounded repeat evidence.
- Negative-result amnesia: rejected design branches remain live candidates and get rediscovered.

## 11. Quality manifest contract

A substantial plan's sibling `.quality.json` must contain:

- `schemaVersion`;
- `plan`;
- `status`;
- `reconciledMainRef`;
- `premises`;
- `repositoryPriorArt`;
- `impactDomains`;
- `solverQueueImpact`;
- `phases`;
- `definitionsOfDone`;
- `splashZone`;
- `hostileCloseout`.

The checker enforces the required structure, requires every definition of done to have a non-prose proof, and rejects empty impact/closeout populations.

The manifest deliberately does **not** attempt to prove that a plan is intellectually correct. It makes omissions and unsupported completion claims visible enough for an agent or human reviewer to challenge.

## 12. Review rubric

When asked "check this plan against the repo's standard for plans", audit in this order:

1. Is the problem/premise well-framed and falsifiable?
2. Is it reconciled to current `main`, current authorities, and actual implementation?
3. Did it inspect/adapt existing repo structures before inventing new ones?
4. Does its impact map cover semantic contracts end-to-end?
5. Does it identify real execution topologies?
6. Are compatibility/history/migration semantics explicit?
7. Are solver queue and research-system consequences dispositioned?
8. Does every completion claim have executable proof?
9. Are guards self-testing and correctly invalidated?
10. Are phases independently closable and authority-safe?
11. Does the final splash-zone phase repair all current-state consequences?
12. Does hostile closeout reconstruct from current truth rather than trusting implementation claims?

A plan with a major gap in items 1-8 should be amended before implementation rather than relying on audits to discover the omission later.

## 13. Historical sources for this standard

The strongest repo-specific lessons came from:

- `docs/naming-cleanup-history-and-lessons.md`;
- `docs/naming-cleanup-process-hardening.md`;
- `docs/naming-cleanup-plan.md`;
- `docs/change-recipes.md`;
- `docs/hint-evidence-execution-identity-storage-consolidation-plan.md`;
- the hostile Hint consolidation closeout and follow-up PRs;
- `docs/ci-35s-critical-path-plan.md`;
- current repository hygiene and solver-research operating authorities.

This document owns the general planning standard. Domain-specific plans may impose stricter requirements.
