import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

export function selectionHash(namespace, parentId) {
    return createHash('sha256').update(String(namespace)).update('\0').update(String(parentId)).digest('hex');
}

export function discoverDirectSymmetryParents(datasetRoot) {
    const familyRoot = path.join(datasetRoot, 'data', 'families');
    return readdirSync(familyRoot)
        .map(name => /^family-(.+)-symmetry-manifest\.json$/.exec(name))
        .filter(Boolean)
        .map(match => match[1])
        .sort();
}

export function rankEligibleParents(parentIds, { namespace, discoveryParents = [] }) {
    const excluded = new Set(discoveryParents.map(String));
    return [...new Set(parentIds.map(String))]
        .filter(id => !excluded.has(id))
        .map(parentId => ({ parentId, selectionHash:selectionHash(namespace, parentId) }))
        .sort((a, b) => a.selectionHash.localeCompare(b.selectionHash) || a.parentId.localeCompare(b.parentId));
}

function assertEqual(actual, expected, label) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${label} mismatch\nexpected=${JSON.stringify(expected)}\nactual=${JSON.stringify(actual)}`);
    }
}

export function validateConfirmationSpec(spec, datasetRoot) {
    if (spec?.kind !== 'pathfinder-pg-g-independent-symmetry-confirmation-spec') {
        throw new Error('unexpected confirmation spec kind');
    }
    const discovered = discoverDirectSymmetryParents(datasetRoot);
    const definition = spec.reservoirDefinition ?? {};
    if (definition.totalDirectSymmetryFamilies != null && discovered.length !== definition.totalDirectSymmetryFamilies) {
        throw new Error(`direct symmetry family count mismatch: expected ${definition.totalDirectSymmetryFamilies}, got ${discovered.length}`);
    }

    const ranked = rankEligibleParents(discovered, {
        namespace:spec.selectionNamespace,
        discoveryParents:spec.discoveryParents ?? [],
    });
    if (definition.eligibleParents != null && ranked.length !== definition.eligibleParents) {
        throw new Error(`eligible parent count mismatch: expected ${definition.eligibleParents}, got ${ranked.length}`);
    }
    const declaredReservoir = (spec.reservoir ?? []).map(row => ({
        parentId:String(row.parentId),
        selectionHash:String(row.selectionHash),
        selected:!!row.selected,
    }));
    const expectedReservoir = ranked.map((row, index) => ({ ...row, selected:index < (spec.selectedParents?.length ?? 0) }));
    assertEqual(declaredReservoir, expectedReservoir, 'reservoir ranking');

    const selected = ranked.slice(0, spec.selectedParents?.length ?? 0);
    assertEqual(spec.selectedParents ?? [], selected, 'selected parent prefix');

    const familyRoot = path.join(datasetRoot, 'data', 'families');
    const familyRows = [];
    for (const { parentId } of selected) {
        const manifestFile = path.join(familyRoot, `family-${parentId}-symmetry-manifest.json`);
        const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
        const manifestParent = String(manifest.parentId ?? manifest.parentLevelId ?? '');
        if (manifestParent !== parentId) throw new Error(`${parentId}: manifest parent identity is ${manifestParent}`);
        if (manifest.familyMode !== 'symmetry') throw new Error(`${parentId}: familyMode is ${manifest.familyMode}`);
        const variants = manifest.variants ?? [];
        if (variants.length !== 7) throw new Error(`${parentId}: expected 7 symmetry siblings, got ${variants.length}`);
        const orientations = variants.map(row => Number(row?.mutationManifest?.variant)).sort((a,b)=>a-b);
        assertEqual(orientations, [1,2,3,4,5,6,7], `${parentId} orientations`);
        familyRows.push({
            parentId,
            parentCorpus:manifest.parentCorpus ?? null,
            parentContentHash:manifest.parentContentHash ?? null,
            orientations,
        });
    }

    return {
        directSymmetryFamilies:discovered.length,
        excludedDiscoveryParents:(spec.discoveryParents ?? []).filter(id => discovered.includes(id)).length,
        eligibleParents:ranked.length,
        selectedParents:selected.length,
        selectedIds:selected.map(row => row.parentId),
        familyRows,
    };
}
