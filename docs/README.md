# Pathfinder Documentation Index

Pathfinder is a browser puzzle game built with Vite and deployed as a static site to GitHub Pages
(Firebase for submissions/progress). Start here to find the right doc.

## Current-state references (authoritative — describe how the app works today)

| Doc | Covers |
|---|---|
| [`architecture.md`](architecture.md) | Layered model, composition root, state/runtime, engine facade, solver, where to put new code |
| [`solver-architecture.md`](solver-architecture.md) | Deep hint-solver reference: core flow, feature-keyed attempt policy, DFS/beam, pruning, `prepLevel` data, encodings, CLI/batch-tool selection (which of `stress:benchmark`/`solver:direct`/`portfolio-solve-sweep.mjs`/`repair-direct-probe.mjs` to reach for) |
| [`solver-level-blindness.md`](solver-level-blindness.md) | Canonical solver-capability contract: editor/production solves must treat every puzzle as unseen; exact-level IDs/history/hints/winners/status/caches are forbidden inputs, saved solutions remain output-side research evidence, and the principal stress workflow enforces a mechanics-only anonymous solve boundary. |
| [`solver-research-operating-model.md`](solver-research-operating-model.md) | Living coordination model for current solver research: connects family/variant analysis, heuristic gaps, mechanic semantics, interoperability, repair, oracle/shadow evidence, and allocation into one evidence-routing pipeline; also owns the current sequencing principle that promotion work serializes while independent observation does not. Read this before selecting a new solver-research alley. |
| [`research-infrastructure-and-optimization-opportunities.md`](research-infrastructure-and-optimization-opportunities.md) | Strategic, non-backlog opportunities for scaling solver research: a manifest-keyed run-identity/comparability spine under DuckDB analytics, reusable Actions experiment infrastructure, Optuna policy optimization, family-balanced use of the ~96k variant trove (research branch, not `main`), progressive evaluation, fresh-corpus transfer tests, property-based testing, mutation testing, and research-data storage. Carries measured 2026-08-12 figures for evidence-set size, archive heterogeneity, and hint-provenance coverage. |
| [`solver-interoperability-and-cooperation-plan.md`](solver-interoperability-and-cooperation-plan.md) | Architectural/research reference for DFS, beam, admissible-order, repair, and future techniques exchanging typed artifacts safely: producer→receptor reasoning, replay-safe artifacts, proof-strength classes, shadow evaluation, pairwise handoffs, and failure-conditioned scheduling. Current implementation sequencing is intentionally narrower; see `solver-research-operating-model.md` and `future-work.md`. |
| [`winning-lineage-survival-analysis.md`](winning-lineage-survival-analysis.md) | Observation-only diagnostic for locating where known-valid solution families disappear from real beam search: generated/pruned/deduped/width-culled/retained stages, support coverage by depth, cull margins, work after extinction, and contrastive exact-prefix follow-up. Known solutions label search but never guide capability solving. |
| [`solver-heuristic-capability-gap-analysis.md`](solver-heuristic-capability-gap-analysis.md) | Current code-and-evidence inventory after the 2026-08-11 level-blind neighbor A/B and first exact CP-SAT labels: dynamic future opportunity, beam score representation, completion interfaces, failure-conditioned allocation, and deep repair prefix editing are the main open representational gaps; closed/demoted leads are explicitly retained. |
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
| [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) | Authoritative current disposition of retained/default-off solver experiments. Revised neighbor-budget population evidence is complete (611→665 level-blind, +54 net) but integration/promotion remains open because of five losses; late reserve remains the next full promotion A/B. |
| [`mechanic-state-contracts.md`](mechanic-state-contracts.md) | Every dynamic mechanic's state shape, cardinality bound, monotonicity, and external-model-support level in one table, including the schema-enforced cardinality bounds for solver bitmasks. |
| [`solve-button-variety.md`](solve-button-variety.md) | Editor/Review "find N varied hints" search: tiers, save-everything policy, the enumeration + curation engine |
| [`hint-workbench.md`](hint-workbench.md) | The unified hint-generation/diversification CLI (`hints:workbench`): generator presets, shared validation/dedupe/acceptance pipeline, report format |
| [`future-work.md`](future-work.md) | Live solver queue after the 2026-08-11 remote results: five-loss neighbor integration, extinction-adjacent exact CP-SAT labels, repair-retreat CP-SAT, then level-blind late-reserve population A/B. Contains compatibility anchors for older historical links but those are not additional backlog. |
| [`solver-correctness-archaeology.md`](solver-correctness-archaeology.md) | Current correctness-hardening reference: taxonomy derived from fixed solver/tooling failures, current correctness-adjacent findings, already-closed families that should not be repeated, and the bounded implementation handoff for remaining hardening work |
| [`solver-mutable-storage-inventory.md`](solver-mutable-storage-inventory.md) | Ownership, capacity, reset, and sequence-test contracts for reusable solver scratch buffers and state pools |
| [`main-loop-late-reserve-experiment.md`](main-loop-late-reserve-experiment.md) | Frozen level-blind matched-budget protocol for the default-off reserve-not-reorder main-loop starvation treatment: fresh control plus 5/10/15% arms, config count 4 throughout. |
| [`solution-profile.md`](solution-profile.md) | Solution-space fingerprints for the known-solvable corpora: per-level cell/edge/turn/portal/must-cross distributions, provenance-source bucketing, cross-level nearest-neighbor comparison, the saturated-vs-complete caution, and how libraries auto-refresh at comparison time |
| [`solver-improvement-research-notes.md`](solver-improvement-research-notes.md) | Historical research ledger, reconciled with later implementation/results: the naive global nogood key remains a soundness caution but a repair-scoped exact-state cache subsequently shipped; the learned repair-winner classifier was later closed after the larger Corpus-2 rerun; homotopy-class curation remains the strongest open item from this particular ledger. Use `future-work.md` for live priorities. |
| [`solver-shadow-eval-harness.md`](solver-shadow-eval-harness.md) | Shared shadow-mode evaluation harness for candidate reasoners: probe contract, telemetry, residual decomposition, and the 5,518-branch CP-SAT-labelled atlas. Its original neighbor-budget discussion is historical; current revised population status belongs in `solver-opt-in-experiment-ledger.md` and the 2026-08-11 reconciliation report. |
| [`solver-aware-game-architecture.md`](solver-aware-game-architecture.md) | Reconciled game-rule/solver opportunity ledger: measured closures, shipped correctness fixes, evidence-backed open directions, and ideas deliberately deferred behind prerequisites. |
| [`solver-next-frontier-2026-08-02.md`](solver-next-frontier-2026-08-02.md) + [`solver-next-frontier-multilingual-research-update-2026-08-02.md`](solver-next-frontier-multilingual-research-update-2026-08-02.md) | **Unvalidated research brainstorm — no code, no experiments, no probes against this codebase.** A literature-informed menu of candidate solver directions, tagged with kill criteria and priority. Subsequent candidates have been measured through the shadow harness; use current analysis/ledger/queue docs rather than treating this brainstorm as the backlog. |
| [`ai-assisted-manual-solving.md`](ai-assisted-manual-solving.md) | Proposed methodology (one worked demonstration, not yet validated on a genuinely unsolved level): can an AI agent reasoning by hand about a level (no solver, no stored hints) surface new solver heuristics? Verdict, recommended differential-diagnosis method, what NOT to do (narrative-mining), and the exact protocol for recording a manually-found hint's provenance |
| [`solver-dev-tooling-plan.md`](solver-dev-tooling-plan.md) | Completed design record for the Corpus-2 solver dev-tooling investments (smoke suite, tier-selection docs, mechanic filter, level ranking, diff-baseline explanations, reference/oracle solver, automatic level reducer, isolated retry/failure-inbox/worker-tuning follow-ups) — what shipped, where |
| [`solver-development-roadmap.md`](solver-development-roadmap.md) | Historical campaign record for the 2026-07-17–08-05 solver push: the still-useful diagnose→generalize→verify→refresh method, dated failure-cluster snapshots, completed campaign sequence, and standing verification rules. Its counts and campaign labels are not the live queue; use `future-work.md` for current priorities. |
| [`fast-portfolio-scheduler-plan.md`](fast-portfolio-scheduler-plan.md) | Concluded opt-in experiment, not production default: broad timed-tier cold-start scheduler variants were slower than legacy. Kept as a design record; this does not close online failure-conditioned allocation based only on evidence generated during the current solve. |
| [`repair-search-stagnation-escape-plan.md`](repair-search-stagnation-escape-plan.md) | Historical investigation record: exact relinking and turn bias closed negative; repair-scoped exact-state nogood caching subsequently shipped. Current next repair evidence is exact retreat depth, tracked in `future-work.md`. |
| [`sibling-cousin-system.md`](sibling-cousin-system.md) | Level-family/cousin generation research instrument: controlled variant generation (symmetry/local-mutant/swap/group-reshuffle/constrained-shuffle/re-embed), witness preservation, provenance stamping, and per-mode implementation status |
| [`variant-corpus-solver-research-plan.md`](variant-corpus-solver-research-plan.md) | Active instrumentation plan for mining family boundaries, symmetry invariance, divergence evidence, and family-conditioned winning attempts without changing solver policy; see the current symmetry reports and `future-work.md` for the ranked gate. |
| [`family-and-scaling-research-possibilities.md`](family-and-scaling-research-possibilities.md) | Original research proposal behind `sibling-cousin-system.md` (level families) plus the still-unimplemented solver-scaling-analysis half |
| [`req-length-sweep.md`](req-length-sweep.md) | Offline `reqLen` scaling experiment: CLI options, evidence classifications, report interpretation, reproducibility, and experimental caveats |
| [`../data/stress/README.md`](../data/stress/README.md) | Solver stress-test corpora (Corpus 1: 102 levels; Corpus 2: 1700 levels, not player content, never bundled): generation guarantees, batch theories, benchmark/regression workflow, and historical solver-improvement ledger. |

## Current solver evidence syntheses

These dated reports are not the live queue, but they are the shortest path from a current solver proposal to the evidence that motivated or constrained it:

| Report | Why to read it |
|---|---|
| [`../reports/2026-08-11-remote-neighbor-cpsat-and-level-blindness-reconciliation.md`](../reports/2026-08-11-remote-neighbor-cpsat-and-level-blindness-reconciliation.md) | Canonical reconciliation of the completed remote neighbor A/B (611→665 level-blind, 59 gained/5 lost), first explicit-prefix CP-SAT batch (7 dead/1 live/4 abstain), historical 725 priming confusion, workflow SHA race, malformed baseline, and the resulting queue changes. |
| [`../reports/2026-08-11-dynamic-resource-frontier-synthesis.md`](../reports/2026-08-11-dynamic-resource-frontier-synthesis.md) | Current dynamic-resource synthesis after the completed revised neighbor A/B: static must-cross descriptors/root freeInt wash out, state-conditioned future opportunity remains the stronger frontier, and the five-loss integration question replaces the old pending-population gate. |
| [`../reports/2026-08-11-winning-lineage-score-width-forensics.md`](../reports/2026-08-11-winning-lineage-score-width-forensics.md) | Exact score/width extinction classifications plus the first CP-SAT follow-up. Records the direct same-parent feasibility counterexample showing a rank-1 sibling can be exact-dead while a valid continuation exists. |
| [`../reports/2026-08-11-symmetry-control-audit.md`](../reports/2026-08-11-symmetry-control-audit.md) | Current-code audit separating symmetry cliffs into semantic mismatch, intentional directional policy, fixed tie order, coordinate-derived repair PRNG/survivor indexing, and emergent retention/search asymmetry. |
| [`../reports/2026-08-08-mc-neighbor-budget-propagation.md`](../reports/2026-08-08-mc-neighbor-budget-propagation.md) | Full evidence chain for the must-cross neighbor-budget prune: derivation, shadow catches, 97,812-path soundness replay, pilot, historical original-wiring A/B, random-index diagnosis, and revised level-blind 611→665 population result. |
| [`../reports/2026-08-08-portal-parity-envelope.md`](../reports/2026-08-08-portal-parity-envelope.md) | Closed portal-parity thread: sound existence-only envelope, zero live reject/node effect in the measured sample. Read before proposing another remaining-twist-portal parity prune. |
| [`../reports/2026-07-31-mustcross-forced-structure.md`](../reports/2026-07-31-mustcross-forced-structure.md) | Successful must-cross forced-neighbour derivations plus the falsified static forced-edge extension. Essential predecessor for any joint must-cross interface proposal. |
| [`../reports/2026-07-31-reserved-intersection-wall.md`](../reports/2026-07-31-reserved-intersection-wall.md) | Reserved-intersection topology result and negative follow-ups (`freeInt >= 1` dilation, axis-aware connectivity), showing where scalar/resource generalizations stopped paying. |
| [`../reports/2026-08-08-symmetry-orientation-sensitivity-synthesis.md`](../reports/2026-08-08-symmetry-orientation-sensitivity-synthesis.md) | Earlier orientation/mirroring synthesis and ranked variant-family gate; pair it with the 2026-08-11 control audit before attributing a cliff to heuristic geometry. |

> `CLAUDE.md` (repo root) is the **current-state developer reference** (project overview, game rules, solver architecture, repo layout, commands, gotchas). The docs above are the concise, authoritative per-topic entry points. Dated build narrative and retracted experiments live under the history/archive areas and remain historical evidence rather than current queue state.

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

- [`archive/`](archive/README.md) — completed plan/design and handoff docs, indexed individually as historical records; load-bearing current facts are folded into the current-state references above.
- [`history/development-journal.md`](history/development-journal.md) — dated build narrative, history only, not current truth.
- [`refactor-notes/`](refactor-notes/) — dated refactor logs, preserved history rather than authoritative current behavior.

## Modernization progress

The staged modernization roadmap (`docs/archive/modernization-plan.md`) is complete. Summary:

| § | Section | Status |
|---|---|---|
| 1 | Architecture boundary work | Done — ADR 0008; pure-layer boundary enforced by AST-based ESLint rules. |
| 2 | Explicit engine state transitions | Done — ADR 0006; state-action boundary. |
| 3 | Real UI/component layer | Done — ADR 0007. |
| 4 | Harden production security | Largely done — ADR 0004; residual ops-blocked items tracked in `future-work.md`. |
| 5 | Static typing | Done and superseded by full strict TypeScript — ADR 0011. |
| 6 | Rationalize tests into tiers | Done — Vitest + typed tests; `ci = check && test:coverage && test:node`. |
| 7 | Docs into authoritative docs + ADRs | Done (foundation) — this index, current-state references, ADRs and refactor notes. |

- [Claude remote solver handoff](claude-remote-solver-handoff.md) — exact current remote-only experiment order, inputs, dependencies and stop conditions after the 2026-08-11 neighbor A/B, CP-SAT labels and level-blind workflow hardening.
