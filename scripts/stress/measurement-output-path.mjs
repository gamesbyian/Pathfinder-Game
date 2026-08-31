const CORPUS1 = 'data/stress/stress-levels.json';
const CORPUS2 = 'data/stress/stress-levels-random.json';

function normalizedCorpusPath(corpusFile) {
  return String(corpusFile ?? '').replaceAll('\\', '/').replace(/^\.\//u, '');
}

export function defaultStressMeasurementOutput(corpusFile, parallel) {
  if (!parallel) return 'reports/stress/benchmark-latest.json';

  const corpus = normalizedCorpusPath(corpusFile);
  if (corpus === CORPUS1) return 'reports/stress/solver-corpus1-latest.json';
  if (corpus === CORPUS2) return 'reports/stress/solver-corpus2-latest.json';

  // A custom corpus must not overwrite a maintained corpus-number report merely because it used
  // --parallel. Keep the fallback generic and require --out for any stronger semantic identity.
  return 'reports/stress/solver-parallel-latest.json';
}
