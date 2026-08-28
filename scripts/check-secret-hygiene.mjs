#!/usr/bin/env node
/**
 * Lightweight repository secret-hygiene guard.
 *
 * Firebase web config is public client config for this static app, so ordinary `apiKey` fields
 * are allowed. The check blocks known secret-like paths and high-confidence private credential
 * material.
 *
 * Local/manual runs scan every tracked text file. PR CI may set PATHFINDER_PR_INCREMENTAL=1:
 * unchanged files already passed this invariant on the tested base, so only PR-changed content
 * can introduce a new secret. Sparse-excluded changed files are read directly from HEAD.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import {
  listRepositoryFiles,
  prChangedFiles,
  readRepositoryText,
} from './repository-file-view.mjs';

const ROOT = process.cwd();
const bannedPaths = [
  '.env',
  '.env.local',
  '.env.production',
  'includes/secret.php',
  'includes/secrets.php',
  'serviceAccountKey.json',
  'firebase-service-account.json',
];

const contentPatterns = [
  { label: 'private key block', pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/ },
  { label: 'Firebase service-account private key field', pattern: /"private_key"\s*:\s*"-----BEGIN PRIVATE KEY-----/ },
  { label: 'Google service-account credential type', pattern: /"type"\s*:\s*"service_account"/ },
];

const binaryExtensions = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.zip', '.gz', '.mp3', '.wav', '.woff', '.woff2',
]);

const scannerSelf = 'scripts/check-secret-hygiene.mjs';
const violations = [];
const allTracked = listRepositoryFiles(ROOT);
const trackedSet = new Set(allTracked);
const incremental = prChangedFiles(ROOT);
const candidates = incremental ?? allTracked;

for (const rel of bannedPaths) {
  if (fs.existsSync(path.join(ROOT, rel)) || trackedSet.has(rel)) {
    violations.push({ file: rel, reason: 'banned secret-like file path exists' });
  }
}

for (const rel of candidates) {
  if (rel === scannerSelf) continue;
  const ext = path.extname(rel).toLowerCase();
  if (binaryExtensions.has(ext)) continue;
  let text;
  try {
    text = readRepositoryText(ROOT, rel);
  } catch {
    // A renamed/deleted path can appear transiently in local Git views; only files present in HEAD
    // can introduce credential material into the tested repository.
    continue;
  }
  for (const { label, pattern } of contentPatterns) {
    if (pattern.test(text)) {
      violations.push({ file: rel, reason: label });
      break;
    }
  }
}

if (violations.length > 0) {
  console.error('Secret hygiene check failed:');
  for (const { file, reason } of violations) console.error(`  - ${file}: ${reason}`);
  console.error('\nRemove real secrets from the repo. Use provider secret storage or committed templates only.');
  process.exit(1);
}

console.log(`Secret hygiene check passed: no banned secret files or high-confidence private credentials found (${incremental ? `${candidates.length} PR-changed paths inspected` : 'full tracked repository inspected'}).`);
