#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function walk(root, out = []) {
  if (!fs.existsSync(root)) return out;
  for (const name of fs.readdirSync(root).sort()) {
    const full = path.join(root, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (/\.(?:mjs|js)$/u.test(name)) out.push(full);
  }
  return out;
}

export function cliOptionContractIssues(source, file = '<source>') {
  // Common parser shape: argv token "--foo=bar" -> key "foo" via slice(2).
  // Looking that key up later as "--foo" makes the CLI path unreachable even when library tests pass.
  const stripsLongOptionPrefix = /\b[A-Za-z_$][\w$]*\.slice\(2(?:\)|,)/u.test(source);
  const dashedMapLookup = /\b[A-Za-z_$][\w$]*\.(?:get|has)\(\s*['"]--[^'"]+['"]/u.test(source);
  if (stripsLongOptionPrefix && dashedMapLookup) {
    return [`${file}: strips the leading "--" from CLI keys but later performs a Map lookup using a "--..." key`];
  }
  return [];
}

export function auditCliOptionContracts(root = 'scripts') {
  return walk(root).flatMap(file => cliOptionContractIssues(fs.readFileSync(file, 'utf8'), file.replaceAll('\\', '/')));
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  const issues = auditCliOptionContracts();
  if (issues.length) {
    console.error('CLI option contract check failed:');
    for (const issue of issues) console.error(`  - ${issue}`);
    process.exit(1);
  }
  console.log('CLI option contract check passed: no strip-prefix/dashed-lookup mismatches found.');
}
