function distinctPathCount(hints) {
    return new Set(hints.map(hint => JSON.stringify(hint?.path ?? []))).size;
}

function earliestFoundAt(hint) {
    const times = (hint?.provenance ?? [])
        .map(entry => Date.parse(entry?.foundAt))
        .filter(Number.isFinite);
    return times.length ? Math.min(...times) : null;
}

function pushMismatch(mismatches, type, levelId, expected, actual) {
    mismatches.push({ type, levelId, expected, actual });
}

/**
 * Compare a tracked schema-v3 Solution Profile library with the current split hint sidecars at
 * the same corpus positions. Profile rows are position-keyed historically, so this deliberately
 * audits position alignment rather than pretending the persisted profile owns stable level IDs.
 */
export function auditTrackedProfileLibrary(library, levels, { sourcePath, maxExamples = 20 } = {}) {
    const mismatches = [];
    const byType = new Map();
    const libraryRows = Array.isArray(library?.levels) ? library.levels : [];

    if (library?.schemaVersion !== 3) pushMismatch(mismatches, 'schema-version', null, 3, library?.schemaVersion ?? null);
    if (sourcePath && library?.source !== sourcePath) pushMismatch(mismatches, 'source-path', null, sourcePath, library?.source ?? null);
    if (libraryRows.length !== levels.length) pushMismatch(mismatches, 'level-count', null, levels.length, libraryRows.length);

    const comparable = Math.min(levels.length, libraryRows.length);
    for (let index = 0; index < comparable; index++) {
        const level = levels[index];
        const row = libraryRows[index];
        const hints = Array.isArray(level?.hintRecords) ? level.hintRecords : [];
        const levelId = level?.id ?? `pos:${index + 1}`;
        const datedHints = hints.filter(hint => earliestFoundAt(hint) != null).length;
        const chronologyComplete = datedHints === hints.length;
        const expectedDistinct = distinctPathCount(hints);

        if (row?.level !== index + 1) pushMismatch(mismatches, 'position-key', levelId, index + 1, row?.level ?? null);
        if (row?.hintCount !== hints.length) pushMismatch(mismatches, 'hint-count', levelId, hints.length, row?.hintCount ?? null);
        if (row?.combined?.pathCount !== hints.length) pushMismatch(mismatches, 'combined-path-count', levelId, hints.length, row?.combined?.pathCount ?? null);
        if (row?.combined?.distinctPathCount !== expectedDistinct) {
            pushMismatch(mismatches, 'distinct-path-count', levelId, expectedDistinct, row?.combined?.distinctPathCount ?? null);
        }
        if (row?.combined?.discoverySaturation?.chronologyDatedHints !== datedHints) {
            pushMismatch(mismatches, 'chronology-dated-hints', levelId, datedHints, row?.combined?.discoverySaturation?.chronologyDatedHints ?? null);
        }
        if (row?.combined?.discoverySaturation?.chronologyComplete !== chronologyComplete) {
            pushMismatch(mismatches, 'chronology-complete', levelId, chronologyComplete, row?.combined?.discoverySaturation?.chronologyComplete ?? null);
        }
    }

    for (const mismatch of mismatches) byType.set(mismatch.type, (byType.get(mismatch.type) ?? 0) + 1);
    return {
        schemaVersion: library?.schemaVersion ?? null,
        provenanceTaxonomy: library?.provenanceTaxonomy ?? null,
        profileAlgorithmVersion: library?.profileAlgorithmVersion ?? null,
        source: library?.source ?? null,
        generatedAt: library?.generatedAt ?? null,
        currentLevels: levels.length,
        profileRows: libraryRows.length,
        compatible: mismatches.length === 0,
        mismatchCount: mismatches.length,
        mismatchTypes: Object.fromEntries([...byType.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
        examples: mismatches.slice(0, maxExamples),
    };
}
