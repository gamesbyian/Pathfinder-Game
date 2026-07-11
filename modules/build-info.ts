// Build-time version marker (git commit SHA), injected into the browser bundle by
// vite.config.ts's `define`. Deliberately NOT under domain/runtime/solver (which must stay
// adapter/build-tool-free) — controllers that attach hint provenance import this directly.
//
// Node-side tools (hint-workbench.mjs and friends) never see this global defined (tsx and the
// esbuild bundle in scripts/run-bundled.mjs don't substitute it) — they compute the git SHA
// themselves via child_process, since Node has that available and modules/ doesn't.
declare const __SOLVER_VERSION__: string | undefined;

export const SOLVER_VERSION: string | null = typeof __SOLVER_VERSION__ !== 'undefined' ? __SOLVER_VERSION__ : null;
