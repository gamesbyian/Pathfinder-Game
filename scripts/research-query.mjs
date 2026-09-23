#!/usr/bin/env node
import process from 'node:process';

import { runResearchQueryCommand } from './research-query-cli-lib.mjs';

const result = runResearchQueryCommand(process.argv.slice(2), { root: process.cwd() });
const payload = JSON.stringify(result.payload, null, result.compact ? 0 : 2) + '\n';

await new Promise((resolve, reject) => {
    process.stdout.write(payload, error => {
        if (error) reject(error);
        else resolve();
    });
});
