import {
    buildPathFeatures,
    featureDistance,
    pathSignature,
    structuralSolutionFamilySignature,
} from '../../modules/domain/path-features.ts';
import {
    originsForHint,
    facetsForHint,
    provenanceTechniqueKey,
    provenanceDependencyStratum,
    classifyEvidenceApplicability,
} from './provenance-source-taxonomy.mjs';
import { classifyProvenanceClass } from './provenance-classes.mjs';

function setDifferenceSize(a, b) {
    let n = 0;
    for (const value of a) if (!b.has(value)) n++;
    return n;
}

function compareTupleDesc(a, b) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const av = a[i] ?? 0;
        const bv = b[i] ?? 0;
        if (av !== bv) return bv - av;
    }
    return 0;
}

export function describeHintEvidence(hint, {
    mcKeys = [], useCrossings = false, evidencePurpose = 'solution-atlas', currentSolverVersion = null,
    comparableSolverVersions = currentSolverVersion ? [currentSolverVersion] : [],
} = {}) {
    const provenance = hint?.provenance || [];
    const origins = originsForHint(hint);
    const facets = facetsForHint(hint);
    const techniques = new Set(provenance.map(provenanceTechniqueKey));
    const versions = new Set(provenance.map(entry => entry?.solver?.version).filter(Boolean));
    const strictClasses = new Set(provenance.map(entry => classifyProvenanceClass(entry, { standard: 'strict' })));
    const narrowClasses = new Set(provenance.map(entry => classifyProvenanceClass(entry, { standard: 'narrow' })));
    const evidenceObservations = provenance.length ? provenance : [null];
    const applicableEntries = evidenceObservations.filter(entry => classifyEvidenceApplicability(
        entry, evidencePurpose, { comparableSolverVersions },
    ).applicability === 'admissible');
    const attributedApplicableEntries = applicableEntries.filter(Boolean);
    const applicableOrigins = new Set(attributedApplicableEntries.map(entry => [...originsForHint({ provenance: [entry] })][0]));
    const applicableTechniques = new Set(attributedApplicableEntries.map(provenanceTechniqueKey));
    const applicableVersions = new Set(attributedApplicableEntries.map(entry => entry?.solver?.version).filter(Boolean));
    const dependencyStrata = new Set(attributedApplicableEntries.map(provenanceDependencyStratum));
    const path = hint?.path || [];
    return {
        hint,
        path,
        signature: pathSignature(path),
        structuralFamily: structuralSolutionFamilySignature(path, mcKeys),
        features: buildPathFeatures(path, mcKeys),
        origins,
        facets,
        techniques,
        versions,
        strictClasses,
        narrowClasses,
        provenanceEntries: provenance.length,
        applicableEntries: applicableEntries.length,
        applicableOrigins,
        applicableTechniques,
        applicableVersions,
        dependencyStrata,
        useCrossings,
    };
}

/**
 * Select a deterministic, structurally diverse subset of hints while preferring paths whose
 * provenance supplies broader independent evidence. This is an OFFLINE analysis helper only.
 *
 * Selection is greedy max-min over existing path-feature distance. The first representative is the
 * path with the broadest evidence footprint; later representatives prefer a new structural family,
 * then greater minimum path distance, then new origins/techniques/versions, then evidence volume.
 * Exact duplicate paths are collapsed before selection.
 */
export function selectRepresentativeHints(hints, {
    limit = 4,
    mcKeys = [],
    useCrossings = false,
    evidencePurpose = 'solution-atlas',
    currentSolverVersion = null,
    comparableSolverVersions = currentSolverVersion ? [currentSolverVersion] : [],
} = {}) {
    if (!Number.isFinite(limit) || limit <= 0) return [];

    const unique = new Map();
    for (const hint of hints || []) {
        if (!Array.isArray(hint?.path) || hint.path.length === 0) continue;
        const descriptor = describeHintEvidence(hint, {
            mcKeys, useCrossings, evidencePurpose, comparableSolverVersions,
        });
        const existing = unique.get(descriptor.signature);
        if (!existing || descriptor.dependencyStrata.size > existing.dependencyStrata.size ||
            (descriptor.dependencyStrata.size === existing.dependencyStrata.size &&
                descriptor.applicableEntries > existing.applicableEntries)) {
            unique.set(descriptor.signature, descriptor);
        }
    }
    const requiresAdmissibleEvidence = evidencePurpose === 'current-production-capability' ||
        evidencePurpose === 'technique-performance';
    const candidates = [...unique.values()].filter(descriptor =>
        !requiresAdmissibleEvidence || descriptor.applicableEntries > 0);
    if (candidates.length <= limit) return candidates.map(d => d.hint);

    const firstScore = d => [
        d.applicableEntries > 0 ? 1 : 0,
        d.dependencyStrata.size,
        d.applicableOrigins.size,
        d.applicableTechniques.size,
        d.applicableVersions.size,
        d.strictClasses.has('cold-capability') ? 1 : 0,
    ];
    candidates.sort((a, b) => compareTupleDesc(firstScore(a), firstScore(b)) || a.signature.localeCompare(b.signature));

    const selected = [candidates.shift()];
    while (selected.length < limit && candidates.length) {
        const selectedFamilies = new Set(selected.map(d => d.structuralFamily));
        const selectedOrigins = new Set(selected.flatMap(d => [...d.applicableOrigins]));
        const selectedTechniques = new Set(selected.flatMap(d => [...d.applicableTechniques]));
        const selectedVersions = new Set(selected.flatMap(d => [...d.applicableVersions]));

        let bestIndex = 0;
        let bestScore = null;
        for (let i = 0; i < candidates.length; i++) {
            const d = candidates[i];
            const minDistance = Math.min(...selected.map(s => featureDistance(d.features, s.features, useCrossings)));
            const score = [
                selectedFamilies.has(d.structuralFamily) ? 0 : 1,
                minDistance,
                d.applicableEntries > 0 ? 1 : 0,
                setDifferenceSize(d.applicableOrigins, selectedOrigins),
                setDifferenceSize(d.applicableTechniques, selectedTechniques),
                setDifferenceSize(d.applicableVersions, selectedVersions),
                d.strictClasses.has('cold-capability') ? 1 : 0,
                setDifferenceSize(d.dependencyStrata, new Set(selected.flatMap(s => [...s.dependencyStrata]))),
            ];
            if (bestScore === null || compareTupleDesc(score, bestScore) < 0 ||
                (compareTupleDesc(score, bestScore) === 0 && d.signature.localeCompare(candidates[bestIndex].signature) < 0)) {
                bestScore = score;
                bestIndex = i;
            }
        }
        selected.push(candidates.splice(bestIndex, 1)[0]);
    }

    return selected.map(d => d.hint);
}
