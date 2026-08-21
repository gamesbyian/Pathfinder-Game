#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { generatorImplementationProvenance } from './generator-implementation-provenance.mjs';

const checkout = generatorImplementationProvenance(process.cwd());
assert.match(checkout.gitCommit, /^[0-9a-f]{40}$/);
assert.match(checkout.sourceSha256, /^[0-9a-f]{64}$/);
const exported = mkdtempSync(path.join(tmpdir(), 'family-generator-export-'));
mkdirSync(path.join(exported, 'scripts'));
writeFileSync(path.join(exported, 'scripts/family-generate.mjs'), 'export {};\n');
const withoutGit = generatorImplementationProvenance(exported);
assert.equal(withoutGit.gitCommit, undefined);
assert.match(withoutGit.sourceSha256, /^[0-9a-f]{64}$/);
console.log('generator implementation provenance unit tests passed');
