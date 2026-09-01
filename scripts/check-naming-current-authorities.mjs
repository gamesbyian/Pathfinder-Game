#!/usr/bin/env node
/**
 * Keep the naming-cleanup human front doors aligned with machine execution state.
 *
 * This is intentionally semantic rather than a retired-token scanner: a document can use entirely
 * canonical code vocabulary and still send an agent to a completed phase.
 */
import { readFileSync } from 'node:fs';

const ledger = JSON.parse(readFileSync('docs/naming-cleanup-ledger.json', 'utf8'));
const nextPhase = Number(ledger.lastCompletedPhase) + 1;
const agents = readFileSync('AGENTS.md', 'utf8');
const docsIndex = readFileSync('docs/README.md', 'utf8');
const failures = [];

if (!agents.includes('npm run naming:status')) failures.push('AGENTS.md naming route must start from npm run naming:status');
if (!agents.includes('next phase returned by that status')) failures.push('AGENTS.md naming route must explicitly follow the next phase returned by status');
if (/technical Phase-8 gate is ready/i.test(agents)) failures.push('AGENTS.md still presents the completed Phase-8 gate as current');
if (/active phase\/batch authority[^\n]*phase-08\.md/i.test(agents)) failures.push('AGENTS.md still hard-codes Phase 8 as the active naming authority');

if (nextPhase === 15) {
    const preparation = 'naming-cleanup-phase-records/phase-15-preparation.md';
    const execution = ledger.phaseExecutionRecords?.['15'];
    const phase15Active = ledger.activeExecution?.status === 'active' && ledger.activeExecution?.phase === 15;
    if (phase15Active) {
        if (execution !== 'docs/naming-cleanup-phase-records/phase-15.md')
            failures.push('active Phase 15 must register docs/naming-cleanup-phase-records/phase-15.md as its execution authority');
        const executionIndexPath = typeof execution === 'string' ? execution.replace(/^docs\//u, '') : '';
        if (!agents.includes(execution)) failures.push('AGENTS.md must route active Phase 15 through its execution authority');
        if (!docsIndex.includes(executionIndexPath)) failures.push('docs/README.md must list the active Phase-15 execution authority');
        if (!docsIndex.includes(preparation)) failures.push('docs/README.md must retain the Phase-15 preparation snapshot');
    } else {
        if (!agents.includes(preparation)) failures.push('AGENTS.md must route pending Phase 15 through its preparation authority');
        if (!docsIndex.includes(preparation)) failures.push('docs/README.md must list the pending Phase-15 preparation authority');
    }
    if (!/phase-08\.md[^\n]*completed Phase-8 implementation evidence/i.test(docsIndex))
        failures.push('docs/README.md must classify phase-08.md as completed evidence while Phase 15 is open');
}

if (failures.length) {
    console.error('Naming current-authority validation failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
}
console.log(`Naming current authorities agree with ledger state: Phase ${ledger.lastCompletedPhase} complete, Phase ${nextPhase} next.`);
