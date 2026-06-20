#!/usr/bin/env node
/**
 * Lock in modal accessibility semantics: every dialog container in index.html (an element
 * whose class list includes `screen-modal` or `modal-overlay`) must advertise itself to
 * assistive tech with role="dialog", aria-modal="true", and a non-empty aria-label.
 *
 * These were added in the a11y pass and are wired to modal focus-trapping
 * (modules/ui/focus-trap.js via modal-ui.js). This check stops a newly-added modal from
 * silently regressing those semantics.
 */
import fs from 'node:fs';
import process from 'node:process';

const html = fs.readFileSync('index.html', 'utf8');

const attr = (attrs, name) => {
  const m = attrs.match(new RegExp(String.raw`\b${name}="([^"]*)"`));
  return m ? m[1] : undefined;
};

const tagRe = /<(\w+)\b([^>]*)>/g;
const found = [];
const violations = [];

for (let m; (m = tagRe.exec(html)); ) {
  const attrs = m[2];
  const classes = (attr(attrs, 'class') || '').split(/\s+/);
  if (!classes.includes('screen-modal') && !classes.includes('modal-overlay')) continue;

  const id = attr(attrs, 'id') || '(no id)';
  found.push(id);

  const problems = [];
  if (attr(attrs, 'role') !== 'dialog') problems.push('role="dialog"');
  if (attr(attrs, 'aria-modal') !== 'true') problems.push('aria-modal="true"');
  const label = attr(attrs, 'aria-label');
  if (!label || !label.trim()) problems.push('non-empty aria-label');
  if (problems.length) violations.push({ id, missing: problems });
}

// Guard against the selector silently matching nothing (e.g., markup refactor).
const MIN_EXPECTED = 13;
if (found.length < MIN_EXPECTED) {
  console.error(`Modal a11y check: expected at least ${MIN_EXPECTED} modal containers, found ${found.length}.`);
  console.error('The .screen-modal / .modal-overlay selector may be stale — verify index.html.');
  process.exit(1);
}

if (violations.length > 0) {
  console.error('Modal containers missing required dialog accessibility semantics:');
  for (const v of violations) console.error(`  - #${v.id}: add ${v.missing.join(', ')}`);
  console.error('\nEvery .screen-modal / .modal-overlay needs role="dialog" aria-modal="true" aria-label="…".');
  process.exit(1);
}

console.log(`Modal a11y check passed: ${found.length} modal containers all expose dialog semantics.`);
