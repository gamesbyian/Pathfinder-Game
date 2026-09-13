# Architecture unification debt

> **Status:** live structural-debt queue.
> **Read for:** duplicate authority, compatibility migration, mutable-state lifetime, and semantic boundary cleanup.
> **Do not use for:** solver-policy/research priority; use [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md).

Preserve behavior and evidence. Similar representations are not automatically duplicates. Keep structural refactors separate from solver-policy tuning unless a structural defect prevents trustworthy research.

History: [`archive/snapshots/architecture-unification-debt-2026-09-04-pre-proposal-consolidation.md`](archive/snapshots/architecture-unification-debt-2026-09-04-pre-proposal-consolidation.md). Detail: [`../reports/2026-09-12-duplicate-authority-and-missing-abstractions-audit.md`](../reports/2026-09-12-duplicate-authority-and-missing-abstractions-audit.md); its second-pass reconciliation supersedes its initial proposals.

## Classification

| Kind | Rule |
|---|---|
| Intentional plurality | Keep distinct representations that answer different questions; document ownership. |
| Boundary compatibility | Accept old/new external forms, normalize once, retain only the needed adapter. |
| Parallel internal authority | Unify modules that independently own the same policy/schema/meaning. |
| Repeated mechanics | Share budget/telemetry/provenance/executor plumbing without forcing identical behavior. |
| Hidden lifetime coupling | Make mutable-state ownership/lifetime explicit; reset/isolate it or define a typed handoff. |
| Evidence reconstruction | Prefer authoritative producer facts when several consumers independently rebuild the same scientific classification or join from raw fields. |
| Identity-model weakness | Strengthen identifiers when apparent duplication/ambiguity is caused by under-resolved run, event, treatment, source, population, or revision identity. |

External forms may vary; internal authority and mutable-resource lifetime should be unambiguous.

## Current debt

| Area | Current direction / exit condition |
|---|---|
| **Residual evidence/classification authority** | Current residual-class research still reconstructs capability, offer/reach/starvation, dispatch, historical-candidate, and no-known-candidate distinctions from several canonical lower-level artifacts. The corrected post-1029 atlas is the strongest candidate for a versioned generated residual-class authority because local predicate drift already changed 25 classifications. Preserve the five-class semantics/source evidence; exit when class-specific research consumes one authoritative residual derivation or an intentionally versioned alternative rather than re-encoding class rules locally. |
| **Research-population derivation** | Core population identity/integrity already exists in `solver-experiment-contract.mjs`, experiment preflight/publication, recovery tooling, and the operating-model single-population-source rule. Do **not** create another generic population authority. Add only reusable derivation recipes/helpers for recurring multi-asset joins such as current residual ∩ capability/treatment predicates, then feed their literal IDs/source identity into the existing hash/integrity contract. Exit when recurring research joins stop re-encoding membership predicates. |
| **Exact treatment opportunity over lifecycle telemetry** | Canonical `stageLifecycle` already owns stage instantiated/reached/skipped/starved/exhausted status plus attempts/nodes/work, and attempt/action identity is already canonical. Remaining debt exists only where a consumer must infer exact action/config opportunity from stage-family names or ladder reconstruction. Prefer enriching/deriving from existing lifecycle + action telemetry before introducing any new participation schema. |
| **Research-question state synchronization** | `solver-research-question-relations.json` already owns machine-readable question IDs, state, evidence, relationships, constraints, results, and reopen conditions. Do **not** replace it. Validate/project it against the Markdown workstream authority, research-status index, workflow outcome artifacts, and report evidence where current tooling permits those surfaces to drift. Preserve relation topology separately from execution priority and workflow execution outcome. |
| **Experiment/run provenance convergence** | Experiment manifests, the v3 solver experiment contract, preflight, result publisher, family-run manifests, and fingerprints legitimately have different top-level jobs. Prefer the existing contract/preflight/publisher path for decision-bearing runs. Extract a shared lower-level provenance fragment only when two current schemas demonstrably drift or must interoperate; do not add `RunIdentity`/run-context frameworks speculatively. |
| **Research harness contract adoption** | Fresh-process retry, production solve, isolated-technique census, fingerprinting, replay/microscope, and sweep tools may execute differently by design. For decision-bearing evidence, reuse existing experiment-contract/preflight/canary/publisher machinery where semantics fit so work/deadline, population, resolved code identity, side effects, and determinism are explicit. Keep diagnostic executors distinct rather than forcing a universal runner. |
| **Corpus/level I/O authority reach** | `level-data-io.mjs` already owns explicit `pos:`/`id:` selector semantics and hint-aware level I/O; `corpus-query-lib.mjs` already owns common research corpus aliases/loading/querying. Migrate bespoke loaders/path tables/ID-position logic onto these owners where semantics match, and clarify any overlap between the two. Add a richer level-reference object only if a concrete remaining join needs corpus revision/fingerprint + persistent ID + position together. |
| **Stage work/budget ownership** | Canonical stage policy already exists in `SOLVER_STAGE_SPECS`/`BudgetEnvelope` plus stage-plan/stage-budget modules. Do **not** create another registry. Replace accidental shared mutable budget inheritance where it remains and reduce source-text shadow authority in `check-solver-budget-boundaries.mjs` by validating existing policy/budget structures where practical. Retain independent behavioral checks because textual/structural ratchets have missed real work-dose defects. Budget semantics remain owned by [`solver-budget-determinism.md`](solver-budget-determinism.md) and scheduler policy by [`solver-scheduling-policy.md`](solver-scheduling-policy.md). |
| **Per-solve vs realm-global work meters** | Keep meanings explicit and prevent cumulative realm state from influencing solve budgets or nested/concurrent behavior. Prefer caller-owned multi-solve accumulation from `SolveResult.workSpent`. Retire this row when ownership cannot be confused by callers. |
| **Search-stage mutable-state isolation** | No known current same-action fresh-vs-preceded discrepancy after the 2026-09-03 reproduction sweep. Reopen as correctness/research-validity debt only if fixed input/config/seed/work produces a new history-dependent search discrepancy without an intentional typed handoff. |
| **Residual stage/retry dispatch duplication** | Remove mirrored policy/dispatch only when canonical stage/action identity remains explicit and behavior is preserved. New actions use canonical scheduler/action identity. |
| **Attempt/result telemetry compatibility** | `stageId` is primary. Keep legacy fields only at I/O compatibility boundaries and retain enough config/seed/budget/protocol identity for reproduction. Remove adapters after all live consumers migrate. |
| **Sequential vs raced orchestration** | Share policy identity/budgets where applicable; keep execution distinct. Test planned-attempt parity rather than winner parity. |
| **Historical hint shapes** | Normalize inward to mutable `Hint[]`; keep legacy `.hints` / `.hintRecords` readable only where historical I/O still requires them. Remove adapters when no supported historical consumer needs them. |
| **Persistent identity vs structural revision** | Keep both semantics: persistent ID identifies the entity, fingerprint identifies structure/revision. Migrate persistence toward ID + revision while retaining versioned legacy reads only as required. |
| **Firestore legacy fingerprint lookup** | Prefer current + known legacy keys; use collection-wide structural scans only for unknown/unversioned history. Retire broad fallback when supported history no longer requires it. |
| **Raw-level wire semantics** | Define wire meaning once and project to optimized solver representation; eliminate independent semantic interpretation where layering permits. |
| **Runtime/domain/solver rule duplication** | Maintain one semantic contract with specialized implementations. Use referee/differential conformance so independence can still catch drift. |
| **Coordinate-base guessing** | Move internal consumers to explicit `packed` / `xy0` / `xy1`; keep autodetection only at true compatibility boundaries. |
| **Level selector guessing** | Canonical solver CLIs use explicit shared `pos:` / `id:` parsing. Remove legacy guessing once consumers are gone. |
| **Published storage backends** | Preserve backend differences behind one application-level published-level abstraction where duplicated ownership still exists. |
| **Corpus activation ownership** | Introduce/extend a facade only if coordinated levels, hints, supplemental hints, and theme selection continue spreading across consumers. |
| **Solver aliases** | Opportunistically converge on one internal solve name; retain only adapters with live consumers. Low priority. |

## Durable contracts

### Stage/action isolation

An action that is intended to be independent must not silently inherit predecessor-dependent legal/search state, scoring/order inputs, PRNG state, memoized mathematical values, budget accounting, proxy overrides, or eligibility/config identity.

If a discrepancy appears: reproduce fresh versus minimal predecessor prefix, diff mutable inputs, locate the first decision/budget divergence, and either isolate the state or formalize a typed handoff with an independent control. Do not hide the dependency by forcing isolated experiments to execute the predecessor ladder.

### Work accounting

Per-solve work and realm-global discovery accounting are distinct concepts. Deterministic allocation comparisons use `workSpent`; raw node counts remain technique diagnostics; wall time measures implementation cost. Current budget-resource meanings belong in [`solver-budget-determinism.md`](solver-budget-determinism.md).

### Solver authority boundary

Canonical stage policy/plan/budget/executor/action identity owns solver orchestration semantics. Sequential and raced engines may execute differently but should not create parallel policy authorities. New stages/actions must use the canonical identity/budget/telemetry path.

### Identity and compatibility

Persistent IDs identify entities; fingerprints identify exact structural revision. Normalize historical external forms inward and keep frozen legacy calculators/readers only where supported provenance/migration requires them.

### Semantic boundaries

Wire-level meaning should have one definition before projection into runtime/domain/solver representations. Specialized implementations may remain. Independent referee/reference paths are useful when they detect drift rather than duplicate mutable policy.

### Research evidence boundaries

Scientific concepts that recur across experiments should have one explicit identity and derivation contract before they become ranking or promotion inputs. **Extend an existing authority before naming a new abstraction.** Relevant existing owners include the research-data asset registry, capability-memory derived interface, experiment population/provenance contracts, canonical stage lifecycle/action telemetry, question-relation registry, and level/corpus I/O helpers. Producers should preserve decision-bearing facts when downstream reconstruction would otherwise require interpreting aliases, stage families, incomplete provenance, or manually assembled source lists. Independent evidence producers may remain intentionally separate; canonicalize/join their observations rather than forcing common-mode generation.

## Priority rule

This is **structural debt, not an execution roadmap**. Work on a row when it:

1. blocks or invalidates current research/correctness;
2. creates live duplicate authority or accidental state coupling;
3. is touched by nearby work and can be removed safely;
4. otherwise causes recurring maintenance cost that exceeds the change risk.

Low-value architectural neatness must not displace current solver research merely because a row remains open.

## Completion standard

A row leaves this file when its ambiguity/compatibility obligation is gone or when a stable owning contract has absorbed the remaining rule. Evidence/chronology belongs in reports or snapshots, not appended here.

Target state: every plurality has an owner and reason; every mutable resource has an owner and lifetime; compatibility normalizes at boundaries; current semantics/policy have one internal authority with deliberate projections.