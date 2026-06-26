#!/usr/bin/env node
/**
 * Validates the Content Security Policy (modernization-plan §4 Phase 3).
 *
 * The CSP lives in security/csp-policy.json as a single source of truth. This check guarantees
 * the policy stays in sync with what the app actually loads/contacts, so it can't silently drift:
 *
 *   1. Every external origin referenced by a src/href in index.html (the same set
 *      check:third-party allowlists) must be covered by some CSP directive.
 *   2. Every documented required-runtime origin (Firestore/Auth/sign-in popup — origins the
 *      Firebase SDK contacts that never appear as a URL in index.html) must be covered.
 *   3. If index.html ships an enforcing <meta http-equiv="Content-Security-Policy">, it must
 *      exactly equal the policy rendered from this file (so an enabled CSP can't drift either).
 *
 * Run `npm run check:csp -- --print` to emit the header string for deployment.
 */
import fs from 'node:fs';
import process from 'node:process';

const POLICY_PATH = 'security/csp-policy.json';
const INDEX_PATH = 'index.html';

const policy = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
const html = fs.readFileSync(INDEX_PATH, 'utf8');

/** Render the directive map into a canonical CSP header string. */
function renderPolicy(directives) {
  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(' ')}`)
    .join('; ');
}

/** All host-source tokens across every directive (drops keywords like 'self', data:, blob:). */
function policyHostSources(directives) {
  const hosts = new Set();
  for (const sources of Object.values(directives)) {
    for (const s of sources) {
      if (s.startsWith('https://') || s.startsWith('http://')) hosts.add(s);
    }
  }
  return hosts;
}

/** Does `origin` (e.g. https://fonts.gstatic.com) match any policy host source, incl. wildcards? */
function isCovered(origin, hostSources) {
  for (const src of hostSources) {
    if (src === origin) return true;
    // Wildcard host: https://*.google.com matches https://accounts.google.com
    if (src.includes('://*.')) {
      const suffix = src.replace('://*.', '://').replace(/^https?:\/\//, '');
      const originHost = origin.replace(/^https?:\/\//, '');
      if (originHost === suffix || originHost.endsWith('.' + suffix)) return true;
    }
    // Origin-prefix match: a full URL is covered by its origin source.
    if (origin.startsWith(src + '/') || origin.startsWith(src + '?')) return true;
  }
  return false;
}

if (process.argv.includes('--print')) {
  process.stdout.write(renderPolicy(policy.directives) + '\n');
  process.exit(0);
}

const errors = [];
const hostSources = policyHostSources(policy.directives);

// (1) External origins referenced in index.html.
const urls = Array.from(html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g), m => m[1]);
const indexOrigins = new Set(urls.map(u => { try { return new URL(u).origin; } catch { return u; } }));
for (const origin of indexOrigins) {
  if (!isCovered(origin, hostSources)) {
    errors.push(`index.html loads ${origin} but no CSP directive covers it (add it to security/csp-policy.json).`);
  }
}

// (2) Documented required-runtime origins.
for (const origin of Object.keys(policy.requiredRuntimeOrigins || {})) {
  if (origin.startsWith('$')) continue;
  if (!isCovered(origin, hostSources)) {
    errors.push(`required runtime origin ${origin} is not covered by any CSP directive.`);
  }
}

// (3) If an enforcing meta CSP is present, it must equal the rendered policy.
// The CSP value contains single quotes ('self', 'none', …), so capture by the attribute's own
// delimiter rather than a [^"']+ class that would stop at the first inner quote.
const metaMatch = html.match(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*content=(["'])([\s\S]*?)\1/i);
if (metaMatch) {
  const rendered = renderPolicy(policy.directives);
  const metaContent = metaMatch[2].trim().replace(/;\s*$/, '');
  if (metaContent !== rendered) {
    errors.push(
      'index.html has a <meta> CSP that does not match security/csp-policy.json.\n' +
      `  meta:   ${metaContent}\n  policy: ${rendered}`,
    );
  }
}

if (errors.length > 0) {
  console.error('CSP policy check failed:');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`CSP policy check passed (${indexOrigins.size} index origins + ${Object.keys(policy.requiredRuntimeOrigins || {}).filter(k => !k.startsWith('$')).length} runtime origins covered).`);
