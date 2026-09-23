# Hint-evidence mechanical continuation 002

> **Status:** concluded-positive
> **Last evidence:** 2026-09-23 — local validation at commit `ed49b458`
> **Decision:** preserve strict failure/discovery comparability and expose historical identity missingness; no identity-model redesign
> **Remaining gate:** reconcile this additive tranche after #2002's canonical request/protocol helpers, then rerun the two owner tests

## Checkout reconstructed

- Audited branch: `work`.
- Audited base SHA: `23389ff4763884db4dc10689689aef216addd2b9`.
- The checkout had no configured remotes and no uncommitted changes.
- The #2003 audit report was not present, so this tranche used the current consolidation plan and current-tree inspection rather than recreating that report.

## Mechanical work completed

The maintained hint-discovery/failure-process join now reports how many failure and discovery rows abstained because the exact population, parent, protocol, or solver-revision comparison key was incomplete. This is additive observability: incomplete historical rows remain readable and remain unjoined rather than acquiring modern defaults.

Owner tests now pin these boundaries:

1. matching protocol/revision/population evidence can join across distinct acquisition run IDs;
2. a shared run ID cannot make different protocols comparable;
3. missing historical protocol/revision identity remains missing and abstains;
4. longitudinal applicability treats run ID as required lineage but not as a semantic equality dimension.

Implementation commit: `ed49b458` (`Guard failure evidence comparability identity`).

## Validation

- `npm run test:hint-failure-process-join` — passed.
- `npm run test:failure-evidence-semantics` — passed.
- `npm run ci:fast` — passed.
- `npm run build` — passed.
- `node scripts/agent-context-budget.mjs --check` — passed (silent success).

## Findings for #2002

- `hint-failure-process-join-lib.mjs` already correctly excludes `runId` from its comparability key; the new tests make that scientific boundary explicit.
- The join's exact legacy key remains `population identity + parent identity + protocolHash + solverRef`. When #2002 reconciles canonical request/protocol identity, this is a precise consumer migration point. Use #2002's compatibility authority there; do not add a local competing digest helper.
- Document-level protocol/revision fallback remains a valid compact failure-document representation. Only evidence missing both row-level and document-level values is counted as incomplete.
- The additive summary counters should be retained through any query/report projection that exposes join accounting; otherwise historical abstention becomes invisible again.

## Safe transplant

Cherry-pick `ed49b458`, then this report commit. Resolve only if #2002 changed the join summary shape or the corresponding owner tests. If #2002 introduced canonical compatibility resolution at this consumer, apply that resolver before the existing exact-key function while preserving the new rule tests and missing-comparability counters. Do not transplant any request digest or source-run abstraction from this branch; none was created.

## Deliberately reserved semantic work

- Choosing canonical request/protocol compatibility across identity eras remains owned by #2002's unseen helper.
- Search-loss semantic-event versus physical-occurrence identity was not changed.
- Source-run binding, physical hint schema v4, Firestore occurrence storage, historical enrichment, and solver policy/budget semantics were not changed.
- No historical missing field was inferred from a current default, filename, timestamp, workflow SHA, or run ID.
