# Pathfinder Documentation Index

Pathfinder is a browser puzzle game built with Vite and deployed as a static site to GitHub Pages
(Firebase for submissions/progress). Start here to find the right doc.

## Current-state references (authoritative — describe how the app works today)

| Doc | Covers |
|---|---|
| [`architecture.md`](architecture.md) | Layered model, composition root, state/runtime, engine facade, solver, where to put new code |
| [`solver-architecture.md`](solver-architecture.md) | Deep hint-solver reference: core flow, feature-keyed attempt policy, DFS/beam, pruning, `prepLevel` data, encodings, CLI/batch-tool selection (which of `stress:benchmark`/`solver:direct`/`portfolio-solve-sweep.mjs`/`repair-direct-probe.mjs` to reach for) |
| [`hint-curation.md`](hint-curation.md) | Which stored hints the player cycles through: distinctiveness metric, gate/portal-usage coverage guarantee, must-cross-order variety, cap + message |
| [`security.md`](security.md) | Data classification, Firebase/Firestore model, debug-surface policy, CSP, rotation |
| [`content-security-policy.md`](content-security-policy.md) | The CSP directives, drift check (`check:csp`), and the two enable paths |
| [`testing.md`](testing.md) | Test tiers, what each protects, which command to run when |
| [`ui-accessibility.md`](ui-accessibility.md) | Modal/dialog/focus/keyboard conventions; adding-a-modal checklist |
| [`command-glossary.md`](command-glossary.md) | Canonical engine/editor/review/solver/persistence flow names → implementation locations (modernization-plan §2 Phase 2) |
| [`typing.md`](typing.md) | Check-only static typing (`// @ts-check` + `tsc --noEmit`): the typed allowlist + how to grow it |
| [`firestore-security-model.md`](firestore-security-model.md) | Rule-by-rule Firestore access model |
| [`firebase-config-and-secret-hygiene.md`](firebase-config-and-secret-hygiene.md) | What may be committed vs. kept secret |
| [`third-party-dependencies.md`](third-party-dependencies.md) | External CDN/asset allowlist + rationale |
| [`ablation.md`](ablation.md) | Solver ablation lab — 63 feature flags, experiment runner, analysis |
| [`solve-button-variety.md`](solve-button-variety.md) | Editor/Review "find N varied hints" search: tiers, save-everything policy, the enumeration + curation engine |
| [`hint-workbench.md`](hint-workbench.md) | The unified hint-generation/diversification CLI (`hints:workbench`): generator presets, shared validation/dedupe/acceptance pipeline, report format |
| [`future-work.md`](future-work.md) | Compiled index of genuinely open, non-stale future work (security, data layout, hint tooling, UI) |
| [`solution-profile.md`](solution-profile.md) | Solution-space fingerprints for the known-solvable corpora: per-level cell/edge/turn/portal/must-cross distributions, provenance-source bucketing, cross-level nearest-neighbor comparison, the saturated-vs-complete caution, and how libraries auto-refresh at comparison time |
| [`solver-improvement-research-notes.md`](solver-improvement-research-notes.md) | Research-inspiration doc cross-checking external CP/planning/SAT literature against the actual solver code — what's already implemented, what's a genuine gap, probe results and verdicts for each (refuted / confirmed-real / needs-redesign / not-yet-probed), and the combined workflow for using solution-space fingerprinting + provenance to attack corpus-2's unsolved levels |
| [`solver-dev-tooling-plan.md`](solver-dev-tooling-plan.md) | Completed design record for the Corpus-2 solver dev-tooling investments (smoke suite, tier-selection docs, mechanic filter, level ranking, diff-baseline explanations, reference/oracle solver, automatic level reducer, isolated retry/failure-inbox/worker-tuning follow-ups) — what shipped, where |
| [`fast-portfolio-scheduler-plan.md`](fast-portfolio-scheduler-plan.md) | Ongoing, opt-in experiment (not the production default — see `solver-architecture.md`'s "Fast portfolio scheduler experiment" section for the current-state summary and verdict): hypothesis, non-negotiable definitions, and the full comparison-harness design for a broad timed-tier scheduler pass run in front of the existing solver ladder |
| [`../data/stress/README.md`](../data/stress/README.md) | Solver stress-test corpora (Corpus 1: 102 levels after a 2026-07-11 non-square-grid cleanup; Corpus 2: 1700 levels, not player content, never bundled): generation guarantees, batch theories, benchmark/regression workflow, and the full ledger of solver-improvement avenues (shipped, rejected-with-evidence, root-caused-not-attempted) |

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
- [0009 — Check-only static typing (JSDoc + `tsc --checkJs`), no build step](adr/0009-check-only-static-typing.md) *(being superseded by 0011)*
- [0010 — Adopt a Vite build step (supersedes 0001)](adr/0010-build-step-vite.md)
- [0011 — Full TypeScript migration (supersedes 0009)](adr/0011-full-typescript-migration.md)

## Plans & history

- [`archive/`](archive/) — completed plan/design docs, kept only as design records (not linked
  individually here; every load-bearing fact they contained has been folded into the
  current-state references above). Includes the original modernization roadmap and its
  offshoots (codebase hardening/strengthening/quality-review/quality-followup), the landmark
  submission-serialization fix, the styling migration, the hint-corpus-expansion plan, the
  hint-discovery design prototype, and the level-id-unification plan (shipped for all 3 corpora
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
| 1 | Architecture boundary work | Done — ADR 0008 (acyclic composition root); `check:domain-purity` enforces the pure-layer boundary. See `architecture.md`. |
| 2 | Explicit engine state transitions | Done — ADR 0006 (pure transition/decision cores, no central dispatcher); state-action boundary. See `architecture.md`. |
| 3 | Real UI/component layer | Done — ADR 0007 (boot-time data-driven builders + semantic CSS + centralized modal behavior). See `ui-accessibility.md`. |
| 4 | Harden production security | Largely done — ADR 0004; CSP enforced in production, admin auth accepts a custom claim with a legacy-email fallback. Residual ops-blocked items (custom-claim cutover, emulator rule tests) tracked in `future-work.md`. See `security.md`. |
| 5 | Static typing | Done, and superseded by more — ADR 0011 took this further than originally scoped: every `modules/` file is now `.ts` under `strict` `tsc` (not the originally-planned check-only JSDoc allowlist). See `typing.md`. |
| 6 | Rationalize tests into tiers | Done — migrated to Vitest (59 suites / ~700 tests), colocated as type-checked `modules/**/*.test.ts`; `ci = check && test:coverage && test:node`. See `testing.md`. |
| 7 | Docs into authoritative docs + ADRs | Done (foundation) — this index, the current-state references above, ADRs, and `refactor-notes/` are in place. |
