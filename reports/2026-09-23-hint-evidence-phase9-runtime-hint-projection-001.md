# Hint evidence consolidation — Phase 9 generated runtime hint projection — 001

> **Status:** active
> **Last evidence:** 2026-09-23 — Retained and reconciled as part of the active hint-evidence consolidation implementation.
> **Decision:** Preserve this report as durable implementation/audit evidence; current code and later reconciliation records remain authoritative where they supersede earlier details.
> **Remaining gate:** Apply the current phase-specific validation and closeout gates before treating this report as proof of whole-program completion.


> **Status:** implementation-complete on descendant branch; real build validation/measurement pending
>
> **Date:** 2026-09-23
>
> **Branch:** `chatgpt/hint-consolidation-phase4-6-table-setting-2026-09-23`

## Purpose

Complete the plan's independent Phase-9 delivery leaf without changing canonical research evidence or
waiting for physical Hint schema v4.

The preimplementation audit measured roughly 741 MB of canonical published/stress hint JSON being
copied into every Vite build even though ordinary player/runtime consumers immediately project loaded
Hints to paths.

The target is therefore a derived build artifact, never a second tracked evidence authority.

## Implementation

Added `scripts/runtime-hint-projection-lib.mjs`.

For each canonical/historical source hint artifact it:

1. decodes through the shared canonical `decodeHintArtifact()` boundary;
2. projects the ordered semantic Hint array to ordered paths;
3. emits a path-only runtime document with:
   - `runtimeProjectionVersion`;
   - SHA-256 of the exact source bytes;
   - SHA-256 of the canonical decoded semantic Hint array;
   - path-only `hints`;
4. decodes the generated document again through the same shared decoder and fails construction if the
   ordered paths do not round-trip exactly.

Directory generation writes a `_projection-manifest.json` containing per-file source hashes,
semantic hashes and hint counts plus aggregate source/runtime byte measurements.

## Vite/build integration

`vite.config.ts` no longer recursively copies the tracked canonical trees:

- `data/hints`;
- `data/stress/hints`;
- `data/stress/hints-random`.

Instead, the build generates path-only runtime artifacts into the corresponding `dist/data/...`
locations.

Level/corpus JSON and other application assets remain unchanged.

The build prints aggregate source bytes, projected bytes and percentage reduction.

## Authority boundary

The tracked canonical Hint stores remain the single research/evidence authority.

The generated runtime files:

- are untracked/rebuildable;
- intentionally contain no provenance;
- remain freshness-bound to source content + decoded semantic content;
- remain readable by the same browser/Node decoder used for canonical evidence;
- do not replace canonical files for research/dev tooling that needs provenance.

No physical Hint schema v4 choice is implied by this implementation.

## Verification guard

Added `scripts/runtime-hint-projection-lib-node-test.mjs`.

It checks:

- provenance-heavy canonical input projects to the exact ordered paths;
- legacy bare-path input also projects correctly;
- generated files carry content and semantic hashes;
- generated files contain no provenance payload;
- generated files round-trip through `decodeHintArtifact()`;
- directory manifests are deterministic and ordered;
- a provenance-bearing fixture materially shrinks.

The guard is included in `test:node`.

## Remaining acceptance

This authoring environment cannot run the real Vite build. A repo-capable continuation should run:

- `npm run test:runtime-hint-projection`;
- `npm run build`;
- browser/dev-mode tests;
- the ordinary type/test floor.

It should record the measured full-corpus source/runtime bytes and build time. If the generated
`_projection-manifest.json` files collide with any browser file-enumeration assumptions, fix the
consumer/discovery contract explicitly rather than falling back to copying canonical provenance.

Once the real build is green and path equivalence is confirmed over the full generated tree, Phase 9's
implementation exit criterion is met independently of Phase 8.
