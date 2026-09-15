#!/usr/bin/env node
/** Offline-only join of the open-path observer to the existing exact-labelled B2 prefixes. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelsWithHints } from '../level-data-io.mjs';
import { observeOpenPathTopology } from '../../modules/solver/open-path-topology-observer.js';
import { stableHash } from '../solver-experiment-contract.mjs';
import { CLASS5_B2_EXACT_LABEL_PROJECTION, class5B2ExactLabel, class5B2ExactLabelCount, verifyClass5B2ExactLabelProjection } from './class5-b2-exact-prefix-labels.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => { const [k, ...v] = x.split('='); return [k, v.join('=')]; }));
const casesFile = args.get('--cases') ?? 'reports/stress/winning-lineage-extinction-adjacent-cases-2026-08-12.json';
const outFile = args.get('--out') ?? 'tmp/class5-open-path-observer-evidence.json';
const labelProjectionPath = 'scripts/stress/class5-b2-exact-prefix-labels.mjs';
const labelProjectionSha256 = `sha256:${createHash('sha256').update(readFileSync(labelProjectionPath)).digest('hex')}`;
const authorityMarkdown = readFileSync(CLASS5_B2_EXACT_LABEL_PROJECTION.authorityReport, 'utf8');
const authorityReportSha256 = `sha256:${createHash('sha256').update(authorityMarkdown).digest('hex')}`;
const exactLabelSourceId = 'class5-b2-exact-label-projection-v1';
function role(row) {
  if (row.source?.role) return row.source.role;
  if (row.id.includes('culled-supported')) return 'witness-culled';
  if (row.id.includes('top-rank1')) return 'top-rank1';
  if (row.id.includes('retained-near-cutoff')) return 'cutoff-survivor';
  return 'other';
}
function packed(prefix) { return Array.isArray(prefix[0]) ? prefix.map(([x, y]) => ((y - 1) << 16) | (x - 1)) : prefix.map(Number); }

installBrowserStubs();
const source = JSON.parse(readFileSync(casesFile, 'utf8'));
if (class5B2ExactLabelCount() !== CLASS5_B2_EXACT_LABEL_PROJECTION.exactLabelledPrefixes) {
  throw new Error('B2 exact-label projection count disagrees with its authoritative artifact declaration');
}
verifyClass5B2ExactLabelProjection(authorityMarkdown);
const { createSolver } = await import('../../modules/solver.js');
const Solver = createSolver();
const levels = new Map(readLevelsWithHints(source.corpus).map(row => [String(row.id), Solver.prepareLevelForSolver(row, { source: 'raw' })]));
const rows = source.cases.flatMap(row => {
  const label = class5B2ExactLabel(row.levelId, role(row));
  if (!label) return [];
  const observation = observeOpenPathTopology(levels.get(String(row.levelId)), packed(row.prefix));
  return [{
    id: row.id, levelId: row.levelId, role: role(row), exactLabel: label,
    exactLabelSource: exactLabelSourceId,
    stratumIdentity: stableHash({ levelId: row.levelId, endpointGeometryKey: observation.endpointGeometryKey,
      referenceSetIdentity: observation.referenceSetIdentity }),
    endpointGeometryKey: observation.endpointGeometryKey,
    referenceSetIdentity: observation.referenceSetIdentity,
    portalExcluded: observation.portalExcluded,
    phaseCount: observation.phases.length,
    phaseIdentity: stableHash(observation.phases),
    phases: observation.phases,
  }];
});
const strata = new Map();
for (const row of rows) {
  const key = row.stratumIdentity;
  if (!strata.has(key)) strata.set(key, []);
  strata.get(key).push(row);
}
const contrasts = [];
for (const [stratumIdentity, members] of strata) {
  for (const live of members.filter(row => row.exactLabel === 'live')) for (const dead of members.filter(row => row.exactLabel === 'dead')) {
    const comparable = !live.portalExcluded && !dead.portalExcluded && live.phases.length === dead.phases.length;
    const maxPhaseDelta = comparable ? Math.max(0, ...live.phases.map((phase, index) => Math.abs(phase.phaseTurns - dead.phases[index].phaseTurns))) : null;
    contrasts.push({ stratumIdentity, liveId: live.id, deadId: dead.id, comparable, maxPhaseDelta, separated: comparable && maxPhaseDelta > 1e-12 });
  }
}
const eligible = contrasts.filter(row => row.comparable);
const output = { schemaVersion: 1, kind: 'class5-open-path-observer-existing-exact-evidence', sourceCases: casesFile,
  exactLabelProvenance: { sourceId: exactLabelSourceId, ...CLASS5_B2_EXACT_LABEL_PROJECTION, authorityReportSha256,
    projection: labelProjectionPath, projectionSha256: labelProjectionSha256, mechanicallyVerifiedAgainstAuthority: true },
  controls: ['levelId', 'endpointGeometryKey', 'referenceSetIdentity'],
  rows: rows.map(({ phases: _phases, ...row }) => row), contrasts,
  summary: { exactLabelledRows: rows.length, controlledStrata: strata.size, naturalLiveDeadContrasts: contrasts.length,
    eligibleContrasts: eligible.length, separatedContrasts: eligible.filter(row => row.separated).length,
    decision: eligible.length === 0 ? 'stop-contrast-starvation' : 'observer-contrast-available' } };
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output.summary, null, 2));
