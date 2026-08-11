# Pathfinder Documentation Index

Pathfinder is a browser puzzle game built with Vite and deployed as a static site to GitHub Pages
(Firebase for submissions/progress). Start here to find the right doc.

## Current-state references (authoritative — describe how the app works today)

| Doc | Covers |
|---|---|
| [`architecture.md`](architecture.md) | Layered model, composition root, state/runtime, engine facade, solver, where to put new code |
| [`solver-architecture.md`](solver-architecture.md) | Deep hint-solver reference: core flow, feature-keyed attempt policy, DFS/beam, pruning, `prepLevel` data, encodings, CLI/batch-tool selection (which of `stress:benchmark`/`solver:direct`/`portfolio-solve-sweep.mjs`/`repair-direct-probe.mjs` to reach for) |
| [`solver-research-operating-model.md`](solver-research-operating-model.md) | Living coordination model for current solver research: connects family/variant analysis, heuristic gaps, mechanic semantics, interoperability, repair, oracle/shadow evidence, and allocation into one evidence-routing pipeline; also owns the current sequencing principle that promotion work serializes while independent observation does not. Read this before selecting a new solver-research alley. |
| [`research-infrastructure-and-optimization-opportunities.md`](research-infrastructure-and-optimization-opportunities.md) | Strategic, non-backlog opportunities for scaling solver research: DuckDB/Parquet analytics, reusable Actions experiment infrastructure, Optuna policy optimization, family-balanced use of the ~96k variant trove, progressive evaluation, fresh-corpus transfer tests, property-based testing, mutation testing, and research-data storage. |
| [`solver-interoperability-and-cooperation-plan.md`](solver-interoperability-and-cooperation-plan.md) | Architectural/research reference for DFS, beam, admissible-order, repair, and future techniques exchanging typed artifacts safely: producer→receptor reasoning, replay-safe artifacts, proof-strength classes, shadow evaluation, pairwise handoffs, and failure-conditioned scheduling. Current implementation sequencing is intentionally narrower; see `solver-research-operating-model.md` and `future-work.md`. |
| [`winning-lineage-survival-analysis.md`](winning-lineage-survival-analysis.md) | Pending observation-only diagnostic for locating where known-valid solution families disappear from real beam search: generated/pruned/deduped/width-culled/retained stages, winning-support coverage by depth, cull margins, work after known-support extinction, and the follow-on contrastive winning-prefix branch atlas. Known solutions label search but never guide it. |
| [`solver-heuristic-capability-gap-analysis.md`](solver-heuristic-capability-gap-analysis.md) | Current code-and-evidence inventory of hard bounds, soft scores, templates, and search-control heuristics. Reconciled through 2026-08-11: the strongest mechanic-derived frontier is dynamic future-opportunity/resource reasoning, especially must-cross; portal parity and several static/reachability counterparts are explicitly closed or demoted. |
| [`solver-budget-determinism.md`](solver-budget-determinism.md) | Current solver-budget model and its history: the attempt ladder and hint-discovery paths now allocate in canonical work units, while `timeBudgetMs` is an outer truncation deadline rather than an allocation currency. Also documents the measured deadline-driven corpus noise floor, deterministic-run recipe, and the known limitation that the fixed connectivity-work charge does not measure optimizations that change flood-fill size accurately. |
| [`hint-curation.md`](hint-curation.md) | Which stored hints the player cycles through: distinctiveness metric, gate/portal-usage coverage guarantee, must-cross-order variety, cap + message |
| [`security.md`](security.md) | Data classification, Firebase/Firestore model, debug-surface policy, CSP, rotation |
| [`content-security-policy.md`](content-security-policy.md) | The CSP directives, drift check (`check:csp`), and the two enable paths |
| [`testing.md`](testing.md) | Test tiers, what each protects, which command to run when |
| [`investigation-report-conventions.md`](investigation-report-conventions.md) | Required status/decision/gate block for new or materially revised investigations; canonical-home rules and closing checklist |
| [`ui-accessibility.md`](ui-accessibility.md) | Modal/dialog/focus/keyboard conventions; adding-a-modal checklist |
| [`command-glossary.md`](command-glossary.md) | Canonical engine/editor/review/solver/persistence flow names → implementation locations (modernization-plan §2 Phase 2) |
| [`typing.md`](typing.md) | Current TypeScript model: all `modules/` source is `.ts` under strict `tsc`; historical check-only/JSDoc migration details and the rules for maintaining the typed boundary |
| [`firestore-security-model.md`](firestore-security-model.md) | Rule-by-rule Firestore access model |
| [`firebase-config-and-secret-hygiene.md`](firebase-config-and-secret-hygiene.md) | What may be committed vs. kept secret |
| [`third-party-dependencies.md`](third-party-dependencies.md) | External CDN/asset allowlist + rationale |
| [`ablation.md`](ablation.md) | Solver ablation lab — 76 feature flags, experiment runner, analysis |
| [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) | Authoritative current disposition of retained/default-off solver experiments: which flags still have a promotion gate, which are closed negatives/negligible, and which knobs are already promoted behavior rather than unfinished work. Read this before inferring a backlog from `OPT_IN_FEATURES`. |
| [`mechanic-state-contracts.md`](mechanic-state-contracts.md) | Every dynamic mechanic's state shape, cardinality bound, monotonicity, and external-model-support level in one table, including the schema-enforced cardinality bounds for solver bitmasks. |
| [`solve-button-variety.md`](solve-button-variety.md) | Editor/Review "find N varied hints" search: tiers, save-everything policy, the enumeration + curation engine |
| [`hint-workbench.md`](hint-workbench.md) | The unified hint-generation/diversification CLI (`hints:workbench`): generator presets, shared validation/dedupe/acceptance pipeline, report format |
| [`future-work.md`](future-work.md) | Compiled index of genuinely open, non-stale future work, including the current solver queue; use this rather than dated campaign plans to decide what remains undone. The 2026-08-11 queue now separates production decision gates from a parallel evidence lane and routes new work through the integrated research operating model. |
| [`solver-correctness-archaeology.md`](solver-correctness-archaeology.md) | Current correctness-hardening reference: taxonomy derived from fixed solver/tooling failures, current correctness-adjacent findings, already-closed families that should not be repeated, and the bounded implementation handoff for remaining hardening work |
| [`solver-mutable-storage-inventory.md`](solver-mutable-storage-inventory.md) | Ownership, capacity, reset, and sequence-test contracts for reusable solver scratch buffers and state pools |
| [`main-loop-late-reserve-experiment.md`](main-loop-late-reserve-experiment.md) | Frozen matched-budget protocol for the default-off reserve-not-reorder main-loop starvation treatment |
| [`solution-profile.md`](solution-profile.md) | Solution-space fingerprints for the known-solvable corpora: per-level cell/edge/turn/portal/must-cross distributions, provenance-source bucketing, cross-level nearest-neighbor comparison, the saturated-vs-complete caution, and how libraries auto-refresh at comparison time |
| [`solver-improvement-research-notes.md`](solver-improvement-research-notes.md) | Historical research ledger, reconciled with later implementation/results: the naive global nogood key remains a soundness caution but a repair-scoped exact-state cache subsequently shipped; the learned repair-winner classifier was later closed after the larger Corpus-2 rerun; homotopy-class curation remains the strongest open item from this particular ledger. Use `future-work.md` for live priorities. |
| [`solver-shadow-eval-harness.md`](solver-shadow-eval-harness.md) | Shared shadow-mode evaluation harness for candidate reasoners: probe contract, telemetry, residual decomposition, and the 5,518-branch CP-SAT-labelled atlas. The must-cross neighbor-budget probe crossed the shadow threshold and its original wiring produced +14 net Corpus-2 solves; current promotion status belongs in `solver-opt-in-experiment-ledger.md` because the later `a113d47` wiring change requires a fresh population verdict. |
| [`solver-aware-game-architecture.md`](solver-aware-game-architecture.md) | Reconciled game-rule/solver opportunity ledger: measured closures, shipped correctness fixes, evidence-backed open directions, and ideas deliberately deferred behind prerequisites. |
| [`solver-next-frontier-2026-08-02.md`](solver-next-frontier-2026-08-02.md) + [`solver-next-frontier-multilingual-research-update-2026-08-02.md`](solver-next-frontier-multilingual-research-update-2026-08-02.md) | **Unvalidated research brainstorm — no code, no experiments, no probes against this codebase.** A literature-informed menu of ~17 candidate solver directions (separator-state resource DP / boundary-conditioned spectra, bounded obligation-compatibility MDDs, bidirectional CEGAR abstraction refinement, backward compatibility envelopes, detour gadgets, Rectangle Search, partial-order/commuting-segment reduction, …), each tagged with kill criteria and a priority tier; the second doc restates and supersedes the first. Subsequent candidates have been measured through `solver-shadow-eval-harness.md`; use that harness, `solver-heuristic-capability-gap-analysis.md`, `solver-research-operating-model.md`, and `future-work.md` for current verdicts rather than treating this brainstorm as the queue. The must-cross static forced-edge instance was falsified, while the later dynamic neighbor-budget instance was sound and materially positive but not promotion-ready. |
| [`ai-assisted-manual-solving.md`](ai-assisted-manual-solving.md) | Proposed methodology (one worked demonstration, not yet validated on a genuinely unsolved level): can an AI agent reasoning by hand about a level (no solver, no stored hints) surface new solver heuristics? Verdict, recommended differential-diagnosis method, what NOT to do (narrative-mining), and the exact protocol for recording a manually-found hint's provenance |
| [`solver-dev-tooling-plan.md`](solver-dev-tooling-plan.md) | Completed design record for the Corpus-2 solver dev-tooling investments (smoke suite, tier-selection docs, mechanic filter, level ranking, diff-baseline explanations, reference/oracle solver, automatic level reducer, isolated retry/failure-inbox/worker-tuning follow-ups) — what shipped, where |
| [`solver-development-roadmap.md`](solver-development-roadmap.md) | Historical campaign record for the 2026-07-17–08-05 solver push: the still-useful diagnose→generalize→verify→refresh method, dated failure-cluster snapshots, completed campaign sequence, and standing verification rules. Its counts and campaign labels are not the live queue; use `future-work.md` for current priorities. |
| [`fast-portfolio-scheduler-plan.md`](fast-portfolio-scheduler-plan.md) | Concluded, opt-in experiment (not the production default — verdict: not production-ready, see `solver-architecture.md`'s "Fast portfolio scheduler experiment" section): hypothesis, non-negotiable definitions, and the full comparison-harness design for a broad timed-tier scheduler pass run in front of the existing solver ladder, kept as a design record in case of a future re-attempt |
| [`repair-search-stagnation-escape-plan.md`](repair-search-stagnation-escape-plan.md) | Historical investigation record whose July intermediate conclusions are superseded by later correction blocks in the same file: exact relinking remained negative, the final clean turn-bias Corpus-2 gate was net −7 and closed promotion, while the once-deprioritized exact-state idea later became the shipped default-on repair-scoped nogood cache. Stage 4 remains re-scoped toward an extend/detour operator; use `future-work.md` for live next actions. |
| [`sibling-cousin-system.md`](sibling-cousin-system.md) | Level-family/cousin generation research instrument: controlled variant generation (symmetry/local-mutant/swap/group-reshuffle/constrained-shuffle/re-embed), witness preservation, provenance stamping, and per-mode implementation status |
| [`variant-corpus-solver-research-plan.md`](variant-corpus-solver-research-plan.md) | Active instrumentation plan for mining family boundaries, symmetry invariance, divergence evidence, and family-conditioned winning attempts without changing solver policy; see the current [`2026-08-08 symmetry-sensitivity synthesis`](../reports/2026-08-08-symmetry-orientation-sensitivity-synthesis.md), the [`2026-08-11 symmetry-control audit`](../reports/2026-08-11-symmetry-control-audit.md), and `future-work.md` for the current ranked gate. |
| [`family-and-scaling-research-possibilities.md`](family-and-scaling-research-possibilities.md) | Original research proposal behind `sibling-cousin-system.md` (level families) plus the still-unimplemented solver-scaling-analysis half |
| [`req-length-sweep.md`](req-length-sweep.md) | Offline `reqLen` scaling experiment: CLI options, evidence classifications, report interpretation, reproducibility, and experimental caveats |
| [`../data/stress/README.md`](../data/stress/README.md) | Solver stress-test corpora (Corpus 1: 102 levels after a 2026-07-11 non-square-grid cleanup; Corpus 2: 1700 levels, not player content, never bundled): generation guarantees, batch theories, benchmark/regression workflow, and the full ledger of solver-improvement avenues (shipped, rejected-with-evidence, root-caused-not-attempted) |

## Current solver evidence syntheses

These dated reports are not the live queue, but they are the shortest path from a current solver
proposal to the evidence that motivated or constrained it:

| Report | Why to read it |
|---|---|
| [`../reports/2026-08-11-dynamic-resource-frontier-synthesis.md`](../reports/2026-08-11-dynamic-resource-frontier-synthesis.md) | Current cross-corpus synthesis: latest failure-property evidence, why static must-cross descriptors/root `freeInt` mostly wash out, the revised neighbor-budget promotion gate after `a113d47`, the now-implemented read-only crossing-slack analyzer, and the remaining portal/joint-interface/turn-family proposals. |
| [`../reports/2026-08-11-symmetry-control-audit.md`](../reports/2026-08-11-symmetry-control-audit.md) | Current-code audit separating symmetry cliffs into semantic mismatch, intentional directional policy, fixed E/W/S/N tie order, coordinate-derived repair PRNG trajectories/survivor indexing, and only then emergent retention/search asymmetry. Also records the required research controls and metamorphic-test opportunity. |
| [`../reports/2026-08-08-mc-neighbor-budget-propagation.md`](../reports/2026-08-08-mc-neighbor-budget-propagation.md) | Exact derivation and evidence for the sound opt-in must-cross neighbor-budget prune: shadow unique catches, 97,812-path replay, +11/30 pilot, original full 725→739 Corpus-2 A/B with 42 gained / 28 lost, and the later repair-random-selection wiring change that reopened the promotion gate for current code. |
| [`../reports/2026-08-08-portal-parity-envelope.md`](../reports/2026-08-08-portal-parity-envelope.md) | Closed portal-parity thread: sound existence-only envelope, zero live reject/node effect in the measured sample. Read before proposing another "remaining twist portal" parity prune. |
| [`../reports/2026-07-31-mustcross-forced-structure.md`](../reports/2026-07-31-mustcross-forced-structure.md) | Successful must-cross forced-neighbour derivations plus the falsified static forced-edge extension. Essential predecessor for any joint must-cross interface proposal. |
| [`../reports/2026-07-31-reserved-intersection-wall.md`](../reports/2026-07-31-reserved-intersection-wall.md) | Reserved-intersection topology result and negative follow-ups (`freeInt >= 1` dilation, axis-aware connectivity), showing where scalar/resource generalizations stopped paying. |
| [`../reports/2026-08-08-symmetry-orientation-sensitivity-synthesis.md`](../reports/2026-08-08-symmetry-orientation-sensitivity-synthesis.md) | Earlier orientation/mirroring synthesis and ranked variant-family gate; pair it with the 2026-08-11 control audit before attributing a cliff to heuristic geometry. |

> `CLAUDE.md` (repo root) is the **current-state developer reference** (project overview, game
> rules, solver architecture, repo layout, commands, gotchas). The docs above are the concise,
> authoritative per-topic entry points. The dated build narrative — session logs, bug-fix
> writeups, retracted experiments — was moved out of `CLAUDE.md` to
> [`history/development-journal.md`](history/development-journal.md) (history only; not current truth).

## Decisions

[`adr/`](adr/) — Architecture Decision Records (context · decision · consequences · status):

- [0001 — Static hosting, no build step](adr/0001-static-hosting-no-build-step.md) *(superseded by 0010)*
- [0002 — ENGINE mutations via state-action helpers](adr/0002-state-action-boundary.md)
- [0003 — Modular solver with a separate testing API](adr/0003-solver-modularization.md)
- [0004 — Firebase public config; authorization in Firestore rules](adr/0004-firebase-public-config-security-model.md)
- [0005 — Grouped engine facade and narrow controller ports](adr/0005-grouped-engine-facade-and-narrow-ports.md)
- [0006 — Pure transition/decision cores per flow; no central dispatcher](adr/0006-pure-transition-cores-no-central-dispatcher.md)
- [0007 — UI component layer: boot builders + semantic CSS + centralized modal behavior](adr/0007-ui-component-layer-boot-builders.md)
- [0008 — Acyclic composition root (no construction cycles / forward decls / late init)](adr/0008-acyclic-composition-root.md)
- [0009 — Check-only static typing (JSDoc + `tsc --checkJs`), no build step](adr/0009-check-only-static-typing.md) *(superseded by 0011)*
- [0010 — Adopt a Vite build step (supersedes 0001)](adr/0010-build-step-vite.md)
- [0011 — Full TypeScript migration (supersedes 0009)](adr/0011-full-typescript-migration.md)

## Plans & history

- [`archive/`](archive/README.md) — completed plan/design and handoff docs, indexed individually
  as historical records; every load-bearing fact they contained has been folded into the
  current-state references above. Includes the original modernization roadmap and its
  offshoots (codebase hardening/strengthening/quality-review/quality-followup), the landmark
  submission-serialization fix, the styling migration, the hint-corpus-expansion plan,
  the hint-discovery design prototype, and the level-id-unification plan (shipped for all 3 corpora
  2026-07-12/07-15 — see CLAUDE.md's "Level Stats"/"Provenance" sections for what it left behind
  in the current-state references). See a doc's own git history for its full original text.
- [`history/development-journal.md`](history/development-journal.md) — the dated build narrative
  (2026-06-11 onward), condensed. History only, not current truth.
- [`refactor-notes/`](refactor-notes/) — dated refactor logs (preserved history, not authoritative
  for current behavior).

## Modernization progress

The staged modernization roadmap (`docs/archive/modernization-plan.md`) is complete. Summary —
detail lives in the linked current-state doc, not repeated here:

| § | Section | Status |
|---|---|---|
| 1 | Architecture boundary work | Done — ADR 0008 (acyclic composition root); the pure-layer boundary is enforced by AST-based ESLint rules under `check:lint` (formerly the standalone `check:domain-purity` script). See `architecture.md`. |
| 2 | Explicit engine state transitions | Done — ADR 0006 (pure transition/decision cores, no central dispatcher); state-action boundary. See `architecture.md`. |
| 3 | Real UI/component layer | Done — ADR 0007 (boot-time data-driven builders + semantic CSS + centralized modal behavior). See `ui-accessibility.md`. |
| 4 | Harden production security | Largely done — ADR 0004; CSP enforced in production, admin auth accepts a custom claim with a legacy-email fallback. Residual ops-blocked items (custom-claim cutover, emulator rule tests) tracked in `future-work.md`. See `security.md`. |
| 5 | Static typing | Done, and superseded by more — ADR 0011 took this further than originally scoped: every `modules/` file is now `.ts` under `strict` `tsc` (not the originally-planned check-only JSDoc allowlist). See `typing.md`. |
| 6 | Rationalize tests into tiers | Done — migrated to Vitest (59 suites / ~700 tests), colocated as type-checked `modules/**/*.test.ts`; `ci = check && test:coverage && test:node`. See `testing.md`. |
| 7 | Docs into authoritative docs + ADRs | Done (foundation) — this index, the current-state references above, ADRs, and `refactor-notes/` are in place. |
- [Claude remote solver handoff](claude-remote-solver-handoff.md) — exact remote-only experiment order, inputs, dependencies, and stop conditions following the PR #1357 local evidence cleanup.
