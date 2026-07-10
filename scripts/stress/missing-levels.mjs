#!/usr/bin/env node
/**
 * Print the corpus level IDs in a target range that are not already present in
 * benchmark JSON logs. Intended for append-only baseline workflows: existing
 * level records anywhere in the log directory are treated as completed and are
 * never scheduled for another solver attempt.
 */
import { appendFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));

const corpusFile = args.get('--corpus') || 'data/stress/stress-levels-random.json';
const levelSpec = args.get('--levels') || null;
const logDir = args.get('--log-dir') || 'logs/solver-randoms-baseline';

function selectLevels(levels, spec) {
    if (!spec) return levels;
    const firstId = levels.find(l => typeof l?.id === 'string')?.id ?? 'S001';
    const [, corpusPrefix = 'S', corpusWidth = '001'] = /^(\D+)(\d+)$/.exec(firstId) ?? [];
    const idPrefix = corpusPrefix.toUpperCase();
    const idWidth = corpusWidth.length;
    const wanted = new Set();
    const formatId = n => `${idPrefix}${String(n).padStart(idWidth, '0')}`;
    for (const part of spec.split(',')) {
        const t = part.trim();
        if (/^\D+\d+$/i.test(t)) { wanted.add(t.toUpperCase()); continue; }
        if (t.includes('-')) {
            const [a, b] = t.split('-').map(Number);
            for (let i = Math.min(a, b); i <= Math.max(a, b); i++) wanted.add(formatId(i));
        } else if (Number.isFinite(Number(t))) wanted.add(formatId(Number(t)));
    }
    return levels.filter(level => wanted.has(level.id));
}

function loadCompletedIds(dir) {
    const completed = new Set();
    const absDir = path.resolve(ROOT, dir);
    if (!existsSync(absDir)) return completed;
    for (const name of readdirSync(absDir)) {
        if (!name.endsWith('.json')) continue;
        let parsed;
        try { parsed = JSON.parse(readFileSync(path.join(absDir, name), 'utf8')); }
        catch { continue; }
        if (!Array.isArray(parsed?.levels)) continue;
        for (const record of parsed.levels) {
            if (typeof record?.id === 'string') completed.add(record.id);
        }
    }
    return completed;
}

const corpus = JSON.parse(readFileSync(path.resolve(ROOT, corpusFile), 'utf8'));
const targets = selectLevels(corpus.levels || [], levelSpec);
const completed = loadCompletedIds(logDir);
const missing = targets.filter(level => !completed.has(level.id)).map(level => level.id);

console.log(`Target levels: ${targets.length}`);
console.log(`Existing results: ${targets.length - missing.length}`);
console.log(`Missing results: ${missing.length}`);
if (missing.length > 0) console.log(`Missing IDs: ${missing.join(',')}`);

if (process.env.GITHUB_OUTPUT) {
    const output = [
        `count=${missing.length}`,
        `levels=${missing.join(',')}`,
        `existing=${targets.length - missing.length}`,
        `total=${targets.length}`,
    ].join('\n');
    appendFileSync(process.env.GITHUB_OUTPUT, `${output}\n`);
}
