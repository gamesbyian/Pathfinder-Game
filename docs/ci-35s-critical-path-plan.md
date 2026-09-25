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
| 36090943840 | **~58 s** | **~40 s** | Node/CLI 36 s; coverage 18 s; proofs+Firestore 8 s |
| 36096284051 | **~99 s** | **~73 s** | Node/CLI 32 s; **21 s runtime-data fallback + 25 s cold build** after canonical harvester changed Hint trees without publishing the new cache generation |

This variability is now itself evidence. Shared hosted runners vary materially not only in assignment/setup but in effective useful-work wall time. One fast sample must not be promoted to an intrinsic cost model.

The current biggest permanent-speed opportunities, in order of expected leverage, are:

1. **Node/CLI contract testability:** use the new machine-readable per-contract timing profiles, then attack structural tails: import-time corpus scans, repeated large-corpus parsing, avoidable subprocess/CLI wrappers, repository-wide discovery in synthetic tests, redundant fixture construction, and tests that invoke real solver/search work for bookkeeping-only assertions. Do not resume shared-runner shard-count tuning.
2. **Covered Vitest testability:** refresh the slow-file/slow-test census from the JSON reporter and make expensive assertions cheaper without weakening coverage or converting real integration semantics into mocks. Preserve balanced coverage sharding as a proven topology for larger/reserved compute.
3. **Heavy proof witnesses:** inspect the longest proof fixtures for smaller deterministic witnesses, tighter work budgets, or reusable setup while preserving the same property. Internal parallelism is already near the current 4-core limit.
4. **Firestore boundary:** current run 36104516509 shows the post-coverage Firestore path is now a larger tail than the solver soundness proofs: ~3 s Firebase CLI cache restore + ~3 s emulator-binary restore, then ~13 s Firestore boundary wall, while the two deadlock proofs finish in ~7.0 s wall. #2109's exact emulator cache remains correct, but Firestore bootstrap/execution is no longer closed as a speed target if coverage sharding succeeds.
5. **Canonical Hint cache authority:** run 36096284051 proved the diagnostics-side seeding is attached to the wrong producer. `solver-diagnostics.yml` seeds the pre-harvest tree, then `harvest-solver-evidence.yml` creates the actual Hint commit and invalidates both exact caches. Move runtime-data and runtime-hint publication to the central harvester's post-persistence HEAD before returning to smaller bootstrap audits.
6. **Residual bootstrap/cache critical path:** after canonical Hint cache ownership is fixed, audit serialized exact-cache restores, setup-node, TypeScript state, validator/lint sequencing, and duplicate repository discovery. Treat each as a measured small-opportunity audit, not a reason to weaken validation.
7. **Larger/reserved compute:** benchmark the already-proven balanced Node and coverage topologies on more predictable compute after software costs are slimmed. Re-test internal deep overlap there because the 4-core negative result is contention-specific. At least 16 logical CPUs remains the initial capacity target.
8. **Cadence/impact routing:** continue using the separate historical-value/impact-routing program to avoid irrelevant work. Do not use cadence demotion as a substitute for making the fullest selected form fast.

Closed or currently low-value directions:

- **bulk text invariant:** closed by #2107 with a permanent 1,500-file sparse regression;
- **same-runner Node fan-out tuning:** direct 4-worker execution is preferred; npm mediation is worse;
- **three-way deep overlap on a standard 4-core runner:** run 36090175972 stayed semantically green but stretched coverage/proofs/Firestore to 43.0/21.0/29.0 s and only reduced the serial sibling window by roughly 3 s;
- **more shared-hosted Node/coverage shards:** semantically proven but p90 margin is inadequate because of hosted variance;
- **solver canary, lint, warm build:** now ~1–2 s each and no longer priority targets; **setup-node is not closed** after run 36103663816 measured a 17 s npm-cache restore on a warm dependency-tree hit.
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
2. Exact Node **22.23.2** is pinned. Run **36103663816** exposed a pathological but real hot-path bootstrap: `actions/setup-node` with `cache: npm` took **17 s** even though the subsequent exact `node_modules` cache hit and `npm ci` never ran. The production lanes now restore the exact dependency tree first where possible and use setup-node **without npm-cache restore on a hit**; npm-cache restoration is reserved for the dependency-tree miss path.
3. Exact dependency-tree restore is active and skips `npm ci` on a hit. The cache identity is now explicitly pinned to Node 22.23.2 / npm 10.9.8 so it can be restored before probing a live runtime on the Fast Gate.
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


Corrected Node-22 benchmark run **36090943731** now provides the current machine-readable census. Direct four-worker execution completed four green repeats at **24.13–26.48 s**, median **24.70 s**, versus npm-mediated median **30.52 s**. Current dominant direct-mode child medians are:

| contract | median child wall |
| --- | ---: |
| `test:research-query` | **9.20 s** |
| `test:research-queryability-audit` | **8.85 s** |
| `test:research-system-query` | **8.75 s** |
| `test:portfolio-solve-sweep-worker` | **3.70 s** |
| `test:harvest-cpsat-discovery-reports` | **3.30 s** |

This is now the primary Node software target. Audit showed that all three dominant contracts also pay for real Git-ref reconstruction: query and system-query assert HEAD snapshot parity, while queryability benchmark QB-010 performs a temporal-change query against HEAD. Simply combining the tests would serialize currently overlapping work and risk increasing wall time.

#2109 therefore attacks the common Git-ref cost first without weakening the integration boundary. `withDetachedGitWorktree()` now supports both cone-directory and explicit file-pattern sparse materialization. Research snapshots use explicit patterns: all docs; report Markdown; experiment-evidence manifests/bundles; the solver-evidence integrity index; the capability-invention-demand register; and, for system inventory only, package/scripts/workflows. This avoids materializing the ~449 MB `data/stress` tree and ~623 MB `reports` tree wholesale, while preserving every source the builders actually read. The snapshot builders still execute against a real detached requested ref. A tiny dedicated Git fixture asserts that requested directories and root files materialize, excluded directories do not, and the detached HEAD matches the requested ref.

Preliminary coarse-cone benchmark evidence from run **36093286575** is already positive on the three target contracts: `research-query` fell from ~9.2 s to roughly **5.7–7.2 s**, queryability from ~8.9 s to **5.2–6.4 s**, and system-query from ~8.8 s to **4.6–5.0 s**. That run was red only because the new `test:git-ref-worktree` contract had not yet been added to the permanent research validation group; the contract itself and all three research-query contracts passed. The registry defect is fixed in #2109.

The exact-pattern implementation produced a much larger speedup on run **36093695768**: `research-query` measured about **3.7–3.9 s**, queryability **3.1–3.3 s**, and system-query **3.9–4.2 s**. Fast Gate's full Node/CLI step on sibling run **36093695712** completed in **20 s**. Query/queryability passed, while system-query failed only its HEAD snapshot parity assertion.

The parity diff localized the omission to `sharedFailureModes`, whose dependency closure follows local imports from research package-script entrypoints into `modules/`. The file-pattern system snapshot had retained package/scripts/workflows but omitted modules. #2109 restored only `/modules/` to the system snapshot pattern; query/queryability remain on the narrower payload.

Exact-head run **36094987316** is fully green, including the real HEAD-parity system-query assertion. The sparse Git-ref optimization is therefore **closed successful**.

Post-snapshot timing now exposes the next Node/CLI tail clearly. On the same benchmark population, dominant medians moved to roughly **5.3 s** `test:harvest-cpsat-discovery-reports`, **4.6 s** `test:run-solver-direct-cli`, **4.4 s** `test:hint-workbench`, **4.4 s** `test:combine-solver-sweep-reports`, **4.3 s** `test:harvest-solver-diagnostics-reports`, and **4.1 s** `test:portfolio-solve-sweep-worker`.

Three of those tails exposed a trivial repeated-bundling tax. `run-bundled.mjs` already exports `buildBundle()` specifically for callers that spawn the same entry multiple times. #2109 now uses that intended seam in the CP-SAT harvester, direct-solver CLI, and diagnostics-harvester Node contracts so each entry is bundled once and reused across its real CLI cases. This preserves executable integration coverage while removing redundant esbuild work.

Final Node-22 benchmark run **36094987266** is green. Direct four-worker execution has **26.25 s median** versus **34.71 s** for npm-mediated execution. Current direct child medians after the sparse/bundle changes are approximately: CP-SAT harvester **4.3 s**, hint-workbench **4.05 s**, sweep combiner **4.0 s**, portfolio worker **3.9 s**, direct-solver CLI **3.4 s**, diagnostics harvester **3.3 s**, research-query **3.25 s**, research-system-query **3.2 s**, and queryability **2.6 s**. The former research-query family is no longer the Node critical tail.

The sweep-combiner contract was a different class: its ~4.4 s test launched **22 Node subprocesses** (14 combiner, 8 planner) across a 930-line semantic suite. Audit showed that the combiner cases and seven of the eight planner cases assert file/semantic results rather than executable stdout; only the separate timeout-recovery tool has an explicit stdout contract in this suite. That makes callable seams appropriate so long as one real combiner CLI smoke and one real planner CLI smoke remain.

Follow-up implementation now lives in the combiner-topology PR. `combine-solver-sweep-reports.mjs` exports `combineSolverSweepReports(argv, { root })` while retaining the same direct CLI guard. `plan-highbudget-shards.mjs` likewise exports `planHighbudgetShards(argv, { root })` behind its existing direct-execution guard.

The Node contract preserves one real combiner CLI smoke and one real planner CLI smoke for executable/argument/file-output integration. The remaining **13 combiner** and **7 planner** semantic cases run in-process through the exported seams. The separate timeout-recovery executable remains a real subprocess because its stdout is explicitly part of the asserted contract. This reduces this portion of the suite from **22 combiner/planner subprocess launches to 3 real executable boundaries** without dropping semantic cases.

Exact Fast Gate evidence from run **36096167198** is green for the full Node/CLI population. `test:combine-solver-sweep-reports` measured **1.6 s**, down from roughly **4.0 s median** in the final #2109 Node benchmark, a ~60% contract-level reduction. The full Node step measured **31 s** on this shared-runner sample, reinforcing the standing rule that child-level timing is the cleaner signal for scoped testability changes.

Decision: **close this process-topology experiment successful**. Preserve the three real executable boundaries (combiner smoke, planner smoke, timeout-recovery stdout integration) and do not chase the remaining 1.6 s unless it re-emerges as a material tail.

Decision gate: keep the sparse path only if all existing real-repository HEAD parity/queryability assertions stay green and the corrected Node-22 benchmark shows a repeatable reduction in the top-three contracts or total direct wall. If not, revert it rather than adding broader shared-fixture coupling.

### Covered Vitest

Fresh production evidence from run **36090943840** / deep job **107933055611** validates the #2109 repair-search reuse change:

- covered ordinary population: **~18 s**, down from the immediately preceding ~30 s sample;
- `repair-search.test.ts`: **3.8 s**, down from **8.6 s**;
- `diversification.test.ts`: **6.0 s**, now the largest covered file;
- all remaining files are materially smaller.

The repair-search change removed six redundant soundness-only real searches and moved validity assertions onto the already-fresh determinism pairs. All 31 remaining repair-search tests are green. This is a demonstrated same-proof-cheaper-testability win, not merely a standalone microbenchmark.

Diversification remains deliberately real solver integration. Its three dominant tests measure about **2.1 s**, **1.9 s**, and **1.9 s** in the current production run. Its reusable prerequisite harvest is already shared; the remaining expensive sessions assert distinct stateful behavior and should not be conflated merely for speed.

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

The proof-value audit found that the four-file set had conflated two different contracts.

PR-blocking deep proofs now contain only the two exhaustive deadlock-root soundness files. The historical R02560 enabled/disabled pair is retained together as `test:solver-effectiveness-characterizations`, outside ordinary PR CI.

The disabled assertion is causal historical evidence: disabling only `STRATEGY_REPAIR_LENGTH_GAP_CLOSE` left R02560 unsolved within the published 900,000-node ceiling. The enabled assertion records the corresponding historical rescue. Both are useful during mechanism attribution, but neither is a software-correctness invariant. Another solver mechanism may legitimately make the disabled arm solve, and an intentional portfolio/search tradeoff may legitimately move the enabled rescue. Effectiveness and regression accounting belong to the experiment/promotion protocol.

The enabled witness did once expose a harmful backward-route scoring experiment while the published 160/160 benchmark stayed green. That is evidence that the witness is scientifically useful, not evidence that it should block every merge: the repository's matched-work A/B, gain/loss accounting, confirmation, and production-boundary refresh process is the stronger authority for solver effectiveness.

The universal nine-published-level solver capability canary has likewise been removed from PR CI. It pinned fixed historical solve outcomes under a 250k-work ceiling, duplicating the solver research regression process. Catastrophic plumbing failure remains covered by the tiny real top-level `solveLevel()` synthetic-line test in `orchestration-core.test.ts`, plus the ordinary solver correctness/unit suite.

The routing audit also found that the local planner already emits independent `needs_coverage`, `needs_deep_proofs`, and `needs_firestore` capabilities, while the production deep job previously used only coarse `deep_job_required` and ran all three obligations whenever any one was selected. That contradicted `ci-validation-plan.json`: deep proofs belong to the solver surface, Firestore to persistence, and coverage to game/solver/shared. The deep job now honors those existing per-capability outputs, with planner failure still failing safe by running all obligations.

Deadlock exact-reference memoization remains a possible implementation optimization only if a complete state-equivalence key can be independently justified; do not add an ad-hoc cache to the proof oracle.


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
| B5 runtime-hint projection cache | **merged; producer-ownership repair in progress** | Warm exact restores remain ~2 s, but #2111 run 36096284051 paid ~25 s cold because report-only diagnostics seeded the pre-harvest key. Publication is moving to `harvest-solver-evidence.yml` post-persistence HEAD, the producer that actually changes canonical Hint trees. |
| D1 two-way Node sharding | **closed negative on shared hosted runners** | Post-hermetic rehearsals are semantically green and cut useful Node work to ~14–17 s/shard, but runner walls varied to **31–35 s** and **27–38 s** across confirmations. Shared bootstrap variance consumes the 35 s budget; stop shard-count tuning. |
| B3 proofs + Firestore overlap | **merged / measured green** | #2100 full-impact run kept coverage green and ran unchanged proofs + Firestore concurrently in **15 s**, with independent success outputs. Prior serialized shape was ~23 s; #2100 is merged to `main`. |
| B6 bulk-change text-invariant batching | **closed / exact-head green with PR-scale regression** | #2072 CI run 36082154314 exposed a scaling regression: `check:text-source-files` took **6m47s** on a 1,474-file migration because each sparse changed file triggered separate `git cat-file -s` + `git show` processes. #2107 batches sparse HEAD blob reads through one `git cat-file --batch` process without changing the checked population or invariant. Exact-head CI run 36084034066 kept the direct text-invariant step below timestamp resolution and passed the permanent real-checker regression against **1,500 unmaterialized changed text blobs** inside a **20 s total Node/CLI step**. |
| D2 coverage sharding | **technical success; shared-runner margin insufficient** | D2b run 36068829982 balanced 146 files to 17.091/17.090 test-s and produced authoritative merged coverage with unchanged thresholds in **34 s from shard start**. Only ~1 s headroom remains; D1 already demonstrated ordinary hosted setup variance can exceed that. |

### A1c. Publish runtime-data cache from the canonical Hint harvester

**Correction after #2111 evidence:** the original #2061 ownership model was wrong.

`solver-diagnostics.yml` is intentionally report-only. It may push audit-history logs, but it does **not** mutate canonical Hint files. The later `harvest-solver-evidence.yml` workflow consumes that report, semantically merges accepted observations, commits the canonical Hint changes, and pushes the tree that actually changes the runtime-data key.

Run **36095878551** demonstrated the defect concretely:

- diagnostics derived/restored `runtime-data-2240ada3…` after its audit-history push;
- the central harvester then committed Hint changes as `aecc858d…`;
- #2111 CI run **36096284051** needed `runtime-data-730d97f4…`, missed both current and base generations, and paid roughly **21 s** for the whole-tree correctness fallback.

Correct ownership:

1. after `harvest-solver-evidence.yml` successfully persists its semantic merge, local `HEAD` is the exact commit just pushed to `main`;
2. derive the runtime-data key from that post-persistence `HEAD`;
3. restore that exact generation if it already exists;
4. otherwise save the fully materialized canonical runtime-data tree already present in the harvester checkout;
5. source/report workflows such as solver diagnostics must not claim canonical Hint-cache authority.

A focused workflow guard mechanically requires the cache-publication steps in the central harvester and forbids them in report-only solver diagnostics.
### A1d. Seed every main generation from full main-push checkout

Main-push `validate` already checks out the complete repository, including the canonical runtime-data tree. Publish that already-materialized tree under the same exact Git-object key PR CI uses.

This closes the base-cache authority gap exposed by A1b: every ordinary merged main commit gets an exact default-branch runtime-data cache generation without additional Git materialization. A1c separately handles central-harvester Hint persistence commits that are created after the source workflow and therefore do not inherit the source workflow's cache generation.

Together:
- A1d covers ordinary merges;
- A1c covers central-harvester canonical Hint commits;
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

A1c now seeds canonical central-harvester Hint generations from the actual post-persistence HEAD. A1d (#2063) seeds every ordinary main generation. Together they make the expensive fallback exceptional rather than normal.

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
5. the canonical central harvester derives both cache keys from its post-persistence local `HEAD` after a successful semantic merge/push and seeds the exact generations created by that Hint commit; report-only solver diagnostics does not seed canonical Hint generations.

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

## Correctness/process/evidence audit

The 35-second audit exposed a broader classification problem: the production Fast Gate is still universal even though the repository already maintains semantic validator/Node-test groups. This causes unrelated PRs to repeatedly run repository-governance and research-process checks.

Use three dispositions:

1. **Correctness/integration** — keep in PR CI, scoped where semantics permit. Examples: typecheck, build, data-schema validity, runtime path validation, hard-prune soundness, persistence boundary behavior, CLI/API contracts.
2. **Repository/process integrity** — keep as change-scoped governance, not universal work. Examples: CI-plan parity, workflow lifecycle/disposition registries, documentation authority/link integrity, file-size/context-budget ratchets, no-level-identity policy, metric-boundary ownership.
3. **Frozen evidence/process-result reconfirmation** — remove from ordinary PR CI. Dated reports and historical research outcomes are evidence, not compatibility APIs. Test analyzers with synthetic fixtures; validate historical artifacts only when intentionally auditing/regenerating them.

Concrete findings and disposition:
- **Implemented:** `test:research-system-consolidation-closeout`, `test:research-portfolio-retrospective`, and `test:ws2-class3-shared-acquisition` are no longer members of the permanent `test:node`/validation-group population. Their package aliases remain available as explicit historical/reproducibility audits. The WS2 acquisition check was a pure dated-artifact integrity assertion over the frozen 23 + 30 = 53 population, not a reusable software contract.
- **Implemented:** production Fast Gate now computes the semantic merge-diff plan locally and executes only selected validator and Node/CLI groups. Router failure fails safe to the full `check:validators` and `test:node` aggregates. The independent impact-shadow job remains an inspectable routing record and deep-lane authority, so Fast Gate does not wait for another hosted runner before starting.
- **Scoped by the activation above:** `test:research-system-inventory` still mixes structural integration assertions with current research-state acceptance, but it now runs only when the research surface is selected rather than on unrelated game/data work. A future fixture-quality cleanup may split those concerns, but that is no longer on the universal critical path.
- **Scoped by the activation above:** `check:current-level-facts`, solver-sweep/failure-evidence workflow governance, research-resource/artifact metadata governance, documentation authority checks, no-level-identity policy, level-metric ownership, CI parity, and maintenance ratchets now run only when their semantic group is selected (subject to conservative multi-surface/shared declarations).
- Coverage thresholds remain quality policy rather than correctness evidence. Keep them for implementation surfaces where they prevent untested-code growth; do not treat coverage itself as proof of solver/game effectiveness.

Production build scoping is now activated too: Fast Gate restores the runtime-hint projection and runs Vite only when the local plan selects `needs_build`; router failure still builds conservatively. Gate parity mechanically asserts both the selection condition and that a selected build failure remains blocking.

The plan/workflow parity audit also removed `check:ci-impact-inventory` from `always.packageScripts`. It is already owned by the repo validator group, so the manual scoped rehearsal no longer runs it a second time unconditionally. This is repository-routing governance, not an every-PR correctness obligation.

This closes the major "reconfirm unrelated repository process on every PR" defect. Remaining CI optimization should audit whether individual group ownership is still too broad, not revert to universal aggregates.

## Methodology retrospective after the first 35-second cycle

The last three days of CI work exposed a sequencing flaw in the original optimization method.

The critical-path program began by treating the existing full-impact validation population as protected and then asking how to execute it faster. That discipline prevented casual test deletion and produced several durable wins: cache authority repairs, direct Node execution, exact dependency/bootstrap caching, the sparse Git-object batching fix, measured coverage sharding, negative shared-runner topology results, and better testability seams.

However, the historical-value, impact-routing, and latest correctness/evidence audits now show that the protected population itself mixed several fundamentally different things:

- merge-safety correctness and soundness;
- repository/process-governance policy;
- software-quality/coverage policy;
- solver/research effectiveness characterization;
- historical/frozen evidence reproducibility.

Treating all five as one immutable "validation contract" caused optimization effort to be spent on obligations whose correct disposition was narrower cadence or explicit audit. The clearest examples are the nine-level solver capability canary and the R02560 historical treatment/control pair: both were first optimized as fixed PR obligations, then later recognized as solver-effectiveness evidence that the experiment/promotion system already measures more appropriately.

The next CI cycle must therefore reverse the order of operations.

### New decision order for every expensive obligation

Before optimizing execution, answer these questions in order:

1. **What concrete bad merge is this check intended to stop?** Name the violated current contract and consequence.
2. **What kind of claim is it?** Runtime correctness/soundness, persistence/security, API/integration, repository governance, maintainability policy, effectiveness/quality, or historical/reproducibility evidence.
3. **Is PR CI the authoritative process for that claim?** Identify any existing repo process that already establishes or periodically re-establishes it: experiment/promotion protocol, generated-authority writer, lifecycle audit, main-push oracle, scheduled hygiene, etc.
4. **Would a changed result necessarily mean the change is bad?** If a solver improvement, intentional tradeoff, updated research conclusion, or regenerated snapshot can legitimately make the assertion false, it is not a permanent correctness invariant.
5. **What changed surfaces can actually invalidate it?** Use semantic ownership before measuring universal cost.
6. **What is its demonstrated marginal detection value?** Use root-cause/failure-family clustering and relevant exposures, not raw red counts.
7. **What is the cheapest faithful proof of the surviving contract?** Only now optimize fixtures, process boundaries, caching, concurrency, sharding, or runner topology.

This order combines the strongest parts of the historical-value audit, impact-routing work, and testability audit instead of treating them as separate programs.

### Change the optimization priority metric

Raw command duration is no longer the right ranking.

Prioritize approximately by:

> **expected critical-path burden = selected frequency × selected wall contribution × tail probability × setup coupling**

and then weight by the confidence that the obligation belongs on that cadence.

Consequences:

- a 6-second research harness that rarely runs after semantic routing is less urgent than a 2-second contract on nearly every implementation PR;
- a long command hidden behind another longer parallel child may have little critical-path value;
- a setup cost that keeps an otherwise unnecessary lane alive may matter more than the command itself;
- p90/tail behavior matters more than one favorable child timing.

Refresh timing censuses **after** routing/cadence changes. Do not optimize from the old universal population.

### Re-open prior topology conclusions only when their premises changed

The D1/D2/B6 shared-runner experiments remain valid for the workloads and runner shape they measured. They proved that adding shared-hosted lanes to the then-full Node/coverage/deep populations lacked reliable 35-second margin.

They are not timeless laws. Semantic Fast Gate routing and removal of effectiveness/historical obligations materially change common selected work. Revisit a closed topology only when a named premise changes, for example:

- selected population shrinks enough to alter lane bootstrap economics;
- longest-child tail is removed or distilled;
- runner capacity changes materially;
- setup is shared differently.

Do not repeat an experiment merely because time passed; do repeat it when its cost model is no longer the same experiment.

### Preserve the best methodological habits

Several practices from the first cycle should remain mandatory:

- exact-head, same-contract measurement rather than anecdotal stopwatch claims;
- explicit p50/p90 and runner-start skew rather than one lucky run;
- negative-result documentation so failed approaches are not rediscovered;
- semantic fault injection before reducing cadence;
- root-cause/failure-family clustering instead of counting red checks;
- fail-safe routing for unknown impact;
- synthetic/small fixtures where the repository artifact is not itself the contract;
- preserving one real executable/integration boundary when direct-library testing replaces repeated subprocess work;
- distinguishing hosted-runner variance from deterministic repository-owned cost;
- permanent cardinality regressions for failures such as the #2072 sparse Git subprocess explosion.

### Fresh audit lenses

The next pass should explicitly look for:

- **process-result duplication:** CI re-proving something already guaranteed by an authoring/generation/experiment workflow;
- **historical assertions disguised as software contracts:** dated reports, fixed solve outcomes, frozen snapshots, old treatment/control relations;
- **current-state acceptance tests:** tests that hard-code today's queue/report/plan state rather than validate the machinery that derives it;
- **integration-owner duplication:** multiple tests rebuilding the same repository model when one integration owner plus pure consumer tests would suffice;
- **policy ratchets running outside their ownership surface:** maintainability/governance checks that are useful but unnecessarily universal;
- **coverage used as a proxy for correctness:** retain coverage as quality policy, but do not credit it as independent behavioral evidence;
- **main/full-oracle duplication:** periodically reassess what the broad oracle is auditing and whether its frequency remains justified once scoped PR CI is stable.

The important fresh question is no longer "what else can we shave?" It is:

> **What is the smallest, correctly owned set of evidence that should block this merge, and only then how do we make that evidence fast?**

### Solver-to-research routing discriminator — implemented, awaiting oracle evidence

The first selected-population census after Fast Gate activation found a coarse ownership edge worth challenging before more test micro-optimization.

Using the checked-in rehearsal profile from run 36065247220 only as a relative child-work model (not current hosted wall-time authority):

| selected surfaces | selected Node contracts | measured child-seconds |
| --- | ---: | ---: |
| `game` | 2 | ~0.8 |
| `solver` | 35 | ~17.7 |
| `research` | 111 | ~46.5 |
| `data` | 49 | ~21.8 |
| `solver + research` | 127 | ~57.0 |
| `data + research` | 150 | ~66.8 |
| `data + game + solver + research` | 168 | ~78.1 |

The exact numbers will change with fresh timings, but the shape is decisive: downstream surface escalation can dominate the selected population before any individual test runtime matters.

After encoding the 59 mechanically observed consumers, current registry selection for `solver` is about **81 Node contracts / 80 measured**, with the old rehearsal profile totaling ~**57.6 child-seconds**. That is far fewer commands than the prior `solver + research` 127-contract selection, but not materially less aggregate child work because most expensive research consumers genuinely import solver authorities. Therefore **contract-count reduction is not a speed result**. Further solver-only routing optimization must be file/dependency-local (which solver files changed and which contract closures touch them), not another coarse surface edit. Do not claim a timing win until a scoped hosted rehearsal demonstrates one.

- the production-solver source rule currently classifies `modules/solver/**` as both `solver` and `research`;
- selecting `research` therefore pulls the entire research validator/Node population into every production-solver PR;
- the current rehearsal timing profile attributes roughly **46.5 child-seconds across 110 measured research-facing Node contracts**, versus roughly **17.7 child-seconds across 35 measured solver-facing contracts**. These are child-time planning figures from run 36065247220, not current hosted wall times;
- many research contracts are pure question/evidence/query/governance machinery with no plausible dependency on solver implementation.

The successful topology audit run 36103663827 emitted **59** registered production-solver consumers. Those exact consumers are now encoded with explicit `solver` contract surfaces across research/data/game/shared ownership, while the production-solver source rule itself selects only `solver`. Unrelated research administration is therefore no longer selected merely because solver is a producer. This remains conservative for the mechanically observed import/process boundary; filesystem/generated/env dependencies are still covered by the broad oracle and fault-injection evidence gate.

Implementation/evidence gate:

1. **done:** collect the exact 59-consumer list from topology run 36103663827;
2. **done:** encode mechanically observed downstream solver invalidation through explicit `contractSurfaces`;
3. **done:** change the production-solver source rule to `solver` only;
4. **pending:** representative semantic fault injection must pass under solver-only source routing;
5. **pending:** replay the historical #1722 unique solver-semantic catch / equivalent historical route oracle;
6. **pending:** run a solver-scoped rehearsal and compare selected population/timing against the prior wholesale research escalation;
7. retain full fallback for CI/router authority changes and periodic/full oracle coverage.

If that evidence closes green, this is preferable to spending the next cycle shaving milliseconds from research contracts that solver PRs never needed to execute.

This exposes a more general routing rule: **producer ownership and downstream invalidation are not the same axis**. Source-impact rules should normally identify the changed producer's own semantic surface. Downstream consumers should opt into invalidation through explicit contract surfaces/dependency metadata. Avoid encoding "A feeds B" by selecting all of surface B unless every B contract genuinely depends on A.

After the solver edge, inspect the same pattern for runtime data and shared-domain sources before attempting dependency-local routing globally.

## Workflow-trigger cruft audit

The PR-level workflow layer itself was audited before interpreting new timing runs. Three automatic workflows had outlived or exceeded their appropriate cadence:

- `hint-consolidation-closeout.yml` was introduced as a closeout canary for the Hint evidence consolidation plan. Its lifecycle ledger explicitly said to retire it when that plan closed. The plan is closed, so the workflow is now manual-only.
- `hint-provenance-hostile-audit.yml` was a completion/hostile audit with broad `scripts/**`, `modules/**`, `data/**`, and workflow triggers. Its durable central-persistence, physical-reader, ingestion-completeness, query/replay/termination/cost/process, runtime-projection, and v4-migration invariants are now permanent ordinary Node contracts. The remaining full-corpus census/referee/occurrence checks are forensic/audit work. The workflow is now manual-only.
- `ci-deep-concurrency-benchmark.yml` is explicitly evidence-only but was automatically triggered by almost any modules/scripts/test change. It is now manual-only; the 35-second program can dispatch it when a topology premise actually changes.

This is a cadence correction, not deletion of evidence. The workflows remain dispatchable for deliberate forensic/measurement use. Their ordinary validation invariants remain where applicable.

The audit did **not** broadly disable every auxiliary PR workflow. `ci-testability-topology-audit.yml`, `ci-semantic-fault-injection-audit.yml`, and `solver-evidence-integrity-guard.yml` have materially narrower authority/input triggers and remain automatic where their owning surfaces change. `ci-node-concurrency-benchmark.yml` is now manual-only as well. It was lifecycle-described as manual measurement but still auto-triggered on `package.json`; dispatch it only when worker-count/execution-mode assumptions actually need remeasurement.

## D1c: reopen two-way Node sharding after bootstrap premise change

D1 closed shared-hosted Node sharding negative after run 36068242014 measured semantically green **17 s / 14 s** useful shards but **27 s / 38 s** runner walls. The deciding failure was not shard balance: shard 2 spent roughly **11 s in setup-node**, exhausting the hard 35 s margin.

The cache-first bootstrap change materially changes that premise. Run 36104516509 demonstrated a **1 s** warm setup-node path when exact `node_modules` is restored before setup-node and npm's download cache is skipped.

The Node rehearsal profile has therefore been refreshed from exact-head run **36103663816 / job 107971397401**. It covers the current permanent `test:node` population exactly: **209/209 contracts, zero missing/stale entries** after the historical-audit removals.

Greedy two-bin balance from that profile is:

| shard | contracts | predicted summed child work |
| --- | ---: | ---: |
| 1 | 120 | **55.0 s** |
| 2 | 89 | **55.0 s** |

These are summed child times under four-worker execution, not expected shard wall.

The existing two-way rehearsal in `ci-testability-topology-audit.yml` is temporarily enabled for PR evidence and now uses the same cache-first bootstrap as production.

Preregistered interpretation:

1. both shards must be semantically green and the profile must exactly match the permanent registry;
2. if both runner walls are **≤30 s** and first-shard-start → both complete is **≤30 s**, shared-hosted Node sharding is strongly revived;
3. **30–35 s** requires repeated confirmation before production promotion;
4. **>35 s** closes D1 negative again under the new bootstrap premise;
5. do not promote from one favorable run, and do not tune membership after a timing miss unless the measured imbalance, rather than runner/bootstrap variance, is the cause.

Remove the temporary automatic shard rehearsal after the decision is recorded.

**First D1c attempt — run 36105650628:** shard 1 was green and ran its 120-contract population in ~15 s useful wall, reaching test completion about **30 s after job start**. Shard 2 stopped on `test:ci-impact-classifier`, not a sharding/concurrency defect: the solver-consumer metadata patch had accidentally overwritten pre-existing research/data surfaces on shared-owned contracts. The classifier correctly exposed that semantic metadata regression. The registry now unions the prior surfaces with `solver`; D1c remains **inconclusive pending the automatic rerun**.

**Clean D1c confirmation — run 36105868439:** both shards green. They started at **07:04:59** and both finished their measured Node populations at **07:05:22**, about **23 s to validation completion**. Shard 1 useful Node wall was ~10 s and shard 2 ~12 s after cache-first bootstrap. Job cleanup completed shortly afterward.

**Decision: D1c is revived as a production candidate.** This is materially inside the ≤30 s strong-revival threshold and directly resolves the old D1 failure mode, where useful 14–17 s shards were drowned by a setup-node outlier. Keep the temporary two-way Node rehearsal for one further comparable sample while production packing is designed; do not claim p90 success from one clean paired run.


## D2c: reopen balanced coverage sharding after bootstrap premise change

The earlier D2/D2b negative result remains valid for its measured topology, but one of its deciding premises has materially changed.

D2b run **36068829982** proved:

- the two measured coverage populations are semantically complete;
- native blob merge preserves the unchanged production coverage thresholds;
- useful shard work was balanced at **18 s / 19 s**;
- authoritative first-shard-start → merged-threshold completion was **38 s**;
- one shard's runner wall reached **38 s** largely because shared-runner bootstrap, including setup-node, consumed the remaining margin.

Run **36104516509** then demonstrated the new cache-first Fast Gate dependency bootstrap: exact `node_modules` restore followed by cache-free setup-node reduced the warm setup-node step from the **17 s** observed in run 36103663816 to **1 s**. That is a named premise change, so repeating the D2b coverage topology is now a genuinely different experiment rather than repetition of a closed negative.

Rehearsal implementation:

- reuse the exact #2098 146-file timing profile; it still matches the current covered file registry **146/146 with zero missing/stale files**;
- reuse the measured greedy two-bin assignment and warm-coordinator/native-merge architecture;
- require exact warm runtime-data and dependency-tree caches so the experiment measures the new hot path rather than cold-install noise;
- restore exact `node_modules` before setup-node and do **not** restore npm's download cache;
- keep `PATHFINDER_COVERAGE_SHARD=1` limited to shard children so per-shard thresholds are suppressed only until native merge;
- enforce the ordinary unchanged thresholds on the merged report.

Preregistered interpretation:

1. any test failure, population mismatch, merge failure, or threshold failure closes the candidate as semantically invalid until repaired;
2. **≤30 s** first-shard-start → merged authoritative result is strong evidence that the bootstrap premise change revives shared-hosted two-way coverage for the 35 s program;
3. **30–35 s** is timing-positive but still requires repeated comparable runs before production promotion because shared-runner p90 margin remains narrow;
4. **>35 s** closes shared-hosted coverage sharding negative again under the new bootstrap premise;
5. do not move production coverage topology from one rehearsal sample alone.

The rehearsal lives temporarily in `ci-testability-topology-audit.yml` so changing that evidence-only workflow triggers its own measurement. Remove the temporary shard jobs after the decision is recorded.

**First D2c result — run 36105650628:** semantically green. Both shard populations passed and the native merged report passed the unchanged production coverage thresholds. Worker useful coverage ran ~17 s; coordinator useful coverage ~11 s; coordinator waited ~4 s for the worker and merged/enforced thresholds in ~2 s. First shard runner start **07:02:21** → merged authoritative threshold result **07:02:49** = about **28 s**. This clears the preregistered strong-revival threshold for one sample. Require at least one comparable confirmation before production promotion because the old D2 failure mode was shared-runner tail variance.

**Confirmation D2c result — run 36105868439:** semantically green again, but the old tail problem returned. Worker coverage ran ~19 s useful and coordinator coverage ~17 s; both paid ~11–12 s of checkout/runtime-data/dependency/setup before coverage. First shard runner start **07:05:00** → merged authoritative thresholds **07:05:36** = about **36 s**. That exceeds the preregistered hard threshold.

**Decision: D2c closes negative again on standard shared-hosted runners.** The cache-first setup fix materially improved one sample (28 s versus the old 38 s), but did not create reliable ≤35 s margin. Do not tune shard membership or repeat shared-hosted coverage sharding under the same cache/runtime-data topology. The temporary shard jobs, threshold seam, and 146-file rehearsal profile are removed. Next coverage work returns to same-proof-cheaper testability or a materially different compute/bootstrap premise.


## F1: independent Firestore boundary rehearsal

Current full-impact deep evidence from run **36104516509** shows:

- covered ordinary Vitest: ~**29 s**;
- Firebase CLI cache restore: ~**3 s**;
- Firestore emulator cache restore: ~**3 s**;
- deadlock soundness proofs: ~**7.0 s wall**;
- Firestore boundary execution: ~**13 s wall**.

The Firestore boundary does not consume canonical runtime data. Its test uses a synthetic level plus production persistence/domain modules and the Firebase emulator. Keeping it serialized behind coverage therefore couples two semantically independent obligations.

A temporary `firestore-boundary-independent` topology job now rehearses the boundary on its own shared runner with:

- source-only checkout;
- exact warm `node_modules` restore before cache-free setup-node;
- exact Firebase CLI and emulator caches;
- Java from the hosted tool cache;
- the unchanged production `test:firestore-level-fingerprint-boundary` command.

Preregistered interpretation:

1. semantic failure rejects the topology;
2. independent runner wall **≤30 s** makes Firestore a strong candidate for its own impact-selected lane;
3. **30–35 s** needs repeated evidence before promotion;
4. **>35 s** means a separate shared-hosted Firestore lane cannot by itself satisfy the hard target;
5. if promoted, remove Firestore setup from the coverage/proof runner entirely and preserve independent final-status ownership/fail-safe routing.

This experiment is complementary to D2c. If two-way coverage and independent Firestore both fit comfortably under 35 s, the deep architecture can stop serializing unrelated obligations.

**First independent Firestore result — run 36105650628:** the unchanged Firebase-CLI boundary was green. Job start **07:02:22** → boundary step complete **07:02:44** = about **22 s authoritative wall** (job cleanup completed immediately afterward). This is comfortably inside the ≤30 s strong-candidate threshold and proves Firestore does not need to sit behind coverage or runtime-data materialization.

**Confirmation — run 36105868439:** green again. Job start **07:04:58** → unchanged boundary complete **07:05:16** = about **18 s authoritative wall**, with job cleanup complete at ~19 s. Two independent samples now place this lane comfortably below 30 s.

**Decision: independent Firestore is ready for production packing**, subject to preserving the existing proof+Firestore concurrency semantics and final-status/fail-safe ownership. It no longer belongs serialized behind covered Vitest.

The sibling direct-JAR experiment was also semantically green but slower: start **07:02:22** → boundary complete **07:02:47** ≈ **25 s**, versus ≈22 s through Firebase Tools. Avoiding the 42 MB CLI cache did not offset the direct emulator startup/readiness cost. **Close direct-JAR launch negative** and retain the maintained Firebase Tools path.


A second benchmark-only lane, `firestore-boundary-direct-jar`, tests whether Firebase Tools is unnecessary on the hot path. Firebase Tools 15.28.2 launches the cached Firestore 1.22.0 emulator as Java with `--host`, `--port`, `--rules`, and `--project_id`; the repo's boundary needs only Firestore. The direct-JAR rehearsal therefore restores only the emulator cache, starts the **same cached JAR** with `firestore.rules` and the same demo project, exports `FIRESTORE_EMULATOR_HOST`, and runs the unchanged boundary test.

Interpret direct-JAR evidence conservatively:

- it must pass the unchanged production repository/emulator boundary test;
- compare against the sibling Firebase-CLI independent lane from the same evidence window;
- only promote if the semantic result is green and removing the 42 MB Firebase CLI cache materially reduces wall/startup time;
- retain Firebase Tools for developer/general emulator workflows if it remains useful; this experiment concerns CI launch topology only.

## Production deep packing activation

The independent-service evidence is now promoted into production packing:

- `deep-verification` owns **covered ordinary Vitest only** and retains canonical runtime-data materialization because coverage needs it.
- `deep-services` owns **deadlock soundness proofs + Firestore boundary**. It uses source-only checkout, no canonical runtime-data restore, and runs proofs/Firestore concurrently when both are selected.
- the local canonical planner now emits `deep_services_job_required` in addition to the coverage-lane `deep_job_required`;
- the scoped rehearsal and execution-plan/final-status contracts contain the same three execution lanes as production.

Why this topology, specifically:

- independent Firestore was green at ~22 s and ~18 s authoritative wall in runs 36105650628 and 36105868439;
- proofs are already a short soundness obligation and pair naturally with Firestore on the service lane;
- D2c two-way coverage sharding was **not** promoted: it produced one ~28 s success but a ~36 s confirmation, reproducing the shared-runner tail problem and failing the preregistered threshold;
- therefore the evidence supports removing unrelated services from behind coverage, not splitting coverage across more shared runners.

The old combined deep lane remains historical evidence only. Exact-head production CI must now prove the three-lane packing is semantically green and establish its wall-clock effect before this activation is called settled.

## Coverage testability pass — diversification integration owner

Full-impact run 36106449568 measured coverage at **26.33 s useful wall** and about **38 s runner-start → coverage completion**. The two largest files were:

- `modules/solver/repair-search.test.ts`: ~7.8 s;
- `modules/solver/diversification.test.ts`: ~7.3 s.

The diversification audit found repeated real-solver work being used for session bookkeeping assertions. The file now preserves **one** real portal/full-session integration owner proving that production search actually traverses diversification phases, discovers referee-valid unique hints, emits progress, and completes. Deduplication, work-budget resumability, max-hints, cancellation, and admissible-order provenance now use a three-cell synthetic level plus a deterministic solver stub.

This follows the testing doctrine already stated in `docs/testing.md`: stub search when the assertion is scheduling/routing/budget/provenance behavior rather than search capability. Do not count this as a speed win until exact-head coverage timings show the file and total lane actually fall.

Repair-search audit found two different budget classes and they must not be conflated:

- enabled prototype determinism tests may need enough work to reach their actual mechanism (plateau/relink/turn mechanisms are stagnation-triggered at 6,000 restarts; beam seeding has its own 3,000-node prepass), so their 250k budget is not being cut without activation evidence;
- explicit-`false` vs omitted-default equivalence tests cannot exercise the disabled mechanism by definition. Their 125k-node budget added no feature coverage, only repeated the same inert trajectory farther. Those tests now use **10k nodes**, still requiring equal nonzero canonical work in both arms.

This is a same-proof-cheaper-work reduction, not an effectiveness/cadence change. Measure the file and coverage lane before considering enabled-path reductions.

## Current forward work order

1. **Validate the three-lane production packing:** require green exact-head full-impact evidence for Fast Gate, coverage-only deep-verification, and deep-services; record first-runner→last-required completion and each lane wall.
2. **Validate the implemented solver→research narrowing:** fault injection, historical #1722-equivalent route oracle, and solver-scoped timing must pass before calling the 59-consumer explicit routing settled.
3. **Refresh the selected-population timing census:** regenerate Node/CLI timings after routing/cadence removals and rank by selected critical-path burden, not the obsolete universal population.
4. **Fresh covered-Vitest census:** use the existing slow-test reporter and pursue same-proof-cheaper-fixture/work-budget/setup wins.
5. **Proof witness audit:** both R02560 arms are now characterization-only; inspect the two exhaustive deadlock roots for equivalent cheaper proof machinery or smaller exhaustive fixtures without weakening soundness.
6. **Firestore setup audit:** separate emulator/bootstrap from test execution and remove duplicated initialization if measurable.
7. **Validate warm bootstrap topology:** measure setup-node and first-validation start after the cache-first dependency-tree change; keep only if warm-path wall improves without harming cold fallback. Then audit remaining serial restores/discovery.
8. **Reserved/larger runner rehearsal:** apply the already-proven Node/coverage partitions on at least 16 logical CPUs and re-test deep internal overlap with the larger CPU budget if the still-justified full contract requires it.
9. **Bounded p50/p90 window:** declare success only from comparable full-impact runs meeting the stop conditions below.

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
