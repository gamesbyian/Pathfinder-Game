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
  // nodeBudget/out/seedSalt are the args the worker's old fork silently dropped — repair-only
  // (nodeBudget/seedSalt) or search-output (out); their defaults reproduce the pre-dispatch
  // behavior byte-for-byte for any caller that omits them.
  nodeBudget = Infinity,
  out: AttemptSearchOut = null,
  seedSalt = 0,
): Promise<number[] | null> {
  const { beamWidth, diverseBeam, repair, repairMustTurnBiased, repairTurnBiased } = attemptConfig;
  const template = attemptConfig.template ?? null;
  return repair
    ? repairSearchFromGate(gateKey, level, prep, profile, budgetMs, startTime, template, yieldFn, !!repairMustTurnBiased, nodeBudget, out, seedSalt, false, false, false, !!repairTurnBiased)
    : beamWidth
    ? beamSearchFromGate(gateKey, level, prep, profile, budgetMs, startTime, template, beamWidth, yieldFn, diverseBeam, out)
    : dfsFromGateLDS(gateKey, level, prep, profile, budgetMs, startTime, template, yieldFn, out);
}
