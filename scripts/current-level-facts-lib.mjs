/** Pure derivation/rendering for the generated current-level-facts documentation block. */
const listSize = (level, field) => Array.isArray(level[field]) ? level[field].length : 0;
const max = (levels, field) => Math.max(0, ...levels.map(level => listSize(level, field)));
const maxGrid = levels => Math.max(0, ...levels.flatMap(level => [level.grid?.w ?? 0, level.grid?.h ?? 0]));
const idsAtMax = (levels, field, maximum) => levels.filter(level => listSize(level, field) === maximum).map(level => level.id);

export function deriveCurrentLevelFacts(published, stressCorpora) {
  if (!Array.isArray(published) || published.length === 0) throw new Error('published levels must be a non-empty array');
  const stress = stressCorpora.flat();
  const publishedNumbers = published.map(level => Number(level.id.slice(1)));
  const sortedNumbers = [...publishedNumbers].sort((a, b) => a - b);
  const withdrawnIds = [];
  for (let n = sortedNumbers[0]; n <= sortedNumbers.at(-1); n++) {
    if (!sortedNumbers.includes(n)) withdrawnIds.push(`P${String(n).padStart(5, '0')}`);
  }
  const firstPositionMismatch = published.findIndex((level, index) => Number(level.id.slice(1)) !== index + 1);
  const flippingFilters = max(published, 'flippingFilters');
  return {
    publishedCount: published.length,
    publishedFirstId: published[0].id,
    publishedLastId: published.at(-1).id,
    withdrawnIds,
    lastIdAlignedPosition: firstPositionMismatch < 0 ? published.length : firstPositionMismatch,
    landmarkLevelIds: published.filter(level => listSize(level, 'landmarks') > 0).map(level => level.id),
    publishedMaxima: {
      mustPass: max(published, 'mustPass'), mustCross: max(published, 'mustCross'),
      portalPairs: max(published, 'portals'), flippingFilters,
      flippingFilterLevelIds: idsAtMax(published, 'flippingFilters', flippingFilters),
      gridSide: maxGrid(published), allSquare: published.every(level => level.grid?.w === level.grid?.h),
    },
    stressMaxima: {
      mustPass: max(stress, 'mustPass'), mustCross: max(stress, 'mustCross'),
      portalPairs: max(stress, 'portals'), flippingFilters: max(stress, 'flippingFilters'),
    },
  };
}

const codeList = values => values.map(value => `\`${value}\``).join(', ');
export function renderCurrentLevelFacts(value) {
  const p = value.publishedMaxima;
  const s = value.stressMaxima;
  const withdrawn = value.withdrawnIds.length ? ` with ${codeList(value.withdrawnIds)} withdrawn` : '';
  const positionNote = value.lastIdAlignedPosition < value.publishedCount
    ? `; ID != array position after ${value.lastIdAlignedPosition}` : '';
  const flipperOwners = p.flippingFilterLevelIds.length ? ` (${codeList(p.flippingFilterLevelIds)})` : '';
  return [
    '<!-- generated: current-level-facts; npm run facts:levels -- --write -->',
    `- ${value.publishedCount} published levels, IDs \`${value.publishedFirstId}\`–\`${value.publishedLastId}\`${withdrawn}${positionNote}. Landmark mechanics: ${codeList(value.landmarkLevelIds)}.`,
    `- Published maxima: must-pass ${p.mustPass}; must-cross ${p.mustCross}; portals ${p.portalPairs} pairs/${p.portalPairs * 2} keys; flipping filters ${p.flippingFilters}${flipperOwners}; grids up to ${p.gridSide}x${p.gridSide} and ${p.allSquare ? 'always square' : 'not always square'}. Published maxima are not solver bounds.`,
    `- Stress-corpus maxima: must-pass ${s.mustPass}; must-cross ${s.mustCross}; portals ${s.portalPairs} pairs; flipping filters ${s.flippingFilters}. See [\`data/stress/README.md\`](data/stress/README.md).`,
    '<!-- /generated: current-level-facts -->',
  ].join('\n');
}
