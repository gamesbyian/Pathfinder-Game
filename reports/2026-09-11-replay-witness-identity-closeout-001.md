# Replay witness identity closeout 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-11 — closes the replay-witness identity gate left open by the hint-provenance evidence-relevance audit.
> **Decision:** CP-SAT prune-gap labels are path-bound evidence. New artifacts must stamp the exact witness identity, and offline replay must match that identity before using the labels.
> **Remaining gate:** none.
> **Compute:** existing-code/source audit only; no CP-SAT relabelling campaign and no solver sweep.

## Why this follow-up existed

The hint-provenance evidence-relevance audit deliberately did not replace every first stored hint with the new representative-hint selector. Some offline tools consume labels produced relative to a specific witness path, so changing the path without changing the labels would be semantically wrong.

That boundary was real. `scripts/stress/prune-gap-probe.mjs` generated CP-SAT branch labels while walking `(raw.hintRecords || [])[0].path`, but its artifact recorded only the level, sampling/oracle parameters and branch labels. `scripts/stress/offline-replay-harness.mjs` later reconstructed those labelled states from whatever path occupied `(raw.hintRecords || [])[0].path` at replay time. There was no persisted identity tying the labels to the witness that generated them.

Therefore a later hint reorder, curation change or corpus rewrite could silently replay valid CP-SAT labels against a different path. The labels themselves would remain valid historical observations, but the reconstructed state associated with them would not be the state that CP-SAT classified.

## Implementation

A small shared identity helper now owns the contract:

- `scripts/stress/witness-path-identity.mjs`
  - versioned witness identity;
  - SHA-256 over the exact JSON cell-key path;
  - exact matching against current stored hints;
  - fail-closed behavior when the stamped witness is absent or the identity version is unsupported;
  - explicit legacy compatibility mode for identity-less artifacts.

`prune-gap-probe.mjs` now writes `witnessIdentity` into every newly generated prune-gap artifact.

`offline-replay-harness.mjs` now resolves the artifact's stamped witness against all current stored hint paths instead of trusting hint-array position. If the matching witness is absent, replay aborts. Reordering records therefore does not change the reconstructed witness.

Legacy prune-gap artifacts predate this stamp. They now fail closed by default. `--allow-unverified-legacy-witness` explicitly restores the old first-hint assumption for historical reproduction; the harness warns and records `witnessIdentityVerified: false` / `witnessSource: legacy-first-hint` in output. That override does not upgrade old artifacts into verified witness-bound evidence.

Regression coverage exercises deterministic identity, reordered hints, missing witnesses, unsupported identity versions and the explicit legacy escape hatch.

## Disposition of existing evidence

No historical labels are deleted or rewritten. The change distinguishes three situations:

1. **New identity-bearing artifact, matching witness present:** replay is verified and can support the usual bounded offline-replay inference.
2. **Identity-bearing artifact, matching witness absent:** fail closed; do not substitute another valid solution path.
3. **Legacy identity-less artifact:** usable only through the explicit unverified compatibility flag. Regenerate the relevant prune-gap artifact before making a new decision-bearing claim that depends on exact witness reconstruction.

A bulk CP-SAT regeneration is not justified. Existing historical results remain historical evidence, and regeneration should be purchased only when a live research question needs one of those old labelled populations as current decision evidence.

## Relationship to the provenance audit

This closes the specific replay-witness identity gate left open by `2026-09-11-hint-provenance-evidence-relevance-audit-001.md` without reopening the broader provenance project.

The audit's older wording that basin/exposure work remained is historical state, not the current solver queue. Subsequent work has already advanced first-loss and repair-side exposure/reachability substantially. Current downstream solver priority remains owned by `docs/solver-optimization-workstreams.md`; this closeout does not change its ordering and does not justify broad new solver compute.

## Remaining work

No general provenance/replay-identity cleanup remains from this gate.

If future research needs a legacy prune-gap atlas for a new promotion or soundness claim, regenerate only the required labelled cohort so it carries verified witness identities. Otherwise leave the old artifacts intact and treat their replay as historical/unverified when the compatibility flag is used.
