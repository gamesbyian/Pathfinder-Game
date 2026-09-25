#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const PROOF_TYPES = new Set([
  'command',
  'test',
  'guard',
  'census',
  'workflow',
  'artifact',
  'query',
  'manual-evidence',
]);

export function validatePlanQualityManifest(manifest, { planPath = null } = {}) {
  const errors = [];
  const req = (condition, message) => { if (!condition) errors.push(message); };

  req(manifest && typeof manifest === 'object' && !Array.isArray(manifest), 'manifest must be an object');
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return errors;

  req(manifest.schemaVersion === 1, 'schemaVersion must be 1');
  req(typeof manifest.plan === 'string' && manifest.plan.trim(), 'plan must be a non-empty path');
  if (planPath && typeof manifest.plan === 'string') {
    const a = path.normalize(manifest.plan);
    const b = path.normalize(planPath);
    req(a === b, `manifest plan (${manifest.plan}) must match requested plan (${planPath})`);
  }
  req(typeof manifest.status === 'string' && manifest.status.trim(), 'status must be non-empty');
  req(typeof manifest.reconciledMainRef === 'string' && manifest.reconciledMainRef.trim(), 'reconciledMainRef is required');

  req(Array.isArray(manifest.premises) && manifest.premises.length > 0, 'premises must contain at least one challenged premise');
  for (const [i, p] of (manifest.premises || []).entries()) {
    req(typeof p.question === 'string' && p.question.trim(), `premises[${i}].question is required`);
    req(Array.isArray(p.evidence) && p.evidence.length > 0, `premises[${i}].evidence must be non-empty`);
    req(Array.isArray(p.alternatives) && p.alternatives.length > 0, `premises[${i}].alternatives must be non-empty`);
    req(typeof p.discriminator === 'string' && p.discriminator.trim(), `premises[${i}].discriminator is required`);
  }

  req(Array.isArray(manifest.repositoryPriorArt) && manifest.repositoryPriorArt.length > 0, 'repositoryPriorArt must classify at least one existing analogue');
  for (const [i, p] of (manifest.repositoryPriorArt || []).entries()) {
    req(typeof p.candidate === 'string' && p.candidate.trim(), `repositoryPriorArt[${i}].candidate is required`);
    req(['reuse','extend','parallel-with-distinction','not-applicable'].includes(p.disposition), `repositoryPriorArt[${i}].disposition is invalid`);
    req(typeof p.reason === 'string' && p.reason.trim(), `repositoryPriorArt[${i}].reason is required`);
  }

  const impactKeys = [
    'definitionsSchemas','producersWriters','transportsWorkers','consumersReaders',
    'persistenceStores','cliPackage','workflowsTriggers','generatedArtifacts',
    'testsValidatorsGuards','compatibilityHistory','currentDocsAuthorities',
    'registriesCatalogues','researchSystem',
  ];
  req(manifest.impactDomains && typeof manifest.impactDomains === 'object', 'impactDomains is required');
  for (const key of impactKeys) {
    req(Array.isArray(manifest.impactDomains?.[key]), `impactDomains.${key} must be an array (empty is allowed only when explicitly not applicable in plan prose)`);
  }
  const impactCount = impactKeys.reduce((n, k) => n + (Array.isArray(manifest.impactDomains?.[k]) ? manifest.impactDomains[k].length : 0), 0);
  req(impactCount > 0, 'impactDomains must classify at least one concrete surface');

  const sq = manifest.solverQueueImpact;
  req(sq && typeof sq === 'object', 'solverQueueImpact is required');
  req(['none','blocks','unblocks','evidence-quality','acquisition-cost','observation-surface','retires-workaround','invalidates-evidence','mechanism-only'].includes(sq?.classification), 'solverQueueImpact.classification is invalid');
  req(Array.isArray(sq?.authoritiesChecked) && sq.authoritiesChecked.length > 0, 'solverQueueImpact.authoritiesChecked must be non-empty');
  req(Array.isArray(sq?.items), 'solverQueueImpact.items must be an array');
  req(typeof sq?.notes === 'string' && sq.notes.trim(), 'solverQueueImpact.notes is required');

  req(Array.isArray(manifest.definitionsOfDone) && manifest.definitionsOfDone.length > 0, 'definitionsOfDone must be non-empty');
  const proofIds = new Set();
  for (const [i, d] of (manifest.definitionsOfDone || []).entries()) {
    req(typeof d.id === 'string' && d.id.trim(), `definitionsOfDone[${i}].id is required`);
    if (d.id) {
      req(!proofIds.has(d.id), `duplicate definition-of-done id: ${d.id}`);
      proofIds.add(d.id);
    }
    req(typeof d.claim === 'string' && d.claim.trim(), `definitionsOfDone[${i}].claim is required`);
    req(Array.isArray(d.proofs) && d.proofs.length > 0, `definitionsOfDone[${i}] must have at least one executable proof`);
    for (const [j, p] of (d.proofs || []).entries()) {
      req(PROOF_TYPES.has(p.type), `definitionsOfDone[${i}].proofs[${j}].type is invalid`);
      req(typeof p.locator === 'string' && p.locator.trim(), `definitionsOfDone[${i}].proofs[${j}].locator is required`);
      req(typeof p.expected === 'string' && p.expected.trim(), `definitionsOfDone[${i}].proofs[${j}].expected is required`);
      if (p.type === 'manual-evidence') {
        req(typeof p.reason === 'string' && p.reason.trim(), `manual-evidence proof ${d.id} must explain why no mechanical proof is possible`);
      }
    }
  }

  req(Array.isArray(manifest.phases) && manifest.phases.length > 0, 'phases must be non-empty');
  for (const [i, p] of (manifest.phases || []).entries()) {
    req(typeof p.id === 'string' && p.id.trim(), `phases[${i}].id is required`);
    req(typeof p.name === 'string' && p.name.trim(), `phases[${i}].name is required`);
    req(Array.isArray(p.entry), `phases[${i}].entry must be an array`);
    req(Array.isArray(p.outputs) && p.outputs.length > 0, `phases[${i}].outputs must be non-empty`);
    req(Array.isArray(p.affectedDomains) && p.affectedDomains.length > 0, `phases[${i}].affectedDomains must be non-empty`);
    req(Array.isArray(p.exitProofIds) && p.exitProofIds.length > 0, `phases[${i}].exitProofIds must be non-empty`);
    for (const id of p.exitProofIds || []) req(proofIds.has(id), `phases[${i}] references unknown proof id ${id}`);
  }

  const sz = manifest.splashZone;
  req(sz && typeof sz === 'object', 'splashZone is required');
  const splashKeys = ['currentAuthorities','workflows','registriesSchemas','generatedData','solverQueue','researchSystem','retireOrArchive'];
  for (const key of splashKeys) req(Array.isArray(sz?.[key]), `splashZone.${key} must be an array`);
  const splashCount = splashKeys.reduce((n,k)=>n+(Array.isArray(sz?.[k])?sz[k].length:0),0);
  req(splashCount > 0, 'splashZone must name at least one concrete reconciliation surface');
  req(Array.isArray(sz?.proofIds), 'splashZone.proofIds must be an array');
  for (const id of sz?.proofIds || []) req(proofIds.has(id), `splashZone references unknown proof id ${id}`);

  const hc = manifest.hostileCloseout;
  req(hc && typeof hc === 'object', 'hostileCloseout is required');
  req(hc?.independentReconstruction === true, 'hostileCloseout.independentReconstruction must be true');
  const requiredInventories = ['producers','consumers','workflows','persistence','compatibility-history','current-authorities'];
  req(Array.isArray(hc?.inventories), 'hostileCloseout.inventories must be an array');
  for (const inv of requiredInventories) req(hc?.inventories?.includes(inv), `hostileCloseout.inventories must include ${inv}`);
  req(Array.isArray(hc?.proofIds), 'hostileCloseout.proofIds must be an array');
  for (const id of hc?.proofIds || []) req(proofIds.has(id), `hostileCloseout references unknown proof id ${id}`);

  return errors;
}

function main() {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--plan');
  const eq = args.find(a => a.startsWith('--plan='));
  const planPath = eq ? eq.slice('--plan='.length) : idx >= 0 ? args[idx + 1] : null;
  if (!planPath) {
    console.error('usage: node scripts/check-plan-quality.mjs --plan=docs/example-plan.md');
    process.exit(2);
  }
  if (!fs.existsSync(planPath)) {
    console.error(`plan not found: ${planPath}`);
    process.exit(2);
  }
  const parsed = path.parse(planPath);
  const manifestPath = path.join(parsed.dir, `${parsed.name}.quality.json`);
  if (!fs.existsSync(manifestPath)) {
    console.error(`quality manifest not found: ${manifestPath}`);
    process.exit(1);
  }
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (err) {
    console.error(`invalid JSON in ${manifestPath}: ${err.message}`);
    process.exit(1);
  }
  const errors = validatePlanQualityManifest(manifest, { planPath });
  if (errors.length) {
    console.error(`Plan quality check failed for ${planPath}:`);
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
  }
  console.log(`Plan quality manifest OK: ${manifestPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
