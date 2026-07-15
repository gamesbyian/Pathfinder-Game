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

console.log(`Family ${manifest.familyId} — parent ${manifest.parentLevelId} (${manifest.selectedWitnessSource}, len ${manifest.selectedWitnessLength}, reqInt ${manifest.selectedWitnessIntersectionCount})`);
console.log(`${manifest.acceptedCount}/${manifest.requestedCount} siblings generated, ${manifest.movableInstanceCount} movable instance(s) available under strict inventory.\n`);

if (parentRow) {
    console.log(`Parent solve:   ok=${parentRow.ok} nodes=${parentRow.nodesExpanded ?? '-'} ms=${parentRow.totalMs ?? '-'} config=${parentRow.winningConfig ?? '-'}\n`);
}

const header = ['variant', 'objectType', 'move', 'ok', 'nodes', 'ms', 'config', 'ΔnodesVsParent', 'ΔmsVsParent'];
console.log(header.join('\t'));
for (const v of manifest.variants) {
    const row = rowsById.get(v.variantId);
    const m = v.mutationManifest;
    const moveDesc = `(${m.from.x},${m.from.y})->(${m.to.x},${m.to.y})`;
    const dNodes = row && parentRow && row.nodesExpanded != null && parentRow.nodesExpanded != null
        ? row.nodesExpanded - parentRow.nodesExpanded : null;
    const dMs = row && parentRow && row.totalMs != null && parentRow.totalMs != null
        ? row.totalMs - parentRow.totalMs : null;
    console.log([
        v.variantId,
        m.role ? `${m.objectType}(${m.role})` : m.objectType,
        moveDesc,
        row ? row.ok : '?',
        row?.nodesExpanded ?? '-',
        row?.totalMs ?? '-',
        row?.winningConfig ?? '-',
        dNodes ?? '-',
        dMs ?? '-',
    ].join('\t'));
}
