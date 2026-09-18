import { DEFAULT_MATCH_DIMENSIONS, featureRow } from './research-generation-match-lib.mjs';

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function stats(rows, dimensions) {
  const out = {};
  for (const key of dimensions) {
    const values = rows.map(row => Number(row.features[key]));
    const m = mean(values);
    const variance = mean(values.map(value => (value - m) ** 2));
    out[key] = { mean: m, sd: Math.sqrt(variance) || 1 };
  }
  return out;
}

function vector(features, dimensions, scale) {
  return dimensions.map(key => (Number(features[key]) - scale[key].mean) / scale[key].sd);
}

function distance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum / Math.max(1, a.length));
}

function centroids(rows, dimensions, scale) {
  const bySource = new Map();
  for (const row of rows) {
    if (!bySource.has(row.source)) bySource.set(row.source, []);
    bySource.get(row.source).push(vector(row.features, dimensions, scale));
  }
  return new Map([...bySource.entries()].map(([source, vectors]) => [
    source,
    dimensions.map((_, i) => mean(vectors.map(v => v[i]))),
  ]));
}

export function auditOriginRecognizability(sources, {
  dimensions = DEFAULT_MATCH_DIMENSIONS,
  folds = 5,
} = {}) {
  if (!Array.isArray(sources) || sources.length < 2) throw new Error('origin audit requires at least two sources');
  if (!Number.isInteger(folds) || folds < 2) throw new Error('--folds must be an integer >= 2');

  const rows = [];
  const sourceCounts = {};
  for (const source of sources) {
    if (!source?.name || !Array.isArray(source.levels)) throw new Error('each source needs {name, levels}');
    sourceCounts[source.name] = source.levels.length;
    source.levels.forEach((level, index) => rows.push({
      source: source.name,
      id: String(level.id),
      sourceIndex: index,
      features: featureRow(level),
    }));
  }
  const minSourceCount = Math.min(...Object.values(sourceCounts));
  const effectiveFolds = Math.min(folds, minSourceCount);
  if (effectiveFolds < 2) throw new Error('each source needs at least two levels');

  const confusion = Object.fromEntries(sources.map(source => [
    source.name,
    Object.fromEntries(sources.map(other => [other.name, 0])),
  ]));
  let correct = 0;
  let tested = 0;

  for (let fold = 0; fold < effectiveFolds; fold++) {
    const train = rows.filter(row => row.sourceIndex % effectiveFolds !== fold);
    const test = rows.filter(row => row.sourceIndex % effectiveFolds === fold);
    const scale = stats(train, dimensions);
    const cs = centroids(train, dimensions, scale);
    for (const row of test) {
      const v = vector(row.features, dimensions, scale);
      const ranked = [...cs.entries()]
        .map(([source, centroid]) => ({ source, distance: distance(v, centroid) }))
        .sort((a, b) => a.distance - b.distance || a.source.localeCompare(b.source));
      const predicted = ranked[0].source;
      confusion[row.source][predicted]++;
      tested++;
      if (predicted === row.source) correct++;
    }
  }

  const allScale = stats(rows, dimensions);
  const allCentroids = centroids(rows, dimensions, allScale);
  const dimensionSeparation = dimensions.map((key, i) => {
    const centerValues = [...allCentroids.values()].map(v => v[i]);
    return {
      dimension: key,
      sourceCentroidVariance: mean(centerValues.map(value => (value - mean(centerValues)) ** 2)),
      standardizedSourceRange: Math.max(...centerValues) - Math.min(...centerValues),
    };
  }).sort((a, b) => b.sourceCentroidVariance - a.sourceCentroidVariance || a.dimension.localeCompare(b.dimension));

  const perSource = Object.fromEntries(sources.map(source => {
    const row = confusion[source.name];
    const total = Object.values(row).reduce((sum, value) => sum + value, 0);
    return [source.name, {
      tested: total,
      correct: row[source.name],
      accuracy: total ? row[source.name] / total : null,
    }];
  }));

  return {
    dimensions: [...dimensions],
    requestedFolds: folds,
    effectiveFolds,
    sourceCounts,
    tested,
    correct,
    accuracy: tested ? correct / tested : null,
    chanceBaseline: 1 / sources.length,
    confusion,
    perSource,
    dimensionSeparation,
  };
}
