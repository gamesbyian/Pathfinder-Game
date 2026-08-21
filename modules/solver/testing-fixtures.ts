import type { Attempt } from './orchestration.js';

/**
 * One deliberately over-specified solver Attempt.  Keep this in lockstep with orchestration.ts's
 * Attempt interface: projection tests use its own keys as a tripwire when a new field is added.
 * The error outcome is intentional; provenance tests turn the same record into a successful win.
 */
export const MAXIMALLY_POPULATED_SOLVER_ATTEMPT = Object.freeze({
  // Matches the `repairLateProbe: true` legacy flag below — classifyAttemptTier (orchestration.ts)
  // reads `stageId` first, so this fixture's canonical/legacy fields must agree on which stage this
  // "maximal" attempt represents, even though every OTHER legacy boolean below is also populated
  // (deliberately over-specified, for field-projection round-trip coverage, not stage consistency).
  stageId: 'repair-late-probe',
  gateKey: 589833,
  profile: 'perimeterSweep',
  template: 'perimeterCW',
  beamWidth: 2000,
  ok: false,
  elapsedMs: 321,
  allocatedBudgetMs: 8000,
  allocatedWorkCeiling: 120000,
  allocatedNodeCeiling: 6000,
  workSpent: 98765,
  outcome: 'error',
  error: Object.freeze({
    name: 'TypeError', message: 'fixture dispatch failure', gateKey: 589833,
    configKey: 'beam:perimeterSweep/perimeterCW@beam2000(diverse)',
    profile: 'perimeterSweep', template: 'perimeterCW',
  }),
  passNumber: 3,
  configKey: 'beam:perimeterSweep/perimeterCW@beam2000(diverse)',
  restart: true,
  schedulerPhase: 'portfolio',
  diverseBeam: true,
  repair: true,
  repairMustTurnBiased: true,
  repairTurnBiased: true,
  seedSalt: 7,
  randomSeed: 4272716209,
  nodesExpanded: 4567,
  timedOut: true,
  bestBadness: 4,
  finalBadness: 6,
  attractionDiversity: true,
  dedupNearTieRetry: true,
  admissibleOrderNonDefaultRetry: true,
  connectivityAxisExhaustedRetry: true,
  repairElitePrefixDfsRetry: true,
  mcNeighborBudgetRetry: true,
  repairLateProbe: true,
  admissibleOrder: true,
  admissibleOrderNoTieBreak: true,
  admissibleOrderLds: true,
  mainLoopLateReserve: true,
  repairProbe: true,
  repairProbeShrinkRecovery: true,
} satisfies Required<Attempt>);
