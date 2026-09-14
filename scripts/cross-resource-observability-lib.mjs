import { classifyProvenanceOrigin, provenanceDependencyStratum } from './stress/provenance-source-taxonomy.mjs';
import { classifyCorpusSelectionLineage } from './corpus-selection-lineage.mjs';

const TRACKED_PROFILE_CORPORA = new Set(['published', 'stress1']);

function finiteTimestamp(value) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function median(values) {
    const clean = values.filter(Number.isFinite).sort((a, b) => a - b);
    if (!clean.length) return null;
    const mid = Math.floor(clean.length / 2);
    return clean.length % 2 ? clean[mid] : (clean[mid - 1] + clean[mid]) / 2;
}

function inc(map, key, amount = 1) {
    const normalized = key == null || key === '' ? '(missing)' : String(key);
    map.set(normalized, (map.get(normalized) ?? 0) + amount);
}

function sortedObject(map) {
    return Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function replayLineage(entry) {
    if (classifyProvenanceOrigin(entry) !== 'variant-parent-replay') return null;
    const stratum = provenanceDependencyStratum(entry);
    const match = /^variant-family:([^:]+):parent:(.+)$/.exec(stratum);
    return match ? { stratum, familyId: match[1], parentId: match[2] } : { stratum, familyId: null, parentId: null };
}

function firstDiscoveryClass(provenance) {
    if (!provenance.length) return 'unattributed';
    const classified = provenance.map(entry => ({ entry, origin: classifyProvenanceOrigin(entry), time: finiteTimestamp(entry?.foundAt) }));
    const undated = classified.filter(item => item.time == null);
    const allReplay = classified.every(item => item.origin === 'variant-parent-replay');
    if (undated.length) return allReplay ? 'variant-replay-only-timing-unknown' : 'timing-unknown';
    const firstTime = Math.min(...classified.map(item => item.time));
    const firstOrigins = new Set(classified.filter(item => item.time === firstTime).map(item => item.origin));
    if (firstOrigins.size === 1 && firstOrigins.has('variant-parent-replay')) return 'variant-replay-first';
    if (firstOrigins.has('variant-parent-replay')) return 'mixed-first';
    return 'non-replay-first';
}

export function summarizeHintObservability(hints = []) {
    const originHintCounts = new Map();
    const replayFamilies = new Set();
    const replayParents = new Set();
    let provenanceEntries = 0;
    let dependencyStrataWithinPath = 0;
    let unattributedHints = 0;
    let replayTouchedHints = 0;
    let replayOnlyHints = 0;
    let replayFirstHints = 0;
    let replayTimingUnknownHints = 0;
    let pathfinderTouchedHints = 0;
    let multiOriginHints = 0;
    let chronologyDatedHints = 0;

    for (const hint of hints) {
        const provenance = Array.isArray(hint?.provenance) ? hint.provenance : [];
        provenanceEntries += provenance.length;
        const origins = new Set(provenance.map(classifyProvenanceOrigin));
        if (!origins.size) origins.add('unattributed');
        for (const origin of origins) inc(originHintCounts, origin);
        if (origins.size > 1) multiOriginHints++;
        if (origins.has('variant-parent-replay')) replayTouchedHints++;
        if (origins.size === 1 && origins.has('variant-parent-replay')) replayOnlyHints++;
        if (origins.has('pathfinder-solver')) pathfinderTouchedHints++;
        if (!provenance.length) unattributedHints++;

        const strata = new Set(provenance.length ? provenance.map(provenanceDependencyStratum) : ['unattributed']);
        dependencyStrataWithinPath += strata.size;
        for (const entry of provenance) {
            const lineage = replayLineage(entry);
            if (!lineage) continue;
            if (lineage.familyId) replayFamilies.add(lineage.familyId);
            if (lineage.parentId) replayParents.add(lineage.parentId);
        }

        const firstClass = firstDiscoveryClass(provenance);
        if (firstClass === 'variant-replay-first') replayFirstHints++;
        if (firstClass === 'variant-replay-only-timing-unknown' || firstClass === 'timing-unknown') replayTimingUnknownHints++;
        if (provenance.some(entry => finiteTimestamp(entry?.foundAt) != null)) chronologyDatedHints++;
    }

    const distinctPaths = new Set(hints.map(hint => JSON.stringify(hint?.path ?? []))).size;
    return {
        hints: hints.length,
        distinctPaths,
        provenanceEntries,
        dependencyStrataWithinPath,
        rawEventsPerWithinPathStratum: dependencyStrataWithinPath ? Number((provenanceEntries / dependencyStrataWithinPath).toFixed(4)) : null,
        unattributedHints,
        multiOriginHints,
        pathfinderTouchedHints,
        replayTouchedHints,
        replayOnlyHints,
        replayFirstHints,
        replayTimingUnknownHints,
        replayFamilies: [...replayFamilies].sort(),
        replayParents: [...replayParents].sort(),
        chronologyDatedHints,
        chronologyComplete: hints.length > 0 && chronologyDatedHints === hints.length,
        originHintCounts: sortedObject(originHintCounts),
    };
}

function profileSupport(source, hintSummary) {
    let supportShape = 'none';
    if (hintSummary.distinctPaths === 1) supportShape = 'single-path';
    else if (hintSummary.distinctPaths > 1) supportShape = hintSummary.chronologyComplete
        ? 'multi-path-complete-chronology'
        : 'multi-path-incomplete-chronology';
    return {
        materialization: TRACKED_PROFILE_CORPORA.has(source) ? 'tracked-library' : 'derivable-not-tracked',
        supportShape,
        pathsObserved: hintSummary.distinctPaths,
        chronologyComplete: hintSummary.chronologyComplete,
        provenanceOriginsObserved: Object.keys(hintSummary.originHintCounts).filter(key => key !== 'unattributed').length,
    };
}

function familyForLevel(levelId, familyCoverage) {
    if (familyCoverage == null) return { availability: 'not-mounted' };
    const row = familyCoverage.get(levelId);
    if (!row) return { availability: 'mounted-no-parent-record', families: 0, variants: 0, modes: [], evaluated: null, solved: null };
    return { availability: 'parent-indexed', ...row };
}

export function analyzeLevelObservability({ source, level, metadata = null, familyCoverage = null }) {
    const hints = Array.isArray(level?.hintRecords) ? level.hintRecords : [];
    const hintSummary = summarizeHintObservability(hints);
    const family = familyForLevel(level.id, familyCoverage);
    const selectionLineage = classifyCorpusSelectionLineage(source, level, metadata);
    const replayParentSelfMatch = hintSummary.replayParents.includes(level.id);
    return {
        id: level.id,
        corpus: source,
        selectionLineage,
        provenance: hintSummary,
        profile: profileSupport(source, hintSummary),
        family,
        ancestry: {
            profileReplayExposed: hintSummary.replayTouchedHints > 0,
            replayFirstPathsKnown: hintSummary.replayFirstHints,
            replayParentSelfMatch,
            replayParentMismatch: hintSummary.replayParents.length > 0 && !replayParentSelfMatch,
        },
    };
}

function groupSummary(rows) {
    const familyKnown = rows.filter(row => row.family.availability !== 'not-mounted');
    return {
        levels: rows.length,
        medianHints: median(rows.map(row => row.provenance.hints)),
        medianDistinctPaths: median(rows.map(row => row.provenance.distinctPaths)),
        medianProvenanceEvents: median(rows.map(row => row.provenance.provenanceEntries)),
        medianWithinPathDependencyStrata: median(rows.map(row => row.provenance.dependencyStrataWithinPath)),
        multiPathProfiles: rows.filter(row => row.profile.pathsObserved > 1).length,
        completeChronologyProfiles: rows.filter(row => row.profile.chronologyComplete).length,
        replayTouchedLevels: rows.filter(row => row.provenance.replayTouchedHints > 0).length,
        replayFirstLevels: rows.filter(row => row.provenance.replayFirstHints > 0).length,
        replayOnlyLevels: rows.filter(row => row.provenance.replayOnlyHints > 0).length,
        familyCoverageKnownLevels: familyKnown.length,
        familyParents: rows.filter(row => row.family.availability === 'parent-indexed').length,
    };
}

function by(rows, keyFn) {
    const groups = new Map();
    for (const row of rows) {
        const key = keyFn(row) ?? '(missing)';
        const group = groups.get(key) ?? [];
        group.push(row);
        groups.set(key, group);
    }
    return Object.fromEntries([...groups.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, group]) => [key, groupSummary(group)]));
}

function compactCase(row) {
    return {
        id: row.id,
        corpus: row.corpus,
        selectionStratum: row.selectionLineage.stratum,
        hints: row.provenance.hints,
        distinctPaths: row.provenance.distinctPaths,
        provenanceEvents: row.provenance.provenanceEntries,
        dependencyStrata: row.provenance.dependencyStrataWithinPath,
        replayTouchedHints: row.provenance.replayTouchedHints,
        replayFirstHints: row.provenance.replayFirstHints,
        replayOnlyHints: row.provenance.replayOnlyHints,
        replayFamilies: row.provenance.replayFamilies.length,
        profileSupport: row.profile.supportShape,
        familyAvailability: row.family.availability,
        families: row.family.families ?? null,
        variants: row.family.variants ?? null,
    };
}

export function summarizeCrossResourceObservability(rows, familyIndexMeta = null, limit = 25) {
    const familyMounted = familyIndexMeta?.loaded === true;
    const familyParents = rows.filter(row => row.family.availability === 'parent-indexed');
    const replayTouched = rows.filter(row => row.provenance.replayTouchedHints > 0);
    const replayFirst = rows.filter(row => row.provenance.replayFirstHints > 0);
    const fourWay = familyParents.filter(row => row.provenance.hints > 0 && row.profile.pathsObserved > 0);
    const trackedFourWay = fourWay.filter(row => row.profile.materialization === 'tracked-library');
    const lowReplayFourWay = fourWay.filter(row => row.provenance.replayTouchedHints === 0);
    const replayHeavy = [...rows].sort((a, b) =>
        b.provenance.replayFirstHints - a.provenance.replayFirstHints ||
        b.provenance.replayTouchedHints - a.provenance.replayTouchedHints ||
        b.provenance.hints - a.provenance.hints || a.id.localeCompare(b.id));
    const richFourWay = [...fourWay].sort((a, b) =>
        (b.family.variants ?? 0) - (a.family.variants ?? 0) ||
        b.provenance.distinctPaths - a.provenance.distinctPaths || a.id.localeCompare(b.id));
    const cleanFourWay = [...lowReplayFourWay].sort((a, b) =>
        (b.family.variants ?? 0) - (a.family.variants ?? 0) ||
        b.provenance.distinctPaths - a.provenance.distinctPaths || a.id.localeCompare(b.id));

    const replayLineages = new Set();
    const replayParents = new Set();
    for (const row of rows) {
        for (const family of row.provenance.replayFamilies) replayLineages.add(`${row.id}\0${family}`);
        for (const parent of row.provenance.replayParents) replayParents.add(`${row.id}\0${parent}`);
    }

    return {
        schemaVersion: 1,
        familyIndex: familyIndexMeta ?? { loaded: false },
        totals: {
            levels: rows.length,
            trackedProfileLevels: rows.filter(row => row.profile.materialization === 'tracked-library').length,
            profileDerivableLevels: rows.filter(row => row.profile.pathsObserved > 0).length,
            replayTouchedLevels: replayTouched.length,
            replayFirstLevels: replayFirst.length,
            replayOnlyLevels: rows.filter(row => row.provenance.replayOnlyHints > 0).length,
            replayFamilyLevelLineages: replayLineages.size,
            replayParentLevelPairs: replayParents.size,
            replayParentMismatchLevels: rows.filter(row => row.ancestry.replayParentMismatch).length,
            familyParents: familyMounted ? familyParents.length : null,
            fourResourceJoinableLevels: familyMounted ? fourWay.length : null,
            fourResourceTrackedProfileLevels: familyMounted ? trackedFourWay.length : null,
            lowReplayFourResourceLevels: familyMounted ? lowReplayFourWay.length : null,
        },
        byCorpus: by(rows, row => row.corpus),
        bySelectionStratum: by(rows, row => row.selectionLineage.stratum),
        byHistoricalOutcomeConditioning: by(rows, row => row.selectionLineage.historicalOutcomeConditioning),
        topCases: {
            replayFeedbackCandidates: replayHeavy.filter(row => row.provenance.replayTouchedHints > 0).slice(0, limit).map(compactCase),
            fourResourceRichCandidates: richFourWay.slice(0, limit).map(compactCase),
            lowReplayFourResourceCandidates: cleanFourWay.slice(0, limit).map(compactCase),
        },
    };
}

export function familyCoverageFromIndex(index, currentLevelIds = null) {
    if (!index) return null;
    const allowed = currentLevelIds ? new Set(currentLevelIds) : null;
    const rows = new Map();
    for (const family of index.families ?? []) {
        if (allowed && !allowed.has(family.parentId)) continue;
        const row = rows.get(family.parentId) ?? {
            families: 0,
            variants: 0,
            modes: new Set(),
            parentCorpora: new Set(),
            evaluated: 0,
            solved: 0,
        };
        row.families++;
        row.variants += family.variantCount ?? 0;
        if (family.mode) row.modes.add(family.mode);
        if (family.parentCorpus) row.parentCorpora.add(family.parentCorpus);
        rows.set(family.parentId, row);
    }
    for (const variant of index.variants ?? []) {
        const row = rows.get(variant.parentId);
        if (!row) continue;
        if (variant.evaluated) row.evaluated++;
        if (variant.solved) row.solved++;
    }
    return new Map([...rows].map(([id, row]) => [id, {
        ...row,
        modes: [...row.modes].sort(),
        parentCorpora: [...row.parentCorpora].sort(),
    }]));
}
