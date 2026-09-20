import path from 'node:path';

import { repositoryPathKind } from './repository-file-view.mjs';

const DEFAULT_ROOTS = Object.freeze(['docs', 'reports', 'scripts', 'data', 'logs']);

function asPosix(value) {
  return String(value ?? '').replaceAll('\\', '/');
}

export function researchRepositoryRefIssues(value, {
  root = null,
  allowedRoots = DEFAULT_ROOTS,
  requireFile = false,
  label = 'repository ref',
} = {}) {
  const issues = [];
  if (typeof value !== 'string' || !value) return [`${label} must be a non-empty string`];
  if (value !== value.trim()) issues.push(`${label} must not contain surrounding whitespace`);
  if (/[\s`]/u.test(value)) issues.push(`${label} must be one exact path, not prose/markup`);

  const normalized = asPosix(value);
  if (path.posix.isAbsolute(normalized)) issues.push(`${label} must be repository-relative`);
  const segments = normalized.split('/');
  if (segments.some(segment => segment === '' || segment === '.' || segment === '..')) {
    issues.push(`${label} must not contain empty, dot, or parent segments`);
  }
  const first = segments[0] ?? '';
  if (!allowedRoots.includes(first)) {
    issues.push(`${label} must start with one of ${allowedRoots.join(', ')}`);
  }
  if (/[?#]/u.test(normalized)) issues.push(`${label} must not contain URL query/fragment syntax`);

  if (root && issues.length === 0) {
    const kind = repositoryPathKind(root, normalized);
    if (!kind) issues.push(`${label} does not exist in tracked repository state: ${normalized}`);
    else if (requireFile && kind !== 'file') issues.push(`${label} must identify a file: ${normalized}`);
  }
  return issues;
}

export function validateResearchRepositoryRef(value, options = {}) {
  const issues = researchRepositoryRefIssues(value, options);
  if (issues.length) throw new Error(issues.join('; '));
  return value;
}
