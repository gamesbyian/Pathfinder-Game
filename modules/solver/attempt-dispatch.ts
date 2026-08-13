// The single attempt-config → search-function dispatcher.
//
// Given one AttemptConfig, route to the repair / beam / DFS search primitive with the right
// arguments. This is the ONE place that mapping lives: orchestration.ts's runAttempt() (the
// production sequential ladder) and scripts/solver-parallel/worker-source.mjs (the offline race
// worker) both call it, so the two can't drift on which config shape runs which search — or on
// which args get threaded through. History: the worker used to hand-roll its own copy of this
// branch, silently dropping the nodeBudget/seedSalt/out arguments and unable to learn about a new
// attempt type; see CLAUDE.md's "behavior leaked into scripts" audit.
import { beamSearchFromGate, dfsFromGateLDS } from './search.js';
import { repairSearchFromGate } from './repair-search.js';
import { admissibleOrderSearch, admissibleOrderSearchLDS } from './admissible-order-search.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { AttemptConfig, PrepLevel, ScoringProfile } from './types.js';

type YieldFn = (() => Promise<void>) | null;

/** `out` is the shared search-output sink: repair writes nodesExpanded/bestBadness, beam/DFS write
 *  timedOut/finalBadness. Callers that don't need it pass null. */
export type AttemptSearchOut = {
  nodesExpanded?: number;
  timedOut?: boolean;
  bestBadness?: number;
  finalBadness?: number;
} | null;

export function runAttemptSearch(
  attemptConfig: AttemptConfig,
  gateKey: number,
  level: NormalizedLevel,
  prep: PrepLevel,
  profile: ScoringProfile,
  budgetMs: number,
  startTime: number,
  yieldFn: YieldFn,
  // nodeBudget/out/seedSalt are the args the worker's old fork silently dropped. nodeBudget is a
  // cumulative-remaining node cap honored by ALL three primitives (repair via its own counter; beam
  // and DFS as of 2026-07-23 — previously repair-only); seedSalt is repair-only; out is the
  // search-output sink. Their defaults (nodeBudget = Infinity => no cap) reproduce the pre-dispatch
  // behavior byte-for-byte for any caller that omits them — which is every production caller, since
  // SolveOpts.nodeBudget is offline-tooling-only.
  nodeBudget = Infinity,
  out: AttemptSearchOut = null,
  seedSalt = 0,
): Promise<number[] | null> {
  const { beamWidth, diverseBeam, repair, repairMustTurnBiased, repairTurnBiased, admissibleOrder, admissibleOrderNoTieBreak, admissibleOrderLds } = attemptConfig;
  const template = attemptConfig.template ?? null;
  const admissibleOrderProfile = admissibleOrderNoTieBreak ? null : profile;
  // Elite-prefix DFS repair (see repair-search.ts's own header comment). Opt-in-only, matching
  // STRATEGY_REPAIR_TURN_BIAS's convention, NOT the standard "!cfg || cfg.FLAG" default-on
  // pattern: a same-day 20-level A/B against the repair-close/repair-far closest-miss population
  // (reports/2026-08-07-repair-elite-prefix-dfs.md) found a net-negative signal (4/20 solved vs.
  // 5/20 with the mechanism off, one confirmed displacement — R02239 exhausts the shared node
  // budget with this on, solves at 14.19M nodes with it off) — the same "scarce shared node
  // budget, zero-sum reallocation" dynamic documented for turn bias's own initial rollout
  // (reports/2026-07-23-turnbias-corpus2-ab-validation.md). Sound and mechanistically real (its
  // own badness-improvement feedback loop is confirmed working), just not validated as a net
  // production win at these constants — kept available for future recalibration/population-scale
  // validation rather than reverted outright.
  const cfg = prep._cfg;
  const enableElitePrefixDfs = cfg && cfg.STRATEGY_REPAIR_ELITE_PREFIX_DFS === true;
  // Counterfactual beam-survivor elite seeding (see repair-search.ts's BEAM_SEED_WIDTH comment and
  // docs/solver-interoperability-and-cooperation-plan.md). Same opt-in-only convention as
  // enableElitePrefixDfs immediately above, not the standard "!cfg || cfg.FLAG" default-on pattern:
  // an unvalidated 2026-08-13 mechanism, kept off in production and any ordinary ablation config.
  const enableBeamSeed = cfg && cfg.STRATEGY_REPAIR_BEAM_SEED === true;
  return admissibleOrder
    ? admissibleOrderLds
      ? admissibleOrderSearchLDS(gateKey, level, prep, budgetMs, startTime, yieldFn, out, nodeBudget, admissibleOrderProfile)
      : admissibleOrderSearch(gateKey, level, prep, budgetMs, startTime, yieldFn, out, nodeBudget, admissibleOrderProfile)
    : repair
    ? repairSearchFromGate(gateKey, level, prep, profile, budgetMs, startTime, template, yieldFn, !!repairMustTurnBiased, nodeBudget, out, seedSalt, false, false, false, !!repairTurnBiased, !!enableElitePrefixDfs, !!enableBeamSeed)
    : beamWidth
    ? beamSearchFromGate(gateKey, level, prep, profile, budgetMs, startTime, template, beamWidth, yieldFn, diverseBeam, out, nodeBudget)
    : dfsFromGateLDS(gateKey, level, prep, profile, budgetMs, startTime, template, yieldFn, out, nodeBudget);
}
