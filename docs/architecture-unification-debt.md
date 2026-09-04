# Architecture unification debt

> **Status:** live structural-debt queue.
> **Read for:** duplicate authority, compatibility migration, mutable-state lifetime, and semantic boundary cleanup.
> **Do not use for:** solver-policy/research priority; use [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md).

Preserve behavior and evidence. Similar-looking representations are not automatically duplicates. Structural refactors should remain separate from solver-policy tuning unless the structural defect prevents trustworthy research.

Historical detail: [`archive/snapshots/architecture-unification-debt-2026-09-04-pre-proposal-consolidation.md`](archive/snapshots/architecture-unification-debt-2026-09-04-pre-proposal-consolidation.md).

## Classification

| Kind | Rule |
|---|---|
| Intentional plurality | Keep distinct representations that answer different questions; document ownership. |
| Boundary compatibility | Accept old/new external forms, normalize once, retain only the needed adapter. |
| Parallel internal authority | Unify modules that independently own the same policy/schema/meaning. |
| Repeated mechanics | Share budget/telemetry/provenance/executor plumbing without forcing identical behavior. |
| Hidden lifetime coupling | Make mutable-state ownership/lifetime explicit; reset/isolate it or define a typed handoff. |

External forms may vary. Internal authority and mutable-resource lifetime should not be ambiguous.

## Current debt

| Area | Current direction / exit condition |
|---|---|
| **Stage work/budget ownership** | Replace accidental shared mutable budget inheritance with explicit attempt/stage ownership where it remains. Structural changes must preserve policy unless separately tested as scheduler experiments. Budget semantics are owned by [`solver-budget-determinism.md`](solver-budget-determinism.md) and scheduler policy by [`solver-scheduling-policy.md`](solver-scheduling-policy.md); do not duplicate their current gates here. |
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