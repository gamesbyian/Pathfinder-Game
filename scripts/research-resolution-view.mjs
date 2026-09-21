#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

import {
  summarizeResearchResolutionComposition,
  summarizeResearchResolutionDocuments,
} from './research-resolution-view-lib.mjs';

const argv = process.argv.slice(2);
const value = name => argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? '';
const input = value('in');

if (!input) {
  throw new Error('--in=<analysis.json>[,<analysis.json>...] is required');
}

const entries = input.split(',').map(item => item.trim()).filter(Boolean).map(source => {
  if (!existsSync(source)) throw new Error(`missing resolution input: ${source}`);
  return { source, document: JSON.parse(readFileSync(source, 'utf8')) };
});

process.stdout.write(JSON.stringify({
  schemaVersion: 1,
  kind: 'pathfinder-research-resolution-view',
  entries: summarizeResearchResolutionDocuments(entries),
  compositionDiagnostics: summarizeResearchResolutionComposition(entries),
}, null, 2) + '\n');
