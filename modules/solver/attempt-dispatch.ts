// Single AttemptConfig → search primitive dispatcher, shared by production orchestration and
// offline workers so config routing and threaded arguments cannot drift.
import { beamSearchFromGate, dfsFromGateLDS, type BeamContinuation } from './search.js';
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
  pausedContinuation?: BeamContinuation;
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
  // STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_WORK_CAP_ENFORCEMENT (see ablation-config.ts's own
  // comment): default false, byte-for-byte unaffected. Deliberately NOT computed here from
  // attemptConfig/prep._cfg — this shared dispatcher also serves the admissible-order-fallback
  // tier's OWN pass over the very same (non-default-profile) AttemptConfig objects, which has no
  // withWorkCapScope of its own and must never start consulting a leftover/outer prep._workCap.
  // Only orchestration.ts's admissible-order-non-default-retry call site (the one tier this flag is
  // actually validated for) may pass true, explicitly, for that one call.
  enforceAdmissibleOrderWorkCap = false,
  // Resumable-portfolio residual pass (2026-09-10, reports/2026-09-05-static-portfolio-resumable-
  // tranche-salvage-preflight.md): both default undefined/false, so every existing caller is
  // byte-for-byte unaffected — only runStaticPortfolio's own resumable-residual-pass path may pass
  // these, and only for beamWidth-bearing configs (the params are otherwise ignored below, matching
  // every other search primitive's own indifference to arguments it doesn't accept).
  beamResumeFrom?: BeamContinuation,
  captureBeamContinuationOnBudgetExit = false,
): Promise<number[] | null> {
  const { beamWidth, mechanicBucketRetention, repair, repairMustTurnBiased, repairTurnBiased, admissibleOrder, admissibleOrderNoTieBreak, admissibleOrderLds } = attemptConfig;
  // These are separate, canonical repair action identities and separate mechanisms inside
  // repairSearchFromGate. Running both at once would create a hybrid action the identity grammar
  // cannot represent (it used to be mislabeled as must-turn-biased), contaminating provenance and
  // technique-census evidence. Policy/parser code never constructs this shape; fail loudly if a
  // programmatic caller does rather than silently executing an unidentifiable fifth repair family.
  if (repairMustTurnBiased && repairTurnBiased) {
    throw new Error('runAttemptSearch: repairMustTurnBiased and repairTurnBiased are mutually exclusive attempt techniques.');
  }
  const orderingBias = attemptConfig.orderingBias ?? null;
  const admissibleOrderProfile = admissibleOrderNoTieBreak ? null : profile;
  // These repair mechanisms are explicit opt-ins; absence/false must not activate them.
  const cfg = prep._cfg;
  const enableElitePrefixDfs = cfg && cfg.STRATEGY_REPAIR_ELITE_PREFIX_DFS === true;
  const enableBeamSeed = cfg && cfg.STRATEGY_REPAIR_BEAM_SEED === true;
  return admissibleOrder
    ? admissibleOrderLds
      ? admissibleOrderSearchLDS(gateKey, level, prep, budgetMs, startTime, yieldFn, out, nodeBudget, admissibleOrderProfile)
      : admissibleOrderSearch(gateKey, level, prep, budgetMs, startTime, yieldFn, out, nodeBudget, admissibleOrderProfile, Infinity, enforceAdmissibleOrderWorkCap)
    : repair
    ? repairSearchFromGate(gateKey, level, prep, profile, budgetMs, startTime, orderingBias, yieldFn, !!repairMustTurnBiased, nodeBudget, out, seedSalt, false, false, false, !!repairTurnBiased, !!enableElitePrefixDfs, !!enableBeamSeed)
    : beamWidth
    ? beamSearchFromGate(gateKey, level, prep, profile, budgetMs, startTime, orderingBias, beamWidth, yieldFn, mechanicBucketRetention, out, nodeBudget, beamResumeFrom, undefined, captureBeamContinuationOnBudgetExit)
    : dfsFromGateLDS(gateKey, level, prep, profile, budgetMs, startTime, orderingBias, yieldFn, out, nodeBudget);
}
