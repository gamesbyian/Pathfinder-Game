# Periodic repository hygiene plan

> **Purpose:** recurring agent-driven entropy-control pass for Pathfinder.
> **Cadence:** normally every 1–2 weeks, and after unusually large migrations/research campaigns.
> **Invocation:** a request such as **“follow the periodic hygiene check plan”** means execute this plan end-to-end from current `main`, including implementation, validation, and concise reporting.
> **Authority:** this document owns the periodic hygiene procedure. Do not copy the procedure into other docs.

The goal is not cosmetic tidiness. The goal is a repository whose current truth stays compact, whose history remains available without contaminating ordinary context, whose tools/workflows earn their maintenance cost, whose CI avoids wasted work, and whose structure resists drift.

## Operating posture

Work from current `main`. Inspect recent repository history before making judgments so the pass is relative to what actually changed since the previous hygiene round.

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

Do **not** optimize for preserving file count, script count, prose volume, historical organization, or migration scaffolding.

## 1. Establish the current baseline

Before changing files, establish what the repository considers current.

Inspect at least:

- recent merges and system changes since the previous hygiene pass;
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

Record enough before/after measurements to tell whether the pass improved context cost and CI structure. Do not create a permanent metrics bureaucracy merely to measure hygiene.

## 2. Agent-context and documentation hygiene

Audit the context an agent is expected to load for representative tasks, including at least:

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

For each route, distinguish required orientation from optional drill-down. Look for both explicitly required bloat and likely accidental bloat caused by indexes, giant authorities, or misleading routing.

### Documentation failure patterns

Look aggressively for:

- live authorities that became append-only chronicles;
- dated experiment narratives embedded in current contracts;
- “then we tried…” sequences in ordinary current reading paths;
- stale state retained above or below newer state;
- the same current numbers/gates/defaults repeated in multiple files;
- prose reproductions of JSON registries or generated inventories;
- indexes that turned into hand-maintained mini-databases;
- compatibility files that accumulated real mutable content;
- transitional/bridge documents that became permanently mandatory;
- completed migration/program documents still presented as current references;
- giant references required when a compact query can answer the task;
- repeated caveats/explanations whose authoritative version exists elsewhere;
- stale names, paths, flags, schemas, commands, examples, or screenshots;
- documents whose title/declared purpose no longer matches their contents;
- multiple documents whose ownership has converged enough that they should be consolidated.

### Ownership model

Use these categories consistently:

- **Live authority:** current truth, contract, state, priority, or next gate.
- **Current reference:** stable supporting knowledge with distinct ownership.
- **Machine registry/query:** structured facts and discovery.
- **Report:** dated evidence, experiment results, reasoning, chronology.
- **Frozen evidence/snapshot:** preserved historical state used for provenance or archaeology.
- **Compatibility path:** locator/pointer only, no duplicated mutable state.
- **Archive/history:** useful past material intentionally removed from ordinary current context.
- **Obsolete:** no longer useful enough to retain.

A mutable fact gets one owner. Other docs link rather than restate it.

Current authorities describe **what is true now**. Chronology belongs in reports/archives. When state changes, replace the obsolete statement instead of appending a correction beneath it.

Before destructive consolidation, preserve genuinely useful history in an existing dated report or a snapshot under `docs/archive/`.

Do not merge documents mechanically. Distinct files should remain distinct where they genuinely own different contracts.

### Concision standard

Edit for decision density. Remove throat-clearing, narrative connective tissue, duplicated rationale, repeated conclusions, and historical scene-setting from current references. Prefer compact tables/bullets when they communicate the same contract more cheaply.

Do not turn terse documentation into cryptic documentation. Preserve qualifiers that change decisions, boundaries, invariants, or safety/correctness.

### Context budgets

Run the existing context-budget tooling and inspect the route definitions/authority ceilings. Tighten ceilings when the live surface has materially shrunk and reasonable headroom remains. Do not loosen ceilings just to accommodate accidental prose growth without first investigating the growth.

If a recurring context failure is not covered by existing guards, add the simplest deterministic check that would have caught it.

## 3. Staleness audit driven by recent changes

Use recent commits as a map of where stale documentation/tooling is most likely.

For each materially changed subsystem, inspect nearby:

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

Pay special attention to recent changes in solver search/scheduling, research-data/provenance, persistence, workers, telemetry, naming, runtime state, schemas, and workflows.

A passing link checker is not evidence that a document is semantically current.

When recent implementation changes invalidate current prose, update the owner. When they invalidate a historical report, usually preserve the report and add/repair the current interpretation elsewhere instead of rewriting frozen evidence.

## 4. Comprehensive tooling audit

Inventory current developer/research tooling using `tooling-census` and package/workflow references before directory-by-directory browsing.

For every significant tool or tool family, determine:

- Is it still used?
- Is it discoverable through current routes?
- Does another tool supersede or substantially duplicate it?
- Is it a generic reusable instrument or a one-off experiment script?
- Does it use current names, schemas, paths, APIs, and artifact formats?
- Is it tested or at least exercised structurally?
- Is it referenced by package scripts, workflows, docs, or current code?
- Is an apparent orphan actually reached indirectly by a workflow/worker/loader?
- Does it embody assumptions invalidated by recent changes?
- Does it still belong as a standalone tool, or should shared logic move into an existing library/generic command?
- Is it compatibility machinery whose promised lifetime is over?

Prefer, in order:

1. delete truly dead tools;
2. archive historically useful one-off machinery when provenance value justifies retention;
3. consolidate overlapping tools;
4. remove obsolete aliases/wrappers after chasing every consumer;
5. keep compact machine discovery authoritative rather than rebuilding giant prose command catalogues.

Use orphan detection as evidence, not truth. Search indirect consumers before retiring anything.

Whenever a tool is removed/renamed/consolidated, chase package aliases, workflows, tests, docs, generated artifacts, readers/writers, and agent discovery surfaces.

## 5. Comprehensive GitHub Actions workflow audit

Inventory all workflows and determine their current purpose and ownership.

For each workflow ask:

- Is it still invoked or useful?
- Is it discoverable and documented appropriately?
- Does it duplicate another workflow that could be parameterized instead?
- Does it exist only for a completed migration or concluded research campaign?
- Does it call retired scripts, old flags, historical paths, or superseded formats?
- Does it materialize data that the job does not need?
- Is sparse checkout appropriate and still correct?
- Are artifacts produced/downloaded without current consumers?
- Are concurrency/cancellation rules preventing superseded work?
- Are branch/PR execution paths available, or does it unnecessarily require `main`?
- Is expensive setup repeated across jobs without buying useful isolation/parallelism?
- Is job decomposition still economical?
- Are caches effective, correctly keyed, and restoring the right material?
- Are heavyweight proofs running at a frequency proportional to their value?
- Can changed-file/scope-aware execution safely skip irrelevant work?

Delete obsolete workflows. Archive only where the workflow definition itself has historical value that is not already captured by Git history. Consolidate overlapping active workflows when that reduces maintenance/CI cost without obscuring their contracts.

Do not weaken validation merely to reduce run time.

## 6. CI runtime and structural-bloat audit

Inspect **recent CI history over a meaningful window**, not only the latest run. Compare with the last known CI-optimization baseline when available.

Examine:

- end-to-end run duration;
- queue time versus execution time;
- per-job duration;
- checkout/setup/install time;
- cache hit/miss behavior;
- dependency installation time;
- test/check/proof runtime;
- job count and parallel structure;
- repeated work across jobs;
- sparse-checkout/materialization volume;
- new dependencies or changed lockfile size;
- new validations added since the last hygiene/CI optimization pass;
- cancelled/superseded runs and whether concurrency behaves efficiently.

Distinguish:

- external runner/network/npm slowness;
- unavoidable dependency/setup cost;
- repository-caused structural regression;
- intentionally added useful validation;
- accidental duplicated or obsolete work.

### CI bloat patterns

Specifically look for:

- `npm ci` repeated across many jobs whose isolation/parallelism does not justify the setup cost;
- caches that are missing, ineffective, too broad, too narrow, or invalidated unnecessarily;
- sparse-checkout regressions;
- large runtime/generated datasets materialized in jobs that do not use them;
- broad test runners that accumulated many unrelated scripts;
- duplicated validation between checks, node tests, coverage, deep proofs, build, and specialist jobs;
- one-off migration/closeout checks still running forever;
- serial bottlenecks introduced by otherwise parallel workflows;
- excessive job fragmentation where startup/setup cost dominates useful work;
- heavyweight proof suites whose trigger conditions can safely be narrowed;
- stale artifacts or setup steps left by retired workflows/tools.

Where evidence supports it, implement safe structural improvements. Report before/after observations when measurable.

A green workflow can still be structurally wasteful. A temporarily slow hosted runner is not by itself evidence that repository changes are required.

## 7. Tests, validators, and completed-migration scaffolding

Audit the checks themselves, especially those created during large cleanup/migration campaigns.

Look for validators that:

- enforce exact prose wording rather than semantics;
- require redundant prose/data to exist in multiple formats;
- encode obsolete document structure;
- scan far more of the repository than their invariant requires;
- fail under intended sparse checkouts because they confuse “not materialized” with “not tracked”;
- duplicate another invariant;
- protect a completed migration phase rather than the final current invariant;
- discourage legitimate consolidation;
- contain stale negative fixtures or retired terminology;
- are disproportionately expensive relative to the risk they control.

Preserve useful invariants while simplifying enforcement.

Prefer semantic/structural checks over brittle sentence regexes.

Completed migration programs should eventually leave a **small permanent final-state/invariant suite**, not require the repository to replay every phase-specific closeout check forever. Collapse or retire historical validators only after identifying the durable invariants they still protect and preserving those invariants somewhere appropriate.

Do not “fix CI” by weakening a meaningful invariant.

## 8. Historical material, compatibility surfaces, and archives

Find completed plans, migration ledgers, phase records, superseded research narratives, abandoned queues, transitional bridges, one-off experiment docs, and old decision logs that pollute current discovery/search.

Classify each relevant surface using the ownership model above.

Prefer:

- live/current documents for current truth;
- reports for dated evidence;
- snapshots/archives for historical states worth keeping;
- tiny pointers only when old paths still have practical locator value;
- deletion where neither provenance nor practical discovery value remains.

Do not rewrite frozen evidence into current terminology merely to make search cleaner. Instead exclude/archive/classify it so agents do not mistake it for current authority.

Compatibility code/docs should have a reason to exist. Where possible, record or infer its retirement condition and remove it once the supported boundary has expired.

## 9. Research-infrastructure hygiene

Ensure current solver/research work can cheaply discover and combine relevant evidence already in the repo before purchasing new compute.

Audit discoverability and inter-relevance for at least:

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

Check:

- whether current queues/plans point toward relevant existing evidence;
- whether structured registries remain authoritative over prose duplicates;
- whether join keys and provenance fields still match current producers/consumers;
- whether aliases/normalizers still cover frozen evidence appropriately;
- whether freshness and population boundaries remain accurately documented;
- whether newly added evidence assets have become undiscoverable orphan datasets.

Do not silently turn historical outcome data into level-aware production policy. Preserve current level-blindness and evidence-selection rules.

## 10. General repository entropy audit

Look broadly beyond docs/tooling/CI for maintenance debt that belongs in a hygiene pass:

- dead files and orphaned exports;
- stale TODO/FIXME notes whose premise is gone;
- obsolete feature flags;
- compatibility code past its intended lifetime;
- duplicate helpers/constants/configuration;
- superseded schemas/readers/writers;
- unused dependencies;
- stale package aliases;
- generated artifacts incorrectly treated as current sources;
- abandoned architecture branches;
- impossible/retired states still described in comments/types/docs;
- misleading comments/examples/fixtures;
- unnecessary root-level clutter;
- accidental large files or generated outputs committed to the wrong place;
- redundant indexes or inventories;
- active code depending on frozen research/migration artifacts unexpectedly.

Do not turn this into unrelated feature development. The boundary is entropy reduction, maintenance leverage, and correctness of current repository structure.

## 11. Anti-regression improvements

For every recurring class of entropy found, ask whether a cheap deterministic guard can prevent recurrence.

Candidates include:

- agent-context route budgets;
- per-authority byte ceilings;
- document lifecycle metadata;
- orphan tooling/workflow detection;
- compatibility-path size/content checks;
- duplicate-current-authority detection;
- archive/current classification checks;
- semantic final-state validators;
- CI job/setup-cost summaries or trend snapshots;
- checks for transitional docs with no retirement condition;
- tooling registry/discovery coverage checks;
- workflow references to retired scripts/flags;
- generated-artifact placement/provenance checks.

Prefer simple checks piggybacking on existing CI over elaborate new infrastructure.

A hygiene mechanism should cost less to maintain and execute than the entropy it prevents.

## 12. Execution strategy

Unless the scope is tiny, use this sequence:

1. baseline and recent-history audit;
2. obvious dead/stale surface cleanup;
3. documentation/context consolidation;
4. tooling and workflow retirement/consolidation;
5. CI structural optimization;
6. validator/test simplification;
7. research-infrastructure/discovery repair;
8. anti-regression guards;
9. final hostile audit and validation.

Use multiple PR-sized slices when a single change would be difficult to review, merge, or recover. Keep the slices pointed at the same hygiene goal rather than spawning a long unrelated refactor campaign.

Avoid large compute merely to perform housekeeping. Use existing evidence and the cheapest checks that answer the question.

Useful decision heuristics:

- When history matters, archive it instead of leaving it live.
- When two current files own the same mutable fact, choose one owner.
- When a current file tells a story, move the story to a report/archive.
- When a tool cannot justify its existence, remove or archive it.
- When CI repeats work, identify what independent evidence the repetition buys.
- When a validator blocks simplification, determine whether it protects a real invariant or merely an old representation.
- When recent changes make a document suspect, verify semantics against implementation rather than polishing stale prose.

## 13. Final hostile audit

Before declaring the pass complete, inspect the resulting tree skeptically.

Ask:

- Did an archive/consolidation move break links or discovery?
- Did a compact front door accidentally become a second mutable authority?
- Did consolidation create a new giant authority?
- Did any current fact still end up owned twice?
- Did compatibility removal break a real historical/live consumer?
- Did CI speed work reduce meaningful coverage rather than remove waste?
- Did a validator get weakened rather than modernized?
- Did main move during the pass in a way that makes updated current-state docs stale?
- Did newly added hygiene machinery itself create notable maintenance/context/CI cost?
- Is any archived material still being routed as ordinary current reading?
- Are there obvious surfaces that will regrow into the same problem because no ownership/guard changed?
- Does the final branch still satisfy current naming, architecture, research, and evidence contracts?

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
- a concise final report containing:
  - what was removed, archived, consolidated, or modernized;
  - measurable context/CI changes where available;
  - any remaining hygiene debt that genuinely needs a later pass;
  - anything intentionally left alone and why when that choice is non-obvious.

The desired result is not merely **clean today**. The repository should be cheaper to understand, cheaper to validate, harder to make stale, and easier for the next agent to change correctly.