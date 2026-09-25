#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { validatePlanQualityManifest } from './check-plan-quality.mjs';

const valid = {
  schemaVersion: 1,
  plan: 'docs/example-plan.md',
  status: 'draft',
  reconciledMainRef: 'main',
  premises: [{ question:'q', evidence:['e'], alternatives:['a'], discriminator:'d' }],
  repositoryPriorArt: [{ candidate:'existing', disposition:'reuse', reason:'fits' }],
  impactDomains: {
    definitionsSchemas:['schema'], producersWriters:[], transportsWorkers:[], consumersReaders:[],
    persistenceStores:[], cliPackage:[], workflowsTriggers:[], generatedArtifacts:[],
    testsValidatorsGuards:[], compatibilityHistory:[], currentDocsAuthorities:[],
    registriesCatalogues:[], researchSystem:[]
  },
  solverQueueImpact: {
    classification:'none',
    authoritiesChecked:['docs/solver-optimization-workstreams.md','docs/solver-future-work.md'],
    items:[],
    notes:'No solver-research priority or mechanism changes.'
  },
  phases:[{ id:'P1', name:'one', entry:[], outputs:['done'], affectedDomains:['definitionsSchemas'], exitProofIds:['DOD-1'] }],
  definitionsOfDone:[{ id:'DOD-1', claim:'works', proofs:[{ type:'test', locator:'test:x', expected:'passes' }] }],
  splashZone: {
    currentAuthorities:['docs/example.md'], workflows:[], registriesSchemas:[], generatedData:[],
    solverQueue:[], researchSystem:[], retireOrArchive:[], proofIds:['DOD-1']
  },
  hostileCloseout: {
    independentReconstruction:true,
    inventories:['producers','consumers','workflows','persistence','compatibility-history','current-authorities'],
    proofIds:['DOD-1']
  }
};

assert.deepEqual(validatePlanQualityManifest(valid,{planPath:'docs/example-plan.md'}), []);

const proseOnly = structuredClone(valid);
proseOnly.definitionsOfDone[0].proofs = [];
assert(validatePlanQualityManifest(proseOnly,{planPath:'docs/example-plan.md'}).some(e => e.includes('executable proof')));

const weakCloseout = structuredClone(valid);
weakCloseout.hostileCloseout.inventories = ['producers'];
assert(validatePlanQualityManifest(weakCloseout,{planPath:'docs/example-plan.md'}).some(e => e.includes('current-authorities')));

const noSplash = structuredClone(valid);
noSplash.splashZone.currentAuthorities = [];
assert(validatePlanQualityManifest(noSplash,{planPath:'docs/example-plan.md'}).some(e => e.includes('splashZone must name')));

console.log('plan quality checker tests passed');


// Repository-level closure: every tracked quality manifest is itself part of the permanent
// plan-quality contract. Use git's tracked-file population rather than a worktree crawl so sparse
// CI cannot make a manifest disappear from the census.
const tracked = execFileSync('git', ['ls-files', ':(glob)**/*.quality.json'], { encoding: 'utf8' })
  .split('\n').map(v => v.trim()).filter(Boolean);

for (const manifestPath of tracked) {
  const manifestText = fs.existsSync(manifestPath)
    ? fs.readFileSync(manifestPath, 'utf8')
    : execFileSync('git', ['show', `HEAD:${manifestPath}`], { encoding: 'utf8' });
  const manifest = JSON.parse(manifestText);
  const parsed = path.parse(manifest.plan);
  const expectedManifest = path.join(parsed.dir, `${parsed.name}.quality.json`).replaceAll('\\', '/');
  assert.equal(manifestPath.replaceAll('\\', '/'), expectedManifest,
    `${manifestPath}: quality manifest must be the sibling of the plan it closes`);

  // A manifest cannot point at an untracked or missing plan. git cat-file works even when sparse
  // checkout omitted the plan body from the physical worktree.
  execFileSync('git', ['cat-file', '-e', `HEAD:${manifest.plan}`], { stdio: 'pipe' });

  const errors = validatePlanQualityManifest(manifest, { planPath: manifest.plan });
  assert.deepEqual(errors, [], `${manifestPath}: ${errors.join('; ')}`);
}

console.log(`tracked plan-quality manifests validated: ${tracked.length}`);
