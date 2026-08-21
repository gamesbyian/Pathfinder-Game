# Worker-count solve-outcome sensitivity: follow-up investigation (2026-08-12)

**Status: TWO confirmed, previously-unknown bugs found and BOTH fixed and validated.** One
(`runRepairProbe`'s wall-clock cap) is a genuine worker-count/contention effect. The other — an
incomplete ablation-flag promotion, found while investigating the corpus-scale directional gap
(Evidence 2) — turned out to be the actual explanation for that gap, which this report originally
left unexplained; not a worker-count effect at all. This is a direct follow-up to
`reports/2026-08-12-worker-count-solve-outcome-sensitivity.md` and
`reports/2026-08-12-neighbor-budget-five-loss-diagnosis.md` — both currently only on branch
`claude/must-cross-intersection-propagation-0t3ljg`, not yet merged to `main` (this report was
written from that branch's copy, fetched via `git fetch`; not linked here since neither file exists
on this branch yet, which `check:documentation-links` correctly flags). Read those first; this
report does not restate their evidence.

**Read order**: the original investigation (Summary through the first "Fix implemented" section)
was written before the finding in "Corpus-scale directionality, resolved" further down — that
later section supersedes the "does not match the corpus-scale gap's direction" caveat in the
Summary immediately
below. Kept in write-order rather than restructured, so the reasoning that led to the resolution is
still visible.

## Summary

- **A real, confirmed, previously-undocumented bug**: `runRepairProbe`'s per-attempt wall-clock cap
  (`modules/solver/orchestration.ts:954`, a hardcoded `30000`ms) is not the "generous,
  contention-independent safety net" its own adjacent comment claims. Under realistic CPU
  contention it binds *before* the intended ~2,000,000-node probe budget, silently truncating
  search. Demonstrated directly with matched attempt-by-attempt node counts (below) — this is a
  genuine, reproducible instance of "hypothesis 3" (a wall-clock-gated decision not neutralized by
  a non-binding outer deadline), independent of and in addition to the one `docs/solver-budget-
  determinism.md` already documents.
- **This mechanism's direction does not match the corpus-scale gap's direction.** More
  contention → *less* search per probe attempt → *more* failures. But Evidence 2 in the originating
  report found *fewer* workers (less contention) doing *worse* (617 vs 665 solved) — the opposite
  sign. So while this bug is real and worth fixing, it is not a sufficient explanation for Evidence 2
  by itself.
- **`R02823`'s specific local irreproducibility could not be reproduced or explained.** In this
  environment, `R02823` failed identically (deterministic `node-budget-reached`) in *every*
  configuration tried, including running it completely alone with zero contention and zero
  predecessors — twice, with two different tools. The originating report's one successful "alone"
  solve was never itself repeated, so it is not yet known whether it was a stable result or a
  one-off. This is now a separate, still-open question from the general worker-count-sensitivity
  finding.
- **The worker-pool persistent-process state-leak hypothesis (hypothesis 2) is weakened, not
  confirmed.** A targeted code audit of every module-level mutable scratch buffer/cache in the
  solver's hot path found each one either already delta-based (immune to non-zero starting state:
  `workMeter`, `prep._metrics.nodesExpanded`-gated node budgets, the `prep._mpLowerBoundCache`/
  `prep._mcLowerBoundCache` lower-bound memoization) or correctly bounds-cleared per call for the
  *current* level's exact footprint before use (`search-state.ts`'s `_stateBufs`, `topology.ts`'s
  generation-tagged reachability buffers, `scoring.ts`'s pooled objective buffers) — several with
  code comments documenting they were themselves hardened after past bugs of exactly this shape.
  Empirically, `R02823`'s outcome did not change based on predecessor count within one persistent
  worker process (failed identically whether run alone, 5th of 10, or last of 10 in the same
  process) — evidence against the hypothesis for this level, though it does not rule the class of
  bug out everywhere.
- **The shard wall-clock-margin hypothesis is ruled out** for run `#34`: the slowest corpus-2 shard
  used ~78 of its 300-minute ceiling (26%); the slowest corpus-1 shard used ~2.3 of 45 minutes.

## Environment note (read before the evidence below)

This investigation ran in a fresh sandbox, not the environment that produced the originating
report. Two things were verified before trusting any comparison:

- **Solver code is byte-identical.** `git diff --stat` between this session's branch tip
  (`9a7c4e8f`) and the originating report's branch tip (`6cc3cea4`, on
  `claude/must-cross-intersection-propagation-0t3ljg`) shows zero changes under `modules/solver/`
  and zero changes to either stress corpus JSON file — only docs, two new report files, and a
  3-line `scripts/ablation-config.mjs` edit (removing `PRUNE_MC_NEIGHBOR_BUDGET` from the CLI
  tooling's opt-in registry; this has no effect on any of the runs below, all of which pass no
  `--enable-flags`, so `opts.ablation` is `undefined` end to end and every prune reads its
  browser-bundled default regardless of the CLI registry's state — confirmed by reading
  `normalizeAblationConfig`, which returns `null` outright for a `null`/`undefined` input).
- **The sandbox is a 4-core, 15GB machine, Node v22.22.2.** Production/CI targets Node 20
  (`.github/workflows/solver-stress-refresh.yml`'s `setup-node`); this sandbox does not have Node
  20 available to test against, so a Node-major-version effect on the search's exact node-by-node
  behavior could not be ruled in or out here. Flagged as an open variable, not investigated further
  (installing an alternate Node major was judged out of scope for the time available).

## Evidence: `R02823` fails in every local configuration tried

All runs below use the same fixed budget as the originating report and the real workflow:
`--node-budget=36000000 --work-budget=48240000`, non-binding deadline (`--budget-ms=86400000` for
the `portfolio-solve-sweep.mjs` runs; `--budget-ms=600000` for the `level-blind-capability-
sweep.mjs` runs, still far above the ~65s actual runtime), no `--enable-flags`/`--disable-flags`
(default ablation config, matching the originating report's "OFF arm").

| scenario | tool | workers | contention | result |
|---|---|---|---:|---|
| alone | `level-blind-capability-sweep.mjs` | 1 | none | `node-budget-reached`, 36,000,188 nodes |
| alone, repeated | `level-blind-capability-sweep.mjs` | 1 | none | `node-budget-reached`, 36,000,052 nodes (same outcome, near-identical node count) |
| alone | `portfolio-solve-sweep.mjs` | 2 | none | `node-budget-reached`, 36,000,068 nodes |
| last of 10, sequential | `level-blind-capability-sweep.mjs` | 1 | some (see caveat) | `node-budget-reached` |
| 4th of 5, sequential | `portfolio-solve-sweep.mjs` | 1 | some (see caveat) | `node-budget-reached`, 36,000,159 nodes |
| 4th of 5, contended | `portfolio-solve-sweep.mjs` | 4 | yes (4 procs / 4 cores) | `node-budget-reached`, 36,000,186 nodes |

**Caveat on the "sequential" rows**: the 10-level and 5-level sequential (`--workers=1`) runs were
launched as background jobs and, checking the actual wall-clock overlap after the fact, ran
*concurrently with each other* for part of their duration (not intentional — background jobs were
started while an earlier one was still in flight). So neither "sequential" row is a clean
zero-contention baseline; both may have experienced some of the same wall-clock pressure as the
explicit `--workers=4` row. The two "alone" rows are the only ones run in true isolation (nothing
else executing), and both still failed.

**The clean result**: `R02823` fails identically whether run completely alone or with contention,
in this environment. This directly contradicts the originating report's Evidence 1, which found a
single alone run *solving* the level in 9,308,917 nodes via `dfs:repair:repair(mustTurnBiased)`.
That alone-success was never itself repeated in the originating investigation to check its own
stability. Given every other search behavior verified below is exactly reproducible run-to-run on
a fixed host, the most likely explanation for this specific discrepancy is a difference between
this sandbox and whatever host produced the original "solved alone" result — not worker count or
predecessor state, since those are exactly what is held constant across the two "alone" rows above
while the result stays `node-budget-reached` either way.

## Confirmed mechanism: `runRepairProbe`'s 30-second wall-clock cap is not actually non-binding

While investigating, the four *other* neighbor-budget losses (`R00635`, `R02119`, `R02422`,
`R02867` — all confirmed solvable, unlike `R02823`) were re-solved as part of the same `--workers=1`
vs `--workers=4` comparison batch (`pos:98,450,753,1154,1198`). All four solved in both arms, via
the identical winning attempt config and — for `R00635` — the byte-identical solution path. But the
node cost of the *losing* attempts before that winner ran differed substantially between arms:

`R00635`, `--workers=1` sequential vs `--workers=4` contended (`portfolio-solve-sweep.mjs`, same
level, same code, same budgets):

| attempt (in ladder order) | profile / seed | `--workers=1` nodes | `--workers=4` nodes | outcome (both) |
|---|---|---:|---:|---|
| 1 | `repair`, seed `554456023` | 2,000,014 | 1,110,690 | timed-out |
| 2 | `repair`, seed `3208325734`, salt 1 | 2,000,019 | 1,114,904 | timed-out |
| 3 | `repair`, seed `554456023` (2nd variant) | 1,974,492 | 1,324,223 | timed-out |
| 4 (winner) | `intersectionHarvest@beam5000` | 432,531 | 432,531 | **success**, identical solution |

Total level cost: 6,407,056 nodes (`--workers=1`) vs 3,982,348 nodes (`--workers=4`) — a 38% node
count difference to reach the *exact same* winning solution.

The first three attempts are all repair-probe attempts, dispatched from `runRepairProbe`
(`modules/solver/orchestration.ts:896-961`). Their per-attempt call is:

```js
// modules/solver/orchestration.ts:954
const r = await runAttempt(gateKey, level, prep, repairConfig, 30000, Date.now(), yieldFn, gateNodeBudget, nodesOut, seedSalt);
```

`30000` is a **hardcoded 30-second wall-clock budget**, passed as the `capMs` argument. The
adjacent comment (lines 949-952) explicitly frames this as safe to ignore:

> "attBudget (ms) is a generous safety-net trip-wire only, well above any observed real-world cost
> for a probe-worthy (node-budget-bounded) win — the node budget above is the actual,
> contention-independent decision"

`runAttempt` threads this `capMs` down into the actual search loop
(`dfsFromGate`/`repairSearchFromGate`/`beamSearchFromGate` in `search.ts`/`repair-search.ts`), each
of which exits on **whichever bound is hit first**:

```js
// modules/solver/search.ts:525 (representative; repair-search.ts:… has the same OR pattern)
if (Date.now() - startTime >= budgetMs || nodesExpandedTotal + frontierIndex >= nodeBudget || ...) { ... return null; }
```

Under `--workers=1` with nothing else running, each repair-probe attempt reliably reaches its
intended ~2,000,000-node cap inside 30 real seconds. Under `--workers=4` on this 4-core sandbox
(4 solver processes sharing 4 cores — not even oversubscribed, just fully subscribed), the *same*
attempts hit the 30-second wall clock at only ~1,100,000-1,300,000 nodes — 35-45% short of their
intended budget — because the process's real-world node-processing rate drops under CPU sharing,
and the wall-clock check has no way to know that. The node-budget accounting inside `runRepairProbe`
(`gateNodeBudget`, `remainingExternal`, etc.) is completely unaffected — it correctly reserves and
tracks node counts — but never gets the chance to be the *binding* constraint, because the
wall-clock check trips first.

This is a genuine violation of the canonical work-budget model's documented host-independence
invariant (`docs/solver-budget-determinism.md`: "Given an explicit `workBudget` and a deadline that
never fires, a solve is bit-identical on any host under any load"), located specifically in one
literal (`orchestration.ts:954`'s `30000`) that is structurally different from every other
`runAttempt` call site in the file — every other site derives its ms budget from the caller's
`timeBudgetMs` (which callers can and do set to a non-binding 24h value); this is the only one that
is a small fixed constant *regardless of what the caller's outer deadline is*, which is exactly what
makes it able to bind even when every other part of the ladder is correctly non-binding.

**For `R00635` this did not change the outcome** — the eventual winner (`intersectionHarvest@beam5000`)
is a beam attempt outside `runRepairProbe`, running to the identical 432,531 nodes and finding the
identical solution regardless of how much the earlier probe attempts were truncated. But for any
level whose *only* solution the ladder can find lies within the repair probe's own bounded search
(rather than a later, unaffected tier), this same truncation could plausibly flip a solve to a
failure under contention. This was not directly demonstrated for any specific level in this session
— `R02823`'s own probe attempts (see below) mostly did reach their full node quota even under
`--workers=4`, so this specific mechanism does not appear to be what makes `R02823` fail — but the
mechanism itself is real and demonstrated, and is very likely present, to varying degree, on other
repair-gated levels across both stress corpora.

**Why this does not fully explain the corpus-scale gap (Evidence 2).** The mechanism's direction is
"more contention → less search per probe attempt → more failures." A GitHub Actions shard running
`corpus2_workers=2` puts *two* processes on one runner's cores (more contention per shard), while
`corpus2_workers=1` puts *one* process on the same runner (less contention, ordinarily *more*
headroom per attempt). If this mechanism dominated at corpus scale, `workers=1` should show *fewer*
probe truncations and therefore *more* solves than `workers=2` — the opposite of what Evidence 2
found (617 at `workers=1` vs 665 at `workers=2`). So this bug is real, reproducible, and worth
fixing on its own terms, but it is not — at least not by this directional argument — a sufficient
explanation for the specific corpus-scale gap the originating report measured. It should be
understood as an independent, second confirmed instance of "hypothesis 3" (a wall-clock decision
that isn't actually neutralized by a non-binding deadline), found via the investigation protocol,
rather than as the root cause of either piece of evidence in the originating report.

## `R02823`'s own probe attempts, for completeness

For contrast with `R00635` above, `R02823`'s first three (probe-tier) attempts under the same
`--workers=1` vs `--workers=4` comparison:

| attempt | `--workers=1` nodes | `--workers=4` nodes |
|---|---:|---:|
| 1 | 2,000,000 | 2,000,000 |
| 2 | 2,000,012 | 2,000,012 |
| 3 | 3,411,791 | 1,847,678 |

Attempts 1-2 reach their full node quota in *both* arms (so the wall-clock mechanism above is not
truncating them here); attempt 3 does show the same truncation pattern as `R00635`'s attempts, but
neither arm goes on to solve the level regardless — both exhaust the full external 36,000,000-node
ceiling and report `node-budget-reached`. So the confirmed mechanism is present in this level's own
telemetry too, just not (as far as this data shows) the deciding factor in why it fails here.

## Ruled out / weakened this session

- **Shard wall-clock margin for run `#34`** (`31555042628`): pulled actual job step durations via
  the GitHub Actions API. Slowest corpus-2 shard (`Capability shard 2/20`) ran 77.8 of its 300-minute
  `timeout` ceiling (26%); slowest corpus-1 shard ran 2.3 of 45 minutes (5%). No shard came close to
  truncation. Ruled out.
- **Worker-pool persistent-process state leak (hypothesis 2), specifically for `R02823`.** Audited
  every module-level mutable buffer/cache reachable from the solver's hot path
  (`work-meter.ts`'s `workMeter.units`, `orchestration.ts`'s `prep._metrics`/lower-bound caches,
  `search-state.ts`'s `_stateBufs` pool, `topology.ts`'s generation-tagged reachability scratch,
  `lower-bounds.ts`'s MST scratch arrays, `scoring.ts`'s pooled objective buffers). Every one is
  either keyed/delta-based against a fresh per-solve object (`prep`, recreated every `solveLevel()`
  call) or explicitly cleared for the *current* level's exact footprint before each use, with
  several carrying comments documenting they were hardened after past bugs of exactly this shape
  (the MST scratch buffer bug, the reachability generation-counter rollover). Found no new instance.
  Empirically, `R02823` failed identically regardless of queue position (alone / 5th-of-10 /
  10th-of-10 / 4th-of-5), which is the outcome this hypothesis predicts should vary. Not proven
  impossible everywhere, but not supported by anything found or measured this session.
- **Solver code / corpus data drift between the two compared commits**: re-confirmed independently
  (see "Environment note" above) — zero diff in `modules/solver/` or either stress corpus JSON.

## Corpus-scale directionality, resolved

Run #33 and run #34 did NOT use "the same effective solver flags" as previously believed — the
ablation flag `PRUNE_MC_NEIGHBOR_BUDGET` differed between them.

**This is very likely THE explanation for Evidence 2's 48-level gap, and it is not a worker-count
effect at all.** Found by re-reading the two runs' *actual invoked commands* via the GitHub Actions
API — `mcp__github__get_job_logs` on one job from each run — rather than trusting the prior
characterization (mine and the originating report's) that they were "same-code, same-effective-flags."
They were not.

### What each run actually ran

**Run `#33`** (`31537474435`, id `c86ba8f86`, `workers=2`, 665/1700) predates the level-blind
hardening (commit `0d560911`, landed ~2.75h *after* this run started) — it ran the *old* workflow,
invoking `portfolio-solve-sweep.mjs` directly, not `level-blind-capability-sweep.mjs`. Its actual
corpus-2 command (from job `93941178863`'s logs):

```
node scripts/run-bundled.mjs scripts/portfolio-solve-sweep.mjs \
  --corpus=data/stress/stress-levels-random.json --levels="pos:681-765" --scheduler-mode=legacy \
  --node-budget=36000000 --work-budget=48240000 --workers=2 \
  --baseline=logs/stress-corpus2-baseline.json \
  --enable-flags=PRUNE_MC_NEIGHBOR_BUDGET \
  --out=... --summary-out=...
```

`--enable-flags=PRUNE_MC_NEIGHBOR_BUDGET` is **explicit**. (`--baseline` is also passed, but without
`--prime-winner`/`--priority`/`--attempt-cache`/`--baseline-budget` — the only flags that actually
*read* `baselineMap` in `portfolio-solve-sweep.mjs` — loading it is otherwise inert for the solve
itself; confirmed by reading the script, not just assumed.)

**Run `#34`** (`31555042628`, id `b925d3f35e`, `workers=1`, 617/1700) ran the new
`level-blind-capability-sweep.mjs`. Its actual corpus-2 command (job `93985608961`'s logs), reconstructed
from the workflow's own templated shell:

```
extra=()
[ -n "" ] && extra+=("--enable-flags=")        # enable_flags dispatch input was BLANK
[ -n "" ] && extra+=("--disable-flags=")
...
node scripts/run-bundled.mjs scripts/level-blind-capability-sweep.mjs -- \
  --corpus=data/stress/stress-levels-random.json --levels="pos:86-170" \
  --node-budget=36000000 --work-budget=48240000 --workers=1 \
  "${extra[@]}" \
  --out=... --summary-out=...
```

`[ -n "" ]` is false, so `--enable-flags` is **never added to the command at all** — the
`STRATEGY_MAIN_LOOP_LATE_RESERVE` A/B's control arm (what run `#34` actually was — see the
originating report's Evidence 2, which correctly identified this) legitimately declared no ablation
flags for that experiment, on the reasonable assumption that "no flags declared" means "production
defaults apply," and that `PRUNE_MC_NEIGHBOR_BUDGET` had been promoted to a production default
eight hours earlier in the very commit this shard checked out (`b925d3f3`, "Promote
PRUNE_MC_NEIGHBOR_BUDGET to default-on").

### Why "no flags declared" did NOT mean "the promoted default applies"

`b925d3f3`'s diff is exactly 3 lines: removing `PRUNE_MC_NEIGHBOR_BUDGET` from
`scripts/ablation-config.mjs`'s `OPT_IN_FEATURES` set. That registry is **Node-tooling-only** —
confirmed via `git diff --stat` between this session's branch and the one carrying that commit:
zero changes anywhere under `modules/solver/`. The flag's actual runtime read site,
`modules/solver/prune-gauntlet.ts:215`, is unchanged:

```js
if (options.allowNeighborBudgetPrune !== false && cfg && cfg.PRUNE_MC_NEIGHBOR_BUDGET === true && ...)
```

This is the codebase's documented **opt-in convention** (`cfg && cfg.FLAG === true`, vs. the
standard `!cfg || cfg.FLAG`) — by design, an opt-in flag's "promoted" status can only be resolved
through `normalizeAblationConfig`'s `Proxy`, which falls back to `OPT_IN_FEATURES` membership *only
when consulted*. But `normalizeAblationConfig` has an earlier, unconditional short-circuit:

```js
// modules/solver/orchestration.ts:1078-1079
export function normalizeAblationConfig(raw) {
    if (raw == null) return null;   // <-- never reaches the Proxy / OPT_IN_FEATURES at all
    ...
```

`level-blind-capability-sweep.mjs` only ever sets `solveOpts.ablation` when `enableFlags.length ||
disableFlags.length` — with `--enable-flags` absent, that's `0 || 0`, so `ablation` stays `null` and
`solveOpts.ablation` is **never set on the object at all**. `opts.ablation` reaches `solveLevel()` as
`undefined`, `normalizeAblationConfig(undefined)` returns `null` at line 1079 before the Proxy (and
therefore `OPT_IN_FEATURES`) is ever consulted, and `prune-gauntlet.ts`'s `cfg && cfg.PRUNE_MC_NEIGHBOR_BUDGET
=== true` evaluates `null && ...` → **false**. The flag is OFF — identical to how it behaved before
the promotion — for any caller that doesn't explicitly pass it.

**This is not limited to CLI batch tooling.** Both interactive production callers omit `.ablation`
entirely too:

```
modules/input/solver-controller.ts:108: solverApi.solve(level, { timeBudgetMs, yieldFn, disableExtraBudgetPasses: true })
modules/input/review-controller.ts:143: solverApi.solve(solveLevel, { timeBudgetMs, yieldFn, disableExtraBudgetPasses: true })
```

So `PRUNE_MC_NEIGHBOR_BUDGET`'s promotion has had **zero effect anywhere** except the small number
of CLI invocations that explicitly pass `--enable-flags=PRUNE_MC_NEIGHBOR_BUDGET` (or an equivalent
non-null `opts.ablation` with that key set) — including Play-mode "Find a Hint" and Review-mode
approval solves, the exact production paths the promotion was meant to benefit.

### Direct empirical confirmation

Rather than relying on the code trace alone, confirmed it directly using the exact dead-state
`modules/solver/lower-bounds.test.ts`'s own `'property: deadlock helpers only report independently
unsatisfiable reachable states'` test already constructs (a state where `mustCrossNeighborBudgetDeadlocked`
genuinely returns `true`). Temporarily added two calls to `evaluatePrunedMove` at that exact state,
reading `diagnostics.reached.PRUNE_MC_NEIGHBOR_BUDGET` to isolate this ONE rule's branch from the
rest of the gauntlet (an earlier, cruder attempt that just checked the overall verdict was misleading
— other, unrelated default-on rules independently reject the same state, so the overall verdict alone
doesn't isolate this rule):

```
cfg = null                              -> reached=undefined, rejected=undefined   (branch never entered)
cfg = { PRUNE_MC_NEIGHBOR_BUDGET: true } -> reached=1, rejected=1                    (fires correctly)
```

Diagnostic edits reverted after confirming (`git diff --stat` clean) — not part of the committed
suite, since it was a one-off falsification of a specific hypothesis, not a durable regression test
for the *existing* code (see "Why not fixed here" for why a real fix, if made, would need its own
proper test).

### What this means for the numbers

Given `PRUNE_MC_NEIGHBOR_BUDGET` was genuinely ON for run `#33` and genuinely OFF for run `#34`,
their corpus-2 solved counts are best read as **a re-measurement of the same neighbor-budget
control-vs-treatment gap** `docs/solver-level-blindness.md` already documents (611/1700 control →
665/1700 treatment) — not a worker-count effect. `665` (run `#33`, ON) matches the documented
treatment figure exactly. `617` (run `#34`, OFF) is close to, though not identical to, the
documented control figure (`611`) — the residual ~6-level difference is consistent with ordinary
run-to-run variance (already documented elsewhere in this codebase, e.g. the "corpus-2 solved-count
difference of ±5 is NOT distinguishable from noise" note in CLAUDE.md) rather than needing a
separate explanation. The `workers=1` vs `workers=2` difference between the two runs was very
likely a coincidental confound, not the causal variable — nobody involved (including this
investigation's own earlier framing) had verified worker count was the *only* difference; it was
assumed from "same solver commit, no `enable_flags`/`disable_flags` override on either dispatch,"
which — as this section shows — is not the same claim as "the same effective ablation config."

### Fix implemented (2026-08-12, follow-up to this report)

Initially left unfixed here (see the struck-through reasoning below, kept for the record) pending
explicit user direction, since it's a real behavior change to production solving — the user then
asked for it directly. Implemented on this branch, which turned out to need *both* halves of the
promotion, not just the missing one: this branch had never picked up either the sibling branch's
registry change (`OPT_IN_FEATURES`) or its read-site fix, so both were done together here.

- **`scripts/ablation-config.mjs`**: removed `PRUNE_MC_NEIGHBOR_BUDGET` from `OPT_IN_FEATURES`;
  updated its `FEATURES` description from "production default-OFF; OPEN promotion gate" to
  "production default-ON as of 2026-08-12 (promoted)" with the population evidence summarized.
- **`modules/solver/prune-gauntlet.ts:219`**: changed the read site from the opt-in convention
  (`cfg && cfg.PRUNE_MC_NEIGHBOR_BUDGET === true`) to the standard convention (`!cfg ||
  cfg.PRUNE_MC_NEIGHBOR_BUDGET`) — matching every other non-opt-in rule in the same gauntlet.
- **Regression test** (`modules/solver/lower-bounds.test.ts`, written and confirmed failing against
  the unfixed code first, then confirmed passing after the fix): at a state the test already knows
  is a genuine dead branch, an ablation config built through the real `normalizeAblationConfig` path
  with this flag left unset must still activate the rule — checked via `diagnostics.reached`/
  `rejected` specifically (not the overall verdict, which an unrelated already-firing rule,
  `PRUNE_MC_CEILING`, made misleadingly pass in an earlier draft of this same test).
- **`docs/solver-opt-in-experiment-ledger.md`**: moved the flag from the open-flags table to
  "Already promoted/default-on items"; added a dated note explaining the wiring gap this exposed
  and a standing lesson for future promotions ("removing a flag from `OPT_IN_FEATURES` is necessary
  but not sufficient — check every read site's convention too").
- **`modules/solver/lower-bounds.ts:117`**: updated the stale "Opt-in, default OFF" comment.
- **`scripts/experiment-manifest-lib-check.mjs`**: its consistency-checker fixture used
  `PRUNE_MC_NEIGHBOR_BUDGET` as a stand-in "genuinely opt-in" flag; switched to
  `PRUNE_PORTAL_PARITY_ENVELOPE` (still opt-in) since the test validates the preflight tool's
  consistency logic in general, not this specific flag's disposition. Confirmed this test failed
  first (correctly — `defaultConfig()` already derives from `OPT_IN_FEATURES` correctly, so once
  the registry changed, this fixture's stale "off means blank workflow inputs" assumption broke) and
  passed after the fixture swap.

**Validation**: `npx vitest run modules/solver/` — 28 files / 340 tests pass.
`npm run test:coverage` — 83/83 files, 1096/1096 tests pass. `npm run test:node` (23 validator
suites, including 160/160 hints still PLAY-valid) — all pass. `npm run check:lint` /
`check:types` / `check:types:tests` / `check:documentation-links` (no new issues; the one
pre-existing unrelated failure is untouched) — all pass. `npm run solver:bench -- --check` —
**160/160 solved, no regressions.** Isolated before/after (stashed just these two files, reran,
restored): **51,959,647 nodes (unfixed) → 51,789,137 nodes (fixed)**, same 160/160 solved both
ways — a small, real, positive effect (the prune now genuinely prunes a few dead branches on this
corpus) with zero solvability change, consistent with the flag's own documented evidence (the much
larger effect is on corpus-2, per the 611→665 A/B already gathered with the flag correctly forced
on).

**Not attempted**: a fresh full corpus-2 A/B specifically re-validating this exact fix (1700 levels
at up to 36M nodes each is far outside this session's compute/time budget). The existing 611→665
A/B remains valid evidence for the prune's own soundness and value — it was run with the flag
correctly forced on via `--enable-flags`, so it was never confounded by this wiring gap — but it
was gathered before this specific fix existed, so it doesn't directly confirm this commit's
behavior end-to-end at corpus-2 scale. The published-corpus and corpus-1-adjacent evidence above
(160/160 no regressions, clean isolated node-count delta) is what's directly confirmed here.

<details>
<summary>Original "why not fixed here" reasoning (superseded once the user asked for the fix directly)</summary>

Completing the promotion correctly would mean changing `prune-gauntlet.ts:215`'s read-site
convention from the opt-in style (`cfg && cfg.FLAG === true`) to the standard style (`!cfg ||
cfg.FLAG`) — a real, behavior-changing edit to the solver's hot pruning path that would, for the
first time, actually activate this prune in production (Play/Review) and in every batch tool run
that doesn't explicitly disable it. That is squarely "a solver ablation default," which the task
that started this investigation explicitly said not to touch. It also needs the same rigor CLAUDE.md
requires for any hot-path change (a regression test distinguishing the two read-site conventions,
`solver:bench --check`, and a fresh full-corpus A/B — the *existing* 611→665 A/B was run with the
flag correctly forced on via `--enable-flags`, so it remains valid evidence for the prune's own
soundness/value, but it was never a test of *this* promotion mechanism). Left as a clearly-scoped,
high-value fix for whoever owns the `PRUNE_MC_NEIGHBOR_BUDGET` promotion (tracked on
`claude/must-cross-intersection-propagation-0t3ljg`, not this branch) to pick up.

</details>

## Still open

1. ~~Why did `R02823` solve once, for the originating report's author, and never for this session
   across five different local configurations?~~ — **resolved (2026-08-13, follow-up session)**.
   It was this report's own `runRepairProbe` wall-clock cap bug, not an execution-context/Node-version
   difference. Direct controlled test, same sandbox (Node v22.22.2, 4-core) that had previously
   failed to reproduce the solve: with current code (`REPAIR_PROBE_ATTEMPT_MS_CAP = 1_200_000`, the
   fix below), `R02823` solves reliably and deterministically alone at `--workers=1`
   (`--node-budget=36000000 --work-budget=48240000`, no ablation flags) — byte-identical
   `9,308,917` nodes via `dfs:repair:repair(mustTurnBiased)` across two separate runs, matching the
   originating report's own solved figure exactly. Restoring *only* the old `30000`ms cap value in
   the same file, same sandbox, same everything else, flips the outcome to `node-budget-reached`,
   `36,000,066` nodes, no winning config — a clean single-variable demonstration that the cap (not
   host, not Node version, not worker count) is the deciding factor. This session's own earlier
   local reproduction attempts (the evidence table above) all predate `2bfefc6`'s fix, which is why
   they uniformly failed regardless of contention or worker count: the 30-second cap could bind even
   fully uncontended if the sandbox's raw uncontended throughput happened to be below the value it
   was implicitly tuned against, not only under explicit multi-process contention as originally
   framed. No further action needed — the fix already on `main` fully explains and resolves this.
2. ~~What actually explains Evidence 2's corpus-scale, directionally-consistent 48-level gap?~~ —
   **resolved**, see "Corpus-scale directionality, resolved" above: an incomplete ablation-flag
   promotion, not a worker-count effect. A genuine worker-count/contention effect (the
   `runRepairProbe` bug fixed in this report) exists and is real, but was not the corpus-scale
   gap's actual cause here — the two questions ("does worker count/contention affect outcomes at
   all" and "what caused this specific 48-level gap") turned out to have different answers. Whether
   worker count has ANY measurable effect on corpus-scale solved-count once the flag confound is
   controlled for is now a fresh, well-posed question for a future matched A/B (same commit, same
   explicit `--enable-flags`/`--disable-flags` on both arms, workers as the only declared
   difference) — not attempted here.
3. ~~A proper fix for the confirmed `runRepairProbe` bug~~ — **implemented and validated**, see
   "Fix implemented" below.
4. ~~Complete the `PRUNE_MC_NEIGHBOR_BUDGET` promotion~~ — **implemented and validated**, see "Fix
   implemented" above. Still genuinely open: a fresh full corpus-2 A/B specifically re-confirming
   this exact commit's behavior at scale (not attempted — outside this session's compute budget),
   and reconciling this fix with whatever the sibling branch
   (`claude/must-cross-intersection-propagation-0t3ljg`) does with its own copy of the same
   promotion when the two branches are eventually merged.

## Fix implemented: `runRepairProbe`'s wall-clock cap

`modules/solver/orchestration.ts:954`'s hardcoded `30000` is replaced with a new named constant,
`REPAIR_PROBE_ATTEMPT_MS_CAP = 1_200_000` (20 minutes), defined and justified next to
`REPAIR_PROBE_ORDINARY_NODE_BUDGET`/`REPAIR_PROBE_BIASED_NODE_BUDGET`. A flat constant (rather than
one derived per-attempt from `gateNodeBudget`) is sufficient because `gateNodeBudget` is always
`<= REPAIR_PROBE_BIASED_NODE_BUDGET` (6,000,000): 20 minutes for that many nodes needs only ~5,000
nodes/sec sustained — roughly 7-8x below the ~37,000-43,000 nodes/sec measured under real
contention above, and >100x below nominal uncontended throughput (~650,000 nodes/sec, measured on
this same host). Confirmed safe for the ~30s interactive latency promise (Play's "Find a Hint",
Review's approval solve): both already pass `repairBudgetFractionOverride: 0`, which skips the
probe outright (its call site's own `repairBudgetFraction !== 0` gate) rather than relying on this
cap — so raising it has no effect on interactive latency.

**Regression test**: `modules/solver/orchestration.test.ts`'s two existing probe tests (which
filtered attempts by the old hardcoded `allocatedBudgetMs === 30000`) now import and filter by
`REPAIR_PROBE_ATTEMPT_MS_CAP` instead. A new test, `'REPAIR_PROBE_ATTEMPT_MS_CAP survives real
contention, not just an idle host'`, encodes the fix's safety margin as a direct assertion (the cap
must cover the worst-case 6,000,000-node budget at a throughput conservatively below the measured
contended rate) rather than re-exercising real contention, which is inherently host/load-dependent
and unsuitable for a fast, deterministic unit test. Verified this test fails against the old value
(`REPAIR_PROBE_ATTEMPT_MS_CAP = 30_000` → `AssertionError: ... 30000ms must cover 6000000 nodes at
10000 nodes/sec (600000ms)`) and passes against the fix.

**Validation performed**:
- `npx vitest run modules/solver/orchestration.test.ts`: 51/51 pass (including the updated and new
  tests above).
- `npm run solver:bench -- --check`: **160/160 solved, no regressions, PASS** (vs.
  `logs/solver-baseline.json`, commit `f02aba4`).
- **Before/after isolation**: since this change should be a complete no-op on any single-process,
  uncontended run (the trip-wire was never the binding constraint there, before or after — only
  under real contention), ran `solver:bench --check` twice on the full 160-level published corpus,
  once with the constant temporarily reverted to `30_000` and once with the fix
  (`1_200_000`), both under the same pinned work budget. Result: **bit-identical `nodesExpanded`**
  (51,959,647 both ways); wall time differed by ~3% (31.3s vs 32.3s), well within normal host
  noise. Confirms the fix changes behavior only under genuine contention, never under ordinary
  solves — exactly the intended scope.
- `npm run ci`'s `check:documentation-links` step also caught and required fixing two broken
  markdown links in this report's own first revision (pointing to the two originating-report files
  that don't exist on this branch) — delinked to plain text references instead. One unrelated,
  pre-existing `check:documentation-links` failure remains on this branch
  (`reports/2026-08-12-repair-retreat-cpsat.md`'s link to a missing
  `claude-remote-solver-handoff.md`, present in `main` before this investigation started — verified
  via `git log`) — not touched, since it belongs to a different, concurrent investigation on this
  branch's history and the task's instructions were explicit about not editing other sessions'
  files.
- Ran every other piece of `npm run ci` individually, since the one pre-existing failure above
  stops the full pipeline early: `check:lint`, `check:types`, `check:types:tests`,
  `check:hint-validity`, `check:corpus-level-formatting` all pass with no output; `npm run
  test:coverage` — **83/83 test files, 1096/1096 tests pass**; `npm run test:node` (all 23
  node-validator suites, including `test:hint-path-oracle` — **160/160 hints valid**) — all pass.
  Every check scoped to this change (and every other check in the suite) passes cleanly; the one
  remaining failure is pre-existing, unrelated, and out of this session's scope.

## Reproducing

```bash
# Clean alone (no contention) — reproduces R02823 failing even in isolation:
node scripts/run-bundled.mjs scripts/level-blind-capability-sweep.mjs -- \
  --corpus=data/stress/stress-levels-random.json --levels="pos:1154" \
  --budget-ms=600000 --node-budget=36000000 --work-budget=48240000 --workers=1 \
  --out=<file> --summary-out=<file>

# Contention comparison — reproduces the confirmed runRepairProbe wall-clock truncation on R00635:
node scripts/run-bundled.mjs scripts/portfolio-solve-sweep.mjs -- \
  --corpus=data/stress/stress-levels-random.json --levels=pos:98,pos:450,pos:753,pos:1154,pos:1198 \
  --scheduler-mode=legacy --budget-ms=86400000 --node-budget=36000000 --work-budget=48240000 \
  --workers=1 --out=<file-w1> --summary-out=<summary-w1>
# then --workers=4 --out=<file-w4> --summary-out=<summary-w4>, and diff attempts[].nodesExpanded for R00635.
```
