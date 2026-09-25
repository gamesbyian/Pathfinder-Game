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

## Reference baseline

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

### Bootstrap

1. Current deep sparse checkout materializes ~207 MB / 3,269 files, ~190 MB of it data.
2. Hosted measurement: current deep checkout **15 s**.
3. Source-only checkout + exact runtime-data cache restore measured **~4 s** on the best second pass (3 s checkout + 1 s restore; first pass ~6 s total).
4. Exact cached Node **22.23.2** setup measured **~1 s**, versus **5–6 s** for floating Node 20 downloading 20.20.2.
5. Node 22.23.2 passed production typecheck, all 1,524 fast-unit test slots (1,513 passed / 11 intentionally skipped), and production Vite compilation/build when runtime assets were present.
6. Raw system Node is not currently preferred: it removes setup-node but loses the setup-node-managed npm-cache version and gives up a pinned runtime for a marginal additional setup saving.
7. Main-push validation does not seed ESLint cache today. This explains why unrelated new PRs cold-lint while same-PR revisions can fall near 2 s.

### Router startup

The impact plan computation itself is negligible, but full-impact deep verification waits on a separate planner runner. Recent planner jobs have taken roughly 9–45 s due to hosted startup/checkout/setup. That dependency is incompatible with the 35 s target.

### Node/CLI

The 176-contract population is unusually balanceable from measured timings:

- two shards: ~53.8/53.9 child-s;
- three shards: ~35.9 each;
- four shards: ~26.9 each.

At the existing four-worker execution inside a shard, two balanced shards project near **13–14 s useful wall each** before bootstrap. Shards must be generated/validated from measured timing data rather than frozen by item count.

### Covered Vitest

Two fixtures dominate the current covered suite:

- `orchestration-work-budget.test.ts`: ~8.2 s; one lifecycle-telemetry bookkeeping regression is ~8.0 s;
- `diversification.test.ts`: ~7.0 s; deliberately real solver integration.

The lifecycle test already lives beside tests that use `attemptSearchForTesting: exhaustingDispatch` to exercise the same orchestration/budget machinery cheaply. Its assertion is lifecycle bookkeeping, not search effectiveness, so it is a high-confidence testability refactor target.

The diversification integration should not be stubbed merely for speed. It should either remain in covered execution or move intact to an explicit parallel deep-integration obligation.

### Heavy proofs

Four explicit proof files already overlap internally and finish in ~11 s wall. The long tails are approximately:

- R02560 disabled: 10.4 s;
- deadlock root 0: 9.1 s;
- deadlock root 1: 6.8 s;
- R02560 enabled: 0.36 s.

Further speed here requires cheaper witnesses or execution on independent compute; simply adding more Vitest workers cannot beat the longest individual proof.

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
| B6 bulk-change text-invariant batching | **exact-head ordinary CI green; PR-scale regression added** | #2072 CI run 36082154314 exposed a scaling regression: `check:text-source-files` took **6m47s** on a 1,474-file migration because each sparse changed file triggered separate `git cat-file -s` + `git show` processes. #2107 batches sparse HEAD blob reads through one `git cat-file --batch` process without changing the checked population or invariant. Exact-head CI run 36083565019 completed the text-invariant step within the same one-second timestamp bucket; `test:repository-file-view` now also executes the real PR-incremental checker against 1,500 unmaterialized changed text blobs. |
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

Expected file saving: roughly **7.5 s** versus the current covered-suite profile. Full-suite wall saving must be measured separately because Vitest overlaps files.

### B1c. Remove hint-occurrence unit-test import side effect

Post-hint-consolidation Node/CLI profiling exposed a new dominant contract:

- `test:hint-occurrence-acceptance`: **15.8 s**;
- next-largest current Node contracts are materially smaller.

Root cause is structural, not intrinsic audit cost. The synthetic node test imports `auditHintOccurrenceSemantics` from the CLI module, and that module executes `buildHintOccurrenceAcceptanceReport()` at top level. Importing one pure function therefore scans all three persisted hint corpora before the synthetic assertions run.

Production/testability fix:

1. extract `auditHintOccurrenceSemantics` and its private occurrence-key helper into a side-effect-free library;
2. keep the CLI importing/re-exporting that function so external API compatibility is preserved;
3. make the synthetic Node contract import the pure library directly;
4. leave the corpus-scale CLI behavior unchanged when the CLI itself is invoked.

Expected contract-level saving is roughly the full **15.8 s** observed import cost. Because Node contracts execute in a four-worker pool, the actual Node-population wall reduction must be measured separately.

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

This is separate from the shared-runner p90 problem documented below. A six-minute deterministic local step is application-owned CI waste and must be removed regardless of future runner capacity.

### Phase D: runtime-balanced execution topology

Do not pick shard count until A/B/C measurements are active. The first standard-runner rehearsal should use **five required lanes** because that is the smallest layout with a plausible ≤27 s budget per lane on 4-core runners.

#### Candidate standard-runner topology

| lane | obligations | target bootstrap | target useful work | lane budget |
| --- | --- | ---: | ---: | ---: |
| static | reachability/text + validators + warm lint + build | **≤8 s** | 8–10 s | **≤18 s** |
| node-a | ~50% measured Node/CLI cost | **≤8 s** | 13–14 s | **≤23 s** |
| node-b | ~50% measured Node/CLI cost | **≤8 s** | 13–14 s | **≤23 s** |
| implementation | ordinary coverage after B1; shard if >19 s | **≤8 s** | ≤19 s | **≤27 s** |
| deep-services | heavy proofs + Firestore + 250k canary, overlapping independent processes where measured safe | **≤8 s** | ≤14–16 s critical path | **≤24 s** |

Notes:

- `deep-services` must benchmark concurrency rather than simply background every command. Firestore startup is partly external/IO and may overlap well with proof CPU; prove it.
- If `implementation` remains above 30 s, split covered Vitest by measured file cost and merge V8 coverage/thresholds. Do not lower coverage thresholds.
- Do not add a separate runner merely to aggregate status. Use native required checks or an effectively dependency-only result contract that does not put another hosted-runner queue on the critical path.
- Generate Node shard membership from a checked-in timing profile plus deterministic fallback, and validate that every registered Node contract is assigned exactly once.

### D1. Two-way Node/CLI sharding — current rehearsal

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

Decision gate:

1. land the hermetic diagnostics-harvest regression;
2. rerun the exact current two-way shard rehearsal;
3. if both shard runner walls remain ≤27–30 s and first-shard-start → both-complete remains ≤35 s, two-way standard-runner Node sharding remains viable;
4. if timing then fails, stop shard-count tuning and move to the larger/reserved-runner fallback already defined in Phase E.


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

### B6. Full same-runner deep concurrency rehearsal

After B3, the warm deep path is roughly **12 s bootstrap + 21 s coverage + 12 s concurrent proofs/Firestore**.

The last single-runner packing experiment launches all three unchanged deep obligations together after one warm bootstrap:

- ordinary covered implementation population with existing thresholds;
- heavyweight solver proofs;
- Firestore persistence boundary.

All child exit codes and logs remain independent.

Decision:
- if the combined validation window stays around **20–22 s**, production deep can plausibly approach the 35 s target without coverage sharding;
- if CPU contention pushes the window materially higher, the 4-core single-runner deep path is exhausted and further work must reduce the proof population itself or change compute infrastructure.

### Phase E: hosted-runner variance decision

Run at least 10 comparable full-impact rehearsal executions after the candidate topology is green.

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

## Activation order

1. A1 deep checkout.
2. A3 main-seeded ESLint cache.
3. A4 canary budget.
4. B1 lifecycle deterministic dispatch.
5. A2 exact Node 22 after a complete Node22 shadow/full contract.
6. C exact dependency-tree restore after a complete restored-tree validation rehearsal.
7. A5 remove planner dependency edge.
8. B2 coverage-shard decision from post-B1 timing; do not create a deep-integration tier by default.
9. D candidate five-lane rehearsal.
10. E standard-vs-reserved runner decision.

Each production activation gets its own PR or tightly scoped reconciled batch with before/after timing evidence.

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
