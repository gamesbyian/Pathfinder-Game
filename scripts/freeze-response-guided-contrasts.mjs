#!/usr/bin/env node
/**
 * Freeze exact technique-discordance cohorts for response-guided premise discovery.
 *
 * This is a development-population constructor. It preserves exact level identities from one
 * immutable technique-capability artifact; it does not authorize historical-ID routing.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    analyzeRelativeAdvantage,
    DEFAULT_PAIRS,
} from './analyze-technique-relative-advantage.mjs';

const sha256 = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;

export function freezeResponseGuidedContrasts(base, {
    sourcePath = null,
    sourceSha256 = null,
    pairs = DEFAULT_PAIRS,
} = {}) {
    const analysis = analyzeRelativeAdvantage(base, pairs);
    return {
        schemaVersion: 1,
        kind: 'pathfinder-response-guided-contrast-population',
        evidenceRole: 'development',
        premiseUse: 'offline-premise-nomination-only',
        identityBasis: 'levelId',
        source: {
            path: sourcePath,
            sha256: sourceSha256,
            sourceSchemaVersion: base.schemaVersion ?? null,
        },
        interpretation: {
            allowed: 'replay exact technique-discordance cohorts for offline premise discovery',
            forbidden: 'use historical cohort membership as a production solver feature or routing rule',
        },
        pairs: analysis.pairs.map(row => ({
            leftAction: row.leftAction,
            rightAction: row.rightAction,
            counts: {
                leftOnly: row.leftOnly,
                rightOnly: row.rightOnly,
                both: row.both,
                neither: row.neither,
            },
            population: row.contrastPopulation,
        })),
    };
}

async function main() {
    const args = new Map(process.argv.slice(2).map(arg => arg.split('=', 2)));
    const basePath = args.get('--base') ?? 'reports/stress/technique-niches/2026-09-03/level-capability.json';
    const outPath = args.get('--out') ?? 'tmp/response-guided-contrast-population.json';
    const bytes = readFileSync(basePath);
    const base = JSON.parse(bytes.toString('utf8'));
    const result = freezeResponseGuidedContrasts(base, {
        sourcePath: basePath,
        sourceSha256: sha256(bytes),
    });
    const absolute = path.resolve(outPath);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, `${JSON.stringify(result, null, 2)}\n`);
    console.log(JSON.stringify({
        out: outPath,
        source: result.source,
        pairs: result.pairs.length,
    }, null, 2));
}

if (process.argv[1] && ['freeze-response-guided-contrasts.mjs', 'freeze-response-guided-contrasts.bundle.mjs']
    .includes(path.basename(process.argv[1]))
    && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
