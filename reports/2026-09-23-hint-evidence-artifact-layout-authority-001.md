# Hint evidence consolidation — shared corpus/hint artifact layout authority — 001

> **Status:** active
> **Last evidence:** 2026-09-23 — Retained and reconciled as part of the active hint-evidence consolidation implementation.
> **Decision:** Preserve this report as durable implementation/audit evidence; current code and later reconciliation records remain authoritative where they supersede earlier details.
> **Remaining gate:** Apply the current phase-specific validation and closeout gates before treating this report as proof of whole-program completion.


> **Status:** implementation-complete, execution-validation pending
>
> **Date:** 2026-09-23
>
> **Branch:** `chatgpt/continue-hint-evidence-consolidation-2026-09-23`
>
> **Base:** exact tip of Claude's continuation branch, `1019851c4a3adde266807531e4f28124dfdaff54`

## Why this batch

Claude's Phase-1 shared-decoder closeout explicitly left PSC-025 open: Node derived hint directories from the corpus filename, browser Dev Mode carried its own `hintsDirName`, `hintFileName()` could write string ids that `listHintFiles()` would never enumerate, and validators treated directory enumeration as identity rather than comparing it with corpus-owned level identities.

This batch closes that architectural seam before continuing deeper Phase-2 identity work.

## Implementation

Added `modules/hint-artifact-layout.mjs`, a browser/Node-neutral authority with no filesystem or browser dependencies. It owns:

- corpus levels filename/path -> sibling hint directory name;
- persistent level id / explicit positional fallback -> hint artifact filename;
- safe filename round-trip validation;
- persistent-id vs 1-based fallback key selection;
- recognition of files that could have been emitted by the canonical writer;
- expected hint artifact filenames derived from current corpus level identities.

Node `scripts/level-data-io.mjs` now delegates `hintsDirFor()`, `hintFileName()`, `hintKeyForLevel()`, and `listHintFiles()` to that authority. The old `/^[A-Za-z]?\\d{3,}\\.json$/` lister restriction is gone, so writer-legal ids such as family/variant-style hyphenated persistent ids are no longer invisible to validators or migrators.

Browser `createDefaultHintsSource()` now derives its hint directory from `levelsFile` using the same authority. Its former `hintsDirName` input remains only as a compatibility assertion: a matching value is tolerated, but a conflicting value throws and cannot choose a different layout.

`modules/dev-corpus.ts` therefore no longer carries `hints-random` as independent configuration. Stress corpus 2 supplies `stress-levels-random.json`; the shared authority derives `hints-random`.

`scripts/check-corpus-level-formatting.mjs` now derives the expected hint-file identity set from the corpus levels and compares it to actual files. Missing files are explicitly classified as valid no-hint levels; orphan files are failures. Directory enumeration no longer defines level identity.

Writers now reject persistent ids containing path separators/control characters rather than treating an arbitrary string as a path fragment.

## Tests added

`modules/hint-artifact-layout.test.ts` covers:

- published/stress filename -> directory rules, including Windows-style paths;
- persistent ids including `F00001-gr-04`;
- positional numeric fallback;
- unsafe/path-like ids failing closed;
- expected-file derivation from corpus identity;
- browser fetching of stress-corpus-2 hints from `hints-random`;
- rejection of a conflicting legacy `hintsDirName` override.

## Authority/status updates

- `docs/hint-evidence-consolidation-inventory.json` records the new neutral authority and marks the layout implementation complete pending execution validation.
- PSC-025's registry progress now names the shared authority and the remaining validation/current-main-reconciliation gate.

## Validation status

This ChatGPT GitHub environment can edit/read repository state but cannot execute the repository locally. No claim of green Vitest/Node/CI is made here.

A repo-capable continuation should run at minimum:

- `npx vitest run modules/hint-artifact-layout.test.ts modules/dev-corpus.test.ts`
- `npm run check:types`
- `node scripts/check-corpus-level-formatting.mjs`
- the ordinary Node/fast validation floor appropriate to the eventual reconciliation PR.

If those expose existing hint-directory occupants that the widened discovery rule correctly recognizes but that are not actual per-level hint artifacts, adjust the *classification contract* explicitly rather than restoring the old narrow regex.

## Next work

After validation/reconciliation, PSC-025 can close. The next dependency-ordered Phase-2 work remains the canonical solver-request projection/identity. That should preserve the plan's distinction between:

- run-wide request syntax/semantics;
- level-specific/history-derived input;
- backend execution/reproducibility;
- actual per-level effective behavior.

Do not collapse level-dependent effective values into a run-wide digest merely to make omitted and explicit-default syntax hash identically.
