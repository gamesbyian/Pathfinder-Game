#!/usr/bin/env node
import assert from 'node:assert/strict';
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
