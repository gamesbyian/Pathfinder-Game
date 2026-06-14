#!/usr/bin/env node
/**
 * Lightweight repository secret-hygiene guard.
 *
 * This is intentionally conservative. Firebase web config is public client config
 * for this static app, so this check does not flag ordinary `apiKey` fields.
 * Instead it blocks the accidental reintroduction of known secret-like files and
 * high-confidence private credential material.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import process from 'node:process';

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
  {
    label: 'private key block',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/,
  },
  {
    label: 'Firebase service-account private key field',
    pattern: /"private_key"\s*:\s*"-----BEGIN PRIVATE KEY-----/,
  },
  {
    label: 'Google service-account credential type',
    pattern: /"type"\s*:\s*"service_account"/,
  },
];

const binaryExtensions = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.zip', '.gz', '.mp3', '.wav', '.woff', '.woff2',
]);

const scannerSelf = 'scripts/check-secret-hygiene.mjs';
const violations = [];

for (const rel of bannedPaths) {
  if (fs.existsSync(path.join(ROOT, rel))) {
    violations.push({ file: rel, reason: 'banned secret-like file path exists' });
  }
}

const trackedFiles = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT })
  .toString('utf8')
  .split('\0')
  .filter(Boolean);

for (const rel of trackedFiles) {
  if (rel === scannerSelf) continue;
  const ext = path.extname(rel).toLowerCase();
  if (binaryExtensions.has(ext)) continue;
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) continue;
  const text = fs.readFileSync(full, 'utf8');
  for (const { label, pattern } of contentPatterns) {
    if (pattern.test(text)) {
      violations.push({ file: rel, reason: label });
      break;
    }
  }
}

if (violations.length > 0) {
  console.error('Secret hygiene check failed:');
  for (const { file, reason } of violations) {
    console.error(`  - ${file}: ${reason}`);
  }
  console.error('\nRemove real secrets from the repo. Use provider secret storage or committed templates only.');
  process.exit(1);
}

console.log('Secret hygiene check passed: no banned secret files or high-confidence private credentials found.');
