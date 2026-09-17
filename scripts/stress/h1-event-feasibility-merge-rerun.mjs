#!/usr/bin/env node
/** Merges a rerun's results (queries filtered/renumbered from the original frozen queries file)
 * back into the original file's queryId numbering, matching by (caseId, query content) since the
 * rerun's own internal queryIds do not align with the original per-state query indices. A rerun row
 * only overrides the original when the original was 'timeout/abstain' -- resolved originals are
 * authoritative and never replaced. */
import { readFileSync, writeFileSync } from 'node:fs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => { const [k, ...v] = x.split('='); return [k, v.join('=')]; }));
const originalQueriesFile = args.get('--original-queries');
const originalResultsFile = args.get('--original-results');
const rerunResultsFile = args.get('--rerun-results');
const outFile = args.get('--out');

const queriesDoc = JSON.parse(readFileSync(originalQueriesFile, 'utf8'));
const originalResults = JSON.parse(readFileSync(originalResultsFile, 'utf8'));
const rerunResults = JSON.parse(readFileSync(rerunResultsFile, 'utf8'));

const rerunByKey = new Map(rerunResults.rows.map(r => [`${r.caseId}\0${JSON.stringify(r.query)}`, r]));
const originalByQueryId = new Map(originalResults.rows.map(r => [r.queryId, r]));

const mergedRows = [];
let overridden = 0;
for (const state of queriesDoc.states) {
    state.queries.forEach((query, queryIndex) => {
        const queryId = `${state.caseId}::q${queryIndex}:${query.type}`;
        const original = originalByQueryId.get(queryId);
        if (!original) throw new Error(`missing original row for ${queryId}`);
        if (original.referenceLabel !== 'timeout/abstain') { mergedRows.push(original); return; }
        const rerun = rerunByKey.get(`${state.caseId}\0${JSON.stringify(query)}`);
        if (rerun && rerun.referenceLabel !== 'timeout/abstain') {
            mergedRows.push({ ...rerun, queryId, timeLimitSec: rerun.timeLimitSec, rerunFrom: original.timeLimitSec });
            overridden++;
        } else {
            mergedRows.push(original);
        }
    });
}
const byLabel = label => mergedRows.filter(r => r.referenceLabel === label).length;
const document = {
    schemaVersion: 1, kind: 'h1-event-feasibility-results-merged', generatedAt: new Date().toISOString(),
    sourceOriginalQueries: originalQueriesFile, sourceOriginalResults: originalResultsFile, sourceRerunResults: rerunResultsFile,
    overriddenByRerun: overridden,
    summary: { total: mergedRows.length, live: byLabel('live'), dead: byLabel('dead'), abstain: byLabel('timeout/abstain'), correctnessAlarms: mergedRows.filter(r => r.correctnessAlarm).length },
    rows: mergedRows,
};
writeFileSync(outFile, `${JSON.stringify(document, null, 2)}\n`);
console.log(JSON.stringify({ overridden, summary: document.summary }, null, 2));
