# Codebase Quality Follow-up Plan

> **Status:** proposed. Scope: the five structural weaknesses identified in the 2026-06-27
> quality review, **excluding** the `data/levels.json` monolith / hint-data split, which is
> tracked separately. Each section states its *intent* (the property of the system we are
> actually buying), the concrete work, and the **invariants** that must hold once the section's
> intent is fully realized. Invariants are written to be falsifiable — a section is not "done"
> until each can be demonstrated.

---

## 1. De-overfit the solver: configuration policy as features, not corpus memory

### Intent
The solver's competence must be a property of its *search*, not of a lookup table keyed implicitly
by the current 156-level corpus. Today `getAttemptConfigs()` (`modules/solver/attempts.ts`) encodes
"what happens to win on L130 / L140 / L146" directly into branch thresholds — `navDensity >= 0.82`,
`reqInt >= 7`, `reqLen >= 90 && gates >= 2`, `minBudgetFraction` floors — every one of which was
reverse-engineered from a specific named level. This couples solver *correctness* to the exact level
set: a genuinely new level is a re-tuning event, and a regression (solved → timeout) can land
silently because nothing pins the corpus-wide result.

The intent is two-fold:
1. **Selection is explained by level features, never by level identity.** A new level that resembles
   existing ones in its feature vector inherits the right strategy automatically.
2. **Success is bought by *racing*, not by *predicting* the order.** The orchestration already
   splits the budget across configs and gates (`runInterleavedAttempts` / `runGateSerialAttempts`);
   today config *order* still decides who gets budget first, so ordering becomes load-bearing and the
   hacks accrete. We want config order to be a wall-time optimization only — never the reason a level
   can or cannot be solved.

### Work
1. **Build the safety net first.** Formalize `npm run solver:bench`: run `--levels=all` at the
   standard budget, write `audits/solver-baseline.json` (per-level: solved?, `solvedBy`, `totalMs`,
   `nodesExpanded`; plus aggregate solve rate). A `--check` mode diffs a fresh run against the
   committed baseline and **fails** if any level regresses solved→unsolved, or aggregate time/nodes
   regress beyond a tolerance. Nothing in this section merges without this gate green.
2. **Lift the policy out of control flow into data.** Replace the `if`-tree with an ordered,
   declarative rule table: `{ when: (f: LevelFeatures) => boolean, bundles: ConfigBundle[],
   evidence: string }`. `LevelFeatures` is the existing derived set (archetype, navDensity, reqInt,
   mustPass/mustCross counts, portal count, flipper count, gates, reqLen). Predicates may reference
   **only** feature thresholds. Level numbers may appear **only** inside the free-text `evidence`
   field, never in a predicate.
3. **Generalize the budget allocator from "ordered" to "fair race."** Make the default allocation
   give every config in the selected set a guaranteed minimum slice of the gate budget, so a level
   is solved iff a winning config is *present and funded*, independent of its position. Cheap configs
   may still run first as an early-exit optimization, but a config being first must never be the only
   way a level solves. The bespoke `minBudgetFraction` floors and the "saves ~11s by ordering X
   before Y" comments dissolve into this uniform guarantee.
4. **Collapse duplication into a config vocabulary.** Replace the five hand-spelled per-archetype
   lists with a small set of named, feature-parameterized bundles (e.g. `PERIMETER_BOTH`,
   `OBJECTIVE_BEAM`, `FLIPPER_DIVERSE_LADDER`). The same intent is expressed once.
5. **Delete the corpus-specific constants** replaced by the race, or — for any that genuinely must
   remain — convert each to a named constant with a documented derivation and a benchmark level
   exercising both sides of the boundary.
6. **Re-run `solver:bench`; require equal-or-better.** Lock the new baseline.

### Invariants (fully realized)
- **No level-identity in logic.** No file under `modules/solver/` references a specific level number
  inside control flow. A guard (`check:no-solver-level-numbers`) scans solver source and permits
  level numbers only inside an `evidence:` string literal (or bans them entirely). It passes.
- **Pure function of features.** `selectAttemptPolicy(features)` (renamed from `getAttemptConfigs`)
  is a pure function of the feature vector: two levels with identical feature vectors receive
  identical config sets.
- **Order-independence of success (the falsifiable core invariant).** Running the full corpus with
  `ATTEMPT_ORDER='random'` and `'reverse'` (the existing ablation knobs) solves exactly the same set
  of levels as the default order — only wall-time differs. This is the operational definition of
  "not overfit to ordering," and it is enforced as a benchmark assertion.
- **No corpus-wide regression.** Solve rate ≥ the locked baseline; no individual level regresses
  solved→unsolved; `solver:bench --check` is green.
- **Every surviving threshold is justified.** Each remaining magic number is a named constant with a
  one-line derivation and at least one benchmark level on each side of it.

---

## 2. Type the inter-module ports: the seams carry real domain types

> **Status: landed.** The `computeStep` port (`ComputeStepDeps`) now carries real domain types; the
> 19 controller/factory dependency bundles type their `state` carrier to `AppState`
> (`{ ENGINE: EngineState }`) via the shared `ControllerDeps` type, leaving only genuinely-opaque
> subsystem handles (`core`/`ui`/`engine`/…) `any` by design; `path-navigator` and
> `computeWinEffects` are typed to `EngineState`/`AppState`; and `pushStep`'s over-wide
> `TapRouteState` param was narrowed to the new `NavStepState` projection so the engine passes its
> live nav slice with no cast. Typing the seams surfaced and fixed real latent bugs: two divergent
> `NormalizedLevel.id` types, a possibly-undefined `gamepadGridPrimaryAction` call, a
> `hints?.length > 0` on a possibly-undefined value, and an unguarded null `level` at win-check.
> Verified: `check:types`/`check:lint`/layering guards clean, 516 unit tests green, and the
> rename-propagation invariant demonstrated (renaming an `EngineState` field now errors at consumers).
> The dual-form `engineState.nav ?? engineState` helpers in `engine.ts`/`editor.ts` and the
> overlay-mode-constant params remain `any` by design (not domain-object ports).

### Intent
The typed logic core is only as trustworthy as the seams that feed it. The `EngineState` tree and the
domain types (`NormalizedLevel`, the state slices, search state, `Effect`/`Action`) are now real
interfaces — but the **function ports between layers launder them through `any`**. The archetype is
`ComputeStepDeps` in `modules/runtime/step-processor.ts`:

```ts
isValidMove: (target: number, state: any, level: any, options: any) => boolean;
areWinMetricsSatisfied: (state: any, level: any) => boolean;
```

`state` is exactly `EngineState`/a slice; `level` is exactly `NormalizedLevel`. Both types already
exist — so a renamed field or a swapped argument at these call sites sails through `tsc` precisely at
the integration points where wiring bugs live. The intent: the *contracts between modules* carry the
same real types the modules internally enforce, so cross-layer mismatches fail at compile time. DOM
handles and genuinely opaque externals (Firebase/Tone, Worker boundary) stay `any` by *stated
policy*; our own logic objects do not.

### Work
1. **Inventory the ports.** Enumerate every `interface *Deps`, injected-dependency bundle, and
   function-typed parameter whose `any` stands for a known domain type. `ComputeStepDeps` first; then
   the engine/win/step controllers and the `input/` controller deps.
2. **Replace `any` with the named types**, narrowing to the slice actually used (`nav:
   NavigationState`, not the whole tree) so a port also documents its true dependency surface.
3. **Reuse canonical signatures.** Where an injected function is itself typed at its definition, type
   the port as `typeof isValidMove` rather than re-declaring a lossy `(...: any) => boolean`.
4. **Declare the one allowed `any` boundary** explicitly: DOM query results, third-party SDK handles,
   the two Worker `.js` files. Everything else is real-typed.
5. **Ratchet it.** Count `: any` / `as any` in the logic + port surface (exclude the declared
   boundary), commit the count, and add a check that fails if it rises. Drive it to zero.

### Invariants (fully realized)
- **No domain object typed `any` at a port.** No function-typed port parameter representing
  `EngineState`, a state slice, `NormalizedLevel`, search state, `Effect`, or `Action` is typed
  `any`. Grepping `state: any` / `level: any` / `nav: any` in non-DOM modules returns nothing.
- **Renames propagate across seams.** Renaming a field on any state slice or on `NormalizedLevel`
  produces a `tsc` error at *every* consumer, including across injected ports (demonstrable: rename,
  expect red, revert).
- **`any` lives only at the declared boundary.** An allowlist enumerates every remaining `any` site
  (DOM handles, third-party SDK, Worker files); a ratchet check forbids new ones.
- **Zero and stays zero.** The non-boundary `any` count in
  `modules/{domain,runtime,solver,state,engine,input,render}` is zero and the ratchet holds it there.

---

## 3. Architecture invariants enforced by tools that understand the code

### Intent
Architectural rules deserve enforcement that understands the code, not its text. The 12
`scripts/check-*.mjs` guards encode genuinely valuable invariants — the state-mutation boundary,
domain purity, the layering graph — but several do it with **regex over raw source**
(`check-engine-state-boundary.mjs`, `check-domain-purity.mjs`, `check-raw-inner-html.mjs`). Regex
both *misses* real violations (alias the object, computed member access, multi-line writes) and
*breaks* on innocent formatting, and the guards are themselves untested. The intent: keep every
invariant, but move each to the right tool — semantic rules to `typescript-eslint` custom rules
(AST + scope + types), the layering contract to a dependency analyzer — so each guard is precise,
visible in the editor, and not a maintenance liability. Pure content/asset checks (CSP, modal a11y,
third-party allowlist) legitimately stay as scripts.

### Work
1. **Triage the 12 checks** into *code-structure/semantic* (must become AST-based) vs
   *content/asset* (stay scripts):
   - **Migrate:** `check-engine-state-boundary`, `check-domain-purity`, `check-raw-inner-html`
     (and keep the existing `no-restricted-syntax` raw-event-string rule as the model — it is
     already AST-based and correct).
   - **Keep as scripts:** `check-csp`, `check-modal-a11y`, `check-third-party-dependencies`,
     `check-audit-output`/`-artifacts`, `check-css-class-coverage`, `check-css-dead-components`,
     `check-package-scripts`, `check-dead-scripts`, `check-secret-hygiene`.
2. **Boundary guard → typed eslint rule.** "No assignment or mutating call on `EngineState`/slice
   objects outside `modules/state/actions/**`." With type information this catches aliases the regex
   cannot, and reports at the exact node.
3. **Layering/purity → dependency-cruiser + import rules.** Declare the layer graph once
   (`domain → runtime → solver` pure, no DOM, no upward imports; adapters may depend inward only).
   The dep-cruiser config becomes the executable architecture diagram and must match
   `docs/architecture.md`. Ban DOM globals inside the pure core via an eslint rule.
4. **Preserve messages, then delete.** Keep each rule's failure message verbatim so CI output reads
   the same; remove a regex script and its npm entry only after the AST equivalent is proven to flag
   the same seeded violations.
5. **Test the guards.** Each migrated rule gets a tripwire fixture: known-bad code it must flag, and
   clean code it must pass. (The regex guards have no such tests today.)

### Invariants (fully realized)
- **No code-structure rule is regex-over-text.** `check-engine-state-boundary.mjs`,
  `check-domain-purity.mjs`, and `check-raw-inner-html.mjs` no longer exist; their invariants are
  enforced by eslint rules / dependency-cruiser.
- **Guards are themselves tested.** Each migrated rule has a tripwire fixture proving it flags a real
  violation and passes clean code.
- **Evasions are closed.** An aliasing / computed-member-access write that the old regex passed is
  now caught (demonstrable with a fixture).
- **One machine-checked layering contract.** The layer graph is declared once, enforced, and is the
  source of truth that `docs/architecture.md` matches.
- **Remaining scripts are content-only.** Every surviving `scripts/check-*.mjs` validates
  content/assets, with no overlap into code-structure concerns.

---

## 4. Tests colocated and type-checked as first-class TypeScript

### Intent
Tests should exercise the same types and contracts the production code is held to, and live where the
code lives so they are found, run, and maintained as one unit. Today 81 unit suites are
`scripts/*-unit-tests.mjs` — plain JavaScript, **not** type-checked, physically divorced from the
`.ts` they cover. A renamed interface field can break a test silently because the test was never
compiled against the interface. The intent: tests become first-class TypeScript, colocated with their
subject and checked by the same `tsc` that guards the source — so the suite is *part of the type
contract*, not a parallel untyped artifact. (Genuine node *validators* — oracle/integration tools —
are deliberately a separate category and stay as scripts.)

### Work
1. **Colocate + retype.** Convert `scripts/<x>-unit-tests.mjs` → `modules/<…>/<x>.test.ts` beside its
   subject. Keep the `vitest test()` + `node:assert` style to minimize churn — the change is
   location, extension, and real (typed) imports.
2. **Bring tests under `tsc`.** Add `**/*.test.ts` to the type-check include (or a dedicated test
   tsconfig) so test files are strict-checked against real types. This is what makes a renamed field
   break its tests at compile time.
3. **Update discovery + coverage.** Point `vitest.config.mjs` `include` at `modules/**/*.test.ts`;
   keep coverage scoped to non-test logic source; thresholds unchanged.
4. **Keep validators as scripts.** hint-path-oracle, validate-bundled-levels, firestore-rules,
   startup-smoke, loader stay node validators; document the unit-vs-validator boundary in
   `docs/testing.md`, with each validator's "why not a unit test" stated.
5. **Migrate incrementally**, CI green per suite; delete each `.mjs` only once its `.test.ts` runs
   under vitest and passes type-check.

### Invariants (fully realized)
- **Every unit suite is a colocated `*.test.ts`** adjacent to its subject; `scripts/` holds only
  validators/CLI tools — no `*-unit-tests.mjs` remain.
- **Tests are type-checked.** `npm run check:types` covers test files: a wrong-typed mock or a
  reference to a renamed field fails the build (demonstrable: rename, expect the test file to error).
- **Zero-config discovery.** `npm run test:unit` discovers via `modules/**/*.test.ts`; adding a test
  needs no config edit.
- **Coverage intact.** Instrumentation targets only non-test logic source; thresholds hold.
- **Documented boundary.** The unit-test vs node-validator split is documented, with a stated reason
  per validator.

---

## 5. Self-documenting code; archived history; retired legacy naming

### Intent
Documentation should explain *why*; the code itself should make *what* and *how* obvious. Today a
683-line `CLAUDE.md` and its "Common Gotchas" list carry correctness knowledge that belongs in named,
asserted code — the must-cross axis-lock, the dense-level `mustMask = 0` rule, the portal forced-move.
Prose drifts from code; an invariant encoded as an assertion cannot. And legacy names (`SolverV2`, and
comments like "no cascade, no referee, no MITM") are tombstones for abandoned designs, now permanent
fixtures that mislead newcomers. The intent: push each correctness "gotcha" into a named, tested
invariant in code; keep docs for rationale and ADRs; archive dated/retracted history out of the
working reference; and rename away the version-scar so names describe what *is*, not what *was*.

### Work
1. **Encode gotchas as code.** For each correctness rule in "Common Gotchas," create a named
   construct + enforcing assertion/test: e.g. an `assertMustCrossAxisNotLocked()` invariant, a
   `DENSE_LEVEL_NAV_DENSITY = 0.70` named constant applied at its single site with a unit test, the
   portal forced-move as a documented `getForcedPortalNeighbors()` predicate. CLAUDE.md then *links*
   to the symbol instead of restating the rule.
2. **Retire the version scar.** Rename `SolverV2 → Solver` and the `*V2` API surface
   (`normalizeRawLevelV2`, `solveLevelV2`, `scoreMoveV2`, `SOLVER_TESTING_API` members) — there is no
   V1. Mechanical rename behind a temporary re-export shim; drop the shim once references update.
   Rewrite the "clean-room rewrite / no cascade / no referee / no MITM" header to describe the design
   that *exists*.
3. **Slim CLAUDE.md to current-state reference.** Architecture pointers, commands, key data
   structures only. Any dated narrative or retracted-experiment text moves wholly into
   `docs/history/`.
4. **Doc-freshness contract.** Each doc declares status (current/historical) and the symbols it
   references; a light check (or review checklist) flags docs naming removed/renamed symbols.

### Invariants (fully realized)
- **Correctness gotchas live in code.** Every "gotcha" that is a correctness *rule* is a named
  constant/function with an enforcing assertion or unit test; CLAUDE.md references the symbol rather
  than restating the rule.
- **No version scars.** `grep -r "V2"` under `modules/` returns nothing outside historical docs;
  no code comment describes a design that no longer exists.
- **CLAUDE.md is reference-only.** It contains no dated session entries and no retracted-experiment
  narrative; that material lives solely in `docs/history/`.
- **Docs are status-tagged and current.** Each doc declares current-vs-historical status, and no
  current-status doc references a removed/renamed symbol.

---

## Sequencing & safety

These are independently shippable, but the low-risk order is:

1. **§2 (type the ports)** and **§3 (AST guards)** first — they tighten the static net cheaply and
   with near-zero behavioral risk, which makes everything after safer.
2. **§1 (solver de-overfit)** next, *behind* the `solver:bench` gate built in step 1 of that section
   — this is the only behaviorally risky change and the benchmark is its seatbelt.
3. **§4 (colocate tests)** alongside or after §1; the typed tests directly reinforce §2.
4. **§5 (docs/naming)** last, as the cleanup that records the new reality.

Every section lands behind `npm run ci` green. The `data/levels.json` monolith / hint-data split is
intentionally **out of scope** here and tracked separately.
