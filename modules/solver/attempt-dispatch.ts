// Single AttemptConfig → search primitive dispatcher, shared by production orchestration and
// offline workers so config routing and threaded arguments cannot drift.
import { beamSearchFromGate, dfsFromGateLDS, type BeamContinuation } from './search.js';
import { repairSearchFromGate } from './repair-search.js';
import { admissibleOrderSearch, admissibleOrderSearchLDS } from './admissible-order-search.js';
import { SCORING_PROFILES, STRUCTURAL_ORDERING_BIASES } from './policy.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { AttemptConfig, PrepLevel, ScoringProfile, StructuralOrderingBias } from './types.js';

type YieldFn = (() => Promise<void>) | null;

/** Shared search-output sink; callers may pass null. */
export type AttemptSearchOut = {
  nodesExpanded?: number;
  timedOut?: boolean;
  bestBadness?: number;
  finalBadness?: number;
  pausedContinuation?: BeamContinuation;
} | null;

function sameOrderingBias(actual: StructuralOrderingBias, canonical: StructuralOrderingBias): boolean {
  const actualKeys = Object.keys(actual).sort();
  const canonicalKeys = Object.keys(canonical).sort();
  if (actualKeys.length !== canonicalKeys.length) return false;
  for (let i = 0; i < actualKeys.length; i++) {
    if (actualKeys[i] !== canonicalKeys[i]) return false;
    const key = actualKeys[i] as keyof StructuralOrderingBias;
    if (actual[key] !== canonical[key]) return false;
  }
  return true;
}

/**
 * Runtime contract for an executable AttemptConfig.
 *
 * Attempt identity deliberately has one canonical vocabulary. A structurally-permissive TS object
 * used to be able to request a different behavior shape than that vocabulary could name: e.g. an
 * unknown scoring profile silently fell back to `default`; repair could carry a non-repair profile
 * even though its identity always says `score=repair`; beam-only retention could be attached to DFS;
 * and family-specific subflags could be silently ignored without their parent family. Those are
 * dangerous experiment failures, not friendly coercions: provenance/census can then say technique X
 * ran while dispatch actually executed Y. Reject malformed programmatic configs at the one shared
 * dispatch boundary. Policy-built and policy-aware parsed configs already satisfy these rules.
 */
export function validateAttemptConfigContract(attemptConfig: AttemptConfig): void {
  const {
    scoringProfileId, orderingBias, beamWidth, mechanicBucketRetention,
    repair, repairMustTurnBiased, repairTurnBiased,
    admissibleOrder, admissibleOrderNoTieBreak, admissibleOrderLds,
  } = attemptConfig;

  const familyCount = Number(!!repair) + Number(!!admissibleOrder) + Number(beamWidth != null);
  if (familyCount > 1) {
    throw new Error('AttemptConfig search families are mutually exclusive: choose exactly one of beamWidth, repair, or admissibleOrder (or none for DFS).');
  }

  if (beamWidth != null && (!Number.isSafeInteger(beamWidth) || beamWidth <= 0)) {
    throw new Error(`AttemptConfig beamWidth must be a positive safe integer; got ${String(beamWidth)}.`);
  }
  if (mechanicBucketRetention && beamWidth == null) {
    throw new Error('AttemptConfig mechanicBucketRetention is only meaningful on a beam attempt.');
  }

  if ((repairMustTurnBiased || repairTurnBiased) && !repair) {
    throw new Error('AttemptConfig repair guidance flags require repair: true.');
  }
  if (repairMustTurnBiased && repairTurnBiased) {
    throw new Error('AttemptConfig repairMustTurnBiased and repairTurnBiased are mutually exclusive attempt techniques.');
  }
  if (repair) {
    if (scoringProfileId !== 'repair') {
      throw new Error(`Repair AttemptConfig must use scoringProfileId "repair"; got "${scoringProfileId}".`);
    }
    if (orderingBias) {
      throw new Error('Repair AttemptConfig cannot carry orderingBias because repair identity does not encode it.');
    }
  }

  if ((admissibleOrderNoTieBreak || admissibleOrderLds) && !admissibleOrder) {
    throw new Error('AttemptConfig admissible-order subflags require admissibleOrder: true.');
  }
  if (admissibleOrder) {
    if (orderingBias) {
      throw new Error('Admissible-order AttemptConfig cannot carry orderingBias because that family does not use or identify it.');
    }
    if (admissibleOrderNoTieBreak) {
      if (scoringProfileId !== 'none') {
        throw new Error('Admissible-order no-tie-break AttemptConfig must use canonical scoringProfileId "none".');
      }
    } else if (!SCORING_PROFILES[scoringProfileId]) {
      throw new Error(`AttemptConfig references unknown admissible-order tie-break profile "${scoringProfileId}".`);
    }
  } else if (!SCORING_PROFILES[scoringProfileId]) {
    throw new Error(`AttemptConfig references unknown scoring profile "${scoringProfileId}".`);
  }

  if (orderingBias) {
    const canonical = STRUCTURAL_ORDERING_BIASES[orderingBias.id];
    if (!canonical) {
      throw new Error(`AttemptConfig references unknown structural ordering bias "${orderingBias.id}".`);
    }
    if (!sameOrderingBias(orderingBias, canonical)) {
      throw new Error(`AttemptConfig ordering bias "${orderingBias.id}" does not match the canonical policy definition; identity cannot represent custom same-id behavior.`);
    }
  }
}

/**
 * Detach a beam continuation from the per-prep STATE_BUF_BEAM backing arrays before retaining it
 * beyond this dispatch call.
 *
 * `beamSearchFromGate` deliberately captures its live execution state without copying: direct
 * pause/resume immediately hands that state back to the same search and pays no snapshot cost.
 * Static-portfolio resumability has a different lifetime, though. It can retain beam A, dispatch
 * beam B on the same `prep`, and only resume A after the whole first pass. `createState` reuses and
 * clears the same per-prep beam buffer for B, which otherwise mutates A's captured `visited` and
 * `edgeUsage` arrays behind its back. The same principle applies to the other mutable state arrays
 * and the landmark restore arrays nested in undo tokens.
 *
 * The frontier/parent-pointer tree is immutable after capture, so it is intentionally shared. Owner
 * sentinels also stay unchanged: the detached snapshot still belongs to the exact same
 * startKey/level/prep and resumes against the same cumulative work meter. This allocation occurs
 * only when a caller explicitly requested continuation capture; ordinary production beam search
 * remains allocation-identical.
 */
export function detachBeamContinuationForRetention(continuation: BeamContinuation): BeamContinuation {
  const ws = continuation.ws;
  const detachedWs = {
    ...ws,
    path: ws.path.slice(),
    visited: ws.visited.slice(),
    edgeUsage: ws.edgeUsage.slice(),
    crossCounts: ws.crossCounts.slice(),
    surroundNeighborRemainingMasks: ws.surroundNeighborRemainingMasks.slice(),
  };
  const detachedUndo = continuation.liveUndo.map(token => ({
    ...token,
    surroundNbrRestores: token.surroundNbrRestores
      ? token.surroundNbrRestores.map(({ i, prevMask }) => ({ i, prevMask }))
      : token.surroundNbrRestores,
  }));
  return { ...continuation, ws: detachedWs, liveUndo: detachedUndo };
}

export async function runAttemptSearch(
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
  validateAttemptConfigContract(attemptConfig);
  const { beamWidth, mechanicBucketRetention, repair, repairMustTurnBiased, repairTurnBiased, admissibleOrder, admissibleOrderNoTieBreak, admissibleOrderLds } = attemptConfig;
  const orderingBias = attemptConfig.orderingBias ?? null;
  const admissibleOrderProfile = admissibleOrderNoTieBreak ? null : profile;
  // These repair mechanisms are explicit opt-ins; absence/false must not activate them.
  const cfg = prep._cfg;
  const enableElitePrefixDfs = cfg && cfg.STRATEGY_REPAIR_ELITE_PREFIX_DFS === true;
  const enableBeamSeed = cfg && cfg.STRATEGY_REPAIR_BEAM_SEED === true;

  if (admissibleOrder) {
    return admissibleOrderLds
      ? admissibleOrderSearchLDS(gateKey, level, prep, budgetMs, startTime, yieldFn, out, nodeBudget, admissibleOrderProfile)
      : admissibleOrderSearch(gateKey, level, prep, budgetMs, startTime, yieldFn, out, nodeBudget, admissibleOrderProfile, Infinity, enforceAdmissibleOrderWorkCap);
  }
  if (repair) {
    return repairSearchFromGate(gateKey, level, prep, profile, budgetMs, startTime, orderingBias, yieldFn, !!repairMustTurnBiased, nodeBudget, out, seedSalt, false, false, false, !!repairTurnBiased, !!enableElitePrefixDfs, !!enableBeamSeed);
  }
  if (beamWidth) {
    const path = await beamSearchFromGate(gateKey, level, prep, profile, budgetMs, startTime, orderingBias, beamWidth, yieldFn, mechanicBucketRetention, out, nodeBudget, beamResumeFrom, undefined, captureBeamContinuationOnBudgetExit);
    if (out?.pausedContinuation) {
      out.pausedContinuation = detachBeamContinuationForRetention(out.pausedContinuation);
    }
    return path;
  }
  return dfsFromGateLDS(gateKey, level, prep, profile, budgetMs, startTime, orderingBias, yieldFn, out, nodeBudget);
}
