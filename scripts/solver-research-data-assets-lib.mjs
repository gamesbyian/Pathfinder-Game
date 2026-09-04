import path from 'node:path';
import { readRepositoryText, repositoryPathKind } from './repository-file-view.mjs';

export const SOLVER_RESEARCH_DATA_REGISTRY = 'docs/solver-research-data-assets.json';

const ASSET_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const LOCATION_KINDS = new Set(['tracked', 'tracked-directory', 'pattern', 'generated', 'off-main-branch']);
const REQUIRED_STRING_ARRAYS = [
  'grain', 'authorities', 'queryEntryPoints', 'joinKeys', 'evidenceRoles', 'relatedAssets', 'affordances', 'caveats',
];

function repositoryPath(root, value) {
  const resolved = path.resolve(root, value);
  const relative = path.relative(root, resolved);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..') ? resolved : null;
}

function validateStringArray(failures, label, value, { allowEmpty = false } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    failures.push(`${label} must be ${allowEmpty ? 'an' : 'a non-empty'} array`);
    return;
  }
  const invalid = value.filter(item => typeof item !== 'string' || item.trim() === '');
  if (invalid.length) failures.push(`${label} must contain only non-empty strings`);
}

export function validateSolverResearchDataAssets(root) {
  const failures = [];
  if (!repositoryPath(root, SOLVER_RESEARCH_DATA_REGISTRY)
    || repositoryPathKind(root, SOLVER_RESEARCH_DATA_REGISTRY) !== 'file') {
    return [`missing registry ${SOLVER_RESEARCH_DATA_REGISTRY}`];
  }

  let registry;
  try {
    registry = JSON.parse(readRepositoryText(root, SOLVER_RESEARCH_DATA_REGISTRY));
  } catch (error) {
    return [`cannot parse ${SOLVER_RESEARCH_DATA_REGISTRY}: ${error.message}`];
  }

  if (registry.schemaVersion !== 1) failures.push(`unsupported schemaVersion ${registry.schemaVersion}; expected 1`);
  if (typeof registry.scope !== 'string' || !registry.scope.trim()) failures.push('scope must be a non-empty string');
  if (typeof registry.catalogDocument !== 'string' || !registry.catalogDocument.trim()) {
    failures.push('catalogDocument must be a non-empty repository path');
  }
  if (!Array.isArray(registry.assets) || registry.assets.length === 0) {
    failures.push('assets must be a non-empty array');
    return failures;
  }

  const ids = new Set();
  for (const [index, asset] of registry.assets.entries()) {
    const label = `assets[${index}]`;
    if (!asset || typeof asset !== 'object' || Array.isArray(asset)) {
      failures.push(`${label} must be an object`);
      continue;
    }
    if (typeof asset.id !== 'string' || !ASSET_ID.test(asset.id)) {
      failures.push(`${label}.id must be lowercase kebab-case`);
    } else if (ids.has(asset.id)) {
      failures.push(`${label}.id duplicates ${asset.id}`);
    } else {
      ids.add(asset.id);
    }
    if (typeof asset.name !== 'string' || !asset.name.trim()) failures.push(`${label}.name must be a non-empty string`);
    if (typeof asset.status !== 'string' || !asset.status.trim()) failures.push(`${label}.status must be a non-empty string`);
    for (const field of REQUIRED_STRING_ARRAYS) {
      validateStringArray(failures, `${label}.${field}`, asset[field], { allowEmpty: field === 'relatedAssets' });
    }

    if (!Array.isArray(asset.locations) || asset.locations.length === 0) {
      failures.push(`${label}.locations must be a non-empty array`);
    } else {
      for (const [locationIndex, location] of asset.locations.entries()) {
        const locationLabel = `${label}.locations[${locationIndex}]`;
        if (!location || typeof location !== 'object' || Array.isArray(location)) {
          failures.push(`${locationLabel} must be an object`);
          continue;
        }
        if (!LOCATION_KINDS.has(location.kind)) {
          failures.push(`${locationLabel}.kind must be one of ${[...LOCATION_KINDS].join(', ')}`);
          continue;
        }
        if (typeof location.path !== 'string' || !location.path.trim()) {
          failures.push(`${locationLabel}.path must be a non-empty string`);
          continue;
        }
        if (location.kind === 'off-main-branch' && (typeof location.ref !== 'string' || !location.ref.trim())) {
          failures.push(`${locationLabel}.ref must identify the off-main branch`);
        }
        if (location.kind === 'tracked' || location.kind === 'tracked-directory') {
          if (!repositoryPath(root, location.path)) {
            failures.push(`${locationLabel}.path escapes the repository: ${location.path}`);
            continue;
          }
          const kind = repositoryPathKind(root, location.path);
          // An off-main asset can name its normal mount point as a tracked-directory-shaped
          // location even though that dataset is intentionally absent from this branch. Its
          // off-main-branch locator remains the evidence source of truth.
          if (!kind && asset.status === 'off-main') continue;
          if (!kind) {
            failures.push(`${locationLabel}.path does not exist in tracked repository state: ${location.path}`);
          } else if (location.kind === 'tracked-directory' && kind !== 'directory') {
            failures.push(`${locationLabel}.path is not a directory: ${location.path}`);
          } else if (location.kind === 'tracked' && kind !== 'file') {
            failures.push(`${locationLabel}.path is a directory but kind is tracked: ${location.path}`);
          }
        }
      }
    }

    if (Array.isArray(asset.authorities)) {
      for (const authority of asset.authorities) {
        if (typeof authority !== 'string' || !authority.trim()) continue;
        if (!repositoryPath(root, authority)) {
          failures.push(`${label}.authorities path escapes the repository: ${authority}`);
          continue;
        }
        const kind = repositoryPathKind(root, authority);
        if (!kind && asset.status === 'off-main') continue;
        if (!kind) failures.push(`${label}.authorities path does not exist in tracked repository state: ${authority}`);
      }
    }
  }

  for (const asset of registry.assets) {
    if (!asset || typeof asset !== 'object' || !Array.isArray(asset.relatedAssets)) continue;
    for (const related of asset.relatedAssets) {
      if (typeof related !== 'string' || !related) continue;
      if (!ids.has(related)) failures.push(`asset ${asset.id ?? '<invalid>'} references unknown relatedAssets id ${related}`);
      if (related === asset.id) failures.push(`asset ${asset.id} must not list itself in relatedAssets`);
    }
  }

  const catalogPath = typeof registry.catalogDocument === 'string'
    ? repositoryPath(root, registry.catalogDocument)
    : null;
  if (!catalogPath) {
    failures.push(`catalogDocument escapes the repository: ${registry.catalogDocument}`);
  } else if (repositoryPathKind(root, registry.catalogDocument) !== 'file') {
    failures.push(`catalogDocument does not exist: ${registry.catalogDocument}`);
  } else {
    const catalog = readRepositoryText(root, registry.catalogDocument);
    // The JSON registry owns per-asset detail. The human guide should route to that source and
    // its compact query interface, not duplicate every asset as a prose section.
    if (!catalog.includes('solver-research-data-assets.json')) {
      failures.push(`${registry.catalogDocument} must route exact per-asset detail to solver-research-data-assets.json`);
    }
    if (!catalog.includes('research-asset-query.mjs')) {
      failures.push(`${registry.catalogDocument} must teach the compact research-asset-query.mjs entry point`);
    }
  }

  if (!Array.isArray(registry.relationships) || registry.relationships.length === 0) {
    failures.push('relationships must be a non-empty array');
  } else {
    const relationshipIds = new Set();
    for (const [index, relationship] of registry.relationships.entries()) {
      const label = `relationships[${index}]`;
      if (!relationship || typeof relationship !== 'object' || Array.isArray(relationship)) {
        failures.push(`${label} must be an object`);
        continue;
      }
      if (typeof relationship.id !== 'string' || !ASSET_ID.test(relationship.id)) {
        failures.push(`${label}.id must be lowercase kebab-case`);
      } else if (relationshipIds.has(relationship.id)) {
        failures.push(`${label}.id duplicates ${relationship.id}`);
      } else {
        relationshipIds.add(relationship.id);
      }
      if (!Array.isArray(relationship.assets) || relationship.assets.length < 2) {
        failures.push(`${label}.assets must contain at least two asset ids`);
      } else {
        if (new Set(relationship.assets).size !== relationship.assets.length) failures.push(`${label}.assets must not contain duplicates`);
        for (const id of relationship.assets) if (!ids.has(id)) failures.push(`${label}.assets references unknown asset id ${id}`);
      }
      if (typeof relationship.join !== 'string' || !relationship.join.trim()) failures.push(`${label}.join must be a non-empty string`);
      validateStringArray(failures, `${label}.questions`, relationship.questions);
      if (typeof relationship.boundary !== 'string' || !relationship.boundary.trim()) failures.push(`${label}.boundary must be a non-empty string`);
    }
  }

  return failures;
}
