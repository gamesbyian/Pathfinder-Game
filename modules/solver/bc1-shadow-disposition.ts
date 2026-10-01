import type { BeamResearchObserver, BeamResearchRecord, Bc1ShadowCandidateInfo } from './types.js';

/**
 * WS2-CUT-BALANCE-PROJECTION (BC1) later-disposition shadow — the smallest honest economics
 * microscope nominated by `reports/2026-09-21-bc1-removable-work-economics-seam-audit-001.md`.
 *
 * Unlike `KnownSolutionPrefixSurvivalObserver` (a fixed, pre-known label set matched by exact
 * length), BC1 conflicts are discovered dynamically *during* the same run via
 * `observeBc1Candidate`, and legitimate descendants can extend far past the flagged depth (BC1
 * fires mid-search, not at a terminal state). Membership is therefore "record path starts with a
 * flagged prefix", tracked incrementally per flagged node rather than through a static index.
 *
 * Production-inert: this class only ever observes already-computed `BeamResearchRecord`s and
 * `Bc1ShadowCandidateInfo`s; it never reads or writes solver state and cannot influence search.
 */

const REMOVAL_STAGES: ReadonlySet<BeamResearchRecord['stage']> = new Set([
    'generated', 'hard-pruned', 'coarse-state-merge-removed',
    'score-width-culled', 'mechanic-bucket-culled', 'ints-bucket-culled',
]);
const BOUNDARY_STAGES: ReadonlySet<BeamResearchRecord['stage']> = new Set([
    'incoming-frontier', 'post-hard-prune', 'post-production-coarse-state-merge',
    'post-score-width-cull', 'post-mechanic-bucket-selection', 'post-ints-bucket-selection',
]);

const isPrefixOf = (prefix: readonly number[], path: readonly number[]): boolean => {
    if (path.length < prefix.length) return false;
    for (let i = 0; i < prefix.length; i++) if (path[i] !== prefix[i]) return false;
    return true;
};

export interface Bc1FlaggedNode {
    path: number[];
    depth: number;
    workAtProof: number;
    constructionWorkUnits: number;
    conflicts: Bc1ShadowCandidateInfo['conflicts'];
}

/** `hard-pruned` = an ordinary rule later proved the same branch impossible (strongest saved-work
 *  nomination). `*-culled`/`coarse-state-merge-removed` = a lossy width/merge/quota removal (BC1
 *  may still save derivation work, but the branch was not guaranteed to die). `survived-observation-
 *  window` = never resolved before the run ended (potentially larger opportunity, not itself a
 *  saved-work number). See the seam audit's "Required Phase-1 records" section 4. */
export type Bc1DispositionOverlap = 'later-deterministic-rejection' | 'later-lossy-cull' | 'survived-observation-window';

export interface Bc1DispositionRecord extends Bc1FlaggedNode {
    everExpanded: boolean;
    lossCause: BeamResearchRecord['stage'] | null;
    lossDepth: number | null;
    workAtLoss: number | null;
    workDistance: number | null;
    overlap: Bc1DispositionOverlap;
}

interface FlagState {
    node: Bc1FlaggedNode;
    everExpanded: boolean;
    resolved: boolean;
    aliveSinceLastBoundary: boolean;
    lastRemovalWithExtension: { stage: BeamResearchRecord['stage']; depth: number; workSpent: number } | null;
    disposition: Bc1DispositionRecord | null;
}

export class Bc1ShadowDispositionObserver implements BeamResearchObserver {
    private readonly flaggedKeys = new Set<string>();
    private readonly states: FlagState[] = [];
    private finalized = false;
    private shadowInvocations = 0;
    private shadowTotalCost = 0;
    /** Feature histograms over live-lineage checks (first-flag/clear), keyed `pending:<n>` and `rem:<bucket>`:
     *  [checks, flags, costUnits]. Offline pre-filter policy evaluation (2026-09-30 lineage result's next gate). */
    private readonly featureHist = new Map<string, [number, number, number]>();
    private readonly lineageCounts = { inherited: 0, 'first-flag': 0, clear: 0, skipped: 0 };
    /** Lineage-aware mode: descendants of a flagged node are not re-checked (see BeamResearchObserver.bc1LineageAware). */
    readonly bc1LineageAware: boolean;
    readonly bc1FreshOnly: boolean;
    private shadowWallMs = 0;
    fastAgree = 0;
    fastMismatch = 0;
    verifyBc1Fast(agreed: boolean): void { if (agreed) this.fastAgree++; else this.fastMismatch++; }

    constructor(options: { lineageAware?: boolean; freshOnly?: boolean } = {}) {
        this.bc1FreshOnly = options.freshOnly === true;
        this.bc1LineageAware = options.lineageAware === true;
    }

    /** Aggregate cost across every candidate the shadow evaluates, flagged or not -- see this
     *  file's own doc and the 2026-09-30 cost-reduction result on why `observeBc1Candidate` alone
     *  (flagged-only) cannot answer what an unconditional per-candidate deployment would cost. */
    observeBc1ShadowCost(constructionWorkUnits: number, lineage: 'inherited' | 'first-flag' | 'clear' | 'skipped' = 'clear',
        features?: { pending: number; remainingSteps: number; depth: number; wallMs?: number }): void {
        this.lineageCounts[lineage]++;
        if (features?.wallMs) this.shadowWallMs += features.wallMs;
        if (features && lineage !== 'inherited' && lineage !== 'skipped') {
            const rem = features.remainingSteps;
            const remBucket = rem <= 20 ? String(rem) : `${Math.floor(rem / 20) * 20}+`;
            for (const key of [`pending:${features.pending}`, `rem:${remBucket}`, `pending:${features.pending}|rem:${remBucket}`]) {
                const row = this.featureHist.get(key) ?? [0, 0, 0];
                row[0]++; if (lineage === 'first-flag') row[1]++; row[2] += constructionWorkUnits;
                this.featureHist.set(key, row);
            }
        }
        this.shadowInvocations++;
        this.shadowTotalCost += constructionWorkUnits;
    }

    observeBc1Candidate(info: Bc1ShadowCandidateInfo): void {
        const key = info.path.join(',');
        if (this.flaggedKeys.has(key)) return; // first proof for this exact prefix wins; never reflag
        this.flaggedKeys.add(key);
        const node: Bc1FlaggedNode = { path: info.path, depth: info.depth, workAtProof: info.workSpent,
            constructionWorkUnits: info.constructionWorkUnits, conflicts: info.conflicts };
        this.states.push({ node, everExpanded: false, resolved: false, aliveSinceLastBoundary: true,
            lastRemovalWithExtension: null, disposition: null });
    }

    observe(record: BeamResearchRecord): void {
        if (this.states.length === 0) return;
        const isBoundary = BOUNDARY_STAGES.has(record.stage);
        const isRemoval = REMOVAL_STAGES.has(record.stage);
        if (!isBoundary && !isRemoval) return;
        for (const state of this.states) {
            if (state.resolved) continue;
            let extending = 0;
            for (const path of record.paths) {
                if (!isPrefixOf(state.node.path, path)) continue;
                extending++;
                if (path.length > state.node.path.length) state.everExpanded = true;
            }
            if (isRemoval && record.stage !== 'generated' && extending > 0) {
                state.lastRemovalWithExtension = { stage: record.stage, depth: record.depth, workSpent: record.workSpent };
            }
            if (isBoundary) {
                if (state.aliveSinceLastBoundary && extending === 0) {
                    const cause = state.lastRemovalWithExtension;
                    state.resolved = true;
                    state.disposition = {
                        ...state.node, everExpanded: state.everExpanded,
                        lossCause: cause?.stage ?? null, lossDepth: cause?.depth ?? record.depth,
                        workAtLoss: cause?.workSpent ?? record.workSpent,
                        workDistance: (cause?.workSpent ?? record.workSpent) - state.node.workAtProof,
                        overlap: cause?.stage === 'hard-pruned' ? 'later-deterministic-rejection' : 'later-lossy-cull',
                    };
                }
                state.aliveSinceLastBoundary = extending > 0;
                state.lastRemovalWithExtension = null;
            }
        }
    }

    /** Call once after the search this observer was attached to returns (solved or exhausted). */
    finalize(): void {
        if (this.finalized) return;
        this.finalized = true;
        for (const state of this.states) {
            if (state.resolved) continue;
            state.resolved = true;
            state.disposition = { ...state.node, everExpanded: state.everExpanded,
                lossCause: null, lossDepth: null, workAtLoss: null, workDistance: null,
                overlap: 'survived-observation-window' };
        }
    }

    /** Soundness alarm: a referee-valid solution must never pass through a state BC1 claimed dead.
     *  Any hit here means either this integration (not the proven theorem) has a bug, or the
     *  connectivity snapshot/candidate-state pairing at the shadow's call site is wrong. */
    checkSolutionSafety(solutionPath: readonly number[] | null): { alarm: boolean; violatingPrefixes: number[][] } {
        if (!solutionPath) return { alarm: false, violatingPrefixes: [] };
        const violating = this.states.map(s => s.node.path).filter(prefix => isPrefixOf(prefix, solutionPath));
        return { alarm: violating.length > 0, violatingPrefixes: violating };
    }

    summary(): { flaggedCount: number; resolved: Bc1DispositionRecord[]; shadowInvocations: number; shadowTotalCost: number; lineageCounts: { inherited: number; 'first-flag': number; clear: number; skipped: number }; shadowWallMs: number; fastAgree: number; fastMismatch: number; featureHist: Record<string, [number, number, number]> } {
        this.finalize();
        return { flaggedCount: this.states.length, resolved: this.states.map(s => s.disposition!),
            shadowInvocations: this.shadowInvocations, shadowTotalCost: this.shadowTotalCost, lineageCounts: { ...this.lineageCounts }, shadowWallMs: this.shadowWallMs, fastAgree: this.fastAgree, fastMismatch: this.fastMismatch, featureHist: Object.fromEntries(this.featureHist) };
    }
}
