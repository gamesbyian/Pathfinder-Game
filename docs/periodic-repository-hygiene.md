# Periodic repository hygiene plan

> **Purpose:** recurring agent-driven entropy-control pass for Pathfinder.
> **Cadence:** run weekly during heavy agent development, every 1–2 weeks otherwise, and sooner after unusually large migrations, research campaigns, or tooling/CI changes.
> **Invocation:** a request such as **“follow the periodic hygiene check plan”** means execute this plan end-to-end from current `main`, including implementation, final-head validation, and concise reporting.
> **Authority:** this document owns the periodic hygiene procedure. Do not copy the procedure into other docs.

The goal is not cosmetic tidiness. The goal is a repository whose current truth stays compact, whose history remains available without contaminating ordinary context, whose tools and workflows earn their maintenance cost, whose CI avoids wasted work, and whose structure resists drift.

## Core execution rule

**Every run covers every hygiene domain in this plan. Not every run reads every file.**

Use recent diffs, inventories, machine-readable registries, compact queries, size/runtime measurements, orphan detection, and current authority maps to establish whether an area is healthy cheaply. Escalate to deep reading when a signal, recent change, age, inconsistency, unexplained growth, or missing evidence justifies it.

Do not downgrade this into a lightweight checklist merely because the previous pass was recent. Pathfinder changes quickly enough that material context, tooling, workflow, validator, and documentation entropy can accumulate within a week. Conversely, do not mechanically reread stable subsystems when cheap evidence establishes that nothing relevant changed.

The economic objective is to reduce total agent cost across subsequent repository work, not merely minimize the tokens spent on the hygiene pass itself. Count avoided wrong turns, repeated experiments, duplicated tools, stale implementation work, and unnecessary CI compute as part of that cost.

## Operating posture

Work from current `main`. Determine what changed since the previous hygiene pass or closest equivalent maintenance round. If no explicit prior pass is recorded, use a practical recent window and the last major agent-context/CI/tooling cleanup as baselines where available.

This is an **implementation task**, not merely an audit report. Make well-supported cleanup and hardening changes as you go. Prefer coherent, reviewable slices over one enormous diff when the work is broad. Preserve useful historical evidence, but do not preserve obsolete live surfaces merely because they once mattered.

Optimize for:

- concise, decision-dense prose;
- minimal narrative in live/current docs;
- low agent context/token cost;
- one owner for each mutable fact;
- minimal redundant documentation;
- consolidation where separate files no longer have distinct ownership;
- explicit separation of current authority from history/evidence;
- cheap discovery of current priorities, tools, workflows, and evidence;
- retirement/removal of stale, obsolete, abandoned, transitional, and compatibility-only surfaces;
- fast, structurally efficient CI without weakening meaningful validation;
- a small, comprehensible tooling/workflow surface;
- durable, cheap anti-regression checks where recurring entropy is found.

Do not optimize for preserving file count, script count, prose volume, historical organization, migration scaffolding, or yesterday's validator shape.

## 1. Establish the current baseline

Before changing files, establish what the repository currently considers authoritative and what changed since the previous pass.

Account for at least:

- recent merges and materially changed subsystems;
- `AGENTS.md` and thin adapters such as `CLAUDE.md` / Copilot instructions;
- `docs/README.md`, `reports/README.md`, `scripts/README.md`, workflow indexes, and other routing/index surfaces;
- current solver/research authorities and specialist docs;
- machine-readable registries and compact-query tooling;
- active, recently completed, or transitional plans/migrations;
- package scripts and validation entry points;
- GitHub Actions workflows and recent run history;
- script/tool inventories and orphan-detection output;
- current archives/snapshots and completed-program evidence.

Use compact discovery first where available:

```bash
node scripts/tooling-census.mjs --compact
node scripts/research-status-index.mjs --compact
node scripts/agent-context-budget.mjs
```

For solver evidence/assets, query `research-asset-query.mjs` rather than preloading the full registry/catalogue.

Use Git history as a triage map. A subsystem with no relevant recent changes and clean machine/inventory signals may require only a bounded spot-check. A subsystem with heavy churn, unexplained growth, new tooling/workflows, or changed contracts deserves deeper inspection.

Record enough before/after measurements to tell whether the pass improved context cost and CI structure. Do not create a permanent metrics bureaucracy merely to measure hygiene.

## 2. Agent-context and documentation hygiene

Account for representative agent routes, including at least:

- ordinary product/code change;
- cross-cutting schema/state/telemetry change;
- solver implementation;
- solver research;
- scheduler/budget research;
- experiment archaeology;
- hint/provenance work;
- variant-family work;
- naming/terminology work;
- this periodic hygiene pass itself.

For each route, distinguish required orientation from optional drill-down. Measure required context where practical and inspect likely accidental context caused by indexes, giant authorities, misleading routing, or stale compatibility docs.

Look aggressively for:

- live authorities that became append-only chronicles;
- dated experiment narratives embedded in current contracts;
- stale state retained above or below newer state;
- the same current numbers/gates/defaults repeated in multiple files;
- prose reproductions of JSON registries or generated inventories;
- indexes that turned into hand-maintained mini-databases;
- compatibility files that accumulated mutable content;
- transitional/bridge documents that became permanently mandatory;
- completed migration/program documents still presented as current references;
- giant references required when a compact query can answer the task;
- repeated caveats/explanations whose owner exists elsewhere;
- stale names, paths, flags, schemas, commands, examples, or screenshots;
- documents whose title/declared purpose no longer matches their contents;
- documents whose ownership has converged enough that they should be consolidated.

Use this ownership model:

- **Live authority:** current truth, contract, state, priority, or next gate.
- **Current reference:** stable supporting knowledge with distinct ownership.
- **Machine registry/query:** structured facts and discovery.
- **Report:** dated evidence, experiment results, reasoning, chronology.
- **Frozen evidence/snapshot:** preserved historical state for provenance/archaeology.
- **Compatibility path:** locator/pointer only, no duplicated mutable state.
- **Archive/history:** useful past material intentionally removed from ordinary current context.
- **Obsolete:** no longer useful enough to retain.

A mutable fact gets one owner. Other docs link rather than restate it. Current authorities describe **what is true now**. When state changes, replace the obsolete statement instead of appending a correction beneath it.

Before destructive consolidation, preserve genuinely useful history in an existing dated report or snapshot under `docs/archive/`.

Edit current docs for decision density. Remove throat-clearing, narrative connective tissue, duplicated rationale, repeated conclusions, and historical scene-setting. Preserve qualifiers that change decisions, boundaries, invariants, or correctness.

Run the context-budget tooling. Tighten ceilings when the live surface has materially shrunk and reasonable headroom remains. Do not loosen ceilings merely to accommodate unexplained prose growth.

## 3. Staleness audit driven by recent changes

For every materially changed subsystem, inspect the nearby surfaces most likely to drift:

- authorities/reference docs;
- agent routing;
- examples and command snippets;
- CLI flags and package aliases;
- workflow inputs/defaults;
- schemas and generated formats;
- report producers/readers/joins;
- tests and validators;
- migration/compatibility notes;
- troubleshooting advice;
- machine registries/catalogues.

Pay special attention to solver search/scheduling, research-data/provenance, persistence, workers, telemetry, naming, runtime state, schemas, and workflows when they changed recently.

A passing link checker is not evidence that prose is semantically current. Verify suspect documentation against implementation and current producers/consumers.

Do not rewrite frozen evidence merely because current terminology changed. Repair the current interpretation/routing instead.

## 4. Comprehensive tooling audit

Account for the entire developer/research tooling surface using `tooling-census`, package aliases, workflow references, and targeted search before broad browsing.

For each significant tool or tool family determine:

- whether it is still used and discoverable;
- whether another tool supersedes or substantially duplicates it;
- whether it is reusable infrastructure or one-off experiment machinery;
- whether it uses current names, schemas, paths, APIs, and artifact formats;
- whether it is tested or structurally exercised;
- whether it is referenced indirectly by workflows/workers/loaders;
- whether recent changes invalidated its assumptions;
- whether shared logic belongs in an existing generic tool/library instead;
- whether compatibility machinery has outlived its supported boundary.

Prefer, in order:

1. delete truly dead tools;
2. archive historically useful one-off machinery only when provenance value justifies retention;
3. consolidate overlapping tools;
4. remove obsolete aliases/wrappers after chasing every consumer;
5. keep compact machine discovery authoritative rather than rebuilding prose command catalogues.

Use orphan detection as evidence, not truth. When retiring or consolidating tooling, chase package aliases, workflows, tests, docs, generated artifacts, readers/writers, and agent discovery surfaces.

## 5. Comprehensive GitHub Actions workflow audit

Account for every workflow and its current purpose. Use workflow inventories and recent run history to avoid rereading unchanged definitions unnecessarily, but do not leave a workflow unclassified.

For each workflow ask:

- Is it still invoked or useful?
- Is it discoverable and documented appropriately?
- Does it duplicate another workflow that could be parameterized instead?
- Does it exist only for a completed migration or concluded research campaign?
- Does it call retired scripts, flags, paths, or formats?
- Does it materialize data that the job does not need?
- Is sparse checkout appropriate and still correct?
- Are artifacts produced/downloaded without consumers?
- Are concurrency/cancellation rules preventing superseded work?
- Does it unnecessarily require `main`?
- Is expensive setup repeated without buying useful isolation/parallelism?
- Is job decomposition still economical?
- Are caches effective and correctly keyed?
- Are heavyweight proofs running at a frequency proportional to their value?
- Can changed-file/scope-aware execution safely avoid irrelevant work?

Delete obsolete workflows. Archive a workflow definition only when its historical value is not already adequately preserved by Git history. Consolidate overlapping active workflows where that reduces maintenance/CI cost without obscuring their contracts.

Do not weaken validation merely to reduce runtime.

## 6. CI runtime and structural-bloat audit

Inspect recent CI history over a meaningful window and compare with the last CI-optimization baseline when available. During heavy development, include enough runs to distinguish persistent regression from one slow hosted runner.

Examine:

- end-to-end duration;
- queue time versus execution time;
- per-job duration;
- checkout/setup/install time;
- cache hit/miss behavior;
- dependency installation time;
- test/check/proof runtime;
- job count and parallel structure;
- repeated work across jobs;
- sparse-checkout/materialization volume;
- dependency/lockfile growth;
- validations added since the last pass;
- cancelled/superseded runs and concurrency behavior.

Distinguish:

- external runner/network/npm slowness;
- unavoidable dependency/setup cost;
- repository-caused structural regression;
- intentionally added useful validation;
- accidental duplicated or obsolete work.

Specifically look for:

- repeated `npm ci` whose isolation/parallelism does not justify setup cost;
- missing/ineffective/over-invalidated caches;
- sparse-checkout regressions;
- large data materialized in jobs that do not use it;
- broad runners that accumulated unrelated checks;
- duplicated validation across checks, node tests, coverage, deep proofs, build, and specialist jobs;
- one-off migration/closeout checks still running forever;
- serial bottlenecks;
- excessive job fragmentation where startup dominates useful work;
- heavyweight proof suites with safely narrowable triggers;
- stale artifacts/setup steps from retired workflows/tools.

Where evidence supports it, implement safe structural improvements. A green workflow can still be wasteful. A temporarily slow hosted runner is not by itself evidence that repository changes are required.

## 7. Tests, validators, and completed-migration scaffolding

Audit checks themselves, especially those created during large cleanup/migration campaigns.

Look for validators that:

- enforce exact prose wording rather than semantics;
- require redundant prose/data in multiple formats;
- encode obsolete document structure;
- scan far more than their invariant requires;
- confuse “not materialized” with “not tracked” in sparse checkouts;
- duplicate another invariant;
- protect a completed migration phase rather than the final current invariant;
- discourage legitimate consolidation;
- contain stale fixtures or retired terminology;
- cost disproportionately more than the risk they control.

Preserve useful invariants while simplifying enforcement. Prefer semantic/structural checks over brittle sentence regexes.

Completed migration programs should leave a small permanent final-state/invariant suite, not replay every phase-specific closeout forever. Collapse or retire historical validators only after preserving the durable invariants they still protect.

Do not “fix CI” by weakening a meaningful invariant.

## 8. Historical material, compatibility surfaces, and archives

Find completed plans, migration ledgers, phase records, superseded research narratives, abandoned queues, transitional bridges, one-off experiment docs, and old decision logs that pollute current discovery/search.

Classify relevant surfaces using the ownership model above. Prefer current docs for current truth, reports for dated evidence, snapshots/archives for worthwhile historical states, tiny pointers for useful old paths, and deletion where neither provenance nor discovery value remains.

Do not rewrite frozen evidence into current terminology merely to make search cleaner. Exclude/archive/classify it so agents do not mistake it for current authority.

Compatibility code/docs should have a reason to exist and, where practical, a retirement condition. Remove them once the supported boundary expires.

## 9. Research-infrastructure hygiene

Ensure current solver/research work can cheaply discover and combine relevant evidence before purchasing new compute.

Account for at least:

- research reports;
- logs and manifests;
- hint provenance;
- fingerprints/descriptors;
- technique census/capability maps;
- variant/family datasets;
- lifecycle telemetry;
- exact/reference labels;
- known-solution profiles/prefix data;
- operational traces;
- production/stress benchmarks;
- corpus metadata;
- scheduling/allocation evidence.

Check whether current queues/plans point toward relevant existing evidence; structured registries remain authoritative over prose duplicates; join keys/provenance fields still match producers/consumers; aliases/normalizers still cover frozen evidence; freshness/population boundaries remain accurate; and newly added evidence assets are discoverable.

Preserve level-blindness and evidence-selection rules. Historical outcome data must not silently become runtime policy.

## 10. General repository entropy audit

Account broadly for maintenance debt that belongs in a hygiene pass:

- dead files and orphaned exports;
- stale TODO/FIXME notes whose premise is gone;
- obsolete feature flags;
- compatibility code past its lifetime;
- duplicate helpers/constants/configuration;
- superseded schemas/readers/writers;
- unused dependencies;
- stale package aliases;
- generated artifacts treated as current sources;
- abandoned architecture branches;
- impossible/retired states in comments/types/docs;
- misleading examples/fixtures;
- unnecessary root-level clutter;
- accidental large files/generated outputs;
- redundant indexes/inventories;
- active code unexpectedly depending on frozen research/migration artifacts.

Do not turn this into unrelated feature development. The boundary is entropy reduction, maintenance leverage, and correctness of current repository structure.

## 11. Anti-regression improvements

For each recurring class of entropy found, ask whether a cheap deterministic guard can prevent recurrence.

Candidates include:

- context-route budgets and per-authority ceilings;
- document lifecycle metadata;
- orphan tooling/workflow detection;
- compatibility-path size/content checks;
- duplicate-current-authority detection;
- archive/current classification checks;
- semantic final-state validators;
- CI job/setup-cost summaries or trend snapshots;
- checks for transitional docs with no retirement condition;
- tooling discovery coverage;
- workflow references to retired scripts/flags;
- generated-artifact placement/provenance checks.

Prefer simple checks piggybacking on existing CI over elaborate infrastructure. A hygiene mechanism should cost less to maintain and execute than the entropy it prevents.

## 12. Execution strategy

Use this sequence unless evidence supports a smaller equivalent path:

1. baseline and recent-history accounting;
2. cheap inventory/delta/context/CI signals across **all** hygiene domains;
3. deep inspection where signals, churn, age, uncertainty, or unexplained growth justify it;
4. obvious dead/stale surface cleanup;
5. documentation/context consolidation;
6. tooling/workflow retirement or consolidation;
7. CI structural optimization;
8. validator/test simplification;
9. research-infrastructure/discovery repair;
10. anti-regression guards;
11. final hostile audit and validation.

The important distinction is **bounded inspection, not bounded scope**. Every run should be able to say why each major hygiene domain is healthy, changed, or requires work.

Use multiple PR-sized slices when one change would be difficult to review, merge, or recover. Keep slices pointed at the same hygiene goal rather than spawning an unrelated refactor campaign.

Avoid large compute merely for housekeeping. Use existing evidence and the cheapest checks that answer the question.

Useful heuristics:

- When history matters, archive it instead of leaving it live.
- When two current files own the same mutable fact, choose one owner.
- When a current file tells a story, move the story to a report/archive.
- When a tool cannot justify its existence, remove or archive it.
- When CI repeats work, identify what independent evidence the repetition buys.
- When a validator blocks simplification, determine whether it protects a real invariant or merely an old representation.
- When recent changes make a document suspect, verify semantics against implementation rather than polishing stale prose.
- When a domain looks unchanged, prove that cheaply with deltas/inventory before skipping deep inspection.

## 13. Final hostile audit

Before declaring the pass complete, inspect the resulting tree skeptically.

Ask:

- Did archive/consolidation moves break links or discovery?
- Did a compact front door become a second mutable authority?
- Did consolidation create a new giant authority?
- Is any current fact still owned twice?
- Did compatibility removal break a real consumer?
- Did CI speed work reduce meaningful coverage rather than remove waste?
- Did a validator get weakened rather than modernized?
- Did `main` move enough during the pass to make updated current-state docs stale?
- Did new hygiene machinery itself create notable maintenance/context/CI cost?
- Is archived material still routed as ordinary current reading?
- Are obvious regrowth paths left without ownership or guards?
- Does the final branch satisfy current naming, architecture, research, and evidence contracts?

Run the appropriate repository validation suite and inspect the **actual final CI result on the final head**. Do not claim superseded/intermediate runs validate the finished branch.

## Completion standard

A completed hygiene pass leaves:

- implemented cleanup/hardening changes, not just findings;
- appropriate green validation on the final state;
- current docs concise and non-narrative relative to their ownership;
- historical evidence preserved but removed from ordinary current context where appropriate;
- dead/stale tools and workflows removed or explicitly classified;
- current tooling/workflows consistent with recent subsystem changes;
- CI structural waste reduced where evidence supports it;
- useful final invariants retained while obsolete migration scaffolding is retired;
- compact discovery surfaces working for current tools/evidence;
- recurring entropy protected by proportionate guards;
- a concise final report stating what changed, measurable context/CI effects where available, remaining genuine hygiene debt, and any non-obvious surfaces intentionally left alone.

The desired result is not merely **clean today**. The repository should be cheaper to understand, cheaper to validate, harder to make stale, and easier for the next agent to change correctly.