#!/usr/bin/env node
/**
 * Checks that browser-facing external dependencies in index.html remain on the
 * documented allowlist. This makes CDN/supply-chain changes explicit in review.
 */
import fs from 'node:fs';
import process from 'node:process';
import { extractExternalUrls } from './external-urls.mjs';

const INDEX_PATH = 'index.html';
const allowed = new Set([
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  'https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap',
  'https://fonts.googleapis.com/css2?family=Merriweather:ital@0;1&display=swap',
  'https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap',
]);

const html = fs.readFileSync(INDEX_PATH, 'utf8');
const urls = extractExternalUrls(html);
const unexpected = urls.filter(url => !allowed.has(url));

if (unexpected.length > 0) {
  console.error('Unexpected external browser dependency URL(s) in index.html:');
  for (const url of unexpected) console.error(`  - ${url}`);
  console.error('\nDocument intentional runtime-origin policy changes in docs/content-security-policy.md and update this allowlist.');
  process.exit(1);
}

console.log('Third-party dependency allowlist check passed.');
