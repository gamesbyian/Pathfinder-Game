import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const PHASE11_RUNTIME_FILES = Object.freeze([
  'modules/state-slices.ts',
  'modules/state/actions/core-actions.ts',
  'modules/state-actions.test.ts',
  'modules/engine.ts',
  'modules/engine/level-flow.ts',
  'modules/engine/engine-controllers.test.ts',
  'modules/domain/geometry.ts',
  'modules/domain/geometry.test.ts',
  'modules/domain/landmark-rules.ts',
  'modules/ports.ts',
  'modules/level-utils.ts',
  'modules/level-utils.test.ts',
  'modules/render/create-render-model.ts',
  'modules/render/create-render-model.test.ts',
  'modules/render/render-layers.ts',
  'modules/renderer.ts',
  'modules/renderer.test.ts',
  'modules/ui/layout-ui.ts',
  'modules/input/options-controller.ts',
  'modules/persistence/local-session-store.test.ts',
  'tests/orientation.spec.mjs',
]);

const LEGACY_PATTERNS = Object.freeze([
  { label: 'setVariant', re: /\bsetVariant\b/u },
  { label: 'runtime variant token', re: /\bvariant\b/u },
  { label: '.variant property', re: /\.variant\b/u },
]);

export function findPhase11RuntimeResidue(relativePath, content) {
  const failures = [];
  for (const { label, re } of LEGACY_PATTERNS) {
    if (re.test(content)) failures.push(`${relativePath}: retired Phase-11 ${label}`);
  }
  return failures;
}

export function checkPhase11RuntimeResidue(root = process.cwd()) {
  const failures = [];
  for (const relativePath of PHASE11_RUNTIME_FILES) {
    const absolutePath = path.join(root, relativePath);
    if (!fs.existsSync(absolutePath)) {
      failures.push(`${relativePath}: expected Phase-11 runtime surface is missing`);
      continue;
    }
    failures.push(...findPhase11RuntimeResidue(relativePath, fs.readFileSync(absolutePath, 'utf8')));
  }
  return failures;
}

function main() {
  const failures = checkPhase11RuntimeResidue();
  if (failures.length) {
    console.error('Phase-11 runtime orientation closeout check failed:');
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log(`Phase-11 runtime orientation closeout check passed: ${PHASE11_RUNTIME_FILES.length} runtime surfaces contain no retired orientation vocabulary.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
