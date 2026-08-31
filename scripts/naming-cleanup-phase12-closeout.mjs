import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const TEXT_EXTENSIONS = new Set(['.js', '.cjs', '.mjs', '.ts', '.mts', '.tsx', '.md', '.yml', '.yaml', '.json']);
const ROOTS = Object.freeze(['modules', 'scripts', 'docs', '.github']);
const RETIRED_PATTERNS = Object.freeze([
  { label: 'ActionType umbrella', re: /\bActionType\b/u },
  { label: 'unowned GameCommandType', re: /\bGameCommandType\b/u },
]);

const EXEMPT_PATHS = Object.freeze([
  /^docs\/archive\//u,
  /^docs\/naming-cleanup-/u,
  /^docs\/naming-and-vocabulary\.md$/u,
  /^scripts\/naming-cleanup-phase12-closeout(?:-node-test)?\.mjs$/u,
]);

function isExempt(relativePath) {
  return EXEMPT_PATHS.some(re => re.test(relativePath));
}

function collectTextFiles(root, relativeDir, out) {
  const absoluteDir = path.join(root, relativeDir);
  if (!fs.existsSync(absoluteDir)) return;
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    const relativePath = path.posix.join(relativeDir.replaceAll('\\', '/'), entry.name);
    if (isExempt(relativePath)) continue;
    if (entry.isDirectory()) {
      collectTextFiles(root, relativePath, out);
      continue;
    }
    if (entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name))) out.push(relativePath);
  }
}

export function findPhase12Residue(relativePath, content) {
  const failures = [];
  for (const { label, re } of RETIRED_PATTERNS) {
    if (re.test(content)) failures.push(`${relativePath}: retired Phase-12 ${label}`);
  }
  return failures;
}

export function checkPhase12Residue(root = process.cwd()) {
  const files = [];
  for (const relativeRoot of ROOTS) collectTextFiles(root, relativeRoot, files);
  const failures = [];
  for (const relativePath of files) {
    const content = fs.readFileSync(path.join(root, relativePath), 'utf8');
    failures.push(...findPhase12Residue(relativePath, content));
  }
  return { failures, scanned: files.length };
}

function main() {
  const { failures, scanned } = checkPhase12Residue();
  if (failures.length) {
    console.error('Phase-12 runtime command/event vocabulary closeout check failed:');
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log(`Phase-12 runtime command/event vocabulary closeout check passed: ${scanned} maintained text surfaces contain no retired ActionType umbrella or unowned GameCommandType.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
