# Architecture unification debt

> **Status:** live structural-debt queue.
> **Read for:** duplicate authority, compatibility migration, mutable-state lifetime, and semantic-boundary cleanup.
> **Do not use for:** solver-policy/research priority; use [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md).

Preserve behavior and evidence. Similar representations are not automatically duplicates. Keep structural refactors separate from solver-policy tuning unless a structural defect prevents trustworthy research.

History: [`archive/snapshots/architecture-unification-debt-2026-09-04-pre-proposal-consolidation.md`](archive/snapshots/architecture-unification-debt-2026-09-04-pre-proposal-consolidation.md).

## Classification

| Kind | Rule |
|---|---|
| Intentional plurality | Keep representations that answer different questions; document ownership. |
| Boundary compatibility | Accept old/new external forms, normalize once, retain only needed adapters. |
| Parallel internal authority | Unify modules that independently own the same policy/schema/meaning. |
| Repeated mechanics | Share budget/telemetry/provenance/executor plumbing without forcing identical behavior. |
| Hidden lifetime coupling | Make mutable-state ownership/lifetime explicit; reset/isolate it or define a typed handoff. |
| Evidence reconstruction | Prefer producer facts when consumers otherwise rebuild the same scientific classification or join. |
| Identity-model weakness | Strengthen identifiers when ambiguity comes from under-resolved run, event, treatment, source, population, or revision identity. |

External forms may vary; internal authority and mutable-resource lifetime should be unambiguous.

## Current debt

| Area | Current direction / exit condition |
|---|---|
| **Residual evidence/classification authority** | Residual-class research still reconstructs capability, offer/reach/starvation, dispatch, historical-candidate, and no-known-candidate distinctions from canonical lower-level artifacts. Prefer a versioned generated residual derivation because local predicate drift already changed classifications. Preserve five-class semantics and source evidence. |
| **Research-population derivation** | Population identity/integrity already exists in experiment contracts, preflight/publication, recovery tooling, and the single-population-source rule. Do **not** create another generic population authority. Add reusable helpers only for recurring multi-asset joins, then feed literal IDs/source identity into the existing integrity contract. |
| **Exact treatment opportunity over lifecycle telemetry** | `stageLifecycle` owns instantiated/reached/skipped/starved/exhausted state plus attempts/nodes/work; attempt/action identity is canonical. Remaining debt is consumers inferring exact opportunity from stage-family names or ladder reconstruction. Prefer deriving from lifecycle + action telemetry before adding a schema. |
| **Research-question state synchronization** | `solver-research-question-relations.json` owns machine-readable question state, evidence, relationships, constraints, results and reopen conditions. Validate/project it against workstreams, research-status index, workflow outcomes and reports where drift remains. |
| **Experiment/run provenance convergence** | Experiment manifests, the v3 experiment contract, preflight, publisher, family-run manifests and fingerprints have different jobs. Prefer the existing contract/preflight/publisher path for decision-bearing runs; extract shared provenance only after demonstrated drift/interoperation need. |
| **Research harness contract adoption** | Diagnostic executors may differ by design. Decision-bearing evidence should reuse existing experiment-contract/preflight/canary/publisher machinery where semantics fit so work/deadline, population, code identity, side effects and determinism are explicit. |
| **Corpus/level I/O authority reach** | `level-data-io.mjs` owns explicit selectors and hint-aware I/O; `corpus-query-lib.mjs` owns common research corpus aliases/loading/querying. Migrate bespoke loaders/path tables/ID-position logic where semantics match. Add richer level references only when a concrete join needs corpus revision/fingerprint + persistent ID + position together. |
| **Stage work/budget ownership** | Canonical policy lives in `SOLVER_STAGE_SPECS`/`BudgetEnvelope` plus stage-plan/stage-budget modules. Replace accidental shared mutable budget inheritance and reduce source-text shadow authority where practical. Keep independent behavioral checks because structural ratchets have missed real defects. |
| **Per-solve vs realm-global work meters** | Keep meanings explicit and prevent cumulative realm state from affecting solve budgets or nested/concurrent behavior. Prefer caller-owned multi-solve accumulation from `SolveResult.workSpent`. |
| **Search-stage mutable-state isolation** | No known same-action fresh-vs-preceded discrepancy after the 2026-09-03 sweep. Reopen only for a new fixed-input/config/seed/work history-dependent discrepancy without an intentional typed handoff. |
| **Residual stage/retry dispatch duplication** | Remove mirrored policy/dispatch only when canonical stage/action identity stays explicit and behavior is preserved. |
| **Attempt/result telemetry compatibility** | `stageId` is primary. Keep legacy fields only at I/O compatibility boundaries and retain enough config/seed/budget/protocol identity for reproduction. |
| **Sequential vs raced orchestration** | Share policy identity/budgets where applicable; keep execution distinct. Test planned-attempt parity rather than winner parity. |
| **Historical hint shapes** | Normalize inward to mutable `Hint[]`; keep legacy `.hints` / `.hintRecords` readable only where historical I/O requires them. |
| **Persistent identity vs structural revision** | Persistent ID identifies the entity; fingerprint identifies structure/revision. Migrate persistence toward ID + revision while retaining versioned legacy reads only as required. |
| **Firestore legacy fingerprint lookup** | Prefer current + known legacy keys; use collection-wide structural scans only for unknown/unversioned history. |
| **Raw-level wire semantics** | Define wire meaning once and project to optimized solver representation; eliminate independent semantic interpretation where layering permits. |
| **Runtime/domain/solver rule duplication** | Maintain one semantic contract with specialized implementations. Use referee/differential conformance so independence can still catch drift. |
| **Coordinate-base guessing** | Move internal consumers to explicit `packed` / `xy0` / `xy1`; keep autodetection only at compatibility boundaries. |
| **Level selector guessing** | Canonical solver CLIs use explicit shared `pos:` / `id:` parsing. Remove guessing once consumers are gone. |
| **Published storage backends** | Preserve backend differences behind one application-level published-level abstraction where duplicated ownership remains. |
| **Corpus activation ownership** | Add/extend a facade only if coordinated levels, hints, supplemental hints and theme selection continue spreading across consumers. |
| **Solver aliases** | Opportunistically converge on one internal solve name; retain only adapters with live consumers. |

## Durable contracts

### Stage/action isolation

An action intended to be independent must not silently inherit predecessor-dependent legal/search state, scoring/order inputs, PRNG state, memoized values, budget accounting, proxy overrides, or eligibility/config identity.

For discrepancies, reproduce fresh versus minimal predecessor prefix, diff mutable inputs, locate the first decision/budget divergence, then isolate state or formalize a typed handoff with an independent control. Do not hide dependencies by forcing isolated experiments through predecessor ladders.

### Work accounting

Per-solve work and realm-global discovery accounting are distinct. Deterministic allocation comparisons use `workSpent`; raw nodes remain technique diagnostics; wall time measures implementation cost. Budget-resource meanings belong in [`solver-budget-determinism.md`](solver-budget-determinism.md).

### Solver authority boundary

Canonical stage policy/plan/budget/executor/action identity owns orchestration semantics. Sequential and raced engines may execute differently but should not create parallel policy authorities. New stages/actions use the canonical identity/budget/telemetry path.

### Identity and compatibility

Persistent IDs identify entities; fingerprints identify exact structural revision. Normalize historical external forms inward and keep frozen legacy calculators/readers only where supported provenance/migration requires them.

### Semantic boundaries

Wire-level meaning gets one definition before projection into runtime/domain/solver representations. Specialized implementations may remain. Independent referee/reference paths are useful when they detect drift rather than duplicate mutable policy.

### Research evidence boundaries

Scientific concepts recurring across experiments need explicit identity and derivation contracts before becoming ranking or promotion inputs. **Extend an existing authority before naming a new abstraction.** Existing owners include the research-data asset registry, capability-memory interface, experiment population/provenance contracts, canonical lifecycle/action telemetry, question-relation registry, and level/corpus I/O helpers. Producers should preserve decision-bearing facts when downstream reconstruction would otherwise require aliases, stage families, incomplete provenance, or manual source lists. Independent evidence producers may remain separate; canonicalize/join observations rather than forcing common-mode generation.

## Priority rule

This is **structural debt, not an execution roadmap**. Work on a row when it blocks trustworthy research/correctness, creates live duplicate authority/state coupling, is safely removable during nearby work, or causes recurring maintenance cost exceeding change risk. Architectural neatness must not displace current solver research.

## Completion standard

A row leaves this file when its ambiguity/compatibility obligation is gone or a stable owner has absorbed the rule. Evidence/chronology belongs in reports or snapshots.

Target state: every plurality has an owner and reason; every mutable resource has an owner and lifetime; compatibility normalizes at boundaries; current semantics/policy have one internal authority with deliberate projections.