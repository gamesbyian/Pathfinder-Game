import { describe, expect, it } from 'vitest';
import {
    classifyKnownRescuer,
    classifyResidualLevel,
    isBaseT1CensusRow,
    summarizeResidualClasses,
} from '../scripts/stress/residual-classification-lib.mjs';

const win = identity => ({ identity, nodes: 10, gate: 'G' });

describe('residual classification authority', () => {
    it('preserves the corrected base-T1 predicate: variantLabel is bookkeeping, ablation is not', () => {
        const cleanPromoted = {
            corpus: 'corpus2', tier: 'T1', techniqueKeys: ['repair|score=repair|guidance=turn-biased'],
            variantLabel: 'repair|score=repair|guidance=turn-biased', ablation: null,
        };
        expect(isBaseT1CensusRow(cleanPromoted)).toBe(true);
        expect(isBaseT1CensusRow({ ...cleanPromoted, ablation: { disable: ['x'] } })).toBe(false);
        expect(isBaseT1CensusRow({ ...cleanPromoted, flagExperiment: 'X' })).toBe(false);
        expect(isBaseT1CensusRow({ ...cleanPromoted, pairLabel: 'pair' })).toBe(false);
    });

    it('matches the atlas static-ladder class 1/2/3 semantics', () => {
        const identity = 'beam|score=default|bias=none|width=100|retention=plain';
        expect(classifyKnownRescuer(win(identity)).class).toBe(1);
        expect(classifyKnownRescuer(win(identity), { offeredLadder: new Set([identity]) }).class).toBe(2);
        expect(classifyKnownRescuer(win(identity), {
            offeredLadder: new Set([identity]), dispatchedIdentities: new Set([identity]),
        }).class).toBe(3);
    });

    it('matches the atlas repair-family reach/starvation semantics', () => {
        const identity = 'repair|score=repair|guidance=standard';
        expect(classifyKnownRescuer(win(identity)).class).toBe(1);
        expect(classifyKnownRescuer(win(identity), { reachedSet: new Set(['repair-fallback']) }).class).toBe(2);
        expect(classifyKnownRescuer(win(identity), {
            reachedSet: new Set(['repair-fallback']), dispatchedIdentities: new Set([identity]),
        }).class).toBe(3);
        expect(classifyKnownRescuer(win(identity), {
            reachedSet: new Set(['repair-fallback']), starvedSet: new Set(['repair-fallback']),
            dispatchedIdentities: new Set([identity]),
        }).class).toBe(2);
    });

    it('preserves primary-class precedence and reserves classes 4/5 for zero T1 winners', () => {
        const c1 = 'beam|score=a|bias=none|width=10|retention=plain';
        const c2 = 'beam|score=b|bias=none|width=10|retention=plain';
        const mixed = classifyResidualLevel({
            t1Wins: [win(c1), win(c2)],
            offeredLadder: new Set([c2]),
            provenanceRescuer: { technique: 'historical' },
        });
        expect(mixed.primaryClass).toBe(1);
        expect(mixed.classes).toEqual({ 1: true, 2: true, 3: false, 4: false, 5: false });

        expect(classifyResidualLevel({ provenanceRescuer: { technique: 'historical' } }).primaryClass).toBe(4);
        expect(classifyResidualLevel({}).primaryClass).toBe(5);
    });

    it('produces the same five-class summary shape consumed by the atlas', () => {
        const rows = [
            classifyResidualLevel({}),
            classifyResidualLevel({ provenanceRescuer: { technique: 'x' } }),
        ];
        const summary = summarizeResidualClasses(rows);
        expect(summary[4].primary).toBe(1);
        expect(summary[5].primary).toBe(1);
        expect(summary[1].primary).toBe(0);
    });
});
