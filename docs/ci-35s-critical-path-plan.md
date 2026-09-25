# CI ≤35-second critical-path plan

> **Status:** active audit / implementation plan.  
> **Target:** a full-impact PR completes its entire required validation contract in **≤35 seconds wall-clock** without deleting meaningful protection.

## Measurement contract

Primary wall clock is measured from the first required validation runner starting to the last required validation job completing. Queue time before any runner starts is reported separately.

A production rollout is not considered complete from one lucky run. Each activation phase must report:

- p50 and p90 workflow wall time over comparable full-impact runs;
- each required lane's runner-start-to-completion time;
- runner-start skew across required lanes;
- checkout/setup/cache/install time separately from useful validation time;
- any cache misses or runner-image changes that materially alter the result.

Shared hosted runners cannot provide a mathematical hard upper bound on assignment latency. The engineering target is therefore:

1. make every required standard-runner lane budget **≤27 s** so normal assignment skew has headroom inside 35 s;
2. require observed full-impact **p50 ≤30 s and p90 ≤35 s** over a bounded rehearsal window before declaring the standard-runner topology successful;
3. if runner assignment alone prevents p90 ≤35 s after useful work is within budget, move the full gate to a reserved/larger runner rather than deleting validation to compensate for infrastructure variance.

## Protected validation contract

The target does not authorize removing the current full-impact obligations:

- package/script reachability and textual repository invariants;
- validator population;
- lint;
- full Node/CLI contract population;
- solver capability canary;
- production build;
- covered ordinary Vitest population and coverage thresholds;
- heavyweight solver proofs;
- Firestore persistence boundary.

Impact routing may still skip the entire deep obligation set on PRs where it is semantically irrelevant. This plan is about the **fullest selected form**.

## Current authority snapshot (2026-09-24)

The original ~98 s run below is retained as the historical starting baseline. The current production shape is materially different and **this section is the forward-looking authority**.

Recent exact-head full-impact evidence:

| run | fast gate | deep verification | notable useful work |
| --- | ---: | ---: | --- |
| 36083565019 | **60 s** | **44 s** | Node/CLI 35 s; coverage 18 s; proofs+Firestore 10 s |
| 36084034066 | **44 s** | **70 s** | Node/CLI 20 s; coverage 31 s; proofs+Firestore 15 s |
| 36086954088 | **71 s** | **67 s** | Node/CLI 36 s; coverage 30 s; proofs+Firestore 14 s |

This variability is now itself evidence. Shared hosted runners vary materially not only in assignment/setup but in effective useful-work wall time. One fast sample must not be promoted to an intrinsic cost model.

The current biggest permanent-speed opportunities, in order of expected leverage, are:

1. **Node/CLI contract testability:** use the new machine-readable per-contract timing profiles, then attack structural tails: import-time corpus scans, repeated large-corpus parsing, avoidable subprocess/CLI wrappers, repository-wide discovery in synthetic tests, redundant fixture construction, and tests that invoke real solver/search work for bookkeeping-only assertions. Do not resume shared-runner shard-count tuning.
2. **Covered Vitest testability:** refresh the slow-file/slow-test census from the JSON reporter and make expensive assertions cheaper without weakening coverage or converting real integration semantics into mocks. Preserve balanced coverage sharding as a proven topology for larger/reserved compute.
3. **Heavy proof witnesses:** inspect the longest proof fixtures for smaller deterministic witnesses, tighter work budgets, or reusable setup while preserving the same property. Internal parallelism is already near the current 4-core limit.
4. **Firestore boundary:** production logs show Firebase downloading `cloud-firestore-emulator-v1.22.0.jar` on every Deep run despite the CLI cache. #2109 now restores/saves `~/.cache/firebase/emulators` under an exact Firebase Tools/emulator-version key; measure warm-hit savings before looking for test-code reductions.
5. **Residual bootstrap/cache critical path:** audit serialized exact-cache restores, setup-node, TypeScript state, validator/lint sequencing, and duplicate repository discovery. Treat each as a measured small-opportunity audit, not a reason to weaken validation.
6. **Larger/reserved compute:** benchmark the already-proven balanced Node and coverage topologies on more predictable compute after software costs are slimmed. Re-test internal deep overlap there because the 4-core negative result is contention-specific. At least 16 logical CPUs remains the initial capacity target.
7. **Cadence/impact routing:** continue using the separate historical-value/impact-routing program to avoid irrelevant work. Do not use cadence demotion as a substitute for making the fullest selected form fast.

Closed or currently low-value directions:

- **bulk text invariant:** closed by #2107 with a permanent 1,500-file sparse regression;
- **same-runner Node fan-out tuning:** direct 4-worker execution is preferred; npm mediation is worse;
- **three-way deep overlap on a standard 4-core runner:** run 36090175972 stayed semantically green but stretched coverage/proofs/Firestore to 43.0/21.0/29.0 s and only reduced the serial sibling window by roughly 3 s;
- **more shared-hosted Node/coverage shards:** semantically proven but p90 margin is inadequate because of hosted variance;
- **solver canary, lint, warm build:** now ~1–2 s each and no longer priority targets;
- **coverage threshold reduction, proof deletion, fixture deletion solely for speed:** prohibited by the protected validation contract.

## Historical starting baseline

Full-impact PR run **35955087367**:

- full first-runner-to-last-completion span: ~98 s;
- fast gate: ~81 s;
- deep verification: ~87 s;
- deep runner started ~11 s after the fast/planner runners.

Representative step costs:

| work | observed |
| --- | ---: |
| fast checkout | 3 s |
| deep checkout | 15–17 s |
| floating Node 20 setup | 5–6 s |
| npm ci | 7–9 s |
| validators | ~5 s wall / ~36 child-s |
| cold-PR lint | ~12–15 s |
| warmed-PR lint | ~2 s |
| Node/CLI | ~27 s wall / ~108 child-s at 4 workers |
| solver canary | ~10 s, ~9.4 s of it L140 |
| build | ~2 s workflow / ~0.7 s Vite compile |
| covered Vitest | ~30 s wall / 35.3 test-s |
| explicit deep proofs | ~11 s wall / 26.6 test-s |
| cached Firestore boundary | ~11 s |

Hosted runner: **4 logical CPUs**.

## Established findings

### Bootstrap and routing

1. Deep and fast lanes now use source-focused checkout plus exact runtime-data caches; the former ~15 s deep data checkout is no longer the normal path.
2. Exact Node **22.23.2** is pinned and setup-node is usually low single digits, though individual shared-runner samples can still vary.
3. Exact dependency-tree restore is active and skips `npm ci` on a hit.
4. Main and diagnostics producers seed runtime-data/runtime-hint cache generations; cold whole-tree materialization is a correctness fallback rather than normal PR work.
5. Main seeds ESLint cache; warm PR lint is now ~1 s.
6. The separate planner runner is no longer a dependency edge for full-impact deep verification; deep computes the canonical plan locally and can start immediately.
7. Remaining bootstrap time is fragmented across checkout, several exact cache restores, setup-node, TypeScript state, and small validators. A final critical-path audit is worthwhile, but evidence no longer supports expecting one large bootstrap-only win on ordinary shared runners.

### Node/CLI

The permanent production harness uses direct four-worker execution. Dedicated benchmark run **36082154293** measured direct invocation at **35.17–35.61 s** across four repeats, while npm-mediated execution was roughly 10 s slower. Ordinary CI has since measured the same production population at both **20 s** and **35–36 s**, demonstrating substantial shared-runner useful-work variance.

The old 176-contract and 204-contract timing profiles are historical planning aids, not current cost authority. Before changing individual tests, regenerate a current per-contract profile from the current registry.

The previously identified `test:hint-occurrence-acceptance` 15.8 s import-side-effect defect is **already fixed in code**: `hint-occurrence-acceptance-lib.mjs` is side-effect free, the synthetic node test imports it directly, and the corpus CLI only scans persisted stores under direct invocation. The checked-in rehearsal timing profile now records that contract at 0.0 s. Do not carry B1c as unfinished work.

Current Node testability audit lenses:

- CLI modules with top-level work on import;
- repeated parsing/indexing of the same large corpus across synthetic contracts;
- repository-wide discovery where a private fixture/root can prove the same invariant;
- subprocess or package-manager wrappers around assertions that can invoke a pure library directly;
- real solver/search execution for bookkeeping/serialization/identity assertions;
- redundant fixture generation or large JSON write/read round trips;
- many ultra-cheap isolated processes where process startup itself becomes a meaningful floor, while preserving isolation where global/module/process state matters.

### Covered Vitest

Fresh uncontended production evidence from run **36090175881** / deep job **107930730496** measured **1595 tests across 162 files** with a ~30 s covered-suite step. Current file tails are:

| file | wall |
| --- | ---: |
| `modules/solver/repair-search.test.ts` | **8.6 s** |
| `modules/solver/diversification.test.ts` | **7.4 s** |
| `modules/solver/hint-ablation-generator.test.ts` | **2.7 s** |
| `modules/solver/restart-continuation-harness.test.ts` | **2.6 s** |
| `scripts/solver-parallel-unit-tests.mjs` | **2.3 s** |
| `modules/solver/orchestration-early-repair.test.ts` | **2.1 s** |

Everything else is below ~1.5 s. This sharply narrows software testability work.

The repair-search 250k/125k deterministic/default-equivalence budgets **are already landed**. The file remains expensive because several feature groups separately ran one real search for soundness and two more fresh real searches for determinism, plus another pair for default equivalence. PR #2109 therefore removes the redundant soundness-only invocation for six feature groups and asserts solution validity on the already-fresh deterministic pair instead. This preserves fresh-state determinism, identical nonzero work, and validity while deleting one real repair search per feature. Measure the full covered-suite effect before pursuing further repair-search restructuring.

Diversification remains deliberately real solver integration. Its three dominant tests currently measure ~2.7 s, 2.4 s, and 2.3 s. Do not replace them with mocks merely to improve CI; inspect fixture/work ceilings and reusable setup only where the same integration contract remains intact.

Current covered-test audit lenses:

- bookkeeping tests invoking real search/solver work;
- repeated expensive beforeEach/setup or corpus/model construction;
- duplicate parsing/bundling across files;
- deterministic work budgets far above the minimum robust envelope;
- redundant real executions where one fresh result can satisfy multiple assertions without sharing mutable state;
- fixture cardinality larger than the asserted property needs;
- Vitest pool/worker configuration only where a controlled rehearsal shows lower full-suite wall without semantic changes.

Real solver integrations stay real unless an equivalent cheaper witness proves the same contract. Coverage thresholds remain unchanged. The measured-balanced two-shard coverage topology is preserved for larger/reserved compute, not promoted on shared hosted runners.

### Heavy proofs

Four explicit proof files already overlap internally and finish in ~11 s wall. The long tails are approximately:

- R02560 disabled: 10.4 s;
- deadlock root 0: 9.1 s;
- deadlock root 1: 6.8 s;
- R02560 enabled: 0.36 s.

Further speed here requires cheaper witnesses or execution on independent compute; simply adding more Vitest workers cannot beat the longest individual proof.

Current production evidence from run **36090175881** shows the deep-proof wall is set by three genuine expensive witnesses running in parallel: deadlock root 0 **9.27 s**, deadlock root 1 **9.25 s**, R02560-disabled **10.90 s**, while R02560-enabled is only **0.25 s**. The R02560 shared ceiling is intentionally **900,000 nodes** because historical characterization places the enabled solve at 803,000 and the disabled control exhausts the 900,000-node regression ceiling. Lowering that ceiling merely for CI would weaken the proof and is not an acceptable speed optimization. Deadlock exact-reference memoization remains a possible implementation optimization only if a complete state-equivalence key can be independently justified; do not add an ad-hoc cache to the proof oracle.


### Solver canary

L140 caused ~9.4 s of the ~9.7 s nine-level canary at the current 5,000,000 work budget.

Follow-up hosted probe:

- L140 at 250k work: ~0.7 s;
- 500k: ~1.1 s;
- 1M: ~1.8 s;
- 2M: ~3.6 s;
- 3M: ~5.6 s;
- all runs still solved.

Five structurally overlapping alternative fixtures also solved in ~0.1 s total, so preserving multi-mechanic representation does not inherently require the current canary cost.

The original nine-level population has now been probed at **250,000 work** and all **9/9 solve in ~1.5 s total / 1.30 M nodes**. Keep the exact fixture set and regenerate its baseline at 250k work; replacement is unnecessary unless future semantics change.

## Implementation status

| Work | Status | Current evidence / next gate |
| --- | --- | --- |
| CI health: diagnostics audit ownership | **merged / guarded** | #2051 routes compact failure-response scratch to `tmp/`, narrows staging to canonical latest/timestamp history, removes the forbidden tracked transient, and makes `check:audit-artifacts` guard the ownership contract. |
| A1 deep runtime-data checkout | **merged / measured green on hit** | #2045: source checkout **2 s** + exact runtime-data restore **2 s**; all deep obligations green; deep job **56 s**. |
| A1b fast runtime-data cache-miss recovery | **merged / measured green** | Differential recovery restores the exact cached `HEAD^1` generation, overlays only changed runtime-data blobs, and saves the current generation. Decisive rehearsal: **2 s base restore + 1 s one-file overlay + 2 s save**. |
| B1 lifecycle deterministic dispatch | **merged / measured green** | #2044: `orchestration-work-budget.test.ts` **~8.2 s → 195 ms**; covered-suite wall **~29.5 s → 26.48 s**; all test slots preserved. |
| A3 main-seeded ESLint cache | **merged / measured green** | #2054 main-push seeded the default-branch generation after a 15 s cold lint; unrelated #2059 restored that generation and lint fell to **1 s** (from 16 s cold on #2054). |
| A4 250k solver canary | **merged / measured green** | #2056: original exact 9-level fixture set retained; repaired-stack PR run solved **9/9 in 1.7 s / 1,303,532 nodes** at 250k with no work-budget mismatch. |
| A2 exact Node 22.23.2 | **merged / measured green** | Production PR/main/scoped workflows are pinned to exact 22.23.2 with a separate Node-22 Firebase CLI cache generation; full-contract rehearsals were green with setup-node ~0–3 s. |
| C exact dependency-tree restore | **merged / measured green** | #2069 production rollout restores the exact OS+arch+Node+npm+lockfile generation. Hit rehearsal restored `node_modules` in **2 s** in both fast and deep and skipped `npm ci` with the full contract green. |
| A5 remove planner dependency edge | **merged / measured green** | Ordinary PR deep starts concurrently and runs the canonical planner locally. Full-impact obligations stayed green; non-deep rehearsal exited in **7 s** before runtime-data/dependency/test/Firestore setup. |
| B5 runtime-hint projection cache | **merged / measured green** | #2087 merged restore/seed across PR/main/scoped and diagnostics. Ordinary PR #2088 restored the exact projection cache and completed build in **~2.3 s** with Vite compile **672 ms**, versus ~25 s cold. |
| D1 two-way Node sharding | **closed negative on shared hosted runners** | Post-hermetic rehearsals are semantically green and cut useful Node work to ~14–17 s/shard, but runner walls varied to **31–35 s** and **27–38 s** across confirmations. Shared bootstrap variance consumes the 35 s budget; stop shard-count tuning. |
| B3 proofs + Firestore overlap | **merged / measured green** | #2100 full-impact run kept coverage green and ran unchanged proofs + Firestore concurrently in **15 s**, with independent success outputs. Prior serialized shape was ~23 s; #2100 is merged to `main`. |
| B6 bulk-change text-invariant batching | **closed / exact-head green with PR-scale regression** | #2072 CI run 36082154314 exposed a scaling regression: `check:text-source-files` took **6m47s** on a 1,474-file migration because each sparse changed file triggered separate `git cat-file -s` + `git show` processes. #2107 batches sparse HEAD blob reads through one `git cat-file --batch` process without changing the checked population or invariant. Exact-head CI run 36084034066 kept the direct text-invariant step below timestamp resolution and passed the permanent real-checker regression against **1,500 unmaterialized changed text blobs** inside a **20 s total Node/CLI step**. |
| D2 coverage sharding | **technical success; shared-runner margin insufficient** | D2b run 36068829982 balanced 146 files to 17.091/17.090 test-s and produced authoritative merged coverage with unchanged thresholds in **34 s from shard start**. Only ~1 s headroom remains; D1 already demonstrated ordinary hosted setup variance can exceed that. |

### A1c. Publish runtime-data cache from diagnostics hint refresh

The diagnostics workflow can change `data/hints` and push a `[skip ci]` commit. That changes the exact runtime-data Git-object key **without running main-push CI**, so the next PR can encounter a cold runtime-data generation even though the change originated on the default branch.

Merged in #2061:

1. after diagnostics commits/pushes its hint/audit refresh, derive the runtime-data key from the final local `HEAD` (after any retry/rebase);
2. check whether that exact key is already cached;
3. if not, save the canonical runtime-data tree from the default-branch workflow;
4. later PRs can then restore the new exact generation instead of materializing the ~190 MB hint/data tree.

This does not replace a correct PR miss fallback, but it should make diagnostics-driven misses rare. It also aligns cache authority with the producer that invalidates the cache generation.

### A1d. Seed every main generation from full main-push checkout

Main-push `validate` already checks out the complete repository, including the canonical runtime-data tree. Publish that already-materialized tree under the same exact Git-object key PR CI uses.

This closes the base-cache authority gap exposed by A1b: every ordinary merged main commit gets an exact default-branch runtime-data cache generation without additional Git materialization. A1c separately handles diagnostics `[skip ci]` hint refresh commits that bypass main-push validation.

Together:
- A1d covers ordinary merges;
- A1c covers diagnostics-generated `[skip ci]` main commits;
- A1b can recover a PR exact miss by restoring the cached base-parent generation and overlaying only changed runtime-data files.

### A1b. Differential runtime-data miss recovery — measured green

Whole-tree materialization during PR CI is rejected in every tested shape (**52-56 s**), and `git archive` from the partial clone is also rejected (**~102 s** for one file).

The production design is differential:

1. exact current runtime-data cache lookup;
2. on miss, derive and restore the exact cached `HEAD^1` generation;
3. identify runtime-data files changed by the tested merge from tree metadata;
4. fetch only each changed blob through GitHub's blob API and overlay it on the cached base tree;
5. remove deleted runtime-data files;
6. save the exact current generation;
7. only if the base cache is absent, use the known-slow whole-tree checkout as a correctness fallback.

Decisive hosted rehearsal 35964508083, with a forced exact-current miss and forced one-file overlay:
- base-parent cache restore: **2 s**;
- one changed blob overlay: **1 s**;
- whole-tree fallback: skipped;
- exact current cache save: **2 s**;
- fast gate remained green.

A1c (#2061) seeds diagnostics-generated `[skip ci]` main generations. A1d (#2063) seeds every ordinary main generation. Together they make the expensive fallback exceptional rather than normal.

### B1b. Right-size repair-search determinism test budgets

Post-B1 coverage profiling identified `repair-search.test.ts` as the remaining dominant covered file at **~9.0 s**.

Measurement-only rehearsal on the exact 37-test file:

| determinism budget | default-equivalence budget | file tests | Vitest duration |
| ---: | ---: | ---: | ---: |
| 250k | 125k | 37/37 green | **1.43 s tests / 1.97 s total** |
| 100k | 50k | 37/37 green | 1.54 s / 2.03 s |
| 50k | 25k | 37/37 green | 1.49 s / 2.07 s |

Lower budgets do not buy additional wall time, so production uses **250k / 125k** for more work-envelope headroom. Paired determinism/default-equivalence tests are also strengthened to require identical node counts and nonzero repair work, preventing trivial null/null success from weakening the invariant.

The 250k/125k budgets are **implemented**, but later covered-suite evidence shows the file still at **8.6 s** under production coverage instrumentation. The old standalone 1.43 s measurement therefore did not translate into the full covered environment. Treat budget right-sizing as complete; #2109’s next repair-search change instead removes six redundant soundness-only real searches while preserving validity on the fresh determinism pairs.

### B1c. Completed: remove hint-occurrence unit-test import side effect

Post-hint-consolidation Node/CLI profiling exposed a new dominant contract:

- `test:hint-occurrence-acceptance`: **15.8 s**;
- next-largest current Node contracts are materially smaller.

Root cause is structural, not intrinsic audit cost. The synthetic node test imports `auditHintOccurrenceSemantics` from the CLI module, and that module executes `buildHintOccurrenceAcceptanceReport()` at top level. Importing one pure function therefore scans all three persisted hint corpora before the synthetic assertions run.

Implemented state:

1. `hint-occurrence-acceptance-lib.mjs` owns the side-effect-free semantic function;
2. the CLI invokes corpus scanning only from its direct-execution path;
3. the synthetic Node contract imports the pure library directly;
4. corpus-scale CLI behavior remains unchanged when the CLI itself is invoked.

The checked-in rehearsal timing profile records this contract at effectively zero child seconds. This work is closed; do not repeat the extraction.

The corpus-scale acceptance proof remains independently maintained by `.github/workflows/hint-consolidation-closeout.yml`, which directly invokes `hint-occurrence-acceptance-audit.mjs`. The optimization therefore separates unit import cost from corpus authority rather than removing the full audit.

### B5. Cache deterministic runtime-hint build projection

Fast-gate profiling separated the production build into two costs:

- Vite bundle compilation: **~0.7 s**;
- runtime-hint projection in `closeBundle()`: **~24 s**, converting roughly **572 MB canonical source hints → 150 MB path-only runtime hints**.

The projection is deterministic derived data. Rehearsal #2081 bound an exact cache to:

- Git tree IDs for `data/hints`, `data/stress/hints`, and `data/stress/hints-random`;
- `scripts/runtime-hint-projection-lib.mjs`;
- `modules/domain/hint-runtime.mjs`;
- `modules/canonical-json.mjs`;
- `vite.config.ts`.

Same-key hosted run **36063620245** measured:

- exact projection restore: **1 s**;
- production build step: **2 s** total;
- Vite compile: **690 ms**;
- cache save skipped on hit.

This clears the ≤6 s acceptance target with substantial margin.

Production rollout:

1. local/default builds remain unchanged unless `PATHFINDER_RUNTIME_HINT_PROJECTION_CACHE_ROOT` is explicitly set;
2. PR fast-gate restores the exact generation, builds from it or generates it on miss, then saves only after successful cold build;
3. main-push does the same and therefore seeds default-branch generations reusable by later PRs;
4. scoped rehearsal mirrors the same exact authority;
5. solver diagnostics derives the key from final local `HEAD` after any push/rebase and seeds a new generation when a `[skip ci]` hint refresh changes canonical hint trees.

No restore prefix is allowed. A stale projection must never be reused across source/code generations.

## Implementation sequence

### Phase A: remove avoidable bootstrap and serial tax

These are independent, low-risk changes and should be activated separately so their effects remain attributable.

#### A1. Deep checkout uses the exact runtime-data cache

- make deep checkout source-only in the same style already proven by fast-gate;
- derive the same Git-object-keyed runtime-data cache key;
- restore the exact runtime-data tree;
- materialize from Git only on an exact miss;
- keep cache miss fully correct.

**Implementation note:** production PR CI is correct and measured green on the cache-hit path. The first scoped-dry-run mirror accidentally inserted this bootstrap into scoped `fast-gate` instead of scoped `deep-verification`; the follow-up parity fix moves it to the intended lane and restores scoped fast-gate to its prior checkout shape. This was rehearsal drift, not a production deep-lane regression.

**Measured opportunity:** ~15 s checkout → ~4–6 s source+runtime restore.  
**Target saving:** 9–11 s deep-lane startup.

#### A2. Pin CI to exact Node 22.23.2

- use setup-node with exact `22.23.2`, not raw system Node;
- first run a complete shadow/full contract under Node 22, including Node/CLI and deep obligations;
- retain `engines >=20.19` unless product/runtime support policy changes independently.

**Measured opportunity:** ~5–6 s setup → ~1 s on current runner image.  
**Target saving:** 4–5 s per installed-dependency lane.

#### A3. Seed ESLint cache from main

- add default-branch restore/save around main-push lint using the same generation prefix PRs already restore;
- save only after successful lint;
- PR miss remains full lint, never a skipped check.

**Measured opportunity:** cold PR ~12–15 s versus warmed revision ~2 s.  
**Target saving on ordinary new PRs:** ~10–13 s.

#### A4. Right-size the solver canary work budget

- keep the current nine fixtures;
- set the canary work budget to **250,000**;
- regenerate the canary baseline at that deterministic work budget;
- preserve solved-set semantics and all nine fixture identities.

**Measured result:** 9/9 solve in ~1.5 s total at 250k; L140 itself is ~0.7 s.  
**Target whole-canary wall:** ≤2 s.

#### A5. Remove the planner runner from the full-impact dependency chain

Do **not** make deep verification wait for a separate hosted planner job.

Preferred shape:

- potential deep job starts immediately;
- its first dependency-free step computes the canonical semantic plan locally;
- if deep is not required, it publishes the decision and exits before Node setup/install;
- if deep is required, it continues immediately;
- the existing shadow artifact may be produced by a parallel observational job or by the deep/fast jobs, but no full-impact validation waits on it;
- planner failure inside the deep job fails safe by continuing with full deep validation.

This may spend a few seconds of runner time on PRs whose deep lane eventually exits, but it removes a 9–45 s dependency edge from the full-impact critical path.

### Phase B: make the same proofs cheaper

#### B1. Lifecycle telemetry regression uses deterministic dispatch

Change only the slow lifecycle-bookkeeping regression to use `attemptSearchForTesting: exhaustingDispatch` (or an equivalent bounded dispatch) while preserving:

- the same fixture;
- `lifecycleTelemetry: true`;
- assertions that `guidance-goal-distance-retry` and `late-repair-multiseed-retry` are mechanically eligible and instantiated.

Require a targeted before/after run proving the mutation/regression would still be caught.

**Target:** remove ~8 s from the slow file without changing the asserted invariant.

#### B2. Separate real deep integrations only if coverage remains sound

The hosted probe with `SOLVER_DEEP_TESTS=0` stayed **green at existing coverage thresholds**, but wall time only improved from roughly **29.5 s to 26.7 s**. Existing Vitest parallelism already hides much of those real-integration costs.

**Decision:** do not create a new deep-integration tier merely for this ~2.8 s gain.

Instead:

- keep current coverage composition while B1 is measured;
- after B1, require covered-suite wall **≤19 s** to fit one standard-runner implementation lane with bootstrap headroom;
- if it remains >19 s, build **two measured file-balanced coverage shards** and merge V8 coverage before enforcing the unchanged thresholds;
- only split real `deepTest` integrations separately if they materially improve the shard critical path or simplify ownership;
- never lower coverage thresholds to avoid implementing coverage merge.

### Phase C: reduce dependency materialization if it pays

Hosted run 35958457759 measured:

- exact Node 22 + npm-cache `npm ci`: **8 s**;
- save exact `node_modules`: **3 s**;
- delete + exact cache restore: **3 s**;
- post-restore `check:types`: green.

This clears the timing threshold: restore saves roughly **5 s per dependency lane**.

Promotion design:

- default branch seeds `node_modules` only after successful `npm ci`;
- exact key includes OS, exact Node runtime, package lock, and any install-generation input that can affect postinstall/native output;
- PR lanes restore read-only from default branch;
- cache miss falls back to `npm ci` and remains fully correct;
- before activation, run the complete Node/CLI + Vitest + build contract from a restored tree, not just typecheck;
- native/install-script packages must be inventoried before treating the cache as authoritative bootstrap state.

Because the five-lane rehearsal would otherwise repeat 8–9 s installs, this optimization moves ahead of lane proliferation.


### D2b result: balanced warm-coordinator coverage reaches 34 s, but with no reliability margin

Evidence-only topology run **36068829982** used the measured 146-file profile and one warm shard runner as merge coordinator:

| lane | useful work | runner wall |
| --- | ---: | ---: |
| coordinator coverage shard | **18 s** | **38 s** |
| worker coverage shard | **19 s** | **33 s** |
| coordinator wait for worker artifact | 3 s | same warm runner |
| download + native merge + unchanged threshold enforcement | **2 s** | same warm runner |

Both runners started at 22:41:25. The authoritative merged coverage result completed at 22:41:59: **34 s from first shard start to threshold result**.

This proves Pathfinder's full covered population can be split and recombined without weakening coverage semantics, and that the third merge runner from D2 was unnecessary.

It does **not** establish a reliable shared-runner ≤35 s gate. The measured margin is ~1 s, while D1 independently observed a healthy shard runner spend 11 s in `setup-node` and push a semantically green pair to 38 s. Shared hosted-runner bootstrap variance is now the limiting factor, not test partition quality.

Preserve the measured coverage profile and warm-coordinator architecture. The next full-gate design should run them on reserved/larger compute, or explicitly accept that a shared-runner p90 ≤35 s cannot be guaranteed.

### Current full-impact baseline after bootstrap/cache work

Ordinary full-impact PR run **36066406944** completed in **77 s** wall. Fast gate was **58 s**, dominated by Node/CLI at **34 s**. Deep verification was the critical path at **77 s**, dominated by serialized **30 s coverage + 10 s proofs + 13 s Firestore**.

This baseline changes the optimization priority: bootstrap/cache work has mostly succeeded. Remaining latency is validation execution plus shared-runner orchestration. B3 removes real serialized work without adding a runner; D1 has already shown that adding shared Node runners does not provide enough p90 headroom; D2b is the final shared-runner coverage architecture worth testing before the plan moves that work to reserved/larger compute.

### Bulk-change Fast Gate regression discovered by #2072

The hint/provenance consolidation merge exposed a CI-cost topology that ordinary PRs had not stressed. PR #2072 changed **1,474 files**, including **1,265 `data/families/**` paths** and **124 stress-Hint paths**. On exact-head CI run **36082154314**, Fast Gate entered `Check textual source invariants` at 01:30:07Z and did not leave it until 01:36:54Z: **6m47s in one invariant step**. Deep verification completed in 48 s on the same run, so this was a Fast Gate implementation regression rather than hosted-runner assignment variance.

The invariant itself is cheap: changed text files must not contain NUL bytes, and `modules/` paths must obey canonical naming. The pathological cost came from the sparse repository view. For every changed text path absent from the sparse working tree, `readRepositoryText()` launched one `git cat-file -s` process to size the blob and one `git show` process to read it. Bulk migrations therefore turned an O(files) byte scan into O(files) **process launches**, with roughly two Git subprocesses per sparse file.

Required correction:

1. preserve working-tree reads for materialized files so local/manual semantics do not change;
2. collect sparse missing paths and read their exact `HEAD:<path>` blobs through one batched Git object process;
3. retain the same NUL-byte and module-path populations;
4. keep a many-file sparse regression fixture so future repository-view refactors cannot silently restore per-file process topology;
5. measure a bulk-change rehearsal before treating this incident as closed.

Exact-head #2107 CI run **36083565019** is green. The text-invariant step entered and exited at **01:48:09Z**, versus 6m47s on #2072. Because this PR itself changes only a handful of text files, that run proves the normal path is healthy but is not alone sufficient bulk-cardinality evidence. The permanent repository-view regression therefore now constructs a synthetic **1,500-file** PR-shaped commit, removes those paths from the working tree to force sparse object reads, and invokes the real `check-text-source-files.mjs` entrypoint with `PATHFINDER_PR_INCREMENTAL=1`. Its CI timing on the next exact head is the closure evidence for the cardinality failure mode.

That closure evidence is now available. Exact-head run **36084034066** passed the 1,500-file real-checker regression inside a **20 s total Node/CLI contract step**, while the direct `Check textual source invariants` step again entered and exited at **01:54:53Z**. The deterministic per-file subprocess explosion is therefore closed. Future work should treat any renewed multi-minute text-invariant timing as a regression, not normal variance.

This is separate from the shared-runner p90 problem documented below. A six-minute deterministic local step is application-owned CI waste and must be removed regardless of future runner capacity.

### Phase D: execution topology after shared-runner sharding experiments

The earlier five-shared-runner candidate is **superseded**. D1 and D2 proved that Node and coverage can be balanced correctly, but additional ordinary hosted runners do not leave reliable p90 headroom once setup/assignment/effective-CPU variance is included.

Forward topology work is now:

1. keep the proven two-way Node and balanced coverage partitions as ready-to-use building blocks for larger/reserved compute;
2. do not add a separate aggregation runner to the production critical path;
3. do not promote three-way deep overlap on the standard 4-core runner: run 36090175972 measured a **43.018 s** concurrent validation window despite all semantics passing;
4. after testability reductions, benchmark a larger/reserved runner with internal parallelism and measure p50/p90 across comparable full-impact runs. The 4-core overlap result does not veto overlap on materially larger compute.

### D1 final result: shared-runner Node sharding closes negative

The current registry had grown to 204 contracts when the decisive two-way partition was measured. After #2091 removed the non-hermetic tracked-hint mutation race, run **36068242014** measured:

| lane | useful Node work | runner wall | result |
| --- | ---: | ---: | --- |
| full warm control | 31 s | 50 s | green |
| shard 1 | **17 s** | **27 s** | green |
| shard 2 | **14 s** | **38 s** | green |

The partition is semantically valid and useful work balances well, but one ordinary shard still reached 38 s because bootstrap/effective-runner variance consumed the target margin. Later direct four-worker runs ranging from roughly 20 s to 36 s reinforce that shared-runner effective capacity is itself variable.

Decision: **do not tune or promote more shared-hosted Node shards**. Preserve measured partition machinery for larger/reserved compute and pursue current per-contract testability instead.

### D2 final result: shared-runner coverage sharding closes negative

The final warm-coordinator rehearsal #2098 / run **36068829982** removed the separate merge-runner tax and runtime-balanced the current 146 covered files at **17.091 / 17.090 predicted file-seconds**.

Measured result:

| lane | useful work | runner wall |
| --- | ---: | ---: |
| balanced coordinator shard | 18 s | **38 s** |
| balanced worker shard | 19 s | **33 s** |
| coordinator wait for worker artifact | 3 s | included above |
| authoritative merged coverage/threshold check | 2 s | included above |

First shard start → merged authoritative thresholds complete: **38 s**.

All tests and unchanged production coverage thresholds remained green. The remaining miss is therefore infrastructure latency, not coverage semantics or shard balance.

Decision: stop shared-runner coverage topology tuning. D1 and D2 independently show the same pattern: useful validation work fits, but standard hosted-runner bootstrap/variance exhausts the hard ≤35 s budget. Future sharding evidence remains useful for a larger/reserved runner, but production should not add shared hosted lanes merely to move work around.

### B6 result: three-way same-runner deep concurrency closes negative on 4 cores

Evidence-only workflow run **36090175972** launched the unchanged covered ordinary Vitest population, heavyweight solver proofs, and Firestore persistence boundary together on one standard hosted runner. Every semantic obligation passed with unchanged coverage thresholds.

Measured child wall:

| obligation | concurrent child wall |
| --- | ---: |
| covered ordinary Vitest | **43.014 s** |
| heavyweight solver proofs | **21.039 s** |
| Firestore boundary | **29.013 s** |
| total concurrent validation window | **43.018 s** |

The sibling production deep lane on the same PR ran the current serial shape at roughly **30 s coverage + 16 s proofs/Firestore**. Three-way overlap therefore saved only about **3 s** while substantially slowing every child through CPU/contention pressure.

Decision: **do not promote three-way deep overlap on the standard 4-core runner**. The 4-core single-runner packing path is exhausted. Keep the workflow as evidence infrastructure until the larger/reserved-runner experiment, where materially more cores may change the result.

### Phase E: hosted-runner variance decision

Run at least 10 comparable full-impact rehearsal executions after a larger/reserved-runner candidate topology is green. No shared-hosted topology currently qualifies for this promotion window.

Promote standard-runner topology only if:

- every lane p90 ≤30 s;
- full workflow p50 ≤30 s;
- full workflow p90 ≤35 s;
- no semantic fault-injection case becomes invisible;
- failures remain attributable and do not reintroduce repair pinball.

If useful work meets its budget but runner-start skew still violates p90 ≤35 s, stop optimizing tests for an infrastructure problem.

#### Reserved/larger-runner fallback

Move the full validation contract to one larger/reserved runner and parallelize obligations internally.

Why this is the fallback:

- current standard runner exposes 4 logical CPUs;
- Node/CLI alone carries ~108 child-seconds and already uses a four-worker sweet spot;
- validators and Vitest/proofs add substantial independent work;
- a single 4-core runner therefore cannot credibly reach 35 s by scheduling alone;
- one larger runner eliminates cross-runner assignment skew and duplicated checkout/install while supplying enough cores for internal parallelism.

Initial capacity target: benchmark **at least 16 logical CPUs**. Eight cores may be borderline after setup; 16 gives headroom for the ~10 s single-proof tails and coverage transforms while Node shards/processes run concurrently.

This fallback is preferable to removing validation solely because shared hosted-runner assignment is noisy.

## Current forward work order

1. **Fresh Node/CLI census:** use the machine-readable benchmark profiles and pursue structural testability wins in descending child-cost order.
2. **Fresh covered-Vitest census:** use the existing slow-test reporter and pursue same-proof-cheaper-fixture/work-budget/setup wins.
3. **Proof witness audit:** reduce the longest deterministic witnesses where equivalence can be demonstrated.
4. **Firestore setup audit:** separate emulator/bootstrap from test execution and remove duplicated initialization if measurable.
5. **Final bootstrap/cache serial audit:** look for redundant restores/discovery/setup and small overlap opportunities; stop if savings are noise-sized.
6. **Reserved/larger runner rehearsal:** apply the already-proven Node/coverage partitions on at least 16 logical CPUs and re-test deep internal overlap with the larger CPU budget.
7. **Bounded p50/p90 window:** declare success only from comparable full-impact runs meeting the stop conditions below.

Each production activation gets its own PR or tightly scoped reconciled batch with before/after timing evidence. Negative experiments stay documented so later agents do not repeat them.

## Stop conditions

The 35-second program is complete when:

- full selected validation breadth is unchanged or strengthened;
- p50 full-impact wall ≤30 s;
- p90 full-impact wall ≤35 s across the rehearsal window;
- router/semantic fault-injection oracles remain green;
- main-push broad validation remains green;
- the plan documents any infrastructure assumption required to sustain the target.

If a shared hosted-runner topology cannot meet p90 because of runner assignment, the audit must say so explicitly and move to reserved/larger compute rather than pretending another test deletion solves the problem.

## Recovered historical D1/D2 evidence from PR #2099

This section preserves the exact intermediate evidence and decisions from the pre-reconciliation PR. Later sections above remain the current decision authority.

### Current post-optimization full-impact baseline

Ordinary full-impact CI run **36066406944** is the current architecture baseline:

| lane | runner wall | dominant work |
| --- | ---: | --- |
| impact shadow | **7 s** | observational; no longer gates deep startup |
| fast gate | **58 s** | Node/CLI population **34 s** |
| deep verification | **77 s** | coverage **30 s** + heavyweight proofs **10 s** + Firestore **13 s**, serialized |

The overall first-required-runner → last-required-completion span was **77 s**.

Bootstrap/cache work has largely succeeded. The remaining critical path is validation execution itself: Node on fast, and especially covered Vitest + proofs + Firestore on deep.

### D1. Initial two-way Node/CLI rehearsal

The current Node/CLI registry has grown to **204 contracts**, so the old 176-contract timing projection is obsolete.

Corrected warm full-control run in #2088 measured:

- full Node/CLI population: **32 s useful step / 48 s runner wall**;
- summed child time: **99.3 s**.

A timing profile rebuilt directly from that run balances the current registry at:

- shard 1: **49.6 child-seconds / 136 contracts**;
- shard 2: **49.7 child-seconds / 68 contracts**.

Hosted rehearsal 36066406943:

| lane | useful Node step | runner wall | result |
| --- | ---: | ---: | --- |
| full warm control | 32 s | 48 s | green |
| shard 1 | 16 s | 29 s | red: one shared-state test race |
| shard 2 | 13 s | 24 s | green |

First shard runner start to both shard completions was **29 s**, inside the 35-second full-gate objective with ~6 s margin.

The shard-1 failure is not a timing-profile or selection failure. `test:harvest-solver-diagnostics-reports` deliberately rewrote the tracked `data/hints/P00001.json` while the Node-contract runner executed other corpus readers concurrently. One reader observed the file between truncate/write operations and failed with `SyntaxError: Unexpected end of JSON input`.

This exposes a hidden non-hermetic test boundary that the monolithic four-worker schedule happened not to trigger in that run. The repair is to make the diagnostics harvester accept an injected corpus path and run the regression against a private one-level temporary corpus, preserving the real P00001 level/hint semantics without mutating repository state.

That initial run exposed the non-hermetic diagnostics-harvest regression subsequently fixed in #2091. The post-fix rerun and final D1 decision are recorded immediately below.

### D1 result: Node sharding is semantically viable, but shared-runner variance still breaks 35 s

After #2091 removed the tracked-hint mutation race, topology run **36068242014** reran the exact current 204-contract two-way partition:

| lane | useful Node work | runner wall | result |
| --- | ---: | ---: | --- |
| full warm control | 31 s | 50 s | green |
| shard 1 | **17 s** | **27 s** | green |
| shard 2 | **14 s** | **38 s** | green |

Both shard runners started at the same second. First-shard-start → both-complete was therefore **38 s**.

Shard 2's excess was bootstrap variance, especially `setup-node` at **11 s** versus 2 s on shard 1. The measured Node work itself is comfortably inside budget.

Decision: **stop tuning Node shard membership/count on shared runners**. The partition is semantically valid and useful for a future larger/reserved-runner topology, but a hard ≤35 s wall target cannot be declared from standard hosted runners when ordinary setup variance alone pushes a healthy shard pair to 38 s.

CI Node Concurrency Benchmark run **36082154293** still removes one possible false lead: four repeated direct-invocation runs at `PATHFINDER_PARALLEL_JOBS=4` measured **35.17–35.61 s**, median **35.46 s**, while the equivalent npm-mediated runs measured **45.53–46.93 s**, median **45.65 s**. However, subsequent exact-head ordinary CI provides an important correction to the interpretation. Run **36083565019** measured the production Node/CLI step at **35 s**, while run **36084034066** measured the same production population at only **20 s**, even after adding the PR-scale 1,500-file repository-view regression. The direct four-worker harness is clearly preferable to the npm-mediated wrapper, but useful Node wall itself is materially variable on shared runners. Do not treat 35 s as a fixed intrinsic contract cost or resume same-runner shard-count tuning from one sample; the evidence supports a broader shared-runner capacity/noise problem plus contract cost. Material p90 improvement still requires cheaper contracts, more predictable/larger compute, or both.

### D2 result: native equal-file coverage sharding preserves thresholds but wastes the critical path

Evidence-only run **36068033403** proved Vitest's merge path is semantically usable:

- both coverage shards passed;
- blob reports merged successfully;
- Pathfinder's unchanged global and `modules/input/*-core.ts` thresholds passed on the merged report.

Timing:

| lane | useful coverage/merge work | runner wall |
| --- | ---: | ---: |
| native shard 1 | 11 s | 28 s |
| native shard 2 | 19 s | 40 s |
| separate merge job | **2 s merge/check** | 21 s |

First shard start → merged thresholds complete: **64 s**.

Two problems are architectural rather than semantic:

1. Vitest's equal-file partition is badly runtime-imbalanced for Pathfinder;
2. a third hosted merge runner spends ~19 s on assignment/setup for ~2 s of actual merging.

The current full-coverage timing profile has **146 files / 34.181 summed file-seconds**. Greedy measured balancing produces **17.091 / 17.090 seconds**, essentially exact.

### D2b: balanced coverage shards with a warm merge coordinator

The next rehearsal therefore:

1. uses the measured 146-file timing profile and validates that it exactly covers the current Vitest file registry;
2. runs two explicit file-balanced coverage populations on standard runners;
3. keeps per-shard threshold enforcement off only while producing blob reports;
4. makes one shard runner the coordinator after its own shard completes;
5. polls the current workflow run for the worker's uploaded blob;
6. downloads it into the already-warm coordinator;
7. runs native `--merge-reports --coverage` there under the ordinary production config and unchanged thresholds.

This removes the third-runner setup/queue tax. D2b is viable only if first-shard-start → merged-threshold completion approaches the ≤35 s target. If it still misses materially, coverage moves to the larger/reserved-runner fallback rather than weakening coverage.
