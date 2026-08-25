import './types.js';

declare module './types.js' {
    interface PrepLevel {
        /** Research-only sibling-order observer. Absent in production; receives copied scalar
         * rankings only and cannot alter candidate arrays or search decisions. */
        _orderingResearchObserver?: OrderingResearchObserver | null;
    }

    export interface OrderingResearchPolicy {
        id: string;
        /** null means the true no-soft-tie-break admissible ordering; DFS ignores null policies. */
        profile: ScoringProfile | null;
        template?: StructuralTemplate | null;
    }

    export interface OrderingResearchRecord {
        family: 'dfs' | 'admissible-order';
        depth: number;
        candidates: number[];
        rankings: { policyId: string; order: number[]; scores: number[] }[];
        admissibleSlack?: { candidate: number; slack: number }[];
        pairwiseDivergences?: {
            leftPolicyId: string; rightPolicyId: string; leftTop: number; rightTop: number;
            leftMargin: number; rightMargin: number;
            scoringWeightContributions: { term: string; marginDelta: number }[];
            contributionSum: number;
        }[];
    }

    export interface OrderingResearchObserver {
        policies?: readonly OrderingResearchPolicy[];
        observe(record: OrderingResearchRecord): void;
    }
}
