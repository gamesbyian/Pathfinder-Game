#!/usr/bin/env node
/**
 * Guards against routine generated raw audit output becoming source-history noise.
 *
 * This does not validate audit correctness; `check:audit-output` handles JSON/log
 * invariants. This check only enforces the repository policy for tracked raw
 * audit artifacts and machine-readable research-resource metadata.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import process from 'node:process';

// Allow latest.json and any timestamped snapshot: YYYY-MM-DDTHH-MM-SSZ-<sha>.json
// Timestamped snapshots are committed by the solver-diagnostics workflow to maintain a
// rolling history for solver regression analysis.
const ALLOWED_NAMES = new Set(['latest.json']);
const TIMESTAMP_SNAPSHOT = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z-[0-9a-f]+\.json$/;

const diagnosticsWorkflow = readFileSync('.github/workflows/solver-diagnostics.yml', 'utf8');
const diagnosticsFailures = [];
if (!diagnosticsWorkflow.includes('--failure-response-out="tmp/solver-diagnostics-compact-failure-response.json"')) {
  diagnosticsFailures.push('solver-diagnostics must route compact failure-response scratch outside logs/solver-workflow');
}
if (/git add\s+logs\/solver-workflow(?:\s|$)/u.test(diagnosticsWorkflow)) {
  diagnosticsFailures.push('solver-diagnostics must not broadly stage logs/solver-workflow; stage only canonical latest/timestamp snapshots');
}
if (diagnosticsFailures.length > 0) {
  console.error('Invalid solver-diagnostics audit artifact ownership:');
  for (const failure of diagnosticsFailures) console.error(`  - ${failure}`);
  process.exit(1);
}

const trackedFiles = execFileSync('git', ['ls-files', '-z', 'logs/solver-workflow'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const unexpected = trackedFiles.filter(file => {
  const name = file.split('/').pop();
  return !ALLOWED_NAMES.has(name) && !TIMESTAMP_SNAPSHOT.test(name);
});

if (unexpected.length > 0) {
  console.error('Unexpected tracked raw audit artifact(s):');
  for (const file of unexpected) console.error(`  - ${file}`);
  console.error('\nOnly latest.json and timestamped snapshots (YYYY-MM-DDTHH-MM-SSZ-<sha>.json) may be committed to logs/solver-workflow/.');
  process.exit(1);
}

const metadata = JSON.parse(readFileSync('logs/artifact-metadata.json', 'utf8'));
const requiredFields = [
  'selector', 'role', 'canonicalInput', 'generator', 'artifactSchemaVersion',
  'sourceCommitOrRunId', 'consumers', 'regenerationCommand', 'supersededBy',
  'safeToDelete', 'safeToRegenerate',
];
const allTrackedLogs = execFileSync('git', ['ls-files', '-z', 'logs'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);
const metadataFailures = [];
const allowedRoles = new Set([
  'current-pointer', 'historical-snapshot', 'historical-source-evidence',
  'compatibility-baseline', 'comparison-baseline', 'superseded-historical-snapshot',
  'superseded-run-archive',
]);
const matchedBy = new Map();
if (metadata.schemaVersion !== 1 || !Array.isArray(metadata.artifacts)) {
  metadataFailures.push('metadata must have schemaVersion 1 and an artifacts array');
} else {
  for (const [index, artifact] of metadata.artifacts.entries()) {
    for (const field of requiredFields) {
      if (!Object.hasOwn(artifact, field)) metadataFailures.push(`artifacts[${index}] missing ${field}`);
    }
    const { kind, value } = artifact.selector ?? {};
    if (!['exact', 'prefix'].includes(kind) || typeof value !== 'string' || !value.startsWith('logs/')) {
      metadataFailures.push(`artifacts[${index}] has an invalid selector`);
      continue;
    }
    const matches = allTrackedLogs.filter(file => kind === 'exact' ? file === value : file.startsWith(value));
    for (const file of matches) matchedBy.set(file, [...(matchedBy.get(file) ?? []), index]);
    if (matches.length === 0) metadataFailures.push(`artifacts[${index}] selector matches no tracked file: ${value}`);
    if (kind === 'exact' && matches.length !== 1) metadataFailures.push(`artifacts[${index}] exact selector is ambiguous: ${value}`);
    if (!allowedRoles.has(artifact.role)) metadataFailures.push(`artifacts[${index}] has unknown role: ${artifact.role}`);
    for (const field of ['generator', 'sourceCommitOrRunId']) {
      if (typeof artifact[field] !== 'string' || artifact[field].trim() === '') metadataFailures.push(`artifacts[${index}] ${field} must be a non-empty string`);
    }
    if (artifact.artifactSchemaVersion !== null && !Number.isInteger(artifact.artifactSchemaVersion)) {
      metadataFailures.push(`artifacts[${index}] artifactSchemaVersion must be an integer or null`);
    }
    if (typeof artifact.canonicalInput !== 'boolean' || typeof artifact.safeToDelete !== 'boolean' || typeof artifact.safeToRegenerate !== 'boolean') {
      metadataFailures.push(`artifacts[${index}] status flags must be boolean`);
    }
    if (!Array.isArray(artifact.consumers) || artifact.consumers.length === 0) {
      metadataFailures.push(`artifacts[${index}] must name at least one consumer`);
    }
    if (artifact.safeToRegenerate && !artifact.regenerationCommand) {
      metadataFailures.push(`artifacts[${index}] is safeToRegenerate but has no regenerationCommand`);
    }
  }
  for (const [file, indexes] of matchedBy) {
    if (indexes.length > 1) metadataFailures.push(`${file} has overlapping metadata selectors: ${indexes.join(', ')}`);
  }
}
if (metadataFailures.length > 0) {
  console.error('Invalid logs/artifact-metadata.json:');
  for (const failure of metadataFailures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`Artifact metadata check passed (${metadata.artifacts.length} tracked exception classes).`);

const registryPath = 'docs/solver-research-data-assets.json';
const contractPath = 'docs/solver-research-resource-contract-audits.json';
const researchFailures = [];
const BASELINE_AUDITED_RESOURCE_IDS = new Set([
  'hint-provenance',
  'variant-family-data',
  'solution-space-profiles',
  'stress-corpora',
  'hint-ingestion-receipts',
]);
const catalogueArrayFields = [
  'grain', 'locations', 'authorities', 'queryEntryPoints', 'joinKeys', 'evidenceRoles',
  'relatedAssets', 'affordances', 'caveats',
];
const auditedArrayFields = [
  'independentUnit', 'identityLayers', 'producerAuthority', 'selectionConditioning',
  'admissibleEvidencePurposes', 'missingnessSemantics', 'freshnessRevisionContract',
  'knownInformationLoss', 'consumerInventory', 'historicalClaimBlastRadius',
  'auditAuthorities', 'prospectiveProducerFixes',
];

let registry;
let contract;
try {
  registry = JSON.parse(readFileSync(registryPath, 'utf8'));
} catch (error) {
  researchFailures.push(`${registryPath} is not readable JSON: ${error.message}`);
}
try {
  contract = JSON.parse(readFileSync(contractPath, 'utf8'));
} catch (error) {
  researchFailures.push(`${contractPath} is not readable JSON: ${error.message}`);
}

const assetIds = new Set();
if (registry) {
  if (registry.schemaVersion !== 1 || !Array.isArray(registry.assets) || !Array.isArray(registry.relationships)) {
    researchFailures.push(`${registryPath} must have schemaVersion 1 plus assets and relationships arrays`);
  } else {
    for (const [index, asset] of registry.assets.entries()) {
      const prefix = `assets[${index}]`;
      for (const field of ['id', 'name', 'status']) {
        if (typeof asset[field] !== 'string' || asset[field].trim() === '') researchFailures.push(`${prefix}.${field} must be a non-empty string`);
      }
      if (assetIds.has(asset.id)) researchFailures.push(`duplicate asset id: ${asset.id}`);
      assetIds.add(asset.id);
      for (const field of catalogueArrayFields) {
        if (!Array.isArray(asset[field]) || asset[field].length === 0) researchFailures.push(`${prefix}.${field} must be a non-empty array`);
      }
    }
    for (const asset of registry.assets) {
      for (const related of asset.relatedAssets ?? []) {
        if (!assetIds.has(related)) researchFailures.push(`${asset.id} relatedAssets references unknown asset: ${related}`);
      }
    }
    const relationshipIds = new Set();
    for (const [index, relationship] of registry.relationships.entries()) {
      const prefix = `relationships[${index}]`;
      if (typeof relationship.id !== 'string' || relationship.id.trim() === '') researchFailures.push(`${prefix}.id must be a non-empty string`);
      if (relationshipIds.has(relationship.id)) researchFailures.push(`duplicate relationship id: ${relationship.id}`);
      relationshipIds.add(relationship.id);
      if (!Array.isArray(relationship.assets) || relationship.assets.length < 2) researchFailures.push(`${prefix}.assets must name at least two assets`);
      for (const assetId of relationship.assets ?? []) {
        if (!assetIds.has(assetId)) researchFailures.push(`${relationship.id} references unknown asset: ${assetId}`);
      }
      for (const field of ['join', 'boundary']) {
        if (typeof relationship[field] !== 'string' || relationship[field].trim() === '') researchFailures.push(`${relationship.id}.${field} must be a non-empty string`);
      }
      if (!Array.isArray(relationship.questions) || relationship.questions.length === 0) researchFailures.push(`${relationship.id}.questions must be a non-empty array`);
    }
  }
}

if (contract) {
  if (contract.schemaVersion !== 1) researchFailures.push(`${contractPath} schemaVersion must be 1`);
  if (contract.registry !== registryPath) researchFailures.push(`${contractPath} registry must point to ${registryPath}`);
  if (contract.contractDocument !== 'docs/solver-research-resource-contract.md') researchFailures.push(`${contractPath} contractDocument must point to docs/solver-research-resource-contract.md`);
  if (!Array.isArray(contract.requiredAuditedResources) || contract.requiredAuditedResources.length === 0) {
    researchFailures.push(`${contractPath} requiredAuditedResources must be a non-empty array`);
  }
  if (!Array.isArray(contract.auditedResources)) {
    researchFailures.push(`${contractPath} auditedResources must be an array`);
  } else {
    const auditedIds = new Set();
    for (const [index, audited] of contract.auditedResources.entries()) {
      const prefix = `auditedResources[${index}]`;
      if (typeof audited.assetId !== 'string' || audited.assetId.trim() === '') researchFailures.push(`${prefix}.assetId must be a non-empty string`);
      if (auditedIds.has(audited.assetId)) researchFailures.push(`duplicate audited resource assetId: ${audited.assetId}`);
      auditedIds.add(audited.assetId);
      if (!assetIds.has(audited.assetId)) researchFailures.push(`${prefix}.assetId is not present in ${registryPath}: ${audited.assetId}`);
      for (const field of auditedArrayFields) {
        if (!Array.isArray(audited[field]) || audited[field].length === 0) researchFailures.push(`${prefix}.${field} must be a non-empty array`);
      }
      if (typeof audited.dependenceModel !== 'string' || audited.dependenceModel.trim() === '') researchFailures.push(`${prefix}.dependenceModel must be a non-empty string`);
      for (const field of ['auditAuthorities', 'historicalClaimBlastRadius']) {
        for (const target of audited[field] ?? []) {
          if ((target.startsWith('docs/') || target.startsWith('reports/') || target.startsWith('data/') || target.startsWith('scripts/')) && !existsSync(target)) {
            researchFailures.push(`${prefix}.${field} references missing tracked path: ${target}`);
          }
        }
      }
    }
    const requiredIds = new Set(contract.requiredAuditedResources ?? []);
    if (requiredIds.size !== (contract.requiredAuditedResources ?? []).length) researchFailures.push(`${contractPath} requiredAuditedResources contains duplicates`);
    for (const requiredId of requiredIds) {
      if (!assetIds.has(requiredId)) researchFailures.push(`required audited resource is not in registry: ${requiredId}`);
      if (!auditedIds.has(requiredId)) researchFailures.push(`required audited resource has no declaration: ${requiredId}`);
    }
    for (const baselineId of BASELINE_AUDITED_RESOURCE_IDS) {
      if (!requiredIds.has(baselineId)) researchFailures.push(`baseline audited resource was silently removed from requiredAuditedResources: ${baselineId}`);
      if (!auditedIds.has(baselineId)) researchFailures.push(`baseline audited resource lost its declaration: ${baselineId}`);
    }
  }
}

if (researchFailures.length > 0) {
  console.error('Invalid solver research resource contract metadata:');
  for (const failure of researchFailures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`Research resource contract check passed (${assetIds.size} catalogue assets, ${contract.auditedResources.length} audited resources).`);
console.log('Audit artifact policy check passed.');
