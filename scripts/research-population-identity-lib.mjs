import { researchSemanticHash } from './research-semantic-identity-lib.mjs';

export function encodeResearchScopedIdentity(scope, subjectId) {
  if (!nonEmptyString(scope)) throw new Error('population identity scope must be a non-empty string');
  if (!nonEmptyString(subjectId)) throw new Error('population subject id must be a non-empty string');
  return JSON.stringify([String(scope), String(subjectId)]);
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function parseResearchIdentityLines(content) {
  if (typeof content !== 'string') throw new Error('identity file content must be a string');
  return content.split(/\r?\n/u).map(value => value.trim()).filter(Boolean);
}

export function canonicalizeResearchIdentities(ids, { rejectDuplicates = true } = {}) {
  if (!Array.isArray(ids)) throw new Error('population identities must be an array');
  const normalized = ids.map(id => String(id).trim());
  if (normalized.some(id => !id)) throw new Error('population identities must be non-empty');
  const seen = new Set();
  const duplicateSet = new Set();
  for (const id of normalized) {
    if (seen.has(id)) duplicateSet.add(id);
    else seen.add(id);
  }
  const duplicates = [...duplicateSet].sort();
  if (rejectDuplicates && duplicates.length) throw new Error(`duplicate population identities: ${duplicates.join(', ')}`);
  return { identities: [...new Set(normalized)].sort(), duplicates };
}

export function hashResearchPopulation({
  kind,
  identityBasis,
  identities,
  corpusIdentity = null,
  selection = null,
  identityCodec = null,
}) {
  if (!kind || !identityBasis) throw new Error('population kind and identityBasis are required');
  if (identityCodec != null && !nonEmptyString(identityCodec)) {
    throw new Error('identityCodec must be null or a non-empty string');
  }
  const canonical = canonicalizeResearchIdentities(identities);
  const hashInput = { kind, identityBasis, corpusIdentity, selection, identities: canonical.identities };
  if (identityCodec != null) hashInput.identityCodec = identityCodec;
  return {
    identities: canonical.identities,
    identityHash: researchSemanticHash(hashInput),
  };
}
