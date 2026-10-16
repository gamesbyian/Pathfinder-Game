#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { rankEligibleParents, selectionHash, validateConfirmationSpec } from './pg-g-symmetry-confirmation-lib.mjs';

assert.equal(
    selectionHash('pg-g-independent-symmetry-confirmation-v1', 'R00392'),
    '02fb11502785226f8822a3d3ef3b56e937d7e679c1c851856ae6077f2e76ead8',
);

const root = mkdtempSync(path.join(os.tmpdir(), 'pg-g-confirm-'));
const familyRoot = path.join(root, 'data', 'families');
mkdirSync(familyRoot, { recursive:true });
const ids = ['A','B','C','D','E','F'];
for (const id of ids) {
    writeFileSync(path.join(familyRoot, `family-${id}-symmetry-manifest.json`), JSON.stringify({
        parentId:id,
        familyMode:'symmetry',
        parentCorpus:'parents.json',
        parentContentHash:'hash-' + id,
        variants:[1,2,3,4,5,6,7].map(n => ({
            variantId:`F${id}-sym-${n}`,
            mutationManifest:{ variant:n, kind:n < 4 ? 'rotation' : 'reflection' },
        })),
    }));
}
writeFileSync(path.join(familyRoot, 'family-Z-sym-manifest.json'), '{}');
const namespace='fixture';
const ranked=rankEligibleParents(ids,{namespace,discoveryParents:['B']});
const selected=ranked.slice(0,3);
const spec={
    kind:'pathfinder-pg-g-independent-symmetry-confirmation-spec',
    selectionNamespace:namespace,
    discoveryParents:['B'],
    reservoirDefinition:{totalDirectSymmetryFamilies:6,eligibleParents:5},
    reservoir:ranked.map((row,index)=>({...row,selected:index<3})),
    selectedParents:selected,
};
const result=validateConfirmationSpec(spec,root);
assert.equal(result.directSymmetryFamilies,6);
assert.equal(result.eligibleParents,5);
assert.deepEqual(result.selectedIds,selected.map(row=>row.parentId));

const badHash=structuredClone(spec);
badHash.reservoir[0].selectionHash='0'.repeat(64);
assert.throws(()=>validateConfirmationSpec(badHash,root),/reservoir ranking mismatch/);

const badOrientation=structuredClone(spec);
const victim=selected[0].parentId;
writeFileSync(path.join(familyRoot,`family-${victim}-symmetry-manifest.json`),JSON.stringify({
    parentId:victim,familyMode:'symmetry',variants:[1,2,3,4,5,6,6].map(n=>({mutationManifest:{variant:n}})),
}));
assert.throws(()=>validateConfirmationSpec(badOrientation,root),/orientations mismatch/);

console.log('PG-G symmetry confirmation spec validation tests passed');
