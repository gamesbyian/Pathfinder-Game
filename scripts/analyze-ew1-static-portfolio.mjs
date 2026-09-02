#!/usr/bin/env node
/**
 * Offline, deterministic construction of a small fixed-work static portfolio from an existing
 * equal-work (EW1) technique-pricing snapshot. This is gate-sequence (C) rung 2 of the
 * "Configuration and portfolio search" complexity ladder (docs/solver-scheduling-policy.md):
 * "construct a small fixed-work static portfolio", evaluated first as a cheap offline reanalysis
 * of already-collected per-technique equal-work cells, not a new dispatched run.
 *
 * Method: greedy marginal-coverage set cover over the technique x level solved matrix. At each
 * step, add the technique that solves the most currently-uncovered levels; ties break toward the
 * technique with the lower mean workSpent (cheaper use of the shared envelope), then toward the
 * technique key sorted first (full determinism). This produces one full ranking of the technique
 * menu (cardinality 1..N); report coverage and a work charge at every prefix, so a reader can pick
 * any cardinality without rerunning the analysis.
 *
 * Work-charge caveat (stated once, not per row): EW1 priced every technique independently against
 * its own fresh workBudget-sized cell. Summing prefix workSpent approximates a real sequential
 * shared-envelope portfolio only for cells that reached natural exhaustion; a cell whose status is
 * `work-budget-reached` would likely spend less real work under a smaller shared remainder. The
 * summary reports the work-budget-reached share of the picked prefix so a reader can judge how much
 * this approximation matters at that cardinality.
 *
 * This is discovery/observational evidence (evidence role: discovery; selection: observational —
 * the full ranking is reported, not a single cherry-picked cardinality) toward nominating a rung-2
 * candidate. It is not itself a production A/B and must not be read as one.
 *
 * A second, complementary view (`analyzeProductionRanking`) reuses the already-landed
 * equal-work x production-reach join (`solver:analyze-equal-work-production-reach`,
 * reports/stress/capability-runs/<run-id>/equal-work-production-reach.json) to rank the same 34
 * base attempt-config identities by REAL production winningLevels across the full corpus1+corpus2
 * population (~1,800 levels, not just the 60-level EW1 sample). Since each production row's
 * `winningConfig` credits exactly one technique, summing top-k winningLevels is an exact (not
 * overlap-estimated) cumulative coverage curve at real production scale. This cannot say whether a
 * still-included technique would have covered a dropped technique's exact wins (routing/reserve
 * order was not re-run), so treat it as a contribution-frequency ranking, not an oracle-exclusivity
 * proof; the EW1 ranking above is the source for exclusivity claims.
 *
 * Usage:
 *   node scripts/analyze-ew1-static-portfolio.mjs \
 *     --pricing-snapshot=reports/stress/ew1/33156541827-pricing-snapshot.json \
 *     --production-reach=reports/stress/capability-runs/33588487486/equal-work-production-reach.json \
 *     --out=reports/stress/portfolio/ew1-static-portfolio-construction.json \
 *     --summary-out=reports/stress/portfolio/ew1-static-portfolio-construction-summary.md
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const familyOf = (techniqueKey) => techniqueKey.startsWith('beam|') ? 'beam'
    : techniqueKey.startsWith('admissible-order|') ? 'ida'
        : techniqueKey.startsWith('repair|') ? 'repair'
            : techniqueKey.startsWith('dfs|') ? 'dfs' : 'other';

const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

/**
 * @param {{ results: Array<{ levelId: string, techniqueKeys: string[], workSpent: number, ok: boolean, status: string }> }} snapshot
 * @returns {object} full analysis: technique menu, greedy ranking, coverage/work curve, rare-capability audit
 */
export function analyze(snapshot) {
    const results = snapshot.results;
    if (!Array.isArray(results) || results.length === 0) {
        throw new Error('analyze-ew1-static-portfolio: snapshot.results must be a non-empty array');
    }

    /** @type {Map<string, Map<string, typeof results[number]>>} technique -> level -> cell */
    const cellsByTechnique = new Map();
    const levelIds = new Set();
    for (const cell of results) {
        if (cell.techniqueKeys.length !== 1) {
            throw new Error(`analyze-ew1-static-portfolio: composite techniqueKeys not supported (cell ${cell.cellId ?? '?'})`);
        }
        const tech = cell.techniqueKeys[0];
        levelIds.add(cell.levelId);
        if (!cellsByTechnique.has(tech)) cellsByTechnique.set(tech, new Map());
        const byLevel = cellsByTechnique.get(tech);
        if (byLevel.has(cell.levelId)) {
            throw new Error(`analyze-ew1-static-portfolio: duplicate cell for technique ${tech} level ${cell.levelId}`);
        }
        byLevel.set(cell.levelId, cell);
    }

    const techniques = [...cellsByTechnique.keys()].sort();
    const levels = [...levelIds].sort();

    // Oracle union and per-level solver set, over the full technique menu.
    /** @type {Map<string, string[]>} level -> techniques that solved it */
    const solversByLevel = new Map();
    for (const level of levels) {
        const solvers = [];
        for (const tech of techniques) {
            const cell = cellsByTechnique.get(tech).get(level);
            if (cell && cell.ok) solvers.push(tech);
        }
        if (solvers.length) solversByLevel.set(level, solvers);
    }
    const oracleUnionCount = solversByLevel.size;

    // Technique-exclusive levels: this exact technique is the sole solver among the full menu.
    /** @type {Map<string, string[]>} technique -> levels only it solves */
    const exclusiveLevelsByTechnique = new Map(techniques.map((t) => [t, []]));
    for (const [level, solvers] of solversByLevel) {
        if (solvers.length === 1) exclusiveLevelsByTechnique.get(solvers[0]).push(level);
    }

    // Per-technique summary stats (menu-wide, independent of any portfolio ordering).
    const techniqueStats = new Map(techniques.map((tech) => {
        const cells = [...cellsByTechnique.get(tech).values()];
        const solvedLevels = cells.filter((c) => c.ok).map((c) => c.levelId);
        return [tech, {
            technique: tech,
            family: familyOf(tech),
            eligibleLevels: cells.length,
            solvedLevels: solvedLevels.length,
            exclusiveLevels: exclusiveLevelsByTechnique.get(tech).length,
            meanWorkSpent: mean(cells.map((c) => c.workSpent)),
        }];
    }));

    // Greedy marginal-coverage ranking. Deterministic tie-break: fewer newly-covered levels loses;
    // among equal newly-covered, lower meanWorkSpent wins; final tie-break is the technique key
    // itself (already globally sorted going in).
    const covered = new Set();
    const remaining = new Set(techniques);
    const ranking = [];
    while (remaining.size) {
        let best = null;
        let bestNewlyCovered = -1;
        for (const tech of remaining) {
            const cells = cellsByTechnique.get(tech);
            let newlyCovered = 0;
            for (const [level, cell] of cells) {
                if (cell.ok && !covered.has(level)) newlyCovered++;
            }
            if (best === null
                || newlyCovered > bestNewlyCovered
                || (newlyCovered === bestNewlyCovered && techniqueStats.get(tech).meanWorkSpent < techniqueStats.get(best).meanWorkSpent)) {
                best = tech;
                bestNewlyCovered = newlyCovered;
            }
        }
        ranking.push(best);
        remaining.delete(best);
        for (const [level, cell] of cellsByTechnique.get(best)) {
            if (cell.ok) covered.add(level);
        }
    }

    // Coverage/work curve: for each prefix length k, compute cumulative coverage and the
    // sequential-charge aggregate work (sum of workSpent for every technique reached on a level,
    // stopping at the first solver; charging the full prefix when unsolved).
    const curve = [];
    const exclusiveOwnedSoFar = new Set();
    for (let k = 1; k <= ranking.length; k++) {
        const prefix = ranking.slice(0, k);
        const prefixSet = new Set(prefix);
        let coveredCount = 0;
        let aggregateWork = 0;
        let workBudgetReachedInDecisiveCells = 0;
        for (const level of levels) {
            let solved = false;
            let levelWork = 0;
            for (const tech of prefix) {
                const cell = cellsByTechnique.get(tech).get(level);
                if (!cell) continue;
                levelWork += cell.workSpent;
                if (cell.ok) {
                    solved = true;
                    if (cell.status === 'work-budget-reached') workBudgetReachedInDecisiveCells++;
                    break;
                }
            }
            aggregateWork += levelWork;
            if (solved) coveredCount++;
        }
        const addedTechnique = ranking[k - 1];
        for (const level of exclusiveLevelsByTechnique.get(addedTechnique)) exclusiveOwnedSoFar.add(level);
        const missingExclusiveLevels = [...exclusiveLevelsByTechnique.entries()]
            .filter(([tech]) => !prefixSet.has(tech))
            .flatMap(([, lvls]) => lvls);
        curve.push({
            cardinality: k,
            addedTechnique,
            addedTechniqueFamily: familyOf(addedTechnique),
            cumulativeCoverage: coveredCount,
            cumulativeCoverageFractionOfOracleUnion: oracleUnionCount ? coveredCount / oracleUnionCount : 0,
            aggregateWork,
            workBudgetReachedShareOfSolves: coveredCount ? workBudgetReachedInDecisiveCells / coveredCount : 0,
            exclusiveLevelsMissing: missingExclusiveLevels.length,
        });
    }

    return {
        schemaVersion: 1,
        sourceRunId: snapshot.sourceRunId ?? null,
        sourceHeadSha: snapshot.sourceHeadSha ?? null,
        evidenceRole: 'discovery',
        selection: 'observational (full greedy ranking reported, not a single chosen cardinality)',
        levelCount: levels.length,
        techniqueCount: techniques.length,
        oracleUnionCount,
        techniqueStats: [...techniqueStats.values()],
        ranking,
        curve,
    };
}

/**
 * Rank the joined equal-work x production-reach report's per-technique real production
 * `winningLevels` counts. Each production row credits exactly one `winningConfig`, so summing
 * top-k `winningLevels` is exact cumulative coverage, not an overlap estimate.
 * @param {{ techniques: Array<{ attemptConfigIdentity: string, production: { winningLevels: number, work: number } }> }} equalWorkProductionReach
 */
export function analyzeProductionRanking(equalWorkProductionReach) {
    const techniques = equalWorkProductionReach.techniques;
    if (!Array.isArray(techniques) || techniques.length === 0) {
        throw new Error('analyzeProductionRanking: techniques must be a non-empty array');
    }
    const sorted = [...techniques].sort((a, b) => b.production.winningLevels - a.production.winningLevels
        || a.attemptConfigIdentity.localeCompare(b.attemptConfigIdentity));
    const totalWins = sorted.reduce((sum, t) => sum + t.production.winningLevels, 0);
    const totalWork = sorted.reduce((sum, t) => sum + t.production.work, 0);
    let cumWins = 0;
    let cumWork = 0;
    const curve = sorted.map((t, i) => {
        cumWins += t.production.winningLevels;
        cumWork += t.production.work;
        return {
            cardinality: i + 1,
            technique: t.attemptConfigIdentity,
            family: familyOf(t.attemptConfigIdentity),
            winningLevels: t.production.winningLevels,
            cumulativeWinningLevels: cumWins,
            cumulativeCoverageFractionOfWins: totalWins ? cumWins / totalWins : 0,
            cumulativeWork: cumWork,
            cumulativeWorkFractionOfTotal: totalWork ? cumWork / totalWork : 0,
        };
    });
    return { schemaVersion: 1, evidenceRole: 'discovery', totalWins, totalWork, curve };
}

function toMarkdown(result) {
    const lines = [];
    lines.push(`Source run: ${result.sourceRunId ?? 'unknown'} (${result.sourceHeadSha ?? 'unknown sha'})`);
    lines.push(`Levels: ${result.levelCount}; techniques: ${result.techniqueCount}; oracle union: ${result.oracleUnionCount}`);
    lines.push('');
    lines.push('| k | added technique | family | coverage | frac of oracle union | aggregate work | work-budget-reached share | exclusive levels still missing |');
    lines.push('|---:|---|---|---:|---:|---:|---:|---:|');
    for (const row of result.curve) {
        lines.push(`| ${row.cardinality} | \`${row.addedTechnique}\` | ${row.addedTechniqueFamily} | ${row.cumulativeCoverage} | ${(row.cumulativeCoverageFractionOfOracleUnion * 100).toFixed(1)}% | ${row.aggregateWork.toLocaleString('en-US')} | ${(row.workBudgetReachedShareOfSolves * 100).toFixed(1)}% | ${row.exclusiveLevelsMissing} |`);
    }
    return lines.join('\n') + '\n';
}

function productionRankingToMarkdown(result) {
    const lines = [];
    lines.push(`Real production wins across the joined corpus: ${result.totalWins}; total charged work: ${result.totalWork.toLocaleString('en-US')}`);
    lines.push('');
    lines.push('| k | technique | family | wins at k | cumulative wins | frac of total wins | cumulative work | frac of total work |');
    lines.push('|---:|---|---|---:|---:|---:|---:|---:|');
    for (const row of result.curve) {
        lines.push(`| ${row.cardinality} | \`${row.technique}\` | ${row.family} | ${row.winningLevels} | ${row.cumulativeWinningLevels} | ${(row.cumulativeCoverageFractionOfWins * 100).toFixed(1)}% | ${row.cumulativeWork.toLocaleString('en-US')} | ${(row.cumulativeWorkFractionOfTotal * 100).toFixed(1)}% |`);
    }
    return lines.join('\n') + '\n';
}

// ─── CLI ──────────────────────────────────────────────────────────────────────
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
    const args = process.argv.slice(2);
    const argMap = new Map(args.filter((a) => a.startsWith('--') && a.includes('=')).map((a) => { const [k, ...v] = a.split('='); return [k, v.join('=')]; }));
    const root = new URL('..', import.meta.url).pathname;
    const snapshotPath = argMap.get('--pricing-snapshot') || 'reports/stress/ew1/33156541827-pricing-snapshot.json';
    const productionReachPath = argMap.get('--production-reach') || null;
    const outFile = argMap.get('--out') || 'reports/stress/portfolio/ew1-static-portfolio-construction.json';
    const summaryOutFile = argMap.get('--summary-out') || outFile.replace(/\.json$/u, '-summary.md');

    const snapshot = JSON.parse(readFileSync(path.resolve(root, snapshotPath), 'utf8'));
    const result = analyze(snapshot);
    let productionRanking = null;
    if (productionReachPath) {
        const equalWorkProductionReach = JSON.parse(readFileSync(path.resolve(root, productionReachPath), 'utf8'));
        productionRanking = analyzeProductionRanking(equalWorkProductionReach);
    }

    mkdirSync(path.dirname(path.resolve(root, outFile)), { recursive: true });
    writeFileSync(path.resolve(root, outFile), JSON.stringify({ ew1: result, productionRanking }, null, 2) + '\n');
    let summary = toMarkdown(result);
    if (productionRanking) {
        summary += '\n## Real production technique-win ranking (full corpus1+corpus2)\n\n' + productionRankingToMarkdown(productionRanking);
    }
    writeFileSync(path.resolve(root, summaryOutFile), summary);
    console.log(`Wrote ${outFile} and ${summaryOutFile}: ${result.techniqueCount} techniques ranked, oracle union ${result.oracleUnionCount}/${result.levelCount}`
        + (productionRanking ? `; production ranking: ${productionRanking.totalWins} total wins` : ''));
}
