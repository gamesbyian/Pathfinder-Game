# Class-4 portal coarse-state dead-last retry: 113-row allocation result and promotion 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-16 — matched control/treatment execution of the frozen 113-row class-4 allocation population on GitHub Actions (`solver-level-blind-targeted-sweep.yml`, runs `35054610172` control / `35054613019` treatment), current HEAD
> **Decision:** promote `STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY` and `STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY_TREATMENT` to production default-ON.
> **Remaining gate:** none for this population; refresh downstream residual/capability-memory views before reusing old class-4 counts.
> **Evidence role:** decision-bearing allocation population per `reports/2026-09-13-ws2-class2-class4-allocation-preflight-001.md`'s "First population gate" and `reports/2026-09-16-class4-dead-last-frozen-canary-001.md`'s earned next gate. Answers `WS2-PORTAL-COARSE-DEAD-LAST-ALLOCATION` in full.

## Question

Does the dead-last additive portal coarse-state-merge retry, having passed its frozen canary, deliver referee-valid gains without loss or earlier-stage collateral on its full earned 113-row nomination population, at an economics profile that clears the promotion contract?

## Treatment

Identical to the canary: both arms enable the funded shell (`STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY=true`); only treatment additionally enables `STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY_TREATMENT=true`. The global `STRATEGY_PORTAL_COARSE_STATE_MERGE` stays `false` in both arms and remains closed negative in its global form.

## Population

113 rows: the corrected class-4 residual-atlas bucket intersected with the closed global-merge treatment's frozen 158-id referee-valid gain set, reproducing the freshness replay's own `88` intersection-heavy / `11` multi-portal / `14` must-cross-heavy stratification exactly. See `reports/2026-09-16-class4-residual-atlas-refresh-and-113-freeze-001.md` for the freshness-reconciliation this population required (the raw class-4 atlas bucket count drifted `123 -> 159` from unrelated hint-provenance churn this session's own Class-2 corpus refresh caused; the actionable 113-row intersection was unaffected and independently re-verified). Frozen IDs: `data/stress/ws2-class4-allocation-113-ids.txt`.

## Execution

`solver-level-blind-targeted-sweep.yml` on current HEAD, both arms: `node_budget=50000000` (`work_budget` derived `67000000`), `workers=4`, `lifecycle_telemetry=true`, `experiment_provenance=ws2-class4-allocation-113-001|WS2-PORTAL-COARSE-DEAD-LAST-ALLOCATION|reports/2026-09-13-ws2-class2-class4-allocation-preflight-001.md`. Population coverage was exact and decision-valid on both arms (`113/113 exact ids present; decision-valid observations=complete`, zero attempt errors, zero deadline truncations). Artifact downloads are blocked by this environment's egress policy (Azure blob storage host denied); results were retrieved from the workflow's own job logs (`summarize-targeted-sweep-work.mjs`'s aggregate/per-stage printout, extended this session to also print referee-validity — see below) rather than the uploaded `targeted-sweep-combined` artifact.

## Participation

Target stage `portal-coarse-state-merge-dead-last-retry` reached **113/113** in both arms with genuine nonzero work (control: 1,198 attempts, 4,765,181,977 aggregate nodes, 0 solves; treatment: 715 attempts, 2,153,056,533 aggregate nodes, 86 solves). Every one of the other 12 stages in the population-wide per-stage table has **byte-identical** reach/attempts/nodesExpanded between control and treatment — direct population-scale confirmation that the dead-last placement cannot regress or redirect earlier-stage work, not merely a structural argument from the additive-tier design.

## Referee validity

`summarize-targeted-sweep-work.mjs` only reported `ok`/status, not `refereeValid`; this session extended it to print an aggregate referee-validity line (`scripts/summarize-targeted-sweep-work.mjs`, merged separately) since a promotion-adjacent gain claim read only from job logs must not silently assume referee validity. Rather than re-run the population under the updated tool (duplicating ~113+113 solves for no new information), a targeted audit fetched the relevant shard-level job logs directly — `level-blind-capability-sweep.mjs` already unconditionally logs `refereeValid` per solved row independent of the summarize-tool change. **All 86 treatment solves are independently referee-valid** (86/86, 100% coverage against the expected solved-id list, zero anomalies).

## Result

| | control | treatment |
|---|---:|---:|
| Solved | 0/113 | **86/113 (76.1%)** |
| Referee-valid | — | 86/86 |
| Aggregate `workSpent` | 32,226,884,446 | **30,001,218,523** |
| Aggregate nodesExpanded | 26,632,506,324 | 24,020,380,880 |
| Deadline truncations | 0 | 0 |
| Attempt errors | 0 | 0 |

**Gains: 86, all referee-valid. Losses: 0** (control solved 0/113, so no loss is structurally possible on this population). Treatment's aggregate `workSpent` is *lower* than control's despite 86 additional solves, because a solved row stops rather than exhausting its full node/work budget; the retry stage itself costs real work (2.15B aggregate nodes) but that cost is more than offset by not paying out the full budget on every formerly-unsolved row. `R03365` remains unsolved in both arms (its isolated retry alone spent ~49.9M work / 43.0M nodes and still fell short) — consistent with the 2026-09-13 freshness replay's isolated measurement of 101,313,315 `nodesExpanded` for this specific row, beyond this population's dose.

## Interpretation

This clears every element of the preflight's promotion contract: level-blind execution, identifiable protocol, complete population, non-binding deadline, comparable arms differing only on the declared treatment dimension, referee-valid gains with zero losses, `workSpent`/nodes accounted, no hidden hint/data mutation. The claim is scoped narrowly to this population by construction — rows independently nominated by prior historical evidence as portal coarse-state-merge beneficiaries — matching this repo's standing rule that residual cohorts support conditional, not universal, claims. Selection pressure on the treatment itself was low: the dead-last additive form, its dose (50M node scope), and this population were all fixed before this dispatch (the canary already spent the only real design decision this treatment had). A 76% solve rate with zero losses and net-lower aggregate work on an unabridged earned population is the "spectacular, prespecified" case `solver-evaluation-evidence.md` says should not be forced through additional successive confirmation corpora it doesn't need.

## Disposition: PROMOTED

`STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY` and `STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY_TREATMENT` are now production default-ON (removed from `OPT_IN_FEATURES` in `modules/solver/ablation-config.ts`). The closed-negative global `STRATEGY_PORTAL_COARSE_STATE_MERGE` form is untouched and stays default-OFF/closed; this promotion does not reopen it.

**Implementation correction required for the promotion to actually take effect:** both read sites (`modules/solver/orchestration.ts`'s stage-plan eligibility and `modules/solver/orchestration-additive-retry-tiers.ts`'s gate + proxy override) used `cfg?.FLAG === true`, which is correct for an opt-in (default-off) flag but silently reads a *newly promoted* default-on flag as off whenever the caller omits `ablation` entirely — `normalizeAblationConfig(undefined)` returns `cfg = null` rather than a Proxy, so `cfg?.FLAG` is `undefined`, not the production default. This is exactly the shape every real production caller uses (`modules/input/solver-controller.ts`, `review-controller.ts` never pass `ablation`), and it was caught by extending `orchestration-portal-coarse-dead-last-retry.test.ts`'s own "default" case to call `solveLevel` with no ablation override at all (matching those real callers) rather than an implicit stand-in. Both sites now use `!cfg || cfg.FLAG === true`, matching every other already-promoted default-on flag's read pattern (e.g. `hard-prune-pipeline.ts`'s `!cfg || cfg.PRUNE_MC_NEIGHBOR_BUDGET`). Without this fix, flipping `OPT_IN_FEATURES` membership alone would have been a documentation-only no-op in the live product.

## Validation

- `npx vitest run modules/solver/` — 641/641 tests pass (69 files), including the updated dead-last-retry test exercising explicit-off, explicit-shell-only, and true bare-no-ablation-override default-on states.
- `npm run check:types` — clean.
- `npm run check:solver-budget-boundaries`, `check:audit-artifacts` — clean.
- `node scripts/run-bundled.mjs scripts/solver-bench.mjs --check` — published-corpus regression gate: **160/160 solved, no regressions**. Baseline refreshed (`--update-baseline`) to capture the new default.

## Capability memory

- **Disposition:** PROMOTED (Axis A).
- **Capability signature (Axis B):** 86 referee-valid rescues on a portal-heavy, intersection/multi-portal/must-cross-mixed population, attributable entirely to the dead-last additive retry stage; zero displacement of any other stage's participation (byte-identical non-target-stage tables); net negative marginal `workSpent` cost per gained solve (aggregate work went *down*). `R03365` remains a genuine capability-absence case at this dose, not a routing/starvation failure — a candidate premise for a future higher-dose or different-mechanism follow-up, not pursued here since it is a single row.
- The 652-row Corpus-2 residual and the class-4/class-5 atlas counts are now stale relative to this promotion and must be refreshed before reuse in a future WS2 decision, per `solver-capability-memory.md`'s freshness-reconciliation rule.

## Next gate

None specific to this treatment. The next live WS2 gate is the Class-2 must-turn-biased late-repair economics result (see the companion closeout report), and refreshing the production-boundary residual/capability-memory views now that this promotion has landed before drawing further class-4/class-5 conclusions from old counts.
