import assert from 'node:assert/strict';
import {
  RETAINED_QUALIFIED_CORES,
  RETAINED_CORE_ACTIONS,
  PHASE14_CURRENT_DOCS,
  classifyPhase14CorePath,
  findPhase14CurrentDocResidue,
} from './naming-cleanup-phase14-closeout.mjs';

assert.equal(classifyPhase14CorePath('modules/core.ts'), 'retired-top-level-facade');
assert.equal(classifyPhase14CorePath('modules/input/navigation-core.ts'), 'retained-qualified-core');
assert.equal(classifyPhase14CorePath(RETAINED_CORE_ACTIONS), 'retained-core-state-actions');
assert.equal(classifyPhase14CorePath('modules/app-constants.ts'), 'unrelated');
assert.equal(RETAINED_QUALIFIED_CORES.length, 7);
assert.ok(RETAINED_QUALIFIED_CORES.every(path => path.endsWith('-core.ts')));

assert.deepEqual(
  findPhase14CurrentDocResidue('docs/architecture.md', ['SOUND_BUS and mutable ', 'ENG', 'INE with levelUtils and `core`'].join('')),
  [
    'docs/architecture.md: retired Phase-14 current-doc vocabulary (SOUND_BUS adapter)',
    'docs/architecture.md: retired Phase-14 current-doc vocabulary (mutable state root)',
    'docs/architecture.md: retired Phase-14 current-doc vocabulary (LevelUtils facade)',
    'docs/architecture.md: retired Phase-14 current-doc vocabulary (core dependency bag)',
  ],
);
assert.deepEqual(
  findPhase14CurrentDocResidue('docs/architecture.md', 'audioService and AppState.engineState with direct domain/input/editor owners'),
  [],
);

assert.ok(PHASE14_CURRENT_DOCS.includes('AGENTS.md'));
assert.ok(PHASE14_CURRENT_DOCS.includes('docs/change-recipes.md'));
assert.ok(PHASE14_CURRENT_DOCS.includes('docs/adr/0002-state-action-boundary.md'));
assert.ok(PHASE14_CURRENT_DOCS.includes('docs/adr/0006-pure-transition-cores-no-central-dispatcher.md'));
assert.ok(PHASE14_CURRENT_DOCS.includes('docs/adr/0011-full-typescript-migration.md'));

assert.deepEqual(
  findPhase14CurrentDocResidue('AGENTS.md', ['mutable ', 'ENG', 'INE state'].join('')),
  ['AGENTS.md: retired Phase-14 current-doc vocabulary (mutable state root)'],
);
assert.deepEqual(
  findPhase14CurrentDocResidue(
    'docs/adr/0011-full-typescript-migration.md',
    ['typed ', 'Level', 'Utils port'].join(''),
  ),
  ['docs/adr/0011-full-typescript-migration.md: retired Phase-14 current-doc vocabulary (LevelUtils facade)'],
);
assert.deepEqual(
  findPhase14CurrentDocResidue(
    'docs/adr/0006-pure-transition-cores-no-central-dispatcher.md',
    'pure transition core with engineState state-action ownership',
  ),
  [],
);

console.log('Phase-14 retained core terminology classification fixtures passed.');
