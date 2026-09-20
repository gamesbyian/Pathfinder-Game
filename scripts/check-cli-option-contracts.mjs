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
  // Tie the lookup to the same Map variable so unrelated dashed-key maps do not become false positives.
  const issues = [];
  const lookup = /\b([A-Za-z_$][\w$]*)\.(?:get|has)\(\s*['"]--[^'"]+['"]/gu;
  for (const match of source.matchAll(lookup)) {
    const mapName = match[1];
    const before = source.slice(Math.max(0, match.index - 6000), match.index);
    const constNeedle = `const ${mapName} = new Map(`;
    const letNeedle = `let ${mapName} = new Map(`;
    const assignment = Math.max(before.lastIndexOf(constNeedle), before.lastIndexOf(letNeedle));
    if (assignment < 0) continue;
    const constructorRegion = before.slice(assignment);
    if (/\b[A-Za-z_$][\w$]*\.slice\(2(?:\)|,)/u.test(constructorRegion)) {
      issues.push(`${file}: Map "${mapName}" strips the leading "--" from CLI keys but later looks up a "--..." key`);
    }
  }
  return [...new Set(issues)];
}

function isProductionScript(file) {
  const name = path.basename(file);
  return !/(?:-node-test|-unit-tests?|\.test)\.(?:mjs|js)$/u.test(name);
}

export function auditCliOptionContracts(root = 'scripts') {
  return walk(root)
    .filter(isProductionScript)
    .flatMap(file => cliOptionContractIssues(fs.readFileSync(file, 'utf8'), file.replaceAll('\\', '/')));
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
