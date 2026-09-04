# portfolio-18-tranche-v2: census-refresh reconciliation and bounded offline-adoption decision

> **Status:** concluded-positive
> **Last evidence:** 2026-09-04 — local join of `reports/stress/technique-niches/2026-09-03/level-capability.json` against `portfolio-18-tranche-v2`'s technique composition; local reproduction of `R02718`'s full 34-technique collapse at current HEAD; a real 160/160-level `data/levels.json` run of the new `scripts/solver-bench.mjs --scheduler=static-portfolio` mode.
> **Decision:** `portfolio-18-tranche-v2` still passes the refreshed capability guardrails (94.8% singleton-exclusive retention, no concentrated loss) and the newly-zero census population is ordinary cross-revision solver drift, not a correctness bug or a recurring capability regression tied to one technique. Made the smallest reversible offline/batch production adoption: an opt-in `--scheduler=static-portfolio` report mode in `scripts/solver-bench.mjs` (the repo's own named "corpus regression"/offline-batch tool), off by default, that runs the confirmed tranche-v2 configuration through the real `solveLevel()` entrypoint against the real published corpus. First real-corpus run: 160/160 solved, zero coverage loss vs. the full-production baseline, 167,755,794 aggregate work.
> **Remaining gate:** none for this reconciliation cycle. The next Workstream 2 gate is whether/when a caller should actually be pointed at this mode for a real batch job (this report only builds and validates the on-ramp), or resumability's already-queued next rung if that thread is picked back up.
> **Evidence role:** development/infrastructure — a capability-map join, a bounded reproduction check, and an additive tooling change; not a new scheduler experiment (tranche-v2's own confirmation evidence is unchanged).

## 1. Refreshed rare-capability retention (replaces the 2026-09-01-snapshot conclusion)

`2026-09-03-portfolio-18-specialists-rare-capability-retention-audit.md` audited `portfolio-18-specialists`'s (== `portfolio-18-tranche-v2`'s technique composition; the two candidates differ only in per-technique work caps, not menu membership) singleton-exclusive retention against the **2026-09-01** frozen census: 144/151 (95.4%), no dropped technique above 1 exclusive win. `docs/solver-optimization-workstreams.md`'s own workstream-wide rules require this reasoning to move to the **2026-09-03** refreshed census once it existed; that audit had not yet been redone against it.

Re-ran the identical join (`data/stress/static-portfolio-confirmation-003-arms.json`'s `full-menu`/`portfolio-18-specialists` composition, now against `reports/stress/technique-niches/2026-09-03/level-capability.json`):

| | techniques | Σ exclusiveLevels | Σ thinBoundaryLevels | Σ solvedLevels |
|---|---:|---:|---:|---:|
| kept (`portfolio-18-tranche-v2`'s 18) | 18 | **147** | 283 | 9,209 |
| dropped (16) | 16 | **8** | 25 | 6,155 |
| all `full-menu` (34) | 34 | 155 | — | — |

**Retention: 147/155 = 94.8%** (was 144/151 = 95.4% on the stale snapshot — both the numerator and denominator moved with the census refresh, direction/magnitude essentially unchanged).

Per-dropped-technique breakdown (all 16, sorted by exclusiveLevels):

| exclusive | thinBoundary | solved | technique |
|---:|---:|---:|---|
| 2 | 4 | 444 | `admissible-order\|tieBreak=nearClosureRescue\|lds=off` |
| 1 | 5 | 371 | `dfs\|score=intersectionHarvest\|bias=none` |
| 1 | 4 | 454 | `admissible-order\|tieBreak=intersectionHarvest\|lds=off` |
| 1 | 4 | 387 | `dfs\|score=perimeterSweep\|bias=perimeterCW` |
| 1 | 2 | 511 | `beam\|score=knotBuilder\|bias=none\|width=2000\|retention=plain` |
| 1 | 2 | 385 | `dfs\|score=perimeterSweep\|bias=cornerHarvest` |
| 1 | 1 | 364 | `dfs\|score=portalCommitted\|bias=none` |
| 0 | 0-2 | 341-385 | the remaining 9 dropped techniques (0 exclusive each) |

One dropped technique (`admissible-order|tieBreak=nearClosureRescue|lds=off`) now shows 2 exclusive wins instead of the prior snapshot's max of 1 — real churn, but still far below any kept specialist's concentration (`repair|score=repair|guidance=standard` alone carries dozens of exclusive wins in both snapshots). **Conclusion unchanged: no single dropped technique is a concentrated rare-capability loss; tranche-v2 still passes this guardrail on current evidence**, superseding the 2026-09-01-snapshot number per the workstream-wide rules' own instruction.

*(Method: identical to the prior audit — canonical technique-key join, no new dispatch, ~15-line local script, not committed, per this research line's established convention for one-off joins.)*

## 2. Newly-zero-support population: classification

`2026-09-03-technique-census-refresh-001-rejoin.md` already flagged 25 levels newly regressed to `production-solved-without-frozen-t1-winner`, spot-checking `R02718` (14 solving actions → zero) as an instance of "the same kind of broad, technique-family-spanning drift" the 12-cell staleness spot-check found. This section extends that check, per the task's request to inspect the population enough to classify it (bounded — not a full forensic campaign).

**Reproduction, not just re-reading the census.** Ran `R02718` (`corpus2`, position 1049) locally at current HEAD via `technique-census-cell.mjs`'s own `runCell`, using two of its ten former census winners:

```
{"techniqueKeys":["beam:intersectionHarvest@beam2000"],"ok":false,"status":"exhausted","nodesExpanded":140069}
{"techniqueKeys":["dfs:repair:repair"],"ok":false,"status":"node-budget-reached","nodesExpanded":50000000}
```

Both numbers match the fresh census's own recorded cells exactly (140,069 / 50,000,000) — this is real, reproducible current-HEAD behavior, not a census-generation artifact (flaky worker, stale shard, etc.).

**Severity/shape check across all 25 regressed IDs**, comparing each level's old census winners (family + count) to its new count (all now 0):

| level | old wins | old families | level | old wins | old families |
|---|---:|---|---|---:|---|
| R03357 | 16 | beam, dfs | R02718 | 10 | beam, dfs |
| R03281 | 6 | beam | R02631 | 4 | ida |
| R02474 | 4 | dfs, ida | R01124 | 3 | beam |
| R02168 | 2 | beam, dfs | R02302 | 2 | beam |
| R02438 | 2 | beam, dfs | R02500 | 2 | beam |
| (15 more) | 0-1 | beam or dfs only | R00440 | 0 | (production-only/pair win) |

Two things this pattern rules in/out:

- **Not a single recurring technique regression.** If one technique's implementation had regressed, the common denominator across 25 levels would be that technique appearing (and failing) everywhere. Instead the old winners span beam (13 levels beam-only), dfs (4 levels dfs-only), ida (1 level ida-only), and mixed beam+dfs/dfs+ida (5-6 levels) — no single family, still less a single technique, explains the population. `R02718`'s own old winners alone span 9 different beam configs plus repair.
- **Not a common missing-technique/configuration niche.** A coverage-gap explanation would predict these levels were always thin/marginal. Instead several (`R02718` with 10 winners incl. repair, `R03357` with 16, `R03281` with 6) previously had *broad*, cross-family support — the opposite of a niche gap. The census refresh's own bidirectional finding (81 levels *gained* isolated-technique support in the same run) is inconsistent with a systemic coverage hole.

What the pattern *does* look like: a handful of individual levels (`R02718`, `R03357`, `R03281` most severely) had their search landscape shift enough, over two weeks of real solver-tuning commits (the same window the 12-cell spot-check attributed to "repair budget-model migration, the beam 31/32-flipper identity fix, `admissible-order-fallback` work-cap resolution, scheduling/scoring tuning"), that every technique that used to find a (possibly narrow/fragile) path on that specific level no longer does within the same 50,000,000-node budget — while the *median* case in the other ~20 regressed levels lost only 1-2 winners, the ordinary single-technique-drift signature already established as the baseline expectation.

**Classification: ordinary solver drift** (bidirectional, level-concentrated on the worst few cases, consistent with and now reproduced beyond the census's own record), **not** a correctness bug, **not** a single recurring technique-level regression, and **not** evidence of a common missing-technique niche. This matches and extends (rather than contradicts) the precedent already established in `2026-09-03-frozen-technique-census-staleness-spotcheck.md` and the refresh's own rejoin report. No further forensic work is warranted from this evidence — a root-cause diagnosis of *why* `R02718` specifically shifted would need its own fresh-vs-preceded-style investigation only if that individual level ever becomes decision-relevant (e.g. cited by name in a future scheduler audit), which it is not here.

## 3. Offline/batch production adoption

### Why this is justified now

Per `docs/solver-scheduling-policy.md`'s promotion path, `portfolio-18-tranche-v2` has cleared: preflight (cap-map derivation), residual-value tables (tail-percentile cost probe), a simple-baseline comparison (beats `full-menu`/`portfolio-18-flat-2m` on two independent Corpus-2 confirmations), rare-capability retention (§1, just refreshed), a production-entrypoint parity check (15/15 exact matches between the research harness and real `solveLevel()`), and cross-generator transfer (ties `full-menu` on Corpus 1 at 7.12% less work, still beats the flat cap). Per §2, the census refresh that motivated this reconciliation surfaced no regression specific to tranche-v2's own evidence chain — the 25 newly-zero levels are general solver drift, not something tied to this candidate's menu or cap map. **Nothing new blocks the production-wiring decision the workstream doc already flagged as the next real gate.**

### What was adopted

`scripts/solver-bench.mjs` — the repository's own "corpus regression"/offline-batch orchestration tool, explicitly named as this design's offline/batch target in `2026-09-03-fixed-cap-portfolio-scheduler-implementation-design.md`'s scoping section — gained an opt-in `--scheduler=static-portfolio` mode:

- Reads the confirmed tranche-v2 technique order from `data/stress/portfolio-18-specialists-production-envelope-confirmation-003-arms-b.json`'s `portfolio-18-tranche-v2` arm and its per-technique cap map from `data/stress/portfolio-18-specialists-tranche-cap-map-v2.json` — the exact committed artifacts every confirmation dispatch in this research line already used, not a re-typed copy.
- Calls the real `solveLevel(level, { schedulerMode: 'static-portfolio', staticPortfolio: {...} })` entrypoint (`runStaticPortfolio` in `modules/solver/orchestration.ts`), the same production code path `2026-09-03-static-portfolio-entrypoint-parity-check.md` already verified reproduces the research harness exactly.
- Runs against `data/levels.json` — the **real published game corpus**, which no dispatch in this research line had used before (every prior confirmation/transfer check used Corpus 1 or Corpus 2 stress data).
- Is a **report, not a gate**: unlike `--order`'s existing order-independence probe (which exits 1 on any regression), a coverage difference here does not fail the build. Tranche-v2 is a confirmed but deliberately different policy from the full production ladder the baseline measures; a difference is expected trade-off information, not a bug. **The existing `--check` gate (used by CI/regression workflows) is completely untouched** — this mode is a new, separate flag path, never invoked unless explicitly requested.
- Guards against nonsensical combinations (`--order` != default, `--update-baseline`) with a loud `exit(2)`, matching this file's existing validation style.

### Why this satisfies the task's constraints

- **Does not change the interactive UI path.** `modules/input/solver-controller.ts`/`review-controller.ts` are untouched; `schedulerMode` still defaults to `'production'` everywhere it always did.
- **One clear caller/workflow with straightforward rollback.** A single CLI flag on a single existing tool. Rollback is deleting the flag/the `if (scheduler === 'static-portfolio')` branches (or simply never passing `--scheduler=static-portfolio`) — nothing else in the codebase reads or depends on this addition.
- **Preserves current work accounting.** `runStaticPortfolio` already reports `workSpent` via the standard `SolveResult` contract; the new mode surfaces it (`--out`'s `workSpent` field, the printed "work spent" comparison line) without touching how the default production path accounts for work.
- **Preserves rare-capability protections.** The default `--check` gate — the actual regression-prevention mechanism CI relies on — is unmodified. The new mode's own report explicitly lists any lost levels (`regressions`) so a future decision to route real batch work through it has that evidence in hand, rather than silently trusting tranche-v2's stress-corpus confirmations to transfer to the real corpus.

### First real-corpus evidence

```
node scripts/run-bundled.mjs scripts/solver-bench.mjs --scheduler=static-portfolio
```

Result: **160/160 solved** (the entire published `data/levels.json` corpus), **zero coverage loss** against the full-production-ladder baseline (`logs/solver-baseline.json`), 29,531,300 nodes / **167,755,794 aggregate work**, wall time 36.0s. This is the first time `portfolio-18-tranche-v2` has been measured against the actual shipped level set rather than a research stress corpus — a stronger, more directly relevant result than any prior confirmation (a tie or narrow win was the norm on Corpus 1/2; this is a clean sweep on real content), though a 160-level population is far smaller than either stress corpus, so read it as one more consistent data point, not a new high-powered confirmation.

## 4. Tests

- `npm run test:solver-bench-cli` (new — `scripts/solver-bench-cli-node-test.mjs`): exercises the real CLI against the real corpus/baseline/cap-map artifacts (following this repo's established execFile-CLI-test convention). Asserts: omitting `--scheduler` reproduces the pre-existing default-production report/exit-code behavior byte-for-byte; `--scheduler=static-portfolio` solves real level 1, reports "no coverage loss", and is a report (exit 0) even though it measures a different policy than the baseline; `--out` carries the new `scheduler`/`workSpent` fields correctly in both modes; an unknown `--scheduler` value and disallowed flag combinations (`--order`, `--update-baseline`) fail loudly at `exit(2)`. **Passing.**
- Manual smoke runs: `--levels=pos:1-5` (default scheduler, confirms unchanged production behavior) and a full 160-level `--scheduler=static-portfolio` run (§3's result). Both passing.
- Did not re-run the broader `vitest` suite or `test:node` aggregate — this change touches only `scripts/solver-bench.mjs` (a standalone CLI script) and adds one new test file; `modules/solver/orchestration.ts` (already covered by `orchestration.test.ts`) was not modified.

## 5. Live-doc updates

`docs/solver-optimization-workstreams.md`'s Workstream 2 handoff section is updated (separate commit) to: (a) point rare-capability-retention citations at this report's refreshed 147/155 number instead of the stale 144/151 one; (b) record the production-wiring decision as made, with a pointer here; (c) note the census-refresh reconciliation is complete and the 25-newly-zero population is classified as ordinary drift, not a new gate.

## What this does not establish

- Does not decide that any *live/scheduled* batch job (a GHA workflow, a hint-generation run) should actually be pointed at `--scheduler=static-portfolio` — that remains a separate, later decision now that the on-ramp exists and has first real-corpus evidence.
- Does not re-litigate or re-derive tranche-v2's own confirmation/transfer evidence — those conclusions stand unchanged; this report only reconciles the capability-map input and builds the adoption path the workstream doc already flagged as the next gate.
- Does not diagnose *why* `R02718`/`R03357`/`R03281` specifically regressed at the code-commit level — per §2, that would need its own investigation and is not warranted by current evidence.
- Is not a resumability contribution — the resumability research ladder (rungs 1-4) is unchanged and was deliberately not touched, per this task's own scope.
