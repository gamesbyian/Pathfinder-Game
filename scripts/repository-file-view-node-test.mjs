#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readRepositoryText, repositoryPathKind, repositoryTextFilesContainingNul } from './repository-file-view.mjs';

const temp = mkdtempSync(path.join(tmpdir(), 'repository-file-view-'));
const checkTextSourceFiles = path.join(path.dirname(fileURLToPath(import.meta.url)), 'check-text-source-files.mjs');
const git = (...args) => execFileSync('git', args, { cwd: temp, stdio: 'pipe', encoding: 'utf8' });

try {
  git('init');
  git('config', 'user.name', 'Pathfinder Test');
  git('config', 'user.email', 'pathfinder-test@example.invalid');

  const payload = `${'x'.repeat(2 * 1024 * 1024)}\n`;
  writeFileSync(path.join(temp, 'large-report.json'), payload);
  writeFileSync(path.join(temp, 'materialized.json'), '{"state":"committed"}\n');
  git('add', 'large-report.json', 'materialized.json');
  git('commit', '-m', 'fixture');

  // Simulate sparse checkout: the file remains tracked in HEAD but is not materialized.
  rmSync(path.join(temp, 'large-report.json'));
  assert.equal(repositoryPathKind(temp, 'large-report.json'), 'file');
  assert.equal(readRepositoryText(temp, 'large-report.json'), payload);
  writeFileSync(path.join(temp, 'materialized.json'), 'working\0tree');
  assert.deepEqual(repositoryTextFilesContainingNul(temp, ['materialized.json']), ['materialized.json']);

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

  assert.deepEqual(repositoryTextFilesContainingNul(temp, bulkPaths), [nulPath]);

  // Exercise the real PR-incremental checker at the cardinality that exposed #2072's process storm.
  mkdirSync(path.join(temp, 'bulk-pr'), { recursive: true });
  for (let index = 0; index < 1500; index += 1) {
    writeFileSync(
      path.join(temp, 'bulk-pr', `file-${String(index).padStart(4, '0')}.json`),
      `{"index":${index}}\n`,
    );
  }
  git('add', 'bulk-pr');
  git('commit', '-m', 'bulk pr fixture');
  rmSync(path.join(temp, 'bulk-pr'), { recursive: true });

  const bulkCheck = execFileSync(process.execPath, [checkTextSourceFiles], {
    cwd: temp,
    env: { ...process.env, PATHFINDER_PR_INCREMENTAL: '1' },
    encoding: 'utf8',
  });
  assert.match(bulkCheck, /Changed text-file check passed \(1500 files scanned\)/);

  console.log('repository-file-view handles large and PR-scale bulk unmaterialized tracked blobs.');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
