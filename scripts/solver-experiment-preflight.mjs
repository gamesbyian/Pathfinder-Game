#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { prepareSolverExperimentPreflight } from './solver-experiment-preflight-lib.mjs';

const result = prepareSolverExperimentPreflight(process.argv.slice(2), { root: process.cwd() });

if (result.kind === 'compare') {
    console.log(
        `Matched arms OK: ${result.result.levels} levels; target=${result.result.targetFlag}; `
        + `workflow treatment dimensions=${result.result.allowedWorkflowInputDifferences.join(',') || '(none)'}`,
    );
} else {
    const outputPath = path.resolve(process.cwd(), result.output);
    mkdirSync(path.dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(result.manifest, null, 2)}\n`);
    console.log(
        `Preflight OK: ${result.manifest.arm}, ${result.manifest.levelIds.length} levels, `
        + `${result.manifest.solverRef}, workflow=${result.manifest.workflow}, `
        + `budgetProtocol=${result.manifest.budgetProtocol}, ${result.output}`,
    );
}
