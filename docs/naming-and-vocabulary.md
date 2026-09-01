# Naming and vocabulary

This is the permanent naming authority for Pathfinder. Use it for new names and during rename migrations. The active repository-wide migration sequence and compatibility details live in [`naming-cleanup-plan.md`](naming-cleanup-plan.md); execution status lives in [`naming-cleanup-ledger.json`](naming-cleanup-ledger.json).

## Naming contract

Names describe **current observable behavior or architectural role**, not the experiment that originally created a component.

Do not overclaim guarantees:

- **dedup** means exact duplicate/equivalence removal;
- **oracle** means an independent reference implementation or authority;
- **full** means complete support for the stated domain;
- **known** means established by proof/evidence, not a heuristic threshold;
- **reachable** means actual graph/search reachability;
- an unqualified executable **benchmark** measures performance/cost, not solved-set regression.

Persisted identities and human-readable names are separate concerns. For a persisted rename, use **dual-read, single-write** unless the owning migration explicitly says otherwise: accept legacy and canonical input, normalize internally, emit canonical output, and do not rewrite frozen historical artifacts for cosmetic consistency.

Use full terms in exported types, public APIs, stage IDs, report fields, and current documentation. Short forms such as `mc`, `mp`, `int`, and `arch` are acceptable only in small local scopes where the expanded term is immediately visible.

## Solver vocabulary

A solver action is described along independent dimensions:

1. **search family**: DFS, beam, repair, admissible-order;
2. **scoring profile**: a weight configuration used by shared scoring;
3. **structural ordering bias**: geometry/order bias such as perimeter direction;
4. **beam retention policy**: plain or mechanic-bucket retention;
5. **routing regime**: implementation classification used to choose actions;
6. **solver stage**: scheduler/orchestration position;
7. **resource envelope**: node/work/deadline allocation;
8. **seed**: deterministic random-search seed when applicable.

Do not call a scoring profile a distinct search technique by name alone. Do not describe a routing regime as an intrinsic puzzle archetype.

Canonical attempt identities use structured, named components:

- `dfs|score=<profile>|bias=<bias-or-none>`
- `beam|score=<profile>|bias=<bias-or-none>|width=<n>|retention=<plain|mechanic-buckets>`
- `repair|score=repair|guidance=<standard|turn-biased|must-turn-biased>`
- `admissible-order|tieBreak=<profile-or-none>|lds=<on|off>`

Legacy attempt identity strings remain historical input syntax only after the migration lands.

**Mechanic-bucket retention** is the canonical term for the current flipper/must-cross bucketed beam retention mechanism. **Coarse state merge** is the canonical term for the beam mechanism that intentionally merges a coarse state tuple; reserve **dedup** for exact equivalence removal.

## Level and routing vocabulary

Use **required path coverage ratio** for required path length divided by the non-gate winning-path cell count. Do not call this navigable density.

Use **routing regime** for the solver's hand-authored routing classifier. Canonical regime values after migration are:

- `general`
- `sparse-low-intersection`
- `intersection-heavy`
- `must-cross-heavy`
- `multi-portal`

Use **requiredLength** and **requiredIntersections** in normalized/runtime APIs. Historical wire fields `reqLen` and `reqInt` remain the serialized compatibility spelling until a separately versioned wire-format change.

## Referee, reference, and validation

Use:

- **referee** for the canonical production game-rule validator;
- **independent reference solver** for a separately derived solver implementation;
- **CP-SAT reference model** for CP-SAT tooling;
- **validator** for a tool that calls the canonical referee.

A wrapper around production validation is not an oracle.

## False-goal terminology

Internal solver/editor/tooling vocabulary is **false-goal triggerability**:

- a false goal is **triggerable** or **untriggerable**;
- a search may be **complete**, **partial**, or **aborted**.

Player-facing UI may continue to say "trap" where that is intentional game language.

## Application vocabulary

Runtime rotation/reflection state is **orientation**. Reserve **variant** for generated/research level relatives.

Runtime flow distinguishes:

- **game command**: requested intent such as MOVE or RESET;
- **game event**: emitted outcome such as WIN or PORTAL_TRAVERSE;
- **state action**: imperative mutation helper under `state/actions/`.

Qualified `*-core.ts` remains valid for the pure transition/input cores defined by ADR 0006. `state/actions/core-actions.ts` also remains canonical because it specifically owns actions on the top-level/core engine-state slice. The former top-level mixed-responsibility core facade was the naming/architecture problem and was removed in Phase 14A; the word `core` is not globally banned.

## Qualified overloaded terms

Prefer explicit qualifiers:

- `scoringProfile`, `solutionProfile`
- `levelFingerprint`, `solverFingerprint`, `solutionFingerprint`
- `levelFamily`, `attemptFamily`, `searchFamily`
- `knownSolutionPrefixSurvival`
- `residualLevelSet`, `residualSearchState`, or another domain-qualified residual term

Qualification is required at surfaced or ambiguous boundaries, not as a ban on contextually
unambiguous locals. A positional/local identifier `profile` is acceptable when its declaration is
typed `ScoringProfile`; generated fields, exported object properties, and prose still use
`scoringProfile`. The read-only `AttemptLike.profile?: string` adapter in `hint-provenance.ts` is a
permanent historical-attempt compatibility read, not a canonical output field. **Solution-path
family** is the canonical concept for groups of structurally
similar complete solution paths. Within the bounded
`known-solution-prefix-survival.ts` contract, `family`, `families`, and `familyIds` are accepted
short member names for that concept; they do not mean level, attempt, or search family.

Historical compatibility is narrower than current vocabulary. Do not copy a legacy spelling into a
new surface merely because one owning reader still accepts it:

- Current application level-identity APIs use `levelFingerprint`. Phase 15 preserved the computed
  fingerprint bytes, Firestore document/path identities, persisted `levelFingerprint` field, and
  `fingerprintVersion`; it did not create a generic `fingerprint` compatibility shape.
- The current variant-family dataset CLI is `--variant-family-dataset-root`. The shared
  `family-paths.mjs` parser alone accepts `--trove-root` as an external transition alias
  (NC-P15-001). Family-run manifest schema v2 single-writes `variantFamilyDataset`, while its owning
  normalizer permanently reads authentic schema-v1 `trove` manifests (NC-P15-002). Family-index
  discovery permanently recognizes frozen `wide-trove-attempts-*` evidence alongside canonical
  `variant-family-dataset-attempts-*` paths (NC-P15-003); new dataset outputs use the canonical
  stable path convention (NC-P15-009).
- Current CP-SAT explicit-prefix results are schema v2
  `referenceLabel`/`referenceReason`, and the workflow job is `reference-shards`
  (NC-P15-005/010). There is no maintained historical schema-v1 result reader. The external
  `atlas-abstain` case-format spelling remains only as the owned transition alias for canonical
  `reference-abstain` (NC-P15-011), and the known-prefix source reader permanently normalizes
  authentic schema-v1 `oracle-abstain` branches to the canonical reference model (NC-P15-012).
  Independent solver-oracle terminology remains valid under the general oracle rule.
- The shared eligibility owner is
  `scripts/stress/lib/cpsat-branch-label-eligibility.mjs`; the retired
  `atlas-eligibility.mjs` filename has no compatibility alias (NC-P15-006). Current prune-gap
  consumers use `--prune-gap-dir`/`PRUNE_GAP_DIR` and new report metadata
  `pruneGapDir`/`pruneGapFiles`; `--atlas-dir`, `ATLAS_DIR`, `atlasDir`, and `atlasFiles`
  survive only in frozen history or naming-migration evidence, not current executable compatibility
  (NC-P15-007/013).

## Corpora

Canonical corpus names are:

- `published`
- `corpus1`
- `corpus2`

Historical physical filenames may retain older spellings. New CLI help, reports, variables, and workflow surfaces must not call Corpus 2 "random" or "randoms".

## Research/tool verbs

Surfaced tools should lead with an operation that states what they do:

- `check`: deterministic invariant/pass-fail check
- `validate`: semantic/data validation
- `analyze`: offline analysis of existing evidence
- `compare`: comparison of outputs/treatments
- `measure`: performance or cost measurement
- `run`: execute a search/treatment when no more precise verb fits
- `generate`: create data
- `collect`: build/rebuild evidence from runs
- `sweep`: repeat a defined operation over a population/parameter range
- `probe`: bounded diagnostic measurement
- `audit`: broad systematic review
- `census`: near-exhaustive enumeration over a defined matrix

More precise domain verbs such as `build`, `merge`, `plan`, `import`, `migrate`, `replay`, `rank`, `solve`, and `report` are preferred when they are clearer.

Lifecycle labels such as `pilot`, dates, experiment origin, and generic `legacy` are not permanent surfaced command identities unless the historical distinction is itself the behavior being selected. `method-probe` is intentionally retained because it is genuinely a bounded diagnostic single-method execution tool.

## Historical evidence

Frozen dated reports, archived snapshots, historical logs, old workflow-run artifacts, and retained experiment evidence preserve their original names. Current authorities may annotate a legacy term with its canonical successor, but do not mass-rewrite evidence to make history look current.

For solver research, the operational boundary between frozen historical vocabulary and current executable identities is documented in [`solver-research-post-naming-resumption.md`](solver-research-post-naming-resumption.md). Historical machine identities must enter current analysis through their named compatibility normalizer; removed command/file/helper names are provenance, not permanent aliases.
