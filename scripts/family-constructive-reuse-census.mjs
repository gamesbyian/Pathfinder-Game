#!/usr/bin/env node
/**
 * Census already-known constructive solutions in generated family datasets.
 *
 * This measures operational reuse opportunity only. A family witness may be exact evidence that a
 * variant is solvable, but using it to skip search inside a solver-capability experiment would
 * destroy the experiment. The report therefore separates constructive availability from scientific
 * permission to consume it.
 */
import { existsSync, readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function walk(dir, out = []) {
    if (!existsSync(dir)) return out;
    for (const name of readdirSync(dir).sort()) {
        const p = path.join(dir, name);
        const st = statSync(p);
        if (st.isDirectory()) walk(p, out);
        else out.push(p);
    }
    return out;
}

function readJson(file) {
    return JSON.parse(readFileSync(file, 'utf8'));
}

export function analyzeFamilyConstructiveReuse(root) {
    const familyRoot = path.join(root, 'data', 'families');
    const manifestFiles = walk(familyRoot).filter(file => file.endsWith('-manifest.json'));
    const hintRoot = path.join(familyRoot, 'hints');

    const rows = [];
    for (const file of manifestFiles) {
        const manifest = readJson(file);
        if (!Array.isArray(manifest?.variants)) continue;
        for (const variant of manifest.variants) {
            const variantId = String(variant?.variantId ?? variant?.id ?? '');
            if (!variantId) continue;
            const witnessRelation = String(variant?.witnessRelation ?? 'unknown');
            const hintFile = path.join(hintRoot, `${variantId}.json`);
            rows.push({
                manifest: path.relative(root, file).split(path.sep).join('/'),
                familyId: manifest.familyId ?? null,
                parentLevelId: manifest.parentLevelId ?? manifest.parentId ?? null,
                parentCorpus: manifest.parentCorpus ?? null,
                familyMode: manifest.familyMode ?? null,
                relation: variant.relation ?? null,
                variantId,
                witnessRelation,
                constructiveWitnessByGenerationContract:
                    witnessRelation === 'exact-coordinate' || witnessRelation === 'transformed',
                storedHintFile: existsSync(hintFile)
                    ? path.relative(root, hintFile).split(path.sep).join('/')
                    : null,
            });
        }
    }

    const countBy = key => Object.fromEntries([...rows.reduce((m, row) => {
        const value = String(row[key] ?? 'null');
        m.set(value, (m.get(value) ?? 0) + 1);
        return m;
    }, new Map())].sort(([a], [b]) => a.localeCompare(b)));

    const constructive = rows.filter(row => row.constructiveWitnessByGenerationContract);
    const stored = rows.filter(row => row.storedHintFile);
    const constructiveWithoutStoredHint = constructive.filter(row => !row.storedHintFile);

    return {
        schemaVersion: 1,
        kind: 'pathfinder-family-constructive-reuse-census',
        evidenceRole: 'development-opportunity-census',
        inferenceScope: 'generated-family constructive witness availability; not permission to consume hints in blind solver experiments',
        summary: {
            manifestFiles: manifestFiles.length,
            variantRows: rows.length,
            constructiveWitnessRows: constructive.length,
            storedHintRows: stored.length,
            constructiveWitnessRowsWithoutStoredHintFile: constructiveWithoutStoredHint.length,
            witnessRelationCounts: countBy('witnessRelation'),
            relationCounts: countBy('relation'),
            familyModeCounts: countBy('familyMode'),
        },
        rows,
    };
}

async function main() {
    const root = new URL('..', import.meta.url).pathname;
    const report = analyzeFamilyConstructiveReuse(root);
    const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(arg => {
        const i = arg.indexOf('=');
        return [i >= 0 ? arg.slice(0, i) : arg, i >= 0 ? arg.slice(i + 1) : true];
    }));
    const out = path.resolve(String(args.get('--out') || path.join(root, 'tmp', 'family-constructive-reuse-census.json')));
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ out, ...report.summary }, null, 2));
}

if (process.argv[1] && path.basename(process.argv[1]).includes('family-constructive-reuse-census')) {
    await main();
}
