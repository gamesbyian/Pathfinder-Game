#!/usr/bin/env node
/**
 * Mutation-effect delta report for a local-mutant sibling family (docs/sibling-cousin-system.md
 * section 18). Joins a family manifest (scripts/family-generate.mjs's output) against solve
 * results (scripts/portfolio-solve-sweep.mjs's --out, run once against the sibling corpus and
 * once against the parent alone) into a per-variant table: what moved, and how solve status/
 * nodes/time/winning-config changed relative to the parent.
 *
 * Usage:
 *   node scripts/family-analyze.mjs --manifest=data/families/family-P00086-manifest.json \
 *     --solve-result=/tmp/family-P00086-solve.json --parent-solve-result=/tmp/parent-P00086-solve.json
 */
import { readFileSync } from 'node:fs';
import { normalizeAttemptIdentityKey } from '../modules/solver/attempt-identity.mjs';
import process from 'node:process';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));

const manifestPath = args.get('--manifest');
const solveResultPath = args.get('--solve-result');
const parentSolveResultPath = args.get('--parent-solve-result');
if (!manifestPath || !solveResultPath) {
    console.error('usage: family-analyze.mjs --manifest=<path> --solve-result=<path> [--parent-solve-result=<path>]');
    process.exit(2);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const solveResult = JSON.parse(readFileSync(solveResultPath, 'utf8'));
const parentSolveResult = parentSolveResultPath ? JSON.parse(readFileSync(parentSolveResultPath, 'utf8')) : null;
const parentRow = parentSolveResult?.levels?.[0] ?? null;

const rowsById = new Map((solveResult.levels || []).map(r => [r.id, r]));

// Every family-generate.mjs --mode produces a differently-shaped mutationManifest object — see
// that file's per-mode branches in main() for the authoritative shape of each. Add a case here
// whenever a new mode's mutation shape would otherwise fall through to the raw-JSON fallback.
function describeMutation(m) {
    switch (m.operation) {
        case 'move': return `(${m.from.x},${m.from.y})->(${m.to.x},${m.to.y})`;
        case 'add': case 'remove': return `${m.operation === 'add' ? '+' : '-'}${m.count} (now ${m.resultingBlockCount})`;
        case 'transform': return `variant ${m.variant} (${m.kind})`;
        case 'swap': return `${m.a.kind}(${m.a.from.x},${m.a.from.y})<->${m.b.kind}(${m.b.from.x},${m.b.from.y})`;
        case 'group-reshuffle': return `reshuffled all ${m.count} instance(s)`;
        case 'constrained-shuffle': return `full reshuffle (${m.order.join(',')})`;
        case 're-embed': return `${m.fromGrid.w}x${m.fromGrid.h}->${m.toGrid.w}x${m.toGrid.h} @ offset(${m.offset.x},${m.offset.y})`;
        default: return JSON.stringify(m);
    }
}

const coverageRatioOf = variant => variant?.requiredPathCoverageRatio ?? variant?.navDensity ?? null;
const parentRequiredPathCoverageRatio = manifest.parentRequiredPathCoverageRatio ?? manifest.parentNavDensity ?? null;
const hasRequiredPathCoverageRatio = manifest.variants.some(v => coverageRatioOf(v) != null);

console.log(`Family ${manifest.familyId} — parent ${manifest.parentLevelId} (${manifest.selectedWitnessSource}, len ${manifest.selectedWitnessLength}, reqInt ${manifest.selectedWitnessIntersectionCount})${parentRequiredPathCoverageRatio != null ? `, parent requiredPathCoverageRatio ${parentRequiredPathCoverageRatio.toFixed(3)}` : ''}`);
console.log(`${manifest.acceptedCount}/${manifest.requestedCount} siblings generated (mode: ${manifest.familyMode ?? 'local-mutant'}), ${manifest.movableInstanceCount} movable instance(s) available under strict inventory.\n`);

function canonicalWinningConfig(value) {
    if (!value) return '-';
    try { return normalizeAttemptIdentityKey(String(value)); }
    catch { return String(value); }
}

if (parentRow) {
    console.log(`Parent solve:   ok=${parentRow.ok} nodes=${parentRow.nodesExpanded ?? '-'} ms=${parentRow.totalMs ?? '-'} config=${canonicalWinningConfig(parentRow.winningConfig)}\n`);
}

const header = ['variant', 'objectType', 'move', ...(hasRequiredPathCoverageRatio ? ['requiredPathCoverageRatio'] : []), 'ok', 'nodes', 'ms', 'config', 'ΔnodesVsParent', 'ΔmsVsParent'];
console.log(header.join('\t'));
for (const v of manifest.variants) {
    const row = rowsById.get(v.variantId);
    const m = v.mutationManifest;
    const moveDesc = describeMutation(m);
    const dNodes = row && parentRow && row.nodesExpanded != null && parentRow.nodesExpanded != null
        ? row.nodesExpanded - parentRow.nodesExpanded : null;
    const dMs = row && parentRow && row.totalMs != null && parentRow.totalMs != null
        ? row.totalMs - parentRow.totalMs : null;
    console.log([
        v.variantId,
        m.role ? `${m.objectType}(${m.role})` : m.objectType,
        moveDesc,
        ...(hasRequiredPathCoverageRatio ? [coverageRatioOf(v) != null ? coverageRatioOf(v).toFixed(3) : '-'] : []),
        row ? row.ok : '?',
        row?.nodesExpanded ?? '-',
        row?.totalMs ?? '-',
        canonicalWinningConfig(row?.winningConfig),
        dNodes ?? '-',
        dMs ?? '-',
    ].join('\t'));
}
