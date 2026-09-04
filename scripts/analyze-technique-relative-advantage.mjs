#!/usr/bin/env node
/**
 * Compact relative-advantage analysis over the committed technique-niche base artifact.
 * Development evidence only: outcome-selected action pairs nominate hypotheses, not routing rules.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Canonical attempt-identity-key spellings (post naming-cleanup Phase 5; see
// docs/naming-cleanup-ledger.json NC-P05-012/013/014 for the 'diverse'->'mechanic-buckets'
// mapping and scripts/technique-census-result-lib.mjs's ida:*->admissible-order|tieBreak=*
// mapping) of the exact same eight pairs first prespecified 2026-09-01
// (reports/2026-09-01-technique-relative-advantage-followup.md). Updated 2026-09-04
// (reports/2026-09-04-census-cross-evidence-coding-handoff.md Gate 0B) when the 2026-09-03
// census refresh's solvingActions moved to this format and every DEFAULT_PAIRS entry stopped
// matching anything (0/8 pairs found any left/right/both rows) -- this is a key-spelling fix
// for the same eight comparisons, not a reselection of which pairs to test.
const DEFAULT_PAIRS = [
    ['admissible-order|tieBreak=default|lds=off', 'admissible-order|tieBreak=mustCrossFirst|lds=off'],
    ['dfs|score=harvestThenFinish|bias=none', 'dfs|score=portalFirstTransfer|bias=none'],
    ['beam|score=objectiveFirst|bias=none|width=2000|retention=plain', 'beam|score=objectiveFirst|bias=none|width=5000|retention=plain'],
    ['beam|score=intersectionHarvest|bias=none|width=2000|retention=plain', 'beam|score=intersectionHarvest|bias=none|width=5000|retention=plain'],
    ['beam|score=objectiveFirst|bias=none|width=5000|retention=plain', 'beam|score=objectiveFirst|bias=none|width=5000|retention=mechanic-buckets'],
    ['beam|score=intersectionHarvest|bias=none|width=5000|retention=plain', 'beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets'],
    ['beam|score=perimeterSweep|bias=perimeterCW|width=2000|retention=plain', 'beam|score=perimeterSweep|bias=perimeterCCW|width=2000|retention=plain'],
    ['dfs|score=perimeterSweep|bias=perimeterCW', 'dfs|score=perimeterSweep|bias=perimeterCCW'],
];

const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const variance = (xs, m) => xs.length ? xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length : null;

function standardizedDifference(left, right, feature) {
    const a = left.map((row) => row.features[feature]).filter(Number.isFinite);
    const b = right.map((row) => row.features[feature]).filter(Number.isFinite);
    if (!a.length || !b.length) return null;
    const ma = mean(a), mb = mean(b);
    const pooled = Math.sqrt((variance(a, ma) + variance(b, mb)) / 2);
    return {
        feature,
        leftMean: ma,
        rightMean: mb,
        standardizedDifference: pooled ? (ma - mb) / pooled : 0,
    };
}

export function analyzeRelativeAdvantage(base, pairs = DEFAULT_PAIRS) {
    if (!Array.isArray(base.levels) || !base.levels.length) throw new Error('Expected non-empty base.levels');
    const numeric = Object.keys(base.levels[0].features).filter((key) => typeof base.levels[0].features[key] === 'number');
    const pairResults = pairs.map(([leftAction, rightAction]) => {
        const leftOnly = base.levels.filter((row) => row.solvingActions.includes(leftAction) && !row.solvingActions.includes(rightAction));
        const rightOnly = base.levels.filter((row) => row.solvingActions.includes(rightAction) && !row.solvingActions.includes(leftAction));
        const both = base.levels.filter((row) => row.solvingActions.includes(leftAction) && row.solvingActions.includes(rightAction));
        const neither = base.levels.length - leftOnly.length - rightOnly.length - both.length;
        const effects = numeric
            .map((feature) => standardizedDifference(leftOnly, rightOnly, feature))
            .filter(Boolean)
            .sort((a, b) => Math.abs(b.standardizedDifference) - Math.abs(a.standardizedDifference));
        return {
            leftAction, rightAction,
            leftOnly: leftOnly.length, rightOnly: rightOnly.length, both: both.length, neither,
            topEffects: effects.slice(0, 8),
            maxAbsoluteStandardizedDifference: effects.length ? Math.abs(effects[0].standardizedDifference) : null,
            evidenceRole: 'outcome-selected-development',
        };
    });
    return {
        schemaVersion: 1,
        evidenceRole: 'observational-development',
        baseSchemaVersion: base.schemaVersion ?? null,
        pairs: pairResults,
    };
}

async function main() {
    const args = new Map(process.argv.slice(2).map((arg) => arg.split('=', 2)));
    const input = args.get('--input') ?? 'reports/stress/technique-niches/2026-09-01/level-capability.json';
    const output = args.get('--out') ?? 'reports/stress/technique-niches/2026-09-01/relative-advantage-summary.json';
    const base = JSON.parse(readFileSync(input, 'utf8'));
    const result = analyzeRelativeAdvantage(base);
    writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
    console.log(`Wrote ${output}: ${result.pairs.length} prespecified pair summaries`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
