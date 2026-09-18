import { levelFeatures } from './stress/features.mjs';

export const DEFAULT_MATCH_DIMENSIONS = Object.freeze([
  'area',
  'reqLen',
  'reqInt',
  'requiredPathCoverageRatio',
  'gates',
  'blocks',
  'mustPass',
  'mustCross',
  'portalPairs',
  'flippers',
  'geese',
  'falseGoals',
  'surround',
  'mustTurn',
  'adjTurn',
]);

export function featureRow(level) {
  const witness = Array.isArray(level?.stressMeta?.witnessSolution) ? level.stressMeta.witnessSolution : null;
  return levelFeatures(level, witness);
}

function relDiff(a, b) {
  return Math.abs(Number(a) - Number(b)) / Math.max(1, Math.abs(Number(a)), Math.abs(Number(b)));
}

export function staticMatchDistance(a, b, dimensions = DEFAULT_MATCH_DIMENSIONS) {
  let sum = 0;
  let n = 0;
  for (const key of dimensions) {
    if (!(key in a) || !(key in b)) throw new Error(`unknown/missing match dimension: ${key}`);
    const av = Number(a[key]);
    const bv = Number(b[key]);
    if (!Number.isFinite(av) || !Number.isFinite(bv)) throw new Error(`match dimension must be numeric: ${key}`);
    const d = key === 'requiredPathCoverageRatio' ? Math.abs(av - bv) : relDiff(av, bv);
    sum += Math.min(1, d);
    n++;
  }
  return n ? sum / n : 0;
}

export function buildMatchedGroups(sources, {
  count = Infinity,
  maxDistance = Infinity,
  dimensions = DEFAULT_MATCH_DIMENSIONS,
  anchorSource = null,
} = {}) {
  if (!Array.isArray(sources) || sources.length < 2) throw new Error('matching requires at least two sources');
  const names = new Set();
  for (const source of sources) {
    if (!source?.name || !Array.isArray(source.levels)) throw new Error('each source needs {name, levels}');
    if (names.has(source.name)) throw new Error(`duplicate source name: ${source.name}`);
    names.add(source.name);
  }
  const anchor = anchorSource
    ? sources.find(source => source.name === anchorSource)
    : [...sources].sort((a, b) => a.levels.length - b.levels.length)[0];
  if (!anchor) throw new Error(`unknown anchor source: ${anchorSource}`);

  const prepared = new Map(sources.map(source => [source.name, source.levels.map(level => ({
    level,
    id: String(level.id),
    features: featureRow(level),
  }))]));
  const used = new Map(sources.map(source => [source.name, new Set()]));
  const groups = [];

  for (const anchorRow of prepared.get(anchor.name)) {
    if (groups.length >= count) break;
    if (used.get(anchor.name).has(anchorRow.id)) continue;
    const members = [{ source: anchor.name, row: anchorRow, distanceFromAnchor: 0 }];
    let worst = 0;
    let failed = false;

    for (const source of sources) {
      if (source.name === anchor.name) continue;
      let best = null;
      for (const candidate of prepared.get(source.name)) {
        if (used.get(source.name).has(candidate.id)) continue;
        const distance = staticMatchDistance(anchorRow.features, candidate.features, dimensions);
        if (!best || distance < best.distance || (distance === best.distance && candidate.id < best.row.id)) {
          best = { row: candidate, distance };
        }
      }
      if (!best || best.distance > maxDistance) {
        failed = true;
        break;
      }
      members.push({ source: source.name, row: best.row, distanceFromAnchor: best.distance });
      worst = Math.max(worst, best.distance);
    }

    if (failed) continue;
    for (const member of members) used.get(member.source).add(member.row.id);
    groups.push({
      groupIndex: groups.length,
      anchorSource: anchor.name,
      worstDistance: worst,
      meanDistance: members.reduce((sum, member) => sum + member.distanceFromAnchor, 0) / Math.max(1, members.length - 1),
      members: members.map(member => ({
        source: member.source,
        id: member.row.id,
        distanceFromAnchor: member.distanceFromAnchor,
        matchedFeatures: Object.fromEntries(dimensions.map(key => [key, member.row.features[key]])),
      })),
    });
  }

  return {
    anchorSource: anchor.name,
    dimensions: [...dimensions],
    requestedCount: Number.isFinite(count) ? count : null,
    matchedCount: groups.length,
    groups,
    unmatchedBySource: Object.fromEntries(sources.map(source => [
      source.name,
      source.levels.length - used.get(source.name).size,
    ])),
  };
}
