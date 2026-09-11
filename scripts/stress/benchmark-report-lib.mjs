// Shared benchmark/capability-report reader for offline stress diagnostics.
//
// Maintained artifacts do not all use the same envelope: older tools commonly emitted
// `{ levels: [...] }`, current capability-run per-level artifacts use `{ rows: [...] }`, and a few
// ad-hoc fixtures are bare arrays. Research CLIs must normalize these shapes explicitly rather than
// silently interpreting an unknown envelope as an empty solved set.

export function benchmarkResultRows(report) {
    if (Array.isArray(report)) return report;
    if (report && Array.isArray(report.rows)) return report.rows;
    if (report && Array.isArray(report.levels)) return report.levels;
    throw new Error('unsupported benchmark report shape: expected an array, { rows: [...] }, or { levels: [...] }');
}

export function solvedIdsFromBenchmarkReport(report) {
    return new Set(benchmarkResultRows(report)
        .filter(row => row && row.ok === true && row.id != null)
        .map(row => row.id));
}
