# Repair-stagnation escape: investigation synthesis + the turn-bias finding (2026-07-22)

## Bottom line

An 8-experiment investigation of `docs/repair-search-stagnation-escape-plan.md`. **The headline
result: turn-aware selective biasing is a genuinely effective mechanism — it solves levels and
dramatically reduces near-miss badness on the must-turn plateau population, with no observed
solved-count downside.** It is the clear product of the investigation and the one thing worth
carrying forward. Everything else either doesn't help or hits the same structural wall, and both
outcomes are now well-diagnosed rather than merely observed.

All eight mechanisms are sound (isSolutionState untouched), unit-tested, determinism-checked,
default-off (opt-in `repairSearchFromGate` params / `PF_*` flags), and `solver:bench --check`
160/160 with no regressions. None changes production behavior.

## What works: turn-aware selective biasing (the find)

Stage 1 found the dominant plateau (13/15) is a *pending must-turn*: the walk reaches the must-turn
cell but leaves without making the required turn. The bias acts on exactly that one load-bearing
move — reward the required-turn exit, penalize the others — only while a must-turn plateau is
detected (`preferredTurnExit` + `enableTurnBias`). This is the *selective* discrimination the
flat-cell prototypes (Stage 2 penalty, Stage 3 reward) lacked.

Two equal-work A/B samples (deterministic 3M-node budget, single gate, `repair-close` cluster,
disjoint level sets):

| sample | levels | new solves | bestBadness better / worse |
|---|---:|---|---:|
| Stage-1 sample | 16 | 0 | 4 / 3 |
| broad sample | 40 | **1 (R02003)** | 12 / 8 |
| **combined** | **56** | **1, zero lost** | **16 / 11** |

The broad sample is decisive: turn bias **solves R02003** (badness 12 → solved), and drives several
levels to the doorstep of a solution — **R01397 39→2, R01860 22→2, R02220 10→2** (one step from
solved), plus many mid-size reductions (R01063 23→14, R02597 14→7, R03071 19→12, R03136 10→4). It is
net-positive on badness on both samples. Crucially, **every regression is on a level that fails
either way** (R02724 4→26, R03267 5→18 are unsolved with or without it), so for the real objective —
solved count — turn bias is **+1 / −0** here. And because it only arms on *stagnation* (repair
already stuck ≥6000 restarts), levels that solve quickly never trigger it, so it cannot slow or break
the levels the solver already handles.

## What doesn't, and the single reason why

Five mechanisms/refinements produced honest negatives, and three of them hit **one** structural wall:

- **Stage 2 signature-conditioned penalty** (flat attractor-cell penalty): mixed, no solve — flat
  cell identity can't tell a trap cell from a load-bearing one.
- **Stage 3-soft recombination** (flat guide-cell reward): the *first* solve (R02239) but net-mixed;
  same cell-identity bluntness. Superseded by turn bias.
- **Stage 3-real reversible-operator relinking** (exact guide-suffix copy): **zero effect** — exact
  segment copies collapse under append-only legality (the guide's suffix is illegal under the base's
  different prefix state within a few moves), so it can't beat the base elite. Underperforms the soft
  version, because randomness escapes the legality trap that rigid copying falls into.
- **Two near-solved arming guards** (Stage 2 and turn bias): both **failed identically** — the
  near-solved regression is a *descent-phase* phenomenon (the bias armed at an intermediate plateau
  blocks the descent to a near-solved state), so an arming-time guard, which checks how close the
  search *currently* is, is blind to it. Confirmed on two independent mechanisms.
- **Turn-bias × closeLengthGap pairing**: **diagnosed no-op** — `closeLengthGap` already fires on the
  exact residual (len + one must-turn) but exhausts a near-empty suffix, because the completion lives
  in the spliced *prefix*, below the floor it can't cross.

**The wall:** repair's search is append-only — it can extend a spliced prefix but never edit it. The
terminal residual of a must-turn plateau is a *global* length↔turn coupling (make the required turn
*and* hit exact length), whose fix generally requires restructuring the prefix. No bounded *local*
operator built here (exact relink, deeper/turn-aware closeLengthGap) can reach it. This is why turn
bias reduces badness impressively but stalls at badness 2–5: it improves the *approach* to the
must-turn cell (which happens forward, in reachable territory) but can't supply the prefix-level
restructuring the exact completion needs.

## Recommended next steps, in priority order

1. **Validate and ship turn bias.** It is the one mechanism worth productionizing. The safe wiring is
   an additive, ablation-gated repair attempt mirroring `repairMustTurnBiasedAttempt`, appended
   *after* the ordinary + must-turn-biased repair attempts so it can only add solves. Exact sites:
   `types.ts` (`repairTurnBiased?: boolean` on `AttemptConfig`), `attempts.ts` (a
   `repairTurnBiasedAttempt` factory + a flag-gated append in `getAttemptConfigs`, kept default-off in
   production by gating on an explicit `STRATEGY_REPAIR_TURN_BIAS` flag), `attempt-dispatch.ts` (pass
   `enableTurnBias=true`), `orchestration.ts` (the `Attempt` record passthrough; keep it *out* of the
   early probe — fallback-only), `scripts/ablation-config.mjs` (register the flag). Then the standard
   **corpus-2 refresh** (`.github/workflows/solver-corpus2-batch-*.yml`) measures the real
   population-level solved-count delta — the validation this in-session 56-level evidence cannot
   provide, and the bar `CLAUDE.md` sets for any repair change. Do a full-corpus before/after timing
   comparison too (a new fallback attempt has a cost `solver:bench --check` won't catch — see
   `CLAUDE.md`'s repair-probe-retry gotcha).
2. **The descent-phase regression needs a descent-aware idea, not another guard.** Two guards failed.
   The honest probe is shadow-mode logging (record what the bias *would* suppress on a would-be
   best-improving restart, per the plan's soundness rule 7) before attempting any fix.
3. **Do not pursue more bounded local completion operators** for the terminal residual — three
   results converge on the append-only prefix-editing wall. Breaking it would need a fundamentally
   different capability (guided systematic search, or genuine reversible prefix edits with
   state-repair), which is a much larger undertaking than this plan's scope.

## Artifacts

Per-experiment reports (all `reports/2026-07-22-repair-stagnation-*`): `stage1-signed-signature-features`,
`stage2-plateau-penalty-prototype`, `stage3-recombination-prototype`,
`stage3-real-relinking-prototype`, `turn-aware-selective-biasing`,
`turnbias-closelengthgap-pairing`, and this synthesis. All code lives behind default-off flags in
`modules/solver/repair-search.ts`; the plan doc tracks per-stage status.
