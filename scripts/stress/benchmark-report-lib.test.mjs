import { describe, expect, it } from 'vitest';

import { benchmarkResultRows, solvedIdsFromBenchmarkReport } from './benchmark-report-lib.mjs';

describe('benchmark report envelope normalization', () => {
    const rows = [
        { id: 'A', ok: true },
        { id: 'B', ok: false },
        { id: 'C', ok: true },
    ];

    it('accepts the maintained capability-run rows envelope', () => {
        expect(benchmarkResultRows({ rows })).toBe(rows);
        expect([...solvedIdsFromBenchmarkReport({ rows })]).toEqual(['A', 'C']);
    });

    it('accepts the legacy levels envelope', () => {
        expect(benchmarkResultRows({ levels: rows })).toBe(rows);
        expect([...solvedIdsFromBenchmarkReport({ levels: rows })]).toEqual(['A', 'C']);
    });

    it('accepts a bare row array', () => {
        expect(benchmarkResultRows(rows)).toBe(rows);
        expect([...solvedIdsFromBenchmarkReport(rows)]).toEqual(['A', 'C']);
    });

    it('fails loudly instead of turning an unknown envelope into an empty solved set', () => {
        expect(() => benchmarkResultRows({ results: rows })).toThrow(/unsupported benchmark report shape/);
        expect(() => solvedIdsFromBenchmarkReport({})).toThrow(/unsupported benchmark report shape/);
    });
});
