import path from 'node:path';
import process from 'node:process';

const CORPUS1 = 'data/stress/stress-levels.json';
const CORPUS2 = 'data/stress/stress-levels-random.json';

function canonicalCorpusKind(corpusFile, root) {
  const resolved = path.resolve(root, String(corpusFile ?? ''));
  if (resolved === path.resolve(root, CORPUS1)) return 'corpus1';
  if (resolved === path.resolve(root, CORPUS2)) return 'corpus2';
  return null;
}

export function defaultStressMeasurementOutput(corpusFile, parallel, root = process.cwd()) {
  if (!parallel) return 'reports/stress/benchmark-latest.json';

  const corpusKind = canonicalCorpusKind(corpusFile, root);
  if (corpusKind === 'corpus1') return 'reports/stress/solver-corpus1-latest.json';
  if (corpusKind === 'corpus2') return 'reports/stress/solver-corpus2-latest.json';

  // A custom corpus must not overwrite a maintained corpus-number report merely because it used
  // --parallel. Keep the fallback generic and require --out for any stronger semantic identity.
  return 'reports/stress/solver-parallel-latest.json';
}
