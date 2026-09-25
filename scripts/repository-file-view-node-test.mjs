#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { readRepositoryText, readRepositoryTexts, repositoryPathKind } from './repository-file-view.mjs';

const temp = mkdtempSync(path.join(tmpdir(), 'repository-file-view-'));
const git = (...args) => execFileSync('git', args, { cwd: temp, stdio: 'pipe', encoding: 'utf8' });

try {
  git('init');
  git('config', 'user.name', 'Pathfinder Test');
  git('config', 'user.email', 'pathfinder-test@example.invalid');

  const payload = `${'x'.repeat(2 * 1024 * 1024)}\n`;
  writeFileSync(path.join(temp, 'large-report.json'), payload);
  git('add', 'large-report.json');
  git('commit', '-m', 'fixture');

  // Simulate sparse checkout: the file remains tracked in HEAD but is not materialized.
  rmSync(path.join(temp, 'large-report.json'));
  assert.equal(repositoryPathKind(temp, 'large-report.json'), 'file');
  assert.equal(readRepositoryText(temp, 'large-report.json'), payload);

  mkdirSync(path.join(temp, 'bulk'), { recursive: true });
  const bulkPaths = [];
  for (let index = 0; index < 256; index += 1) {
    const relativePath = `bulk/file-${String(index).padStart(3, '0')}.json`;
    bulkPaths.push(relativePath);
    writeFileSync(path.join(temp, relativePath), `{"index":${index}}\n`);
  }
  const nulPath = 'bulk/contains-nul.json';
  bulkPaths.push(nulPath);
  writeFileSync(path.join(temp, nulPath), 'before\0after');
  git('add', 'bulk');
  git('commit', '-m', 'bulk fixture');
  rmSync(path.join(temp, 'bulk'), { recursive: true });

  const bulk = readRepositoryTexts(temp, bulkPaths);
  assert.equal(bulk.size, bulkPaths.length);
  assert.equal(bulk.get('bulk/file-000.json'), '{"index":0}\n');
  assert.equal(bulk.get('bulk/file-255.json'), '{"index":255}\n');
  assert.equal(bulk.get(nulPath), 'before\0after');

  console.log('repository-file-view handles large and bulk unmaterialized tracked blobs.');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
