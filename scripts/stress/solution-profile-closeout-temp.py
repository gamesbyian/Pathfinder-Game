from pathlib import Path

lib_path = Path('scripts/stress/solution-profile-lib.mjs')
s = lib_path.read_text()

replacements = {
    '// Solution-space fingerprint primitives for the known-solvable corpora (published + stress-corpus-1).':
        '// Known-solution sample-profile primitives for the known-solvable corpora (published + stress-corpus-1).',
    ' * search is exhaustive. `provablyExhaustive` (computed by the caller from provenance) is the only\n * legitimate "this library is complete" signal; see docs/solver-solution-profile.md\'s caution.':
        ' * search is exhaustive. No generic profile field proves the stored library is the complete\n * solution space; see docs/solver-solution-profile.md for the evidence boundary.',
    ' *  corpus-wide summary — counts, central tendencies, and the "how many levels does each\n *  provenance source contribute usefully to" coverage table. Never claims corpus-wide exhaustion;':
        ' *  corpus-wide summary — counts, central tendencies, and the "how many levels does each\n *  provenance origin contribute usefully to" coverage table. Never claims corpus-wide exhaustion;',
    "? '- Discovery-saturation plateau: n/a (no level had enough hints to detect one).'":
        "? '- Discovery-saturation plateau: n/a (no comparable fully dated level had a detected plateau).'",
}
for old, new in replacements.items():
    assert old in s, f'missing expected lib fragment: {old}'
    s = s.replace(old, new)

bucket_anchor = """export function buildSinglePathProfile(path, level, seed = 20260703) {
    const objectives = extractObjectives(level);
    const mcKeys = mustCrossKeysOf(level);
    const useCrossings = requiredPathCoverageRatio(level) >= NEAR_HAMILTONIAN_COVERAGE_THRESHOLD;
    return buildBucketProfile([{ path, provenance: [] }], level, objectives, mcKeys, useCrossings, seed);
}
"""
bucket_insert = bucket_anchor + """
/** Resolve one persisted per-level bucket, including storage-deduplication references. */
export function storedLevelProfileForBucket(levelEntry, bucket = 'combined') {
    if (!levelEntry) return null;
    if (bucket === 'combined') return levelEntry.combined || null;
    const candidate = levelEntry.bySource?.[bucket];
    if (candidate?.sameAsCombined) return levelEntry.combined || null;
    return candidate || null;
}
"""
assert bucket_anchor in s
assert 'export function storedLevelProfileForBucket' not in s
s = s.replace(bucket_anchor, bucket_insert)

sat_anchor = """const footprintSet = (fp) => new Set(fp || []);
"""
sat_insert = sat_anchor + """
/** Comparable longitudinal saturation position. A fully dated sample below the heuristic's
 * minimum five observations cannot measure a plateau. With adequate chronology, null
 * `plateauFraction` means no plateau was detected, represented as the end of the observed stream. */
function saturationPosition(stats) {
    if (!stats?.chronologyComplete || (stats.totalHints ?? 0) < 5) return null;
    return stats.plateauFraction ?? 1;
}
"""
assert sat_anchor in s
assert 'function saturationPosition(stats)' not in s
s = s.replace(sat_anchor, sat_insert)

old_sat_term = """        discoverySaturation: a.discoverySaturation?.plateauFraction == null || b.discoverySaturation?.plateauFraction == null
            ? null : Math.abs(a.discoverySaturation.plateauFraction - b.discoverySaturation.plateauFraction),"""
new_sat_term = """        discoverySaturation: saturationPosition(a.discoverySaturation) == null || saturationPosition(b.discoverySaturation) == null
            ? null : Math.abs(saturationPosition(a.discoverySaturation) - saturationPosition(b.discoverySaturation)),"""
assert old_sat_term in s
s = s.replace(old_sat_term, new_sat_term)
lib_path.write_text(s)

compare_path = Path('scripts/stress/solution-profile-compare.mjs')
c = compare_path.read_text()
old_import = """    buildBucketProfile, buildSinglePathProfile, extractObjectives, nearestProfiles,
    computeHintSignature, regenerateCorpusProfile, SOLUTION_PROFILE_TAXONOMY,
    hasCurrentSolutionProfileTaxonomy,
"""
new_import = """    buildBucketProfile, buildSinglePathProfile, extractObjectives, nearestProfiles,
    computeHintSignature, regenerateCorpusProfile, SOLUTION_PROFILE_TAXONOMY,
    hasCurrentSolutionProfileTaxonomy, storedLevelProfileForBucket,
"""
assert old_import in c
c = c.replace(old_import, new_import)
old_helper = """function levelProfileForBucket(levelEntry, bucket) {
    if (bucket === 'combined') return levelEntry.combined;
    const bucketProfile = levelEntry.bySource?.[bucket];
    // A generator-side `sameAsCombined` marker is a storage deduplication reference, not a
    // profile. Resolve it here before handing the value to distance code.
    if (bucketProfile?.sameAsCombined) return levelEntry.combined;
    return bucketProfile;
}

"""
assert old_helper in c
c = c.replace(old_helper, '')
c = c.replace('const profile = levelProfileForBucket(levelEntry, bucket);', 'const profile = storedLevelProfileForBucket(levelEntry, bucket);')
compare_path.write_text(c)

test_path = Path('scripts/stress/solution-profile-lib-unit-tests.mjs')
t = test_path.read_text()
t = t.replace('buildBucketProfile, buildLevelSolutionProfile, buildSinglePathProfile, profileDistance,',
              'buildBucketProfile, buildLevelSolutionProfile, buildSinglePathProfile, storedLevelProfileForBucket, profileDistance,')
t = t.replace("test('mustCrossOrderStats: null below 2 must-cross keys; rigid=true when every path agrees', () => {",
              "test('mustCrossOrderStats: null below 2 must-cross keys; observedSingleOrder describes sample agreement', () => {")
t = t.replace('    assert.equal(stats.rigid, true);\n    assert.equal(stats.distinctFirstEntryOrders, 1);',
              '    assert.equal(stats.observedSingleOrder, true);\n    assert.equal(stats.rigid, true); // compatibility alias only\n    assert.equal(stats.distinctFirstEntryOrders, 1);')

bucket_test_anchor = """test('buildSinglePathProfile: degenerates cleanly for a lone witness path', () => {
    const level = { grid: { w: 3, h: 1 }, mustPass: [], mustCross: [], landmarks: [] };
    const profile = buildSinglePathProfile([p(0, 0), p(1, 0), p(2, 0)], level);
    assert.equal(profile.pathCount, 1);
    assert.equal(profile.pairwiseDistinctiveness.pairsCompared, 0);
});
"""
bucket_test = bucket_test_anchor + """

test('storedLevelProfileForBucket resolves sameAsCombined storage references', () => {
    const combined = { pathCount: 3, marker: 'combined' };
    const entry_ = {
        combined,
        bySource: {
            other: { pathCount: 3, sameAsCombined: true },
            witness: { pathCount: 2, marker: 'witness' },
        },
    };
    assert.equal(storedLevelProfileForBucket(entry_, 'other'), combined);
    assert.equal(storedLevelProfileForBucket(entry_, 'witness').marker, 'witness');
    assert.equal(storedLevelProfileForBucket(entry_, 'combined'), combined);
    assert.equal(storedLevelProfileForBucket(entry_, 'missing'), null);
});
"""
assert bucket_test_anchor in t
assert 'storedLevelProfileForBucket resolves sameAsCombined' not in t
t = t.replace(bucket_test_anchor, bucket_test)

sat_test_anchor = """test('profileDistanceTerms: one-path distribution axes are unknown rather than synthetic zero evidence', () => {
    const level = { grid: { w: 3, h: 1 }, mustPass: [], mustCross: [], landmarks: [] };
    const profile = buildSinglePathProfile([p(0, 0), p(1, 0), p(2, 0)], level);
    const terms = profileDistanceTerms(profile, profile);
    assert.equal(terms.prefixDiversity, null);
    assert.equal(terms.pairwiseDistinctiveness, null);
    assert.equal(terms.discoverySaturation, null);
    assert.equal(terms.turnChirality, null);
});
"""
sat_test = sat_test_anchor + """

test('profileDistanceTerms: adequate dated no-plateau history is an observed endpoint, not missing evidence', () => {
    const base = {
        cellVisitFrequency: { normalizedFootprint: [], entropy: 0 },
        turnDistribution: { turnRateMean: 0, cwFraction: null },
        mustCrossOrder: null,
        portalUsage: { pathsTotal: 5, pathsUsingPortals: 0 },
        objectiveSatisfaction: [],
        prefixDiversity: { pathsSampled: 1, meanSharedPrefixFrac: 0 },
        pairwiseDistinctiveness: { pairsCompared: 0, meanDistance: 0 },
        discoverySaturation: { chronologyComplete: true, totalHints: 5, plateauFraction: null },
    };
    const plateau = {
        ...base,
        discoverySaturation: { chronologyComplete: true, totalHints: 5, plateauFraction: 0.4 },
    };
    assert.ok(Math.abs(profileDistanceTerms(base, plateau).discoverySaturation - 0.6) < 1e-9);
    const incomplete = {
        ...base,
        discoverySaturation: { chronologyComplete: false, totalHints: 5, plateauFraction: null },
    };
    assert.equal(profileDistanceTerms(base, incomplete).discoverySaturation, null);
});
"""
assert sat_test_anchor in t
assert 'adequate dated no-plateau history' not in t
t = t.replace(sat_test_anchor, sat_test)
test_path.write_text(t)
