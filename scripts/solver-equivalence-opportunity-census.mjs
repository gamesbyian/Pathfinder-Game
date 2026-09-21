#!/usr/bin/env node
/**
 * Exact/symmetry-equivalence opportunity census over committed level corpora.
 *
 * Uses the same 8-way geometry transforms as runtime/editor/family generation, then canonicalizes
 * with the current level-fingerprint payload. Generated family datasets are intentionally excluded
 * unless explicitly supplied as --corpus paths: known symmetry siblings would otherwise inflate
 * the apparent opportunity by construction.
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { transformPoint, transformAxis, transformTurnDir } from '../modules/domain/geometry.js';
import { getLevelFingerprintSource } from '../modules/domain/level-fingerprint.js';

function parseArgs(argv) {
    const out = new Map();
    for (const arg of argv) {
        if (!arg.startsWith('--')) continue;
        const eq = arg.indexOf('=');
        out.set(eq >= 0 ? arg.slice(0, eq) : arg, eq >= 0 ? arg.slice(eq + 1) : true);
    }
    return out;
}

function loadLevels(filePath) {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
    const levels = Array.isArray(parsed) ? parsed : parsed.levels;
    if (!Array.isArray(levels)) throw new Error(`${filePath} has no level array`);
    return levels;
}

function tCoord(coord, orientation, w, h) {
    const { tx, ty } = transformPoint(Number(coord.x) - 1, Number(coord.y) - 1, orientation, w, h);
    return { x: tx + 1, y: ty + 1 };
}

function transformRawLevel(raw, orientation) {
    const w = Number(raw?.grid?.w || 0);
    const h = Number(raw?.grid?.h || 0);
    if (w !== h && [1, 3, 6, 7].includes(orientation)) {
        throw new Error('non-square symmetry census is not supported for width/height-swapping transforms');
    }
    const coordList = value => Array.isArray(value)
        ? value.map(coord => tCoord(coord, orientation, w, h))
        : value;
    const tFilter = value => Array.isArray(value)
        ? value.map(item => ({
            ...tCoord(item, orientation, w, h),
            axis: transformAxis(Number(item.axis), orientation),
        }))
        : value;
    const tPortal = value => Array.isArray(value)
        ? value.map(portal => {
            const a = tCoord({ x: portal.x1, y: portal.y1 }, orientation, w, h);
            const b = tCoord({ x: portal.x2, y: portal.y2 }, orientation, w, h);
            return { ...portal, x1: a.x, y1: a.y, x2: b.x, y2: b.y };
        })
        : value;
    const tLandmarks = value => Array.isArray(value)
        ? value.map(item => {
            const out = { ...item, ...tCoord(item, orientation, w, h) };
            if (item.turn != null) out.turn = transformTurnDir(item.turn, orientation);
            return out;
        })
        : value;

    return {
        ...raw,
        grid: { w: orientation === 1 || orientation === 3 || orientation === 6 || orientation === 7 ? h : w,
            h: orientation === 1 || orientation === 3 || orientation === 6 || orientation === 7 ? w : h },
        gates: coordList(raw.gates),
        goal: tCoord(raw.goal, orientation, w, h),
        falseGoals: coordList(raw.falseGoals),
        blocks: coordList(raw.blocks),
        mustPass: coordList(raw.mustPass),
        mustCross: coordList(raw.mustCross),
        geese: coordList(raw.geese),
        filters: tFilter(raw.filters),
        flippingFilters: tFilter(raw.flippingFilters),
        portals: tPortal(raw.portals),
        landmarks: tLandmarks(raw.landmarks),
    };
}

export function symmetryCanonicalFingerprintSource(raw) {
    const variants = [];
    for (let orientation = 0; orientation < 8; orientation++) {
        variants.push(getLevelFingerprintSource(transformRawLevel(raw, orientation)));
    }
    variants.sort();
    return variants[0];
}

function groupRows(rows, keyOf) {
    const groups = new Map();
    for (const row of rows) {
        const key = keyOf(row);
        const list = groups.get(key) ?? [];
        list.push(row);
        groups.set(key, list);
    }
    return [...groups.values()].filter(group => group.length > 1);
}

export function analyzeEquivalenceCorpora(corpora) {
    const rows = [];
    for (const corpus of corpora) {
        corpus.levels.forEach((raw, index) => {
            rows.push({
                corpus: corpus.name,
                position: index + 1,
                id: raw?.id ?? null,
                exactKey: getLevelFingerprintSource(raw),
                symmetryKey: symmetryCanonicalFingerprintSource(raw),
            });
        });
    }

    const exactGroups = groupRows(rows, row => row.exactKey);
    const symmetryGroups = groupRows(rows, row => row.symmetryKey);
    const exactMemberKeys = new Set(exactGroups.flatMap(group => group.map(row => `${row.corpus}\0${row.position}`)));
    const strictSymmetryGroups = symmetryGroups
        .map(group => group.filter(row => !exactMemberKeys.has(`${row.corpus}\0${row.position}`)))
        .filter(group => group.length > 1);

    const summarizeGroups = groups => groups.map(group => ({
        size: group.length,
        members: group.map(({ corpus, position, id }) => ({ corpus, position, id })),
    })).sort((a, b) => b.size - a.size
        || String(a.members[0]?.corpus).localeCompare(String(b.members[0]?.corpus))
        || Number(a.members[0]?.position) - Number(b.members[0]?.position));

    const duplicateRows = groups => groups.reduce((sum, group) => sum + Math.max(0, group.length - 1), 0);

    return {
        schemaVersion: 1,
        kind: 'pathfinder-solver-equivalence-opportunity-census',
        evidenceRole: 'development-opportunity-census',
        inferenceScope: 'exact raw semantic fingerprint and exact 8-way geometric symmetry only',
        corpora: corpora.map(corpus => ({ name: corpus.name, rows: corpus.levels.length })),
        summary: {
            rows: rows.length,
            exactDuplicateGroups: exactGroups.length,
            exactDuplicateRowsAvoidableAfterRepresentative: duplicateRows(exactGroups),
            symmetryEquivalentGroupsIncludingExact: symmetryGroups.length,
            strictSymmetryEquivalentGroups: strictSymmetryGroups.length,
            additionalRowsAvoidableBySymmetryAfterExactDedup: strictSymmetryGroups.reduce(
                (sum, group) => sum + Math.max(0, new Set(group.map(row => row.exactKey)).size - 1), 0),
        },
        exactDuplicateGroups: summarizeGroups(exactGroups),
        strictSymmetryEquivalentGroups: summarizeGroups(strictSymmetryGroups),
    };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const root = new URL('..', import.meta.url).pathname;
    const corpusArgs = String(args.get('--corpora')
        || 'published=data/levels.json,corpus1=data/stress/stress-levels.json,corpus2=data/stress/stress-levels-random.json')
        .split(',').map(value => value.trim()).filter(Boolean);
    const corpora = corpusArgs.map(spec => {
        const eq = spec.indexOf('=');
        const name = eq >= 0 ? spec.slice(0, eq) : path.basename(spec);
        const relative = eq >= 0 ? spec.slice(eq + 1) : spec;
        const absolute = path.resolve(root, relative);
        return { name, path: relative, levels: loadLevels(absolute) };
    });
    const report = analyzeEquivalenceCorpora(corpora);
    const out = path.resolve(String(args.get('--out') || path.join(root, 'tmp', 'solver-equivalence-opportunity-census.json')));
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ out, ...report.summary }, null, 2));
}

if (process.argv[1] && path.basename(process.argv[1]).includes('solver-equivalence-opportunity-census')) {
    await main();
}
