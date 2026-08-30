import type { BeamResearchObserver, BeamResearchRecord } from './types.js';

export interface KnownSolutionLabel { path: number[]; provenance: string; family?: string; provenances?: string[]; families?: string[]; }
export interface PrefixSupport { paths: number; families: number; provenances: string[]; }
interface PrefixMatch extends PrefixSupport { solutionIds: number[]; familyIds: string[]; }

const keyOf = (path: readonly number[]): string => path.join(',');

/** Compact immutable prefix index. Labels are observation-only and never exposed to search. */
export class KnownSolutionPrefixIndex {
    private readonly prefixes = new Map<string, { paths: Set<number>; families: Set<string>; provenances: Set<string> }>();
    readonly solutions: KnownSolutionLabel[];

    constructor(labels: KnownSolutionLabel[]) {
        const unique = new Map<string, KnownSolutionLabel>();
        for (const label of labels) {
            if (!Array.isArray(label.path) || label.path.length === 0) throw new Error('known solution path must be non-empty');
            const id = keyOf(label.path);
            const prior = unique.get(id);
            if (!prior) unique.set(id, { ...label, path: [...label.path],
                provenances: [...new Set([...(label.provenances ?? []), label.provenance])],
                families: [...new Set([...(label.families ?? []), label.family ?? id])] });
            else {
                prior.provenances = [...new Set([...(prior.provenances ?? [prior.provenance]), ...(label.provenances ?? []), label.provenance])];
                prior.families = [...new Set([...(prior.families ?? [prior.family ?? id]), ...(label.families ?? []), label.family ?? id])];
            }
        }
        this.solutions = [...unique.values()];
        this.solutions.forEach((label, id) => {
            for (let n = 1; n <= label.path.length; n++) {
                const key = keyOf(label.path.slice(0, n));
                let entry = this.prefixes.get(key);
                if (!entry) this.prefixes.set(key, entry = { paths: new Set(), families: new Set(), provenances: new Set() });
                entry.paths.add(id);
                for (const family of label.families ?? [label.family ?? keyOf(label.path)]) entry.families.add(family);
                for (const provenance of label.provenances ?? [label.provenance]) entry.provenances.add(provenance);
            }
        });
    }

    match(path: readonly number[]): PrefixMatch {
        const hit = this.prefixes.get(keyOf(path));
        return hit ? { paths: hit.paths.size, families: hit.families.size, provenances: [...hit.provenances].sort(),
            solutionIds: [...hit.paths], familyIds: [...hit.families] }
            : { paths: 0, families: 0, provenances: [], solutionIds: [], familyIds: [] };
    }

    support(path: readonly number[]): PrefixSupport {
        const { paths, families, provenances } = this.match(path);
        return { paths, families, provenances };
    }
}

export interface KnownSolutionPrefixStageSummary {
    stage: string; depth: number; work: number; candidateCount: number;
    supportedCandidates: number; supportedPaths: number; supportedFamilies: number;
    details?: Record<string, unknown>;
    correctnessAlarm?: boolean;
    lossCause?: string;
}

/** Observer used by the real beam. It only consumes copied records after decisions are made. */
export class KnownSolutionPrefixSurvivalObserver implements BeamResearchObserver {
    readonly stages: KnownSolutionPrefixStageSummary[] = [];
    constructor(readonly index: KnownSolutionPrefixIndex, readonly options: {
        retainAllRemovalDetails?: boolean;
        retainRankedPoolDetails?: boolean;
    } = {}) {}
    observe(record: BeamResearchRecord): void {
        const supports = record.paths.map(path => this.index.match(path));
        const solutionIds = new Set(supports.flatMap(s => s.solutionIds));
        const familyIds = new Set(supports.flatMap(s => s.familyIds));
        const correctnessAlarm = record.stage === 'hard-pruned' && solutionIds.size > 0;
        let details = record.details;
        if (details && Array.isArray(details.rankedPool)) {
            const rankedPool = details.rankedPool as { path: number[]; rank: number; score: number; insertionOrder: number }[];
            const supportedPool = rankedPool.map(row => ({ ...row, match: this.index.match(row.path) }))
                .filter(row => row.match.paths > 0).map(row => ({ rank: row.rank, score: row.score,
                    insertionOrder: row.insertionOrder, paths: row.match.paths, families: row.match.familyIds }));
            const poolFamilies = new Set(supportedPool.flatMap(row => row.families));
            details = { ...details, poolCandidateCount: rankedPool.length, supportedPool,
                supportedPoolCandidates: supportedPool.length, supportedPoolFamilies: poolFamilies.size };
            if (!this.options.retainRankedPoolDetails) delete details.rankedPool;
        }
        if (details && !this.options.retainAllRemovalDetails) {
            const supportedKeys = new Set(record.paths.filter((_, i) => supports[i].paths > 0).map(keyOf));
            const filter = (values: unknown, pathField: string): unknown => Array.isArray(values)
                ? values.filter(value => value && typeof value === 'object' && supportedKeys.has(keyOf((value as Record<string, number[]>)[pathField] ?? [])))
                : values;
            details = { ...details };
            if ('rejections' in details) details.rejections = filter(details.rejections, 'path');
            if ('removals' in details) details.removals = filter(details.removals, 'removedPath');
            if ('culled' in details) details.culled = filter(details.culled, 'path');
        }
        this.stages.push({
            stage: record.stage, depth: record.depth, work: record.work,
            candidateCount: record.paths.length,
            supportedCandidates: supports.filter(s => s.paths > 0).length,
            supportedPaths: solutionIds.size,
            supportedFamilies: familyIds.size,
            ...(details ? { details } : {}),
            ...(correctnessAlarm ? { correctnessAlarm: true } : {}),
        });
    }
    summary(reqLen: number): Record<string, unknown> {
        // Removal-event records describe what left a population, not the surviving population.
        // Only boundary snapshots participate in extinction accounting.
        const boundaries = this.stages.filter(s => !['generated', 'hard-pruned', 'coarse-state-merge-removed', 'score-width-culled', 'mechanic-bucket-culled'].includes(s.stage));
        const supported = boundaries.filter(s => s.supportedCandidates > 0);
        const losses = boundaries.filter((s, i) => i > 0 && boundaries[i - 1].supportedCandidates > 0 && s.supportedCandidates === 0)
            .map(loss => {
                const lossIndex = this.stages.indexOf(loss);
                const removal = this.stages.slice(0, lossIndex).reverse().find(s => s.depth === loss.depth &&
                    s.supportedCandidates > 0 && ['hard-pruned', 'coarse-state-merge-removed', 'score-width-culled', 'mechanic-bucket-culled'].includes(s.stage));
                return { ...loss, lossCause: removal?.stage ?? (loss.stage === 'incoming-frontier' ? 'not-generated' : loss.stage) };
            });
        const last = supported.at(-1) ?? null;
        return {
            schemaVersion: 1, solutionLabels: this.index.solutions.length, stages: this.stages,
            firstSupportLoss: losses[0] ?? null, finalSupportLoss: losses.at(-1) ?? null,
            lastSupportDepth: last?.depth ?? null,
            normalizedLastSupportDepth: last ? last.depth / Math.max(1, reqLen) : null,
            workAfterFinalKnownSupport: last ? Math.max(0, (this.stages.at(-1)?.work ?? last.work) - last.work) : null,
            correctnessAlarms: this.stages.filter(s => s.correctnessAlarm),
            caution: 'Known support extinction does not prove that no valid solution remains.',
        };
    }
}