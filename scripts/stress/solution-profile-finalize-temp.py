from pathlib import Path


def replace_once(text, old, new, label):
    assert old in text, f'missing expected fragment: {label}'
    return text.replace(old, new, 1)


lib_path = Path('scripts/stress/solution-profile-lib.mjs')
s = lib_path.read_text()
s = replace_once(
    s,
    "export const SOLUTION_PROFILE_ALGORITHM_VERSION = 'sample-support-v1';",
    "export const SOLUTION_PROFILE_ALGORITHM_VERSION = 'sample-support-v2';",
    'algorithm version',
)

old_summary = '''export function summarizeCorpusProfiles(levelProfiles) {
    const withHints = levelProfiles.filter(p => !p.insufficientData);
    const combined = withHints.map(p => p.combined).filter(Boolean);
    const withMustCrossOrder = combined.filter(c => c.mustCrossOrder);
    const withSaturation = combined.filter(c => c.discoverySaturation?.plateauFraction !== null);

    const sourceCoverage = {};
    for (const source of PROVENANCE_SOURCES) {
        sourceCoverage[source] = withHints.filter(p => !p.bySource?.[source]?.insufficientData).length;
    }

    return {
        levelsTotal: levelProfiles.length,
        levelsWithHints: withHints.length,
        levelsInsufficientData: levelProfiles.length - withHints.length,
        levelsWithExhaustiveSearchEvent: combined.filter(c => c.hasExhaustiveSearchEvent).length,
        meanHintCount: Number(mean(withHints.map(p => p.hintCount)).toFixed(2)),
        meanPathwiseDistinctiveness: Number(mean(combined.map(c => c.pairwiseDistinctiveness.meanDistance)).toFixed(4)),
        meanTurnRate: Number(mean(combined.map(c => c.turnDistribution.turnRateMean)).toFixed(4)),
        meanCwFraction: Number(mean(combined.map(c => c.turnDistribution.cwFraction).filter(Number.isFinite)).toFixed(4)),
        levelsWithMustCrossOrder: withMustCrossOrder.length,
        levelsWithObservedSingleMustCrossOrder: withMustCrossOrder.filter(c => c.mustCrossOrder.observedSingleOrder).length,
        meanDiscoverySaturationPlateauFraction: withSaturation.length
            ? Number(mean(withSaturation.map(c => c.discoverySaturation.plateauFraction)).toFixed(4)) : null,
        sourceCoverage,
    };
}'''
new_summary = '''export function summarizeCorpusProfiles(levelProfiles) {
    const withHints = levelProfiles.filter(p => !p.insufficientData);
    const combined = withHints.map(p => p.combined).filter(Boolean);
    const withPairwise = combined.filter(c => (c.pairwiseDistinctiveness?.pairsCompared ?? 0) > 0);
    const chiralityValues = combined.map(c => c.turnDistribution?.cwFraction).filter(Number.isFinite);
    const withMustCrossOrder = combined.filter(c => c.mustCrossOrder);
    const withComparableMustCrossOrder = withMustCrossOrder.filter(c => (c.mustCrossOrder.pathsObserved ?? 0) >= 2);
    const withComparableSaturation = combined.filter(c =>
        c.discoverySaturation?.chronologyComplete === true && (c.discoverySaturation?.totalHints ?? 0) >= 5);
    const withDetectedSaturation = withComparableSaturation.filter(c => c.discoverySaturation.plateauFraction !== null);

    const originCoverage = {};
    for (const origin of PROVENANCE_SOURCES) {
        originCoverage[origin] = withHints.filter(p => !p.bySource?.[origin]?.insufficientData).length;
    }

    return {
        levelsTotal: levelProfiles.length,
        levelsWithHints: withHints.length,
        levelsInsufficientData: levelProfiles.length - withHints.length,
        levelsWithExhaustiveSearchEvent: combined.filter(c => c.hasExhaustiveSearchEvent).length,
        meanHintCount: Number(mean(withHints.map(p => p.hintCount)).toFixed(2)),
        levelsWithComparablePathwiseDistinctiveness: withPairwise.length,
        meanPathwiseDistinctiveness: withPairwise.length
            ? Number(mean(withPairwise.map(c => c.pairwiseDistinctiveness.meanDistance)).toFixed(4)) : null,
        meanTurnRate: Number(mean(combined.map(c => c.turnDistribution.turnRateMean)).toFixed(4)),
        meanCwFraction: chiralityValues.length ? Number(mean(chiralityValues).toFixed(4)) : null,
        levelsWithMustCrossOrder: withMustCrossOrder.length,
        levelsWithComparableMustCrossOrder: withComparableMustCrossOrder.length,
        levelsWithObservedSingleMustCrossOrder: withComparableMustCrossOrder
            .filter(c => c.mustCrossOrder.observedSingleOrder).length,
        levelsWithComparableDiscoverySaturation: withComparableSaturation.length,
        levelsWithDetectedDiscoverySaturationPlateau: withDetectedSaturation.length,
        meanDiscoverySaturationPlateauFraction: withDetectedSaturation.length
            ? Number(mean(withDetectedSaturation.map(c => c.discoverySaturation.plateauFraction)).toFixed(4)) : null,
        originCoverage,
        // Compatibility alias for schema-v2 consumers. New human-facing output uses origin terminology.
        sourceCoverage: originCoverage,
    };
}'''
s = replace_once(s, old_summary, new_summary, 'corpus summary')

old_render_start = '''export function renderSummaryMd(summary, corpusTag, levelsJsonLabel) {
    const lines = ['''
new_render_start = '''export function renderSummaryMd(summary, corpusTag, levelsJsonLabel) {
    const originCoverage = summary.originCoverage || summary.sourceCoverage || {};
    const comparablePairwise = summary.levelsWithComparablePathwiseDistinctiveness ?? summary.levelsWithHints ?? 0;
    const comparableMustCross = summary.levelsWithComparableMustCrossOrder ?? summary.levelsWithMustCrossOrder ?? 0;
    const comparableSaturation = summary.levelsWithComparableDiscoverySaturation ?? 0;
    const detectedSaturation = summary.levelsWithDetectedDiscoverySaturationPlateau ??
        (summary.meanDiscoverySaturationPlateauFraction === null ? 0 : comparableSaturation);
    const lines = ['''
s = replace_once(s, old_render_start, new_render_start, 'summary renderer header')
s = replace_once(
    s,
    '`# Solution-space fingerprint summary — ${corpusTag}`',
    '`# Known-solution sample-profile summary — ${corpusTag}`',
    'summary title',
)
old_pairwise = '''        `- Mean hints/level: **${summary.meanHintCount}**. Mean pairwise distinctiveness: ` +
        `**${summary.meanPathwiseDistinctiveness}**. Mean turn rate: **${summary.meanTurnRate}** ` +
        `(cw fraction **${summary.meanCwFraction}**).`,'''
new_pairwise = '''        `- Mean hints/level: **${summary.meanHintCount}**. Mean pairwise distinctiveness: ` +
        `${summary.meanPathwiseDistinctiveness === null ? 'n/a' : `**${summary.meanPathwiseDistinctiveness}**`} ` +
        `across **${comparablePairwise}** levels with at least one path pair. ` +
        `Mean turn rate: **${summary.meanTurnRate}** (cw fraction ` +
        `${summary.meanCwFraction === null ? 'n/a' : `**${summary.meanCwFraction}**`}).`,'''
s = replace_once(s, old_pairwise, new_pairwise, 'pairwise summary line')
old_mc = '''        `- Must-cross order: **${summary.levelsWithObservedSingleMustCrossOrder}** / ` +
        `${summary.levelsWithMustCrossOrder} multi-must-cross levels show one observed entry+completion order in the stored sample.`,'''
new_mc = '''        `- Must-cross order: **${summary.levelsWithObservedSingleMustCrossOrder}** / ` +
        `**${comparableMustCross}** support-comparable multi-must-cross levels show one observed ` +
        `entry+completion order; **${summary.levelsWithMustCrossOrder}** levels have the mechanic at all.`,'''
s = replace_once(s, old_mc, new_mc, 'must-cross summary line')
old_sat = '''        summary.meanDiscoverySaturationPlateauFraction === null
            ? '- Discovery-saturation plateau: n/a (no comparable fully dated level had a detected plateau).'
            : `- Mean discovery-saturation plateau point: **${summary.meanDiscoverySaturationPlateauFraction}** ` +
              'of a level\\'s hint corpus (heuristic — see doc; not proof of exhaustion).','''
new_sat = '''        `- Discovery saturation: **${detectedSaturation}** / **${comparableSaturation}** chronology-comparable ` +
        `levels had a detected plateau; mean detected point ` +
        `${summary.meanDiscoverySaturationPlateauFraction === null ? 'n/a' : `**${summary.meanDiscoverySaturationPlateauFraction}**`} ` +
        '(heuristic; no-plateau observations stay in the denominator and are not treated as missing).','''
s = replace_once(s, old_sat, new_sat, 'saturation summary line')
s = replace_once(
    s,
    '...PROVENANCE_SOURCES.map(s => `| ${s} | ${summary.sourceCoverage[s]} |`),',
    '...PROVENANCE_SOURCES.map(origin => `| ${origin} | ${originCoverage[origin] ?? 0} |`),',
    'origin coverage renderer',
)
s = replace_once(
    s,
    '/** Builds AND WRITES the full solution-space fingerprint library for one corpus — the single',
    '/** Builds AND WRITES the full known-solution sample-profile library for one corpus — the single',
    'generator docblock',
)
s = replace_once(
    s,
    "description: 'Per-level solution-space fingerprints (combined + per-provenance-source) for a '",
    "description: 'Per-level known-solution sample profiles (combined + per-provenance-origin) for a '",
    'generated description',
)
s = replace_once(
    s,
    '// Compact, not pretty-printed: this is a machine-readable fingerprint library, not a',
    '// Compact, not pretty-printed: this is a machine-readable sample-profile library, not a',
    'machine-readable comment',
)
lib_path.write_text(s)

compare_path = Path('scripts/stress/solution-profile-compare.mjs')
c = compare_path.read_text()
c = replace_once(
    c,
    'npx tsx scripts/stress/solution-profile-compare.mjs --target-level=42',
    'npx tsx scripts/stress/solution-profile-compare.mjs --target-level=pos:42',
    'comparer example selector',
)
c = replace_once(
    c,
    "console.error('Usage: --target-level=<n or id>",
    "console.error('Usage: --target-level=<pos:n or full-id>",
    'comparer usage selector',
)
compare_path.write_text(c)

doc_path = Path('docs/solver-solution-profile.md')
d = doc_path.read_text()
d = replace_once(d, 'profileAlgorithmVersion: sample-support-v1', 'profileAlgorithmVersion: sample-support-v2', 'doc algorithm version')
d = replace_once(
    d,
    'npm run stress:solution-profile-compare -- --target-level=42',
    'npm run stress:solution-profile-compare -- --target-level=pos:42',
    'doc comparer selector',
)
doc_path.write_text(d)

audit_path = Path('reports/2026-09-13-solution-profile-resource-audit-001.md')
a = audit_path.read_text()
a = replace_once(a, '`profileAlgorithmVersion: sample-support-v1`', '`profileAlgorithmVersion: sample-support-v2`', 'audit algorithm version')
audit_path.write_text(a)

tests_path = Path('scripts/stress/solution-profile-lib-unit-tests.mjs')
t = tests_path.read_text()
summary_marker = '''    assert.equal(summary.levelsTotal, 2);
    assert.equal(summary.levelsWithHints, 1);
    assert.equal(summary.levelsInsufficientData, 1);'''
summary_replacement = summary_marker + '''
    assert.equal(summary.levelsWithComparablePathwiseDistinctiveness, 0);
    assert.equal(summary.meanPathwiseDistinctiveness, null);
    assert.equal(summary.meanCwFraction, null);'''
t = replace_once(t, summary_marker, summary_replacement, 'summary support assertions')
t = replace_once(
    t,
    '    assert.match(md, /Must-cross order: \\*\\*1\\*\\* \\/ 2 multi-must-cross levels/);',
    '    assert.match(md, /Must-cross order: \\*\\*1\\*\\* \\/ \\*\\*2\\*\\* support-comparable/);',
    'renderer assertion',
)
t = replace_once(
    t,
    '    assert.doesNotMatch(md, /undefined/);',
    '    assert.match(md, /across \\*\\*2\\*\\* levels with at least one path pair/);\n    assert.doesNotMatch(md, /undefined/);',
    'renderer compatibility assertion',
)
tests_path.write_text(t)
