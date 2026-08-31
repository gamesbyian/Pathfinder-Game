#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { readRepositoryText, repositoryPathKind } from './repository-file-view.mjs';

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

  console.log('repository-file-view handles large unmaterialized tracked blobs.');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
