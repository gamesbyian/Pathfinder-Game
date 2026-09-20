#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { buildResearchPortfolioRetrospective } from './research-portfolio-retrospective-lib.mjs';

const args = process.argv.slice(2);
const startDate = args.find(arg => arg.startsWith('--start='))?.slice('--start='.length) ?? '2026-09-12';
const endDate = args.find(arg => arg.startsWith('--end='))?.slice('--end='.length) ?? '2026-09-19';
const out = args.find(arg => arg.startsWith('--out='))?.slice('--out='.length) ?? null;

const result = buildResearchPortfolioRetrospective(process.cwd(), { startDate, endDate });
const rendered = JSON.stringify(result, null, 2) + '\n';

if (out) {
  const output = path.resolve(out);
  writeFileSync(output, rendered);
  console.log(JSON.stringify({ output, ...result.counts, explorationTriggers: result.explorationTriggers }, null, 2));
} else {
  process.stdout.write(rendered);
}
