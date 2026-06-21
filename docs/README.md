# Pathfinder Documentation Index

Pathfinder is a static-hosted, no-build-step browser puzzle game (GitHub Pages; Firebase for
submissions/progress). Start here to find the right doc.

## Current-state references (authoritative — describe how the app works today)

| Doc | Covers |
|---|---|
| [`architecture.md`](architecture.md) | Layered model, composition root, state/runtime, engine facade, solver, where to put new code |
| [`security.md`](security.md) | Data classification, Firebase/Firestore model, debug-surface policy, CSP & dependency gaps |
| [`testing.md`](testing.md) | Test tiers, what each protects, which command to run when |
| [`ui-accessibility.md`](ui-accessibility.md) | Modal/dialog/focus/keyboard conventions; adding-a-modal checklist |
| [`firestore-security-model.md`](firestore-security-model.md) | Rule-by-rule Firestore access model |
| [`firebase-config-and-secret-hygiene.md`](firebase-config-and-secret-hygiene.md) | What may be committed vs. kept secret |
| [`third-party-dependencies.md`](third-party-dependencies.md) | External CDN/asset allowlist + rationale |

> `CLAUDE.md` (repo root) remains a detailed developer reference and running engineering
> journal. The docs above are the concise, authoritative current-state entry points; deep
> historical detail lives in `CLAUDE.md` and `refactor-notes/`.

## Decisions

[`adr/`](adr/) — Architecture Decision Records (context · decision · consequences · status):

- [0001 — Static hosting, no build step](adr/0001-static-hosting-no-build-step.md)
- [0002 — ENGINE mutations via state-action helpers](adr/0002-state-action-boundary.md)
- [0003 — Modular solver with a separate testing API](adr/0003-solver-modularization.md)
- [0004 — Firebase public config; authorization in Firestore rules](adr/0004-firebase-public-config-security-model.md)
- [0005 — Grouped engine facade and narrow controller ports](adr/0005-grouped-engine-facade-and-narrow-ports.md)

## Plans & history

- [`modernization-plan.md`](modernization-plan.md) — the staged modernization roadmap (7 sections
  with completion specs). See "Modernization progress" below for status.
- [`refactor-notes/`](refactor-notes/) — dated refactor logs (preserved history, not authoritative
  for current behavior).

## Modernization progress

Tracking against `modernization-plan.md`'s sections:

| § | Section | Status |
|---|---|---|
| 1 | Finish architecture boundary work | **Partial** — staged construction done; `data↔themes` cycle removed; narrow editor port (now a documented `EditorRuntimePort` typedef) + grouped engine facade landed; callers migrated to groups; `check:domain-purity` now statically enforces the pure-layer boundary. Remaining: named ports for the other seams, `ui↔renderer`/`themes↔persistence` cycle removal. |
| 2 | Make engine state transitions explicit | **Partial** — state-action boundary + per-slice ownership/derived typedefs done. Remaining: command/effect transitions for the correctness-sensitive flows; derived-field invariant tests. |
| 3 | Real UI/component layer | **Partial** — focus-trap, dialog semantics, boot-time DOM builders (sprite/palette/close-icon), pixel-stable modal/overlay component classes done. Remaining: fuller primitive set; shrink `index.html` further. |
| 4 | Harden production security | **Discovery done** — model documented here + ADR 0004; gaps catalogued (custom-claim admin, CSP, debug-surface, emulator tests). Implementation pending. |
| 5 | Add static typing gradually | **Not started** — JSDoc ownership typedefs exist on state slices; no `// @ts-check`/`tsc` gate yet. |
| 6 | Rationalize tests into tiers | **Partial** — `ci` grouped into `check`/`test:core`/`test:app`/`test:solver`; visual harness added; tiers documented in `testing.md`. Remaining: tier renames, shared fixtures, coverage. |
| 7 | Docs into authoritative docs + ADRs | **Done (foundation)** — this index, `architecture/security/testing/ui-accessibility`, ADRs 0001–0005, and `refactor-notes/` are in place. |
