#!/usr/bin/env node
/**
 * Direct Node driver for SolverV2. Usage mirrors run-solver-direct.mjs.
 *
 *   node scripts/run-solverv2-direct.mjs --levels=92
 *   node scripts/run-solverv2-direct.mjs --levels=all --budget-ms=30000
 *   node scripts/run-solverv2-direct.mjs --levels=1-10
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';

const args    = process.argv.slice(2);
const argMap  = new Map(args.filter(a => a.startsWith('--')).map(a => { const [k, ...v] = a.split('='); return [k, v.join('=') ?? '']; }));
const argFlags = new Set(args.filter(a => a.startsWith('--') && !a.includes('=')));

const parseLevelSpec = spec => {
    if (!spec || spec === 'all') return null;
    const set = new Set();
    for (const part of spec.split(',')) {
        const t = part.trim();
        if (t.includes('-')) {
            const [from, to] = t.split('-').map(v => Number(v.trim()));
            if (Number.isFinite(from) && Number.isFinite(to)) for (let i = Math.min(from,to); i <= Math.max(from,to); i++) set.add(i);
        } else { const n = Number(t); if (Number.isFinite(n) && n > 0) set.add(n); }
    }
    return set.size > 0 ? set : null;
};

const levelFilter  = parseLevelSpec(argMap.get('--levels'));
const budgetMsArg  = argMap.get('--budget-ms');
const outputFile   = argMap.get('--output') || 'audits/local-v2/latest.json';
const verbose      = argFlags.has('--verbose');

// Browser stubs
if (typeof globalThis.window === 'undefined')    globalThis.window    = { __PF_DISABLE_AUTO_PORTAL_VALIDATOR_DIAGNOSTICS__: true };
if (typeof globalThis.document === 'undefined')  globalThis.document  = { addEventListener(){}, getElementById: () => null, createElement: () => ({ classList: { add(){}, remove(){} }, style: {} }) };
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => Date.now() };

const { createSolverV2 } = await import('../modules/SolverV2.js');

const budgetMs = Number(budgetMsArg || 30000);

const SolverV2 = createSolverV2();

function loadAllLevels() {
    const root = new URL('..', import.meta.url).pathname;
    const filePath = path.join(root, 'data', 'levels.json');
    const levels = JSON.parse(readFileSync(filePath, 'utf8'));
    if (!Array.isArray(levels) || levels.length === 0) throw new Error('data/levels.json is empty or not an array');
    return levels;
}

const getCommitSha = () => {
    if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
    try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { return 'local'; }
};

const rawLevels = loadAllLevels();
console.log(`Loaded ${rawLevels.length} levels. Budget: ${budgetMs}ms`);

const levelNumbers = levelFilter
    ? [...levelFilter].filter(n => n >= 1 && n <= rawLevels.length).sort((a, b) => a - b)
    : Array.from({ length: rawLevels.length }, (_, i) => i + 1);

console.log(`Target: ${levelNumbers.length} level(s)`);

const results = [];
let solvedCount = 0, failCount = 0, errorCount = 0;
const runStart = Date.now();

for (const levelNumber of levelNumbers) {
    const raw = rawLevels[levelNumber - 1];
    if (!raw) { results.push({ level: levelNumber, status: 'error', error: 'no-raw-level' }); errorCount++; continue; }

    let level;
    try { level = SolverV2.prepareLevelForSolver(raw, { source: 'raw', levelNumber }); }
    catch (e) { results.push({ level: levelNumber, status: 'error', error: `normalize: ${e?.message}` }); errorCount++; continue; }

    const t0 = Date.now();
    let result;
    try { result = await SolverV2.solve(level, { timeBudgetMs: budgetMs }); }
    catch (e) { results.push({ level: levelNumber, status: 'error', error: `solve: ${e?.message}`, elapsedMs: Date.now() - t0 }); errorCount++; console.log(`  L${levelNumber}: ERROR — ${e?.message}`); continue; }

    const elapsed = Date.now() - t0;
    const ok = !!result?.ok;
    ok ? solvedCount++ : failCount++;

    const solvedBy = ok ? (result.attempts?.find(a => a.ok)?.profile ?? 'unknown') : null;
    results.push({ level: levelNumber, status: result.status, ok, elapsedMs: elapsed, solvedBy, attempts: result.attempts });

    const marker = ok ? '✓' : '✗';
    if (verbose || !ok) console.log(`  L${levelNumber} ${marker} ${elapsed}ms${ok ? ` [${solvedBy}]` : ''}`);
    else process.stdout.write(`  L${levelNumber} ${marker} ${elapsed}ms [${solvedBy}]\n`);
}

const totalMs = Date.now() - runStart;
console.log(`\nDone: ${solvedCount} solved, ${failCount} failed, ${errorCount} errors / ${levelNumbers.length} total — ${totalMs}ms`);

const out = {
    timestamp: new Date().toISOString(),
    commitSha: getCommitSha(),
    budgetMs,
    levelFilter: levelFilter ? [...levelFilter].sort((a,b) => a-b) : 'all',
    solved: solvedCount, failed: failCount, errors: errorCount, total: levelNumbers.length, totalMs,
    levels: results,
};

const dir = path.dirname(path.resolve(outputFile));
await mkdir(dir, { recursive: true });
await writeFile(outputFile, JSON.stringify(out, null, 2));
console.log(`Results → ${outputFile}`);
