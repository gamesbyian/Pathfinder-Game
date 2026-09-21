#!/usr/bin/env node
/**
 * Retrospective action-selection oracle census.
 *
 * For every solved level, find the first successful attempt and measure canonical work spent
 * before it. This is a perfect-hindsight upper bound on work a perfect free action selector
 * could eliminate. It is NOT evidence that predecessor attempts were predictably redundant.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = name => argv.find(v => v.startsWith(`--${name}=`))?.slice(name.length + 3) ?? null;
const inputs = String(arg('inputs') ?? '').split(',').map(v => v.trim()).filter(Boolean);
const out = arg('out');
if (!inputs.length || !out) throw new Error('--inputs=<a.json,b.json> and --out=<result.json> are required');

const success = a => a?.ok === true || a?.outcome === 'success' || a?.outcome === 'solved' || a?.status === 'success';
const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
const pct = (sorted, q) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1)))] : null;
const ratio = (a, b) => b > 0 ? a / b : null;

export function analyzePrewinnerWorkDocuments(documents) {
    const rows = [];
    const sources = [];
    for (const { source, document } of documents) {
        const levels = Array.isArray(document) ? document : (document?.levels ?? document?.data?.levels ?? []);
        if (!Array.isArray(levels)) throw new Error(`${source}: expected array or {levels:[...]}`);
        let solved = 0;
        for (const level of levels) {
            if (!(level?.ok === true || level?.status === 'success')) continue;
            const attempts = Array.isArray(level?.attempts) ? level.attempts : [];
            const winnerIndex = attempts.findIndex(success);
            if (winnerIndex < 0) continue;
            solved++;
            const preWinnerWork = attempts.slice(0, winnerIndex).reduce((s, a) => s + num(a?.workSpent), 0);
            const winnerWork = num(attempts[winnerIndex]?.workSpent);
            const attemptWork = attempts.reduce((s, a) => s + num(a?.workSpent), 0);
            rows.push({
                source,
                levelId: String(level?.id ?? level?.level ?? ''),
                winnerIndex,
                attemptsBeforeWinner: winnerIndex,
                preWinnerWork,
                winnerWork,
                attemptWork,
                preWinnerWorkShare: ratio(preWinnerWork, attemptWork),
                winningStage: attempts[winnerIndex]?.stageId ?? level?.winningStage ?? null,
                winningActionKey: attempts[winnerIndex]?.actionKey ?? level?.winningActionKey ?? null,
            });
        }
        sources.push({ source, levels: levels.length, solvedWithWinnerAttempt: solved });
    }

    const totalWork = rows.reduce((s, r) => s + r.attemptWork, 0);
    const preWork = rows.reduce((s, r) => s + r.preWinnerWork, 0);
    const idx = rows.map(r => r.winnerIndex).sort((a,b) => a-b);
    const work = rows.map(r => r.preWinnerWork).sort((a,b) => a-b);
    const shares = rows.map(r => r.preWinnerWorkShare).filter(v => v != null).sort((a,b) => a-b);
    const byStageMap = new Map();
    for (const r of rows) {
        const key = r.winningStage ?? '(unknown)';
        const g = byStageMap.get(key) ?? { winningStage:key, levels:0, preWinnerWork:0, totalWork:0 };
        g.levels++; g.preWinnerWork += r.preWinnerWork; g.totalWork += r.attemptWork;
        byStageMap.set(key, g);
    }
    const byWinningStage = [...byStageMap.values()].map(g => ({
        ...g, preWinnerWorkShare: ratio(g.preWinnerWork, g.totalWork),
    })).sort((a,b) => b.preWinnerWork - a.preWinnerWork || a.winningStage.localeCompare(b.winningStage));

    return {
        schemaVersion: 1,
        kind: 'pathfinder-prewinner-work-oracle-census',
        interpretation: {
            allowed: 'perfect-hindsight upper bound on canonical work spent before the eventual winning attempt',
            forbidden: 'infer that predecessor attempts were ex-ante avoidable, redundant, or safely skippable',
        },
        sources,
        summary: {
            solvedLevels: rows.length,
            winnerWasFirstAttempt: rows.filter(r => r.winnerIndex === 0).length,
            winnerWasLaterAttempt: rows.filter(r => r.winnerIndex > 0).length,
            totalAttemptWork: totalWork,
            preWinnerWork: preWork,
            preWinnerWorkShare: ratio(preWork, totalWork),
            medianWinnerIndex: pct(idx, .5),
            p90WinnerIndex: pct(idx, .9),
            medianPreWinnerWork: pct(work, .5),
            p90PreWinnerWork: pct(work, .9),
            medianPerLevelPreWinnerWorkShare: pct(shares, .5),
            p25PerLevelPreWinnerWorkShare: pct(shares, .25),
            p75PerLevelPreWinnerWorkShare: pct(shares, .75),
        },
        byWinningStage,
        levels: rows,
    };
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const documents = inputs.map(source => ({ source, document: JSON.parse(readFileSync(source, 'utf8')) }));
    const result = analyzePrewinnerWorkDocuments(documents);
    mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
    console.log(JSON.stringify(result.summary, null, 2));
}
