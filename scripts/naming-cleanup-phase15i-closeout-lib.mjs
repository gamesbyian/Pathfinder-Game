import path from 'node:path';

export function stripCodeComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/.*$/gmu, '');
}

export function compactExecutableSource(source) {
  return stripCodeComments(source).replace(/['"`+\s]/gu, '');
}

export function hasExecutableToken(source, token) {
  return compactExecutableSource(source).includes(token.replace(/['"`+\s]/gu, ''));
}

export function findDerivedIdentityHits(source, tokens) {
  const compact = compactExecutableSource(source);
  return tokens.filter(token => compact.includes(token.replace(/['"`+\s]/gu, '')));
}

export function isLikelyTestOrNamingGuard(file) {
  const posix = file.split(path.sep).join('/');
  return posix.startsWith('scripts/naming-cleanup-')
    || posix.includes('/test-fixtures/')
    || /(?:-node-test|-check)\.(?:mjs|js|ts|tsx)$/u.test(posix)
    || /(?:^|\/)test(?:s)?\//u.test(posix);
}
