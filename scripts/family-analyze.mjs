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

// Different family modes (family-generate.mjs's --mode) produce differently-shaped
// mutationManifest objects: local-mutant's is {operation:'move', from:{x,y}, to:{x,y}, ...};
// density-sweep's is {operation:'add'|'remove', count, resultingBlockCount} — no from/to at all.
function describeMutation(m) {
    if (m.operation === 'move') return `(${m.from.x},${m.from.y})->(${m.to.x},${m.to.y})`;
    if (m.operation === 'add' || m.operation === 'remove') return `${m.operation === 'add' ? '+' : '-'}${m.count} (now ${m.resultingBlockCount})`;
    return JSON.stringify(m);
}

const hasNavDensity = manifest.variants.some(v => v.navDensity != null);

console.log(`Family ${manifest.familyId} — parent ${manifest.parentLevelId} (${manifest.selectedWitnessSource}, len ${manifest.selectedWitnessLength}, reqInt ${manifest.selectedWitnessIntersectionCount})${manifest.parentNavDensity != null ? `, parent navDensity ${manifest.parentNavDensity.toFixed(3)}` : ''}`);
console.log(`${manifest.acceptedCount}/${manifest.requestedCount} siblings generated (mode: ${manifest.familyMode ?? 'local-mutant'}), ${manifest.movableInstanceCount} movable instance(s) available under strict inventory.\n`);

if (parentRow) {
    console.log(`Parent solve:   ok=${parentRow.ok} nodes=${parentRow.nodesExpanded ?? '-'} ms=${parentRow.totalMs ?? '-'} config=${parentRow.winningConfig ?? '-'}\n`);
}

const header = ['variant', 'objectType', 'move', ...(hasNavDensity ? ['navDensity'] : []), 'ok', 'nodes', 'ms', 'config', 'ΔnodesVsParent', 'ΔmsVsParent'];
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
        ...(hasNavDensity ? [v.navDensity != null ? v.navDensity.toFixed(3) : '-'] : []),
        row ? row.ok : '?',
        row?.nodesExpanded ?? '-',
        row?.totalMs ?? '-',
        row?.winningConfig ?? '-',
        dNodes ?? '-',
        dMs ?? '-',
    ].join('\t'));
}
