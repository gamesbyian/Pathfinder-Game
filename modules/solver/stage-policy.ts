/** Stable policy-level identities shared by orchestration, telemetry, and alternate schedulers. */
export const SOLVER_STAGE_IDS = [
    'prime', 'repair-probe', 'main-loop', 'repair-fallback', 'attraction-diversity',
    'repair-probe-shrink-recovery', 'admissible-order', 'dedup-near-tie-retry',
    'admissible-order-non-default-retry', 'connectivity-axis-exhausted-retry',
    'repair-elite-prefix-dfs-retry', 'mc-neighbor-budget-retry', 'repair-late-probe',
    'goal-attraction-legacy-distance-retry', 'repair-late-probe-multi-seed-retry',
    'portfolio-pass', 'portfolio-fallback',
] as const;
export type SolverStageId = typeof SOLVER_STAGE_IDS[number];
export type SolverStageDisposition = 'production-default' | 'promoted' | 'opt-in' | 'experiment-only';
export type SolverSchedulerPhase = 'prime' | 'probe' | 'main' | 'fallback' | 'retry' | 'portfolio';
export type StageBudgetPolicyId = 'caller-main' | 'fixed-probe' | 'additive-fraction' | 'withheld-node-reserve' | 'additive-node-headroom' | 'fixed-node-cap' | 'portfolio-pass';
export interface SolverStageSpec {
    id: SolverStageId; order: number; disposition: SolverStageDisposition;
    schedulerPhase: SolverSchedulerPhase; eligibility: string;
    attemptSource: 'configured-main' | 'configured-repair' | 'admissible-order-profiles' | 'prime' | 'portfolio';
    budgetPolicy: StageBudgetPolicyId; telemetryLabel: SolverStageId; retryIdentity: string | null;
}
// Disposition is current policy status, not historical origin. In particular, a retry promoted to
// production default must say `promoted` here even if its feature began life as an opt-in. Keep this
// aligned with ablation-config.ts's OPT_IN_FEATURES/default polarity and the opt-in experiment ledger;
// schedulers/reports consume this registry as metadata and must not resurrect stale pre-promotion state.
const rows = [
    ['prime', 0, 'experiment-only', 'prime', 'explicit primeAttempt option', 'prime', 'fixed-node-cap', null],
    ['repair-probe', 10, 'production-default', 'probe', 'repair configs and repair probe enabled', 'configured-repair', 'fixed-probe', null],
    ['main-loop', 20, 'production-default', 'main', 'configured non-repair attempts', 'configured-main', 'caller-main', null],
    ['repair-fallback', 30, 'production-default', 'fallback', 'configured repair attempts and positive repair fraction', 'configured-repair', 'additive-fraction', null],
    ['attraction-diversity', 40, 'promoted', 'retry', 'candidate flag active and extra passes enabled', 'configured-main', 'withheld-node-reserve', 'attraction-diversity'],
    ['repair-probe-shrink-recovery', 50, 'opt-in', 'retry', 'a biased probe was shrunk and recovery enabled', 'configured-repair', 'withheld-node-reserve', 'repair-probe-shrink-recovery'],
    ['admissible-order', 60, 'production-default', 'fallback', 'admissible-order tier enabled', 'admissible-order-profiles', 'withheld-node-reserve', null],
    ['dedup-near-tie-retry', 70, 'promoted', 'retry', 'dedup retry flag and budget enabled', 'configured-main', 'additive-node-headroom', 'dedup-near-tie-retry'],
    ['admissible-order-non-default-retry', 80, 'promoted', 'retry', 'non-default admissible retry enabled', 'admissible-order-profiles', 'additive-node-headroom', 'admissible-order-non-default-retry'],
    ['connectivity-axis-exhausted-retry', 90, 'promoted', 'retry', 'connectivity retry enabled', 'configured-main', 'additive-node-headroom', 'connectivity-axis-exhausted-retry'],
    ['repair-elite-prefix-dfs-retry', 100, 'opt-in', 'retry', 'elite-prefix repair retry enabled', 'configured-repair', 'additive-node-headroom', 'repair-elite-prefix-dfs-retry'],
    ['mc-neighbor-budget-retry', 110, 'promoted', 'retry', 'must-cross neighbor retry enabled', 'configured-main', 'additive-node-headroom', 'mc-neighbor-budget-retry'],
    ['repair-late-probe', 120, 'promoted', 'retry', 'late repair probe enabled', 'configured-repair', 'fixed-node-cap', 'repair-late-probe'],
    ['goal-attraction-legacy-distance-retry', 125, 'promoted', 'retry', 'goal-attraction legacy-distance retry enabled', 'configured-main', 'additive-node-headroom', 'goal-attraction-legacy-distance-retry'],
    ['repair-late-probe-multi-seed-retry', 128, 'promoted', 'retry', 'repair-late-probe multi-seed retry enabled and repair-late-probe itself eligible', 'configured-repair', 'additive-node-headroom', 'repair-late-probe-multi-seed-retry'],
    ['portfolio-pass', 20, 'experiment-only', 'portfolio', 'portfolio pass includes config', 'portfolio', 'portfolio-pass', null],
    ['portfolio-fallback', 130, 'experiment-only', 'portfolio', 'portfolio passes did not solve', 'configured-main', 'caller-main', null],
] as const;
export const SOLVER_STAGE_SPECS = Object.freeze(Object.fromEntries(rows.map(([id, order, disposition, schedulerPhase, eligibility, attemptSource, budgetPolicy, retryIdentity]) => [id, Object.freeze({ id, order, disposition, schedulerPhase, eligibility, attemptSource, budgetPolicy, telemetryLabel: id, retryIdentity })])) as unknown as Record<SolverStageId, SolverStageSpec>);
export function solverStageSpec(id: SolverStageId): SolverStageSpec {
    const spec = SOLVER_STAGE_SPECS[id];
    if (!spec) throw new Error(`Unknown solver stage: ${String(id)}`);
    return spec;
}
export interface BudgetCurrency { ceiling: number | null; capped: boolean; source: 'production-default' | 'explicit-override'; }
export interface BudgetEnvelope {
    stageId: SolverStageId; scope: 'stage-local' | 'whole-solve'; wall: BudgetCurrency; work: BudgetCurrency; nodes: BudgetCurrency;
    headroom: { kind: 'none' | 'additive' | 'withheld'; amount: number; sourceStageId: SolverStageId | null }; strictTotalWork: boolean;
}
export function createBudgetEnvelope(input: { stageId: SolverStageId; wallMs?: number; workUnits?: number; nodeCeiling?: number; explicitOverride?: boolean; scope?: BudgetEnvelope['scope']; strictTotalWork?: boolean; headroom?: BudgetEnvelope['headroom'] }): BudgetEnvelope {
    solverStageSpec(input.stageId);
    const currency = (value: number | undefined): BudgetCurrency => ({ ceiling: value === undefined || value === Infinity ? null : value, capped: value !== undefined && Number.isFinite(value), source: input.explicitOverride ? 'explicit-override' : 'production-default' });
    const headroom: BudgetEnvelope['headroom'] = input.headroom ?? { kind: 'none', amount: 0, sourceStageId: null };
    return Object.freeze({ stageId: input.stageId, scope: input.scope ?? 'stage-local', wall: currency(input.wallMs), work: currency(input.workUnits), nodes: currency(input.nodeCeiling), headroom, strictTotalWork: input.strictTotalWork ?? false });
}
type LegacyStageTags = { attractionDiversity?: boolean; repairProbe?: boolean; repairProbeShrinkRecovery?: boolean; dedupNearTieRetry?: boolean; admissibleOrderNonDefaultRetry?: boolean; connectivityAxisExhaustedRetry?: boolean; repairElitePrefixDfsRetry?: boolean; mcNeighborBudgetRetry?: boolean; repairLateProbe?: boolean };
export function legacyStageTags(stageId: SolverStageId): LegacyStageTags {
    switch (stageId) {
        case 'repair-probe': return { repairProbe: true };
        case 'attraction-diversity': return { attractionDiversity: true };
        case 'repair-probe-shrink-recovery': return { repairProbe: true, repairProbeShrinkRecovery: true };
        case 'dedup-near-tie-retry': return { dedupNearTieRetry: true };
        case 'admissible-order-non-default-retry': return { admissibleOrderNonDefaultRetry: true };
        case 'connectivity-axis-exhausted-retry': return { connectivityAxisExhaustedRetry: true };
        case 'repair-elite-prefix-dfs-retry': return { repairElitePrefixDfsRetry: true };
        case 'mc-neighbor-budget-retry': return { mcNeighborBudgetRetry: true };
        case 'repair-late-probe': return { repairLateProbe: true };
        default: return {};
    }
}
export function withSolverStage<T extends object>(value: T, stageId: SolverStageId): T & { stageId: SolverStageId } & LegacyStageTags {
    solverStageSpec(stageId);
    return { ...value, stageId, ...legacyStageTags(stageId) };
}
