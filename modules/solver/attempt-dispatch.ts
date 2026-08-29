// Single AttemptConfig → search primitive dispatcher, shared by production orchestration and
// offline workers so config routing and threaded arguments cannot drift.
import { beamSearchFromGate, dfsFromGateLDS } from './search.js';
import { repairSearchFromGate } from './repair-search.js';
import { admissibleOrderSearch, admissibleOrderSearchLDS } from './admissible-order-search.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { AttemptConfig, PrepLevel, ScoringProfile } from './types.js';

type YieldFn = (() => Promise<void>) | null;

/** Shared search-output sink; callers may pass null. */
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
  // Cumulative node cap, output sink, and repair-only seed salt. Defaults preserve uncapped behavior.
  nodeBudget = Infinity,
  out: AttemptSearchOut = null,
  seedSalt = 0,
): Promise<number[] | null> {
  const { beamWidth, mechanicBucketRetention, repair, repairMustTurnBiased, repairTurnBiased, admissibleOrder, admissibleOrderNoTieBreak, admissibleOrderLds } = attemptConfig;
  const orderingBias = attemptConfig.orderingBias ?? null;
  const admissibleOrderProfile = admissibleOrderNoTieBreak ? null : profile;
  // These repair mechanisms are explicit opt-ins; absence/false must not activate them.
  const cfg = prep._cfg;
  const enableElitePrefixDfs = cfg && cfg.STRATEGY_REPAIR_ELITE_PREFIX_DFS === true;
  const enableBeamSeed = cfg && cfg.STRATEGY_REPAIR_BEAM_SEED === true;
  return admissibleOrder
    ? admissibleOrderLds
      ? admissibleOrderSearchLDS(gateKey, level, prep, budgetMs, startTime, yieldFn, out, nodeBudget, admissibleOrderProfile)
      : admissibleOrderSearch(gateKey, level, prep, budgetMs, startTime, yieldFn, out, nodeBudget, admissibleOrderProfile)
    : repair
    ? repairSearchFromGate(gateKey, level, prep, profile, budgetMs, startTime, orderingBias, yieldFn, !!repairMustTurnBiased, nodeBudget, out, seedSalt, false, false, false, !!repairTurnBiased, !!enableElitePrefixDfs, !!enableBeamSeed)
    : beamWidth
    ? beamSearchFromGate(gateKey, level, prep, profile, budgetMs, startTime, orderingBias, beamWidth, yieldFn, mechanicBucketRetention, out, nodeBudget)
    : dfsFromGateLDS(gateKey, level, prep, profile, budgetMs, startTime, orderingBias, yieldFn, out, nodeBudget);
}
