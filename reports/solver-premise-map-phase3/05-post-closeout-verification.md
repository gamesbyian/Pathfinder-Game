# Phase 3 post-closeout repository-state verification

Date: 2026-09-17
Branch: `chatgpt/phase3-premise-map-reconciliation-2026-09-17`
PR: #1852
Base: Phase-2 branch / PR #1851

## Why this addendum exists

The original closeout intentionally left the final CI state pending. A subsequent verification pass therefore re-opened the repository/PR state instead of treating the closeout text as proof of completion.

## Verified PR boundary

PR #1852 is still open, mergeable, non-draft, and stacked directly on `chatgpt/phase2-premise-map-synthesis-2026-09-17` at `3c9a0edb78bebe049c4c128b907a5456508a767c`. Before this verification work its head was `7c7ddea740cae3a981e893d396d2caafb98c0610`, 13 commits ahead of the Phase-2 base.

The Phase-3 diff before this addendum contained exactly 12 files:

- `.github/workflows/premise-map-hardening.yml`;
- `docs/solver-optimization-workstreams.md`;
- four separately versioned v2 premise-map/admission/relation artifacts;
- five Phase-3 reports;
- `scripts/audit-solver-premise-map-v2.mjs`.

No frozen-v1 snapshot, v1 hardening overlay, mining preregistration, Phase-1 report, Phase-2 report, solver-runtime source, corpus/dataset, production-policy file, or `solver-future-work.md` change was present in that diff.

## Review state

At verification time there were no submitted PR reviews and no inline review threads. CodeRabbit had skipped automatic review because the PR targets a non-default stacked base; that skip is not treated as review approval.

## Validation defect and confirmed cause

The premise-map hardening workflow completed successfully and ordinary CI's `deep-verification` job succeeded, but the `fast-gate` job failed at its final collected-outcome step.

The failing underlying condition is now identified without relying on opaque job logs:

- `docs/solver-optimization-workstreams.md` declares `agent-context-budget: warn=10500 max=14000`;
- the Phase-2 base blob is 13,979 bytes, only 21 bytes below the enforced maximum;
- Phase 3's legitimate queue handoff enlarged it to 15,226 bytes;
- `check:dead-scripts` transitively runs the mandatory agent-context budget checker, so the Phase-3 head necessarily failed that fast-gate subcheck.

This explains the otherwise confusing Actions presentation in which continue-on-error substeps appear successful while the final collector records a failed underlying `outcome`.

## Repair

Phase 3 does not weaken or raise the context budget. Instead, commit `924d6dccd704763fcd8926390130d8b89db8b342` compacts the canonical workstreams authority to 12,276 bytes while preserving its current lane dispositions, evidence links, Phase-3 handoff, production boundary, and standing research restrictions.

The inherited 13,979-byte state is itself a maintenance warning: the authority was already on a 21-byte cliff before Phase 3. The repair restores useful headroom rather than merely squeezing the new handoff under the limit.

## Current status

The semantic reconciliation, versioned-v2 admission, hardening workflow, and bounded queue handoff remain intact. The context-budget defect has been repaired on the existing Phase-3 branch, but Phase 3 is not declared verification-clean until the repaired head's ordinary CI and premise-map hardening have been checked at a natural checkpoint.

No solver implementation, consumer-contract execution, new premise admission, corpus mutation, or production promotion is authorized by this verification repair.
