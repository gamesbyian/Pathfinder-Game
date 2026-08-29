#!/usr/bin/env node
/**
 * Offline replay of portfolio cap policies against already-recorded winning attempts.
 *
 * Usage:
 *   npm run solver:portfolio-replay -- --inputs=logs/published.json --out=reports/portfolio-historical-replay.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { LEGACY_LATENCY_PORTFOLIO_EXPERIMENT } from '../modules/solver/legacy-latency-portfolio-experiment.js';
import { canonicalAttemptConfigKey } from './portfolio-solve-sweep-lib.mjs';
import { normalizeAttemptIdentityKey } from '../modules/solver/attempt-identity.mjs';

const args = process.argv.slice(2);
const argMap = new Map(args.filter(a => a.startsWith('--') && a.includes('=')).map(a => { const [k, ...v] = a.split('='); return [k, v.join('=')]; }));
const positional = args.filter(a => !a.startsWith('--'));
const inputs = (argMap.get('--inputs') || '').split(',').map(s => s.trim()).filter(Boolean).concat(positional);
const outFile = argMap.get('--out') || 'reports/portfolio-historical-replay.json';

if (inputs.length === 0) {
    console.error('Usage: npm run solver:portfolio-replay -- --inputs=logs/a.json[,logs/b.json] [--out=reports/portfolio-historical-replay.json]');
    process.exit(2);
}


function csvSet(value, fallback) {
    const raw = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [...fallback];
    return new Set(raw.map(normalizeAttemptIdentityKey));
}

function experimentFromArgs() {
    return {
        pass1Ms: Number(argMap.get('--pass1-ms') || LEGACY_LATENCY_PORTFOLIO_EXPERIMENT.pass1Ms),
        pass2Ms: Number(argMap.get('--pass2-ms') || LEGACY_LATENCY_PORTFOLIO_EXPERIMENT.pass2Ms),
        pass3Ms: Number(argMap.get('--pass3-ms') || LEGACY_LATENCY_PORTFOLIO_EXPERIMENT.pass3Ms),
        pass2Configs: csvSet(argMap.get('--pass2-configs'), LEGACY_LATENCY_PORTFOLIO_EXPERIMENT.pass2Configs),
        pass3Configs: csvSet(argMap.get('--pass3-configs'), LEGACY_LATENCY_PORTFOLIO_EXPERIMENT.pass3Configs),
        conditionalPasses: LEGACY_LATENCY_PORTFOLIO_EXPERIMENT.conditionalPasses,
    };
}

const tieredPolicy = experimentFromArgs();

function round(value, places = 3) {
    if (!Number.isFinite(value)) return null;
    const m = 10 ** places;
    return Math.round(value * m) / m;
}

function levelsFrom(parsed) {
    if (Array.isArray(parsed?.levels)) return parsed.levels;
    if (Array.isArray(parsed?.data?.levels)) return parsed.data.levels;
    if (Array.isArray(parsed)) return parsed;
    return [];
}

function firstWinningAttempt(level) {
    const attempts = Array.isArray(level?.attempts) ? level.attempts : [];
    return attempts.find(a => a?.ok) ?? null;
}

function replayTiered(win) {
    if (!win) return null;
    if (win.elapsedMs <= tieredPolicy.pass1Ms) return 'pass1';
    if (tieredPolicy.pass2Configs.has(win.configKey) && win.elapsedMs <= tieredPolicy.pass2Ms) return 'pass2';
    if (tieredPolicy.pass3Configs.has(win.configKey) && win.elapsedMs <= tieredPolicy.pass3Ms) return 'pass3';
    for (const conditionalPass of tieredPolicy.conditionalPasses ?? []) {
        if (conditionalPass.configs.has(win.configKey) && win.elapsedMs <= conditionalPass.capMs) return `pass${conditionalPass.passNumber}`;
    }
    return null;
}

const wins = [];
const sources = [];
for (const input of inputs) {
    const parsed = JSON.parse(readFileSync(input, 'utf8'));
    const levels = levelsFrom(parsed);
    let sourceWins = 0;
    for (const level of levels) {
        const attempt = firstWinningAttempt(level);
        const elapsedMs = Number(attempt?.elapsedMs);
        if (!attempt || !Number.isFinite(elapsedMs)) continue;
        wins.push({
            source: input,
            level: level?.level ?? level?.id ?? null,
            configKey: canonicalAttemptConfigKey(attempt),
            gateKey: attempt.gateKey ?? null,
            elapsedMs,
            allocatedBudgetMs: Number.isFinite(Number(attempt?.allocatedBudgetMs)) ? Number(attempt.allocatedBudgetMs) : null,
            nodesExpanded: Number.isFinite(Number(attempt?.nodesExpanded)) ? Number(attempt.nodesExpanded) : null,
        });
        sourceWins += 1;
    }
    sources.push({ input, levels: levels.length, winningAttempts: sourceWins });
}

const thresholds = [250, 500, 1000, 2000, 5000];
const simpleCaps = Object.fromEntries(thresholds.map(cap => [`within${cap}ms`, {
    capMs: cap,
    recovered: wins.filter(w => w.elapsedMs <= cap).length,
    total: wins.length,
    fraction: wins.length ? round(wins.filter(w => w.elapsedMs <= cap).length / wins.length) : null,
}]));
const tieredRows = wins.map(win => ({ ...win, recoveredIn: replayTiered(win) }));
const tieredSummary = {
    pass1: tieredRows.filter(w => w.recoveredIn === 'pass1').length,
    pass2: tieredRows.filter(w => w.recoveredIn === 'pass2').length,
    pass3: tieredRows.filter(w => w.recoveredIn === 'pass3').length,
    conditional: tieredRows.filter(w => /^pass[4-9]\d*$/u.test(w.recoveredIn ?? '')).length,
    missed: tieredRows.filter(w => !w.recoveredIn).length,
    total: wins.length,
};
tieredSummary.recovered = tieredSummary.pass1 + tieredSummary.pass2 + tieredSummary.pass3 + tieredSummary.conditional;
tieredSummary.fraction = wins.length ? round(tieredSummary.recovered / wins.length) : null;

const byConfig = new Map();
for (const row of tieredRows) {
    if (!byConfig.has(row.configKey)) byConfig.set(row.configKey, { wins: 0, pass1: 0, pass2: 0, pass3: 0, conditional: 0, missed: 0 });
    const entry = byConfig.get(row.configKey);
    entry.wins += 1;
    entry[row.recoveredIn && /^pass[4-9]\d*$/u.test(row.recoveredIn) ? 'conditional' : (row.recoveredIn ?? 'missed')] += 1;
}

const report = {
    generatedAt: new Date().toISOString(),
    evidenceClass: 'legacy-wall-clock-scheduler-replay',
    decisionBearingForEqualWork: false,
    inputs,
    sources,
    note: 'Historical replay is an upper-bound expectation from recorded winning-attempt elapsed times only; it is host/provenance-sensitive, does not model scheduler-context effects, and is not equal-work evidence.',
    totalWinningAttempts: wins.length,
    simpleCaps,
    tieredPolicy: {
        pass1Ms: tieredPolicy.pass1Ms,
        pass2Ms: tieredPolicy.pass2Ms,
        pass3Ms: tieredPolicy.pass3Ms,
        pass2Configs: [...tieredPolicy.pass2Configs],
        pass3Configs: [...tieredPolicy.pass3Configs],
        conditionalPasses: (tieredPolicy.conditionalPasses ?? []).map(pass => ({
            passNumber: pass.passNumber,
            capMs: pass.capMs,
            configs: [...pass.configs],
            when: pass.when,
        })),
    },
    tieredSummary,
    byConfig: Object.fromEntries([...byConfig.entries()].sort((a, b) => b[1].wins - a[1].wins || a[0].localeCompare(b[0]))),
    missed: tieredRows.filter(w => !w.recoveredIn),
};

mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(report, null, 2) + '\n');
console.log(`Replayed ${wins.length} historical winning attempts.`);
console.log(`Tiered recovery: ${tieredSummary.recovered}/${tieredSummary.total} (${tieredSummary.fraction})`);
console.log(`Wrote ${outFile}`);
