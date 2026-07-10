/**
 * Shared helper for scripts that need every external (http/https) URL referenced by a
 * src/href attribute in index.html. Used by check-csp.mjs (CSP directive coverage) and
 * check-third-party-dependencies.mjs (explicit dependency allowlist) — two different checks
 * over the same underlying fact, so the extraction itself has exactly one implementation.
 */

/** @param {string} html */
export function extractExternalUrls(html) {
  return Array.from(html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g), match => match[1]);
}
