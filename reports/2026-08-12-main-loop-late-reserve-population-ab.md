# Main-loop late-reserve full-population A/B: results, a confound, and the promotion decision (2026-08-12)

**Verdict: promoted default-ON at fraction 0.15 — but the A/B's control-vs-treatment comparison was found confounded after the fact.** The flag stays promoted (the read-site fix and the unconfounded treatment-vs-treatment trend both support it); a single full corpus-1+corpus-2 sweep with everything correctly default-on is the chosen follow-up evidence, not a matched-control re-run. Frozen protocol: [`docs/main-loop-late-reserve-experiment.md`](../docs/main-loop-late-reserve-experiment.md). Workflow: `.github/workflows/solver-stress-refresh.yml`, level-blind capability sweep (`scripts/level-blind-capability-sweep.mjs`), all four arms `corpus2_workers=1`, `corpus1_workers=1`, `deterministic=true`, `main_loop_late_reserve_config_count=4`.

## Raw results

| arm | run id | commit | C1 solved | C1 nodes | C1 work | C2 solved | C2 nodes | C2 work |
|---|---|---|---:|---:|---:|---:|---:|---:|
| control | 31555042628 (#34) | `b925d3f35e79` | 91/102 | 856,373,268 | 1,305,259,616 | 617/1700 | 42,848,573,912 | 59,098,364,678 |
| 0.05 | 31559504666 (#35) | `b925d3f35e79` | 94/102 | 804,491,846 | 1,207,539,467 | 687/1700 | 41,193,237,907 | 56,597,695,949 |
| 0.10 | 31569619386 (#36) | `6cc3cea4e1d7` | 94/102 | 804,291,978 | 1,217,830,107 | 692/1700 | 40,957,017,442 | 56,215,383,606 |
| 0.15 | 31577986868 (#37) | `6cc3cea4e1d7` | 94/102 | 800,831,184 | 1,206,857,384 | 694/1700 | 40,897,086,361 | 56,210,144,075 |

Every arm confirmed full coverage (1700/1700 C2, 102/102 C1) in its combine-job log before being accepted. Commit note: control/0.05 ran at `b925d3f35e79`; 0.10/0.15 ran at `6cc3cea4e1d7` (that diff is `reports/` + `docs/future-work.md` only, zero `modules/solver/` change — not itself a source of the confound below).

Corpus-2 solved count rises monotonically with the reserve fraction, with clearly diminishing marginal gain: +70 (control→0.05), +5 (0.05→0.10), +2 (0.10→0.15). Aggregate nodes/work decrease monotonically across all four arms despite each successive arm solving more levels.

## The confound

The control arm left `enable_flags` blank. `scripts/level-blind-capability-sweep.mjs` only sets `solveOpts.ablation` when `enableFlags.length || disableFlags.length` is nonzero — with both empty, `ablation` stays `undefined` all the way into `solveLevel()`, and `normalizeAblationConfig(undefined)` returns `null` **before ever consulting `OPT_IN_FEATURES`**.

At the exact commit the control arm ran (`b925d3f35e79`), `PRUNE_MC_NEIGHBOR_BUDGET` had already been removed from `OPT_IN_FEATURES` (an earlier commit the same session), but `modules/solver/prune-gauntlet.ts`'s read site for that flag was **still gated the opt-in way** (`cfg && cfg.PRUNE_MC_NEIGHBOR_BUDGET === true`, not yet fixed on this branch — that fix only arrived via a same-day merge from `origin/main`). With `cfg = null`, that check evaluates `null && ...` → `false`. **`PRUNE_MC_NEIGHBOR_BUDGET` was OFF in the control arm.**

Every treatment arm passed `enable_flags=STRATEGY_MAIN_LOOP_LATE_RESERVE`, which the sweep script turns into a **non-null** sparse object: `{STRATEGY_MAIN_LOOP_LATE_RESERVE: true}`. `normalizeAblationConfig` wraps any non-null raw object in a `Proxy` whose getter, for any key not explicitly set, returns `!OPT_IN_FEATURES.has(key)`. Since `PRUNE_MC_NEIGHBOR_BUDGET` was already out of that set, the Proxy's fallback for it was `true` — and `prune-gauntlet.ts`'s opt-in check (`cfg && cfg.FLAG === true`) is satisfied by any truthy `cfg` whose `.FLAG` getter reads `true`, Proxy included. **`PRUNE_MC_NEIGHBOR_BUDGET` was ON in all three treatment arms.**

So the control arm had `PRUNE_MC_NEIGHBOR_BUDGET` off while every treatment arm had it on — as a pure side effect of passing *any* non-null ablation object, unrelated to `STRATEGY_MAIN_LOOP_LATE_RESERVE` itself. `PRUNE_MC_NEIGHBOR_BUDGET`'s own isolated effect was already measured at +54 net on Corpus-2 (611→665, level-blind, matched flags — see `reports/2026-08-08-mc-neighbor-budget-propagation.md`). A large, unknown-exact-size share of this A/B's 617-vs-687/692/694 gap belongs to that already-known effect, not to the late-reserve mechanism under test.

This is the *same underlying wiring gap* — an opt-in-convention read site left unfixed after a registry-only promotion — that also explained an apparently worker-count-driven corpus-scale gap found and resolved the same day; see `docs/solver-opt-in-experiment-ledger.md`'s neighbor-budget "wiring gap" note and `reports/2026-08-12-worker-count-sensitivity-repair-probe-wallclock.md`'s "Corpus-scale directionality, resolved" section for the sibling case. This report's confound is a distinct instance of the same root cause, discovered while merging both fixes together, not a duplicate of that finding.

## What survives the confound

The **687 → 692 → 694** treatment-vs-treatment trend (0.05 → 0.10 → 0.15) is *not* confounded: `PRUNE_MC_NEIGHBOR_BUDGET` was constant (ON) across all three treatment arms, so the monotonic, diminishing-marginal-gain shape as the reserve fraction grows (+5, then +2) is real, unconfounded evidence the late-reserve mechanism has *some* positive effect. The nodes/work trend across the three treatment arms is likewise clean. The earlier mechanism pilot's narrower finding (reserve-not-reorder activates the intended late configs and recovered 1/14 hard historical matches) is unaffected — it never depended on this A/B.

What does **not** survive as clean evidence: the headline "617 → 694" framing as an isolated measurement of `STRATEGY_MAIN_LOOP_LATE_RESERVE`'s own effect. The true isolated effect, relative to a control with `PRUNE_MC_NEIGHBOR_BUDGET` correctly matched ON, is unknown — it could be a meaningful fraction of the ~70-77-level gap, or it could be small.

## Decision: promoted, not reverted

The flag stays promoted to production default-ON at fraction 0.15:

- `scripts/ablation-config.mjs`: `STRATEGY_MAIN_LOOP_LATE_RESERVE` removed from `OPT_IN_FEATURES`; description updated to explain the confound.
- `modules/solver/orchestration.ts`: `mainLoopLateReserveEnabled`'s read site converted to the standard convention (`!cfg || cfg.FLAG`), matching the neighbor-budget fix's lesson — a registry-only promotion is otherwise inert for any caller that omits `.ablation` (every interactive Play/Editor/Review solve, and any CLI run without `--enable-flags`). `MAIN_LOOP_LATE_RESERVE_FRACTION` stays `0.15` — the best current evidence from the unconfounded treatment-vs-treatment comparison.

Rationale for not reverting: the read-site fix is correct and necessary regardless of the confound (a genuine bug independent of this A/B's validity); the unconfounded treatment-vs-treatment trend and the earlier mechanism pilot both still support a real, positive effect; and the practical follow-up — a single full-corpus sweep with everything correctly default-on — is a cheaper and more direct way to see the actual achieved capability than re-running a matched-control A/B.

The reserve mechanism itself remains a strict no-op unless a finite `nodeBudget` is supplied (`mainLoopLateReserveEligible` requires `earlyTierNodeBudget !== Infinity`) — production Play/Editor/Review solves never set `nodeBudget`, so this only affects offline batch-tooling behavior (stress refreshes, benchmarking), not interactive solve behavior.

## Follow-up: single full corpus-1+corpus-2 sweep (run 2026-08-12, run #38, id 31630124558, commit `ba5630978`)

Now that both `PRUNE_MC_NEIGHBOR_BUDGET`'s and `STRATEGY_MAIN_LOOP_LATE_RESERVE`'s read sites are fixed, a genuinely blank `enable_flags` run correctly gives **both** flags their real production-default (ON) state simultaneously. Same protocol as the A/B (`corpus1_workers=1`, `corpus2_workers=1`, `deterministic=true`, `corpus1_node_budget=50000000`, `corpus2_node_budget=36000000`, `budget_ms=86400000` both corpora, `main_loop_late_reserve_config_count=4`), full coverage confirmed (1700/1700 C2, 102/102 C1).

**Result: Corpus-1 95/102 (nodes=769,439,503, work=1,229,099,624), Corpus-2 635/1700 (nodes=42,810,944,729, work=64,065,888,506).**

This is **lower** than expected, and lower than several individual reference points:

| run | workers | `PRUNE_MC_NEIGHBOR_BUDGET` | `STRATEGY_MAIN_LOOP_LATE_RESERVE` | other solver changes | C1 | C2 |
|---|---:|---|---|---|---:|---:|
| original neighbor-budget-only treatment | 2 | ON | n/a (didn't exist yet) | — | 94/102 | 665/1700 |
| this A/B's control (confounded) | 1 | OFF (accidental) | OFF | — | 91/102 | 617/1700 |
| this A/B's 0.15 treatment (confounded) | 1 | ON (accidental) | ON @ 0.15 | — | 94/102 | 694/1700 |
| **this single sweep** | 1 | ON (intended) | ON @ 0.15 (intended) | + repair-probe wall-clock fix | 95/102 | **635/1700** |

The 0.15 treatment arm and this sweep both intend the same effective configuration (both flags ON, same budgets, same worker count) — yet differ by 59 levels on Corpus-2. The diff between their two commits (`6cc3cea4e1d7` → `ba5630978`) is not just ablation-registry bookkeeping: it also includes `2bfefc660`, **"Fix runRepairProbe's wall-clock trip-wire silently binding under CPU contention"** (merged from `origin/main`, found by a separate investigation this same day). That fix replaces a 30-second hardcoded per-repair-probe-attempt wall-clock cap with a 20-minute one, specifically so a probe attempt reaches its full intended ~2,000,000-node budget under CPU contention instead of being silently truncated at ~30s of degraded throughput.

**Plausible mechanism for the drop**: `level-blind-capability-sweep.mjs` enforces a hard cumulative `nodeBudget` ceiling (36,000,000 for Corpus-2) across the whole ladder for a level. Before the wall-clock fix, a contended repair probe attempt could get truncated well short of its node quota, *inadvertently* leaving more of that shared ceiling for later tiers (the main loop, repair fallback, and specifically `STRATEGY_MAIN_LOOP_LATE_RESERVE`'s own reserved slice) to spend. After the fix, probe attempts under contention now correctly consume closer to their full intended budget — which is more faithful to the documented model, but also means less of the shared ceiling survives to reach later tiers on any level where the probe doesn't itself solve. This is corpus-2-specific in exactly the way the data shows: Corpus-1's more generous per-level budget (50,000,000 vs 36,000,000) makes it far less exposed to this effect, and Corpus-1 actually ticked up slightly (94→95) rather than dropping.

This has **not been confirmed** as the actual cause — it is the most plausible mechanism given what changed between the two commits, not a verified diagnosis. It has also not been checked whether GHA's own runner environment is actually under meaningful CPU contention during these sweeps (the mechanism requires contention to matter; an uncontended runner would make the wall-clock fix a no-op, per that commit's own uncontended `solver:bench --check` validation).

**Not yet resolved**: whether the true production-default capability (both flags on, wall-clock fix included) is genuinely 635, or whether this specific sweep's number is itself an artifact of budget-reallocation timing rather than a stable measurement. No further action taken here beyond recording the result and this analysis; see `docs/future-work.md` for how this is tracked forward.

## Second, more general lesson

Even after both halves of *one* flag's promotion are correctly wired, a batch tool that constructs a sparse `--enable-flags` ablation object can silently change *other* flags' effective state too, if those other flags' registry membership has changed but their own read sites haven't been fixed yet. Any A/B run during a window when another flag's promotion is only half-done (registry changed, read site not yet fixed) is at risk of exactly this cross-contamination — check that every currently-being-promoted flag's read site is fully fixed before trusting *any* A/B that passes a non-null ablation object, not just the flag under direct test.

## Verification performed

- `npx tsc --noEmit`: clean.
- `npx vitest run modules/solver/`: full suite passes (341/341).
- `npm run solver:bench -- --check`: 0 regressions vs `logs/solver-baseline.json` (this check cannot exercise the late-reserve mechanism either way, since `solver:bench` never sets a `nodeBudget`).
