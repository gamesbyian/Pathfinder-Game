/** Stable policy-level identities shared by orchestration, telemetry, and alternate schedulers.
 * The ID list and the legacy-to-canonical normalizer live in ./stage-id-normalization.mjs (plain
 * JS) so plain-`node`-invoked research tooling can import the single source of truth without a
 * TypeScript resolution step; re-exported here for every TypeScript consumer. */
import { SOLVER_STAGE_IDS, normalizeSolverStageId } from './stage-id-normalization.mjs';
export { SOLVER_STAGE_IDS, normalizeSolverStageId };
export type SolverStageId = typeof SOLVER_STAGE_IDS[number];
export type SolverStagePolicyStatus = 'production-default' | 'opt-in' | 'experiment-only';
export type SolverSchedulerPhase = 'prime' | 'probe' | 'main' | 'fallback' | 'retry' | 'legacy-latency-portfolio' | 'static-portfolio';
export type StageBudgetPolicyId = 'caller-main' | 'fixed-probe' | 'additive-wall-multiplier' | 'withheld-node-reserve' | 'additive-node-headroom' | 'fixed-node-cap' | 'portfolio-pass';
export interface SolverStageSpec {
    id: SolverStageId; order: number; disposition: SolverStagePolicyStatus;
    schedulerPhase: SolverSchedulerPhase; eligibility: string;
    attemptSource: 'configured-main' | 'configured-repair' | 'admissible-order-profiles' | 'prime' | 'portfolio';
    budgetPolicy: StageBudgetPolicyId; telemetryLabel: SolverStageId; retryIdentity: string | null;
}
// Disposition is current policy status, not historical origin. In particular, a retry promoted to
// production default must say `production-default` here even if its feature began life as an opt-in. Keep this
// aligned with ablation-config.ts's OPT_IN_FEATURES/default polarity and the opt-in experiment ledger;
// schedulers/reports consume this registry as metadata and must not resurrect stale pre-promotion state.
const rows = [
    ['explicit-prime', 0, 'experiment-only', 'prime', 'explicit primeAttempt option', 'prime', 'fixed-node-cap', null],
    ['early-repair-search', 10, 'production-default', 'probe', 'repair configs and repair probe enabled', 'configured-repair', 'fixed-probe', null],
    ['main-search', 20, 'production-default', 'main', 'configured non-repair attempts', 'configured-main', 'caller-main', null],
    ['repair-fallback', 30, 'production-default', 'fallback', 'configured repair attempts and positive repair wall multiplier', 'configured-repair', 'additive-wall-multiplier', null],
    ['goal-attraction-disabled-retry', 40, 'production-default', 'retry', 'candidate flag active and extra passes enabled', 'configured-main', 'withheld-node-reserve', 'goal-attraction-disabled-retry'],
    ['repair-shrink-recovery', 50, 'opt-in', 'retry', 'a biased probe was shrunk and recovery enabled', 'configured-repair', 'withheld-node-reserve', 'repair-shrink-recovery'],
    ['admissible-order-fallback', 60, 'production-default', 'fallback', 'admissible-order-fallback tier enabled', 'admissible-order-profiles', 'withheld-node-reserve', null],
    ['coarse-state-near-tie-retention-disabled-retry', 70, 'production-default', 'retry', 'coarse-state near-tie retention retry flag and budget enabled', 'configured-main', 'additive-node-headroom', 'coarse-state-near-tie-retention-disabled-retry'],
    ['admissible-order-alternate-tiebreak-retry', 80, 'production-default', 'retry', 'non-default admissible retry enabled', 'admissible-order-profiles', 'additive-node-headroom', 'admissible-order-alternate-tiebreak-retry'],
    ['connectivity-axis-prune-disabled-retry', 90, 'production-default', 'retry', 'connectivity retry enabled', 'configured-main', 'additive-node-headroom', 'connectivity-axis-prune-disabled-retry'],
    ['repair-elite-prefix-dfs-retry', 100, 'opt-in', 'retry', 'elite-prefix repair retry enabled', 'configured-repair', 'additive-node-headroom', 'repair-elite-prefix-dfs-retry'],
    ['must-cross-neighbor-prune-disabled-retry', 110, 'production-default', 'retry', 'must-cross neighbor retry enabled', 'configured-main', 'additive-node-headroom', 'must-cross-neighbor-prune-disabled-retry'],
    ['late-repair-search', 120, 'production-default', 'retry', 'late repair probe enabled', 'configured-repair', 'fixed-node-cap', 'late-repair-search'],
    ['guidance-goal-distance-retry', 125, 'production-default', 'retry', 'goal-attraction legacy-distance retry enabled', 'configured-main', 'additive-node-headroom', 'guidance-goal-distance-retry'],
    ['late-repair-multiseed-retry', 128, 'production-default', 'retry', 'late-repair-search multi-seed retry enabled and late-repair-search itself eligible', 'configured-repair', 'additive-node-headroom', 'late-repair-multiseed-retry'],
    ['legacy-latency-portfolio-pass', 20, 'experiment-only', 'legacy-latency-portfolio', 'portfolio pass includes config', 'portfolio', 'portfolio-pass', null],
    ['legacy-latency-portfolio-fallback', 130, 'experiment-only', 'legacy-latency-portfolio', 'portfolio passes did not solve', 'configured-main', 'caller-main', null],
    ['static-portfolio', 20, 'experiment-only', 'static-portfolio', 'schedulerMode "static-portfolio" with opts.staticPortfolio set', 'portfolio', 'portfolio-pass', null],
] as const;
export const SOLVER_STAGE_SPECS = Object.freeze(Object.fromEntries(rows.map(([id, order, disposition, schedulerPhase, eligibility, attemptSource, budgetPolicy, retryIdentity]) => [id, Object.freeze({ id, order, disposition, schedulerPhase, eligibility, attemptSource, budgetPolicy, telemetryLabel: id, retryIdentity })])) as unknown as Record<SolverStageId, SolverStageSpec>);
export function solverStageSpec(id: SolverStageId | string): SolverStageSpec {
    return SOLVER_STAGE_SPECS[normalizeSolverStageId(id)];
}
export interface BudgetCurrency { ceiling: number | null; capped: boolean; source: 'production-default' | 'explicit-override'; }
export interface BudgetEnvelope {
    stageId: SolverStageId;
    scope: 'stage-local' | 'whole-solve';
    /** Compatibility/telemetry projection only. Wall time is a deadline, not an allocation currency;
     * new scheduler policy must not derive search shares from this field. */
    wall: BudgetCurrency;
    /** Canonical cross-technique allocation currency. Some legacy stage projections are not yet
     * populated here; stage-budget.ts documents that migration debt explicitly. */
    work: BudgetCurrency;
    /** Technique-local/diagnostic guard. Raw nodes are not portable cross-technique cost. */
    nodes: BudgetCurrency;
    /** Historical node-headroom metadata today. Keep the unit explicit in callers; a future work
     * reserve must not reuse this unqualified scalar. */
    headroom: { kind: 'none' | 'additive' | 'withheld'; amount: number; sourceStageId: SolverStageId | null };
    strictTotalWork: boolean;
}
export function createBudgetEnvelope(input: { stageId: SolverStageId; wallMs?: number; workUnits?: number; nodeCeiling?: number; explicitOverride?: boolean; scope?: BudgetEnvelope['scope']; strictTotalWork?: boolean; headroom?: BudgetEnvelope['headroom'] }): BudgetEnvelope {
    solverStageSpec(input.stageId);
    const currency = (value: number | undefined): BudgetCurrency => ({ ceiling: value === undefined || value === Infinity ? null : value, capped: value !== undefined && Number.isFinite(value), source: input.explicitOverride ? 'explicit-override' : 'production-default' });
    const headroom: BudgetEnvelope['headroom'] = input.headroom ?? { kind: 'none', amount: 0, sourceStageId: null };
    return Object.freeze({ stageId: input.stageId, scope: input.scope ?? 'stage-local', wall: currency(input.wallMs), work: currency(input.workUnits), nodes: currency(input.nodeCeiling), headroom, strictTotalWork: input.strictTotalWork ?? false });
}
type LegacyStageTags = { goalAttractionDisabledRetry?: boolean; earlyRepairSearch?: boolean; repairShrinkRecovery?: boolean; coarseStateNearTieRetentionRetry?: boolean; admissibleOrderNonDefaultRetry?: boolean; connectivityAxisExhaustedRetry?: boolean; repairElitePrefixDfsRetry?: boolean; mcNeighborBudgetRetry?: boolean; repairLateProbe?: boolean };
export function legacyStageTags(stageId: SolverStageId): LegacyStageTags {
    switch (stageId) {
        case 'early-repair-search': return { earlyRepairSearch: true };
        case 'goal-attraction-disabled-retry': return { goalAttractionDisabledRetry: true };
        case 'repair-shrink-recovery': return { earlyRepairSearch: true, repairShrinkRecovery: true };
        case 'coarse-state-near-tie-retention-disabled-retry': return { coarseStateNearTieRetentionRetry: true };
        case 'admissible-order-alternate-tiebreak-retry': return { admissibleOrderNonDefaultRetry: true };
        case 'connectivity-axis-prune-disabled-retry': return { connectivityAxisExhaustedRetry: true };
        case 'repair-elite-prefix-dfs-retry': return { repairElitePrefixDfsRetry: true };
        case 'must-cross-neighbor-prune-disabled-retry': return { mcNeighborBudgetRetry: true };
        case 'late-repair-search': return { repairLateProbe: true };
        default: return {};
    }
}
/** Canonical current writer: stage identity is single-written as stageId.
 * legacyStageTags() remains a compatibility projection for historical records only. */
export function withSolverStage<T extends object>(value: T, stageId: SolverStageId): T & { stageId: SolverStageId } {
    solverStageSpec(stageId);
    return { ...value, stageId };
}
