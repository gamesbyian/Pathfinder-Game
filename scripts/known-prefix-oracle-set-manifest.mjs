import { stableHash } from './solver-experiment-contract.mjs';

const nonEmpty = value => typeof value === 'string' && value.trim().length > 0;
function canonicalPath(path) {
  if (!Array.isArray(path) || path.length === 0) throw new Error('oracle path must be a non-empty array');
  return path.map(cell => {
    if (Number.isInteger(cell) && cell >= 0) return cell;
    if (Array.isArray(cell) && cell.length === 2 && cell.every(Number.isInteger)) return [...cell];
    throw new Error('oracle path cells must be packed non-negative integers or integer [x,y] pairs');
  });
}

function scientificIdentities(producer, oracles, conditioningOracleIds) {
  const scientificOracles = oracles.map(({ oracleId, pathIdentity, ancestry }) => ({ oracleId, pathIdentity, ancestry }));
  const oracleSetIdentity = stableHash({ producerIdentity: producer.identity, oracles: scientificOracles });
  const scientificConditioningIdentity = stableHash({ oracleSetIdentity, conditioningOracleIds });
  const manifestIdentity = stableHash({ schemaVersion: 1, kind: 'known-prefix-oracle-set-manifest',
    oracleSetIdentity, scientificConditioningIdentity });
  return { oracleSetIdentity, scientificConditioningIdentity, manifestIdentity };
}

export function validateKnownPrefixOracleSetManifest(manifest) {
  const issues = [];
  if (manifest?.schemaVersion !== 1) issues.push('schemaVersion');
  if (manifest?.kind !== 'known-prefix-oracle-set-manifest') issues.push('kind');
  if (!nonEmpty(manifest?.producer?.id)) issues.push('producer.id');
  if (!nonEmpty(manifest?.producer?.version)) issues.push('producer.version');
  if (manifest?.producer?.identity !== stableHash({ id: manifest?.producer?.id, version: manifest?.producer?.version })) issues.push('producer.identity');
  if (!Array.isArray(manifest?.oracles) || manifest.oracles.length === 0) issues.push('oracles');
  const ids = new Set();
  for (const oracle of manifest?.oracles ?? []) {
    if (!nonEmpty(oracle?.oracleId) || ids.has(oracle.oracleId)) issues.push(`oracleId:${oracle?.oracleId ?? ''}`);
    ids.add(oracle?.oracleId);
    let path;
    try { path = canonicalPath(oracle?.path); } catch { issues.push(`path:${oracle?.oracleId ?? ''}`); continue; }
    if (oracle.pathIdentity !== stableHash({ path })) issues.push(`pathIdentity:${oracle.oracleId}`);
    if (!nonEmpty(oracle?.ancestry?.sourceKind) || !nonEmpty(oracle?.ancestry?.dependenceGroupId)) issues.push(`ancestry:${oracle.oracleId}`);
    if (!Array.isArray(oracle?.ancestry?.parentOracleIds)) issues.push(`parentOracleIds:${oracle.oracleId}`);
  }
  for (const oracle of manifest?.oracles ?? []) {
    const parents = oracle?.ancestry?.parentOracleIds ?? [];
    if (new Set(parents).size !== parents.length) issues.push(`duplicateParents:${oracle.oracleId}`);
    for (const parent of parents) if (!ids.has(parent) || parent === oracle.oracleId) issues.push(`parent:${oracle.oracleId}:${parent}`);
  }
  const parentsById = new Map((manifest?.oracles ?? []).map(oracle => [oracle.oracleId, oracle?.ancestry?.parentOracleIds ?? []]));
  const visit = (id, active = new Set(), complete = new Set()) => {
    if (active.has(id)) { issues.push(`ancestryCycle:${id}`); return; }
    if (complete.has(id)) return;
    active.add(id);
    for (const parent of parentsById.get(id) ?? []) if (parentsById.has(parent)) visit(parent, active, complete);
    active.delete(id); complete.add(id);
  };
  const complete = new Set();
  for (const id of ids) visit(id, new Set(), complete);
  const ordered = [...(manifest?.oracles ?? [])].sort((a, b) => a.oracleId.localeCompare(b.oracleId));
  if (manifest?.pathSetIdentity !== stableHash(ordered.map(({ oracleId, pathIdentity }) => ({ oracleId, pathIdentity })))) issues.push('pathSetIdentity');
  const conditioning = manifest?.conditioningOracleIds;
  if (!Array.isArray(conditioning) || new Set(conditioning).size !== conditioning?.length || conditioning?.some(id => !ids.has(id))) issues.push('conditioningOracleIds');
  const canonicalConditioning = [...(conditioning ?? [])].sort();
  if (manifest?.conditioningPathSetIdentity !== stableHash(canonicalConditioning.map(oracleId => {
    const oracle = ordered.find(row => row.oracleId === oracleId);
    return { oracleId, pathIdentity: oracle?.pathIdentity };
  }))) issues.push('conditioningPathSetIdentity');
  const expectedScientific = scientificIdentities(manifest?.producer ?? {}, ordered, canonicalConditioning);
  for (const field of ['oracleSetIdentity', 'scientificConditioningIdentity', 'manifestIdentity']) {
    if (manifest?.[field] !== expectedScientific[field]) issues.push(field);
  }
  return [...new Set(issues)];
}

/** Inactive research metadata: callers must explicitly provide the conditioning subset. */
export function createKnownPrefixOracleSetManifest({ producer, oracles, conditioningOracleIds }) {
  const normalized = oracles.map(oracle => {
    const path = canonicalPath(oracle.path);
    return {
      oracleId: String(oracle.oracleId), path, pathIdentity: stableHash({ path }),
      ancestry: { sourceKind: oracle.ancestry?.sourceKind, sourceIdentity: oracle.ancestry?.sourceIdentity ?? null,
        parentOracleIds: [...(oracle.ancestry?.parentOracleIds ?? [])].sort(), dependenceGroupId: oracle.ancestry?.dependenceGroupId },
    };
  }).sort((a, b) => a.oracleId.localeCompare(b.oracleId));
  const conditioning = [...conditioningOracleIds].map(String).sort();
  const manifest = {
    schemaVersion: 1, kind: 'known-prefix-oracle-set-manifest', producer: { id: producer?.id, version: producer?.version,
      identity: stableHash({ id: producer?.id, version: producer?.version }) }, oracles: normalized,
    pathSetIdentity: stableHash(normalized.map(({ oracleId, pathIdentity }) => ({ oracleId, pathIdentity }))),
    conditioningOracleIds: conditioning,
    conditioningPathSetIdentity: stableHash(conditioning.map(oracleId => {
      const oracle = normalized.find(row => row.oracleId === oracleId);
      return { oracleId, pathIdentity: oracle?.pathIdentity };
    })),
  };
  Object.assign(manifest, scientificIdentities(manifest.producer, normalized, conditioning));
  const issues = validateKnownPrefixOracleSetManifest(manifest);
  if (issues.length) throw new Error(`invalid known-prefix oracle-set manifest: ${issues.join(', ')}`);
  return manifest;
}
