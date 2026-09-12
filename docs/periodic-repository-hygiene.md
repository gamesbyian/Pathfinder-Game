# Periodic repository hygiene plan

> **Purpose:** recurring agent-driven entropy-control pass for Pathfinder.
> **Cadence:** weekly during heavy agent development, every 1–2 weeks otherwise, and sooner after unusually large migrations, research campaigns, or tooling/CI changes.
> **Invocation:** “follow the periodic hygiene check plan” means execute this plan end-to-end from current `main`, including implementation, final-head validation, and concise reporting.
> **Authority:** this document owns the periodic hygiene procedure. Do not duplicate the procedure elsewhere.

The goal is not cosmetic tidiness. Keep current truth compact, history available without polluting ordinary context, source/edit surfaces reviewable, evidence accessible to agents, tooling/workflows worth their maintenance cost, and CI structurally efficient.

## Core rule

**Every run covers every hygiene domain. Not every run reads every file.**

Start with recent diffs, inventories, compact queries, byte/runtime measurements, orphan detection, current authority maps, and workflow history. Escalate when churn, age, inconsistency, growth, a recent migration, or missing evidence justifies deeper inspection. The objective is total future agent cost, including wrong turns, duplicated tools, repeated experiments, hard-to-edit giant files, inaccessible evidence, and wasted CI/solver compute.

Work from current `main`. This is an implementation task, not merely an audit. Make supported cleanup/hardening changes as you go. Preserve useful history, not obsolete live surfaces.

Optimize for concise current authorities, one owner per mutable fact, compact discovery, stable boundaries, small comprehensible tool/workflow surfaces, reviewable file sizes, efficient CI, and cheap guards against recurring entropy. Do not optimize for preserving file count, prose volume, migration scaffolding, historical organization, or yesterday's validator shape.

## 1. Establish the baseline

Account for:

- recent merges and materially changed subsystems;
- `AGENTS.md` and thin provider adapters such as `CLAUDE.md` / Copilot instructions;
- routing/index surfaces (`docs/README.md`, `reports/README.md`, `scripts/README.md`, workflow indexes);
- current solver/research authorities and specialist docs;
- machine registries and compact-query tooling;
- active, completed, or transitional plans/migrations/research campaigns;
- package scripts, validation entry points, workflows, and recent run history;
- tool/script inventories and orphan signals;
- current archives/snapshots and completed-program evidence;
- file-size/context-budget ratchets and their exemptions.

Use compact discovery first:

```bash
node scripts/tooling-census.mjs --compact
node scripts/research-status-index.mjs --compact
node scripts/agent-context-budget.mjs
npm run check:file-size-ratchet
```

For solver evidence/assets, query `research-asset-query.mjs` instead of preloading the full registry/catalogue.

Also reverse-sweep each recently completed migration, experiment, temporary bridge, or one-off validation campaign. Look outward from the completed program for package aliases, universal-CI membership, workflows, triggers, fixtures, inventories, compatibility owners, contract checkers, docs, and discovery entries. Ordinary dead-code scans can miss residue whose individual consumers still look plausible.

Record enough before/after measurements to establish whether context, editability, or CI structure improved. Do not create metrics bureaucracy merely to measure hygiene.

## 2. Agent context and documentation

Account for representative routes: ordinary code change, cross-cutting schema/state change, solver implementation, solver research, scheduler/budget work, experiment archaeology, hint/provenance work, variant-family work, naming work, and this hygiene pass.

For each route distinguish required orientation from optional drill-down. Inspect accidental context caused by giant authorities, indexes, stale compatibility docs, or mandatory bridges.

Look for:

- live authorities becoming append-only chronicles;
- dated experiment narratives in current contracts;
- mutable facts repeated across files;
- prose reproductions of registries/generated inventories;
- indexes becoming hand-maintained databases;
- compatibility files accumulating mutable state;
- transitional documents becoming permanent mandatory reading;
- completed programs presented as current authorities;
- giant references where a compact query suffices;
- stale names, paths, flags, schemas, commands, examples, or screenshots;
- documents whose declared purpose no longer matches their contents;
- separate documents whose ownership has converged enough to consolidate.

Use these classes: **live authority**, **current reference**, **machine registry/query**, **report**, **frozen evidence/snapshot**, **compatibility pointer**, **archive/history**, **obsolete**.

A mutable fact gets one owner. Current authorities say what is true now; replace stale state rather than appending corrections beneath it. Put chronology, measurements, failed attempts, and dated reasoning in reports/snapshots and link to them.

Keep provider-specific agent files thin. Reusable working rules belong in `AGENTS.md`; adapters should contain routing plus genuinely provider-specific constraints, not fork shared guidance.

Run context budgets after edits and after integrating current `main`. Treat the hard ceiling as a guardrail, not a target. High-churn or concurrently edited authorities need **merge-composable headroom**: enough margin that two reasonable branches do not combine into an immediate failure. Tighten ceilings after real compaction; do not raise them to accommodate unexplained growth.

When a file exceeds a hard limit, make one coherent reduction with margin rather than shaving toward the boundary.

## 3. Non-core plans, proposals, backlogs, and debt queues

Audit future-work files, proposals, design sketches, debt queues, deferred ideas, reopening inventories, and other “maybe later” surfaces separately from the canonical current queue.

For each ask:

- Does it still have a distinct purpose?
- Is it carrying current execution state that belongs in the canonical authority?
- Is it carrying dated evidence/chronology that belongs in a report?
- Are completed/promoted/rejected ideas still presented as live possibilities?
- Are open question, reopen condition, stop condition, and disposition explicit?
- Has a proposal become a miniature research report or shadow queue?
- Have multiple planning surfaces converged enough to consolidate?

A live non-core planning item should usually contain only the question/debt, why it remains open when non-obvious, cheapest meaningful next gate or reopen condition, stop criteria, current disposition/evidence link, and any durable safety boundary.

Use size/context ceilings for recurring junk drawers. Preserve exact pre-consolidation text in a dated snapshot only when it has genuine design/research value not already captured elsewhere.

## 4. Staleness driven by recent changes

For each materially changed subsystem inspect nearby authorities, routing, examples, CLI flags/package aliases, workflow inputs/defaults, schemas/formats, producers/readers/joins, tests/validators, compatibility notes, troubleshooting advice, and machine registries.

A passing link checker does not prove semantic freshness. Verify suspect prose against implementation and current producers/consumers. Do not rewrite frozen evidence merely because terminology changed; repair current interpretation/routing instead.

## 5. Tooling audit

Account for the developer/research tool surface with `tooling-census`, package aliases, workflow references, and targeted search before broad browsing.

For each significant tool/family ask whether it is used, discoverable, duplicated/superseded, reusable or one-off, current in names/schemas/paths/APIs/formats, tested or structurally exercised, indirectly consumed, and still justified by current boundaries.

Prefer: delete dead tools; retain one-off machinery only when provenance/reproduction value justifies it; consolidate overlap; remove obsolete wrappers after chasing consumers; keep machine discovery authoritative rather than rebuilding prose catalogues.

Existence is not integration. A useful tool that is never wired into the workflow where its evidence matters may be effectively dead infrastructure; either integrate it at the smallest useful point or classify it honestly as on-demand.

Orphan detection is evidence, not truth. Deletion/demotion requires a consumer chase through aliases, workflows, tests, docs, generated artifacts, readers/writers, inventories, contract checkers, triggers, aggregators, fixtures, and agent discovery.

## 6. GitHub Actions and evidence accessibility

Classify every workflow's current purpose. Use inventory/run history to avoid rereading unchanged definitions unnecessarily.

Ask whether each workflow is still useful/discoverable, duplicates another, belongs only to a closed campaign, calls retired surfaces, materializes unused data, uses sparse checkout correctly, has useful concurrency/cancellation, repeats expensive setup, fragments jobs economically, caches effectively, runs heavy proofs proportionally, and can safely narrow triggers.

Treat historical names (`phase`, date, `legacy`, `one-off`, `closeout`, temporary bridge) as scrutiny signals. If the invariant remains live but the campaign identity does not, re-home it under the current domain owner.

Audit not only whether artifacts have consumers, but whether important consumers can **reach the evidence reliably**. If an agent needs evidence to diagnose, verify, or continue work, prefer a bounded proof-bearing projection in ordinary logs/job summaries with the full artifact retained for drill-down. Put this in shared publishing infrastructure when many workflows need it. Keep emitted summaries bounded so accessibility does not create a new size problem.

When a research line closes, reverse-sweep candidate-specific workflows/tests against current dispositions. Default-OFF code retained for reproducibility does not automatically justify a lifetime dedicated workflow.

## 7. CI runtime and structural bloat

Inspect recent CI over a meaningful window. Separate hosted-runner/network variance from repository-caused regression.

Examine end-to-end and per-job duration, queue time, setup/install/cache cost, test/check/proof runtime, job count, repeated work, sparse-checkout/materialization volume, dependency growth, new validations, cancellation/concurrency, and slow tail tasks inside parallel populations.

Look for repeated `npm ci` without enough benefit, ineffective caches, oversized materialization, broad runners that accumulated unrelated checks, duplicated validation, completed-campaign checks still universal, serial bottlenecks, excessive fragmentation, heavyweight proofs with safely narrowable triggers, and stale artifacts/setup.

A green workflow can still be wasteful. Do not weaken meaningful validation merely to reduce runtime.

## 8. Tests, validators, ratchets, and completed-program scaffolding

Audit checks themselves. Look for exact-prose enforcement, redundant representations, obsolete structure, scans much broader than the invariant, duplicate checks, historical campaign shells, stale fixtures/terminology, and disproportionate cost.

Prefer semantic/structural checks over brittle sentence/regex shape checks. When a validator necessarily depends on syntax/pattern matching, periodically challenge it with nearby equivalent forms or fixtures. A ratchet that misses semantically identical debt because the syntax changed needs either a stronger matcher or an explicit documented boundary.

When a migration/research campaign/temporary bridge closes:

1. enumerate its tests, validators, aliases, workflows, triggers, fixtures, inventories, and compatibility owners;
2. ask what current failure each uniquely catches;
3. extract live behavior into a compact current-domain invariant;
4. demote forensic/reproduction machinery out of universal CI when appropriate;
5. delete obsolete campaign surfaces;
6. chase reverse consumers;
7. validate the actual final head.

Treat exemptions as debt with a lifecycle. Grandfather lists, allowlists, compatibility exceptions, lint suppressions, temporary path exemptions, and similar ratchets should, where practical, be **self-pruning**: allow pre-existing debt without permitting growth, and fail once the exception is no longer needed so stale permission cannot enable regrowth. Never raise an exception ceiling merely to accommodate new debt.

## 9. Historical material and compatibility

Move completed plans, ledgers, phase records, superseded narratives, abandoned queues, transitional bridges, one-off experiment docs, and old decision logs out of ordinary current discovery when they no longer own current truth.

Prefer current docs for current truth, reports for dated evidence, snapshots/archives for worthwhile historical states, tiny pointers for useful old paths, and deletion where neither provenance nor discovery value remains.

Compatibility code/docs need a reason and, where practical, a retirement condition. Remove them once the supported boundary expires.

## 10. Research-infrastructure hygiene

Ensure current solver/research work can cheaply discover and combine evidence before buying new compute. Account for reports, logs/manifests, hint provenance, descriptors, technique census/capability maps, variant/family data, lifecycle telemetry, exact/reference labels, known-solution profiles/prefixes, traces, benchmarks, corpus metadata, and scheduling/allocation evidence.

Check that queues point to relevant evidence; structured registries remain authoritative over prose duplicates; join/provenance fields match producers/consumers; aliases/normalizers still cover frozen evidence; freshness/population boundaries remain accurate; and new evidence is discoverable.

For append-only longitudinal summaries, keep the long-lived index compact: counts, hashes, protocol identity, and references where sufficient; retain item-level detail in referenced per-run/per-snapshot artifacts. Do not duplicate full detail into the timeline merely because it is available.

Preserve level-blindness and evidence-selection rules. Historical outcome data must not silently become runtime policy.

## 11. General repository entropy and editability

Account broadly for dead files/exports, stale TODO/FIXME notes, obsolete flags, expired compatibility code, duplicate helpers/constants/config, superseded schemas/readers/writers, unused dependencies, stale aliases, generated artifacts treated as sources, abandoned architecture branches, impossible states, misleading examples/fixtures, root clutter, redundant indexes/inventories, and active code depending unexpectedly on frozen artifacts.

Treat source-file size as an editability/reviewability resource, not merely a cosmetic metric. Run the file-size ratchet and inspect files approaching thresholds as well as current offenders/exemptions. Large implementation, test, and workflow files should justify their cohesion. When splitting:

- extract along real responsibility seams, not arbitrary line counts;
- preserve stable public façades/import paths when that materially reduces migration risk;
- keep types/contracts in sensible owners rather than creating dumping-ground modules;
- inspect the resulting import/dependency graph for cycles or boundary inversions;
- run the owning test surface before declaring a behavior-preserving split;
- remove stale grandfather exemptions as soon as ordinary limits are met.

Do not turn hygiene into unrelated feature development. The boundary is entropy reduction, maintenance leverage, current-structure correctness, and agent editability.

## 12. Anti-regression improvements

For each recurring entropy class ask whether a cheap deterministic guard can prevent recurrence. Candidates include context/authority budgets, editability-size ratchets, junk-drawer ceilings, lifecycle metadata, orphan detection, compatibility-path limits, duplicate-authority detection, archive/current classification, semantic final-state validators, CI cost summaries, transitional-doc retirement checks, tooling discovery coverage, workflow references to retired surfaces, artifact provenance/placement checks, and self-pruning exemption guards.

Prefer simple checks piggybacking on existing CI. A hygiene mechanism should cost less to maintain and execute than the entropy it prevents.

## 13. Execution strategy

Use this sequence unless evidence supports a smaller equivalent path:

1. baseline/recent-history accounting and completed-program reverse sweep;
2. cheap inventory, context, file-size, CI, and discovery signals across all domains;
3. deep inspection where churn, age, uncertainty, near-threshold growth, or missing evidence warrants it;
4. dead/stale cleanup and documentation/context consolidation;
5. non-core planning compaction;
6. tooling/workflow retirement or consolidation;
7. campaign closeout/permanent-invariant extraction;
8. editability decomposition and dependency cleanup where warranted;
9. CI structural optimization and validator simplification;
10. research-infrastructure/discovery repair;
11. proportionate anti-regression guards;
12. integrate latest `main`, rerun budgets/ratchets, and perform the final hostile audit.

Use multiple PR-sized slices when one diff becomes hard to review, merge, or recover. Keep slices pointed at the same hygiene goal. Avoid large compute merely for housekeeping; use the cheapest evidence that answers the question.

Useful heuristics:

- Archive history instead of leaving it live.
- Choose one owner when two current files own the same fact.
- Replace narrative in authorities with current state plus evidence links.
- Move active ideas into the canonical queue; do not maintain shadow queues.
- Remove tools/workflows that cannot justify current maintenance cost.
- Ask what independent evidence repeated CI work buys.
- Re-home live invariants trapped in historical campaign shells.
- Treat a near-limit, high-churn authority as debt even while technically green.
- Prefer compact projections plus drill-down artifacts over duplicating full evidence everywhere.
- When a ratchet misses a real instance, test the ratchet's detection model, not just the missed instance.

## 14. Final hostile audit

Before declaring completion ask:

- Did archive/consolidation break links or discovery?
- Did a compact front door become a second authority?
- Did consolidation or decomposition create a new giant file, cycle, or boundary inversion?
- Is any mutable current fact still owned twice?
- Did a proposal/backlog remain a shadow queue or mini report?
- Did compatibility removal break a real consumer?
- Did workflow/test retirement leave hardcoded consumers?
- Did CI speed work reduce meaningful coverage?
- Did a validator get weakened rather than modernized?
- Do stale exemptions remain after their debt disappeared?
- Can an agent actually reach the evidence needed to verify important workflow results?
- Did concurrent/mainline changes consume the headroom of edited authorities?
- Did new hygiene machinery create disproportionate maintenance/context/CI cost?
- Is archived material still routed as current reading?
- Does the final branch satisfy current naming, architecture, research, evidence, context-budget, and file-size contracts?

Run the appropriate repository validation suite and inspect the **actual final CI result on the final head**. Intermediate green runs do not validate the finished branch.

## Completion standard

A completed pass leaves implemented cleanup/hardening; appropriate green validation; concise current docs; non-core plans limited to genuine open gates/dispositions; historical evidence preserved without contaminating current routing; dead/stale tools/workflows removed or classified; recently completed programs reverse-swept; current tooling/workflows aligned with current contracts; CI waste reduced where justified; live invariants owned by current domains; file sizes/edit surfaces structurally manageable; important evidence agent-accessible through bounded summaries plus drill-down; compact discovery working; stale exemptions unable to linger; recurring entropy guarded proportionately; and a concise report of changes, measurable effects, remaining genuine debt, and intentionally retained exceptions.

The desired result is not merely **clean today**. The repository should be cheaper to understand, cheaper to edit and validate, harder to make stale, and easier for the next agent to change correctly.
