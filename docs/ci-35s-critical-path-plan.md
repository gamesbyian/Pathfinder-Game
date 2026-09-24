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
| A1b fast runtime-data cache-miss recovery | **investigation in progress (#2058)** | Hint-tree invalidation exposed a **52–56 s** fast-gate miss path. In-place sparse expansion and second checkout in the same worktree are rejected; #2058 is probing an isolated runtime-data checkout/copy and will remove forced-miss instrumentation before merge. |
| B1 lifecycle deterministic dispatch | **merged / measured green** | #2044: `orchestration-work-budget.test.ts` **~8.2 s → 195 ms**; covered-suite wall **~29.5 s → 26.48 s**; all test slots preserved. |
| A3 main-seeded ESLint cache | **merged / measured green** | #2054 main-push seeded the default-branch generation after a 15 s cold lint; unrelated #2059 restored that generation and lint fell to **1 s** (from 16 s cold on #2054). |
| A4 250k solver canary | **merged / measured green** | #2056: original exact 9-level fixture set retained; repaired-stack PR run solved **9/9 in 1.7 s / 1,303,532 nodes** at 250k with no work-budget mismatch. |
| A2 exact Node 22.23.2 | **full-contract rehearsal green; implementation next** | #2057 run 35961318833 passed planner, validators, lint, all Node/CLI, 250k canary, build, coverage, deep proofs, and Firestore under exact Node 22.23.2. setup-node was ~1–3 s. Production migration must re-key/reseed Firebase CLI from node20→node22. |
| C exact dependency-tree restore | planned | Hosted restore **3 s** vs `npm ci` **8 s**; promotion requires OS + arch + exact Node/npm generation + lockfile keying and complete restored-tree validation. |
| A5 remove planner dependency edge | planned | Fast gate consumes no planner outputs; deep can compute the canonical plan locally, fail safe to full deep, and exit before dependency setup when not selected. |

### A1c. Publish runtime-data cache from diagnostics hint refresh

The diagnostics workflow can change `data/hints` and push a `[skip ci]` commit. That changes the exact runtime-data Git-object key **without running main-push CI**, so the next PR can encounter a cold runtime-data generation even though the change originated on the default branch.

Implementation in progress:

1. after diagnostics commits/pushes its hint/audit refresh, derive the runtime-data key from the final local `HEAD` (after any retry/rebase);
2. check whether that exact key is already cached;
3. if not, save the canonical runtime-data tree from the default-branch workflow;
4. later PRs can then restore the new exact generation instead of materializing the ~190 MB hint/data tree.

This does not replace a correct PR miss fallback, but it should make diagnostics-driven misses rare. It also aligns cache authority with the producer that invalidates the cache generation.

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
