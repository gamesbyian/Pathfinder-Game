from pathlib import Path

lib = Path('scripts/stress/solution-profile-lib.mjs')
s = lib.read_text()
replacements = {
    "'exhaustive' (provablyExhaustive), which is a per-level fact, not an inference.":
        "'exhaustive' (an event-local marker), without promoting that event into a whole-library completeness claim.",
    '`- **${summary.levelsProvablyExhaustive}** levels have at least one hint whose own search ` +':
        '`- **${summary.levelsWithExhaustiveSearchEvent}** levels have at least one hint whose own search ` +',
    '`- Must-cross order: **${summary.levelsWithRigidMustCrossOrder}** / ` +':
        '`- Must-cross order: **${summary.levelsWithObservedSingleMustCrossOrder}** / ` +',
    'function renderSummaryMd(summary, corpusTag, levelsJsonLabel) {':
        'export function renderSummaryMd(summary, corpusTag, levelsJsonLabel) {',
}
for old, new in replacements.items():
    assert old in s, f'missing expected renderer fragment: {old}'
    s = s.replace(old, new)
lib.write_text(s)

tests = Path('scripts/stress/solution-profile-lib-unit-tests.mjs')
t = tests.read_text()
old_import = 'profileDistanceTerms, profileDistanceWithCoverage, nearestProfiles, summarizeCorpusProfiles, PROVENANCE_SOURCES,'
new_import = 'profileDistanceTerms, profileDistanceWithCoverage, nearestProfiles, summarizeCorpusProfiles, renderSummaryMd, PROVENANCE_SOURCES,'
assert old_import in t
t = t.replace(old_import, new_import)
regression = """

test('renderSummaryMd uses current event/order summary fields', () => {
    const md = renderSummaryMd({
        levelsTotal: 2,
        levelsWithHints: 2,
        levelsInsufficientData: 0,
        levelsWithExhaustiveSearchEvent: 1,
        meanHintCount: 3,
        meanPathwiseDistinctiveness: 0.25,
        meanTurnRate: 0.4,
        meanCwFraction: 0.5,
        levelsWithObservedSingleMustCrossOrder: 1,
        levelsWithMustCrossOrder: 2,
        meanDiscoverySaturationPlateauFraction: null,
        sourceCoverage: Object.fromEntries(PROVENANCE_SOURCES.map(source => [source, 0])),
    }, 'test', 'data/test.json');
    assert.match(md, /\\*\\*1\\*\\* levels have at least one hint/);
    assert.match(md, /Must-cross order: \\*\\*1\\*\\* \\/ \\*\\*2\\*\\*/);
    assert.doesNotMatch(md, /undefined/);
});
"""
assert "renderSummaryMd uses current event/order summary fields" not in t
t += regression
tests.write_text(t)
