// @ts-check
// Shared JSDoc type contracts for the domain/runtime/solver layers. This module has NO runtime
// exports — it exists only to be referenced from other `// @ts-check`'d modules via
// `import('./types.js').TypeName`. (modernization-plan §5 keystone — ADR 0009 / docs/typing.md.)

/** A portal pair's two endpoint cells (used for rendering + parity checks).
 *  @typedef {{ k1: number, k2: number }} PortalVisual */

/** Grid dimensions in cells. @typedef {{ w: number, h: number }} GridSize */

/** A resolved portal exit. `dest` is the packed destination key, or -1 if the portal is unpaired.
 *  @typedef {{ dest: number }} PortalExit */

/**
 * The engine's internal, normalized level shape (0-based, packed cell keys; produced by
 * `normalizeLevel` / `normalizeRawLevelV2`). This typedef grows as more modules are typed — only
 * fields needed by already-typed modules are guaranteed complete; see docs/typing.md.
 *
 * @typedef {Object} NormalizedLevel
 * @property {GridSize}                      grid
 * @property {number}                        goalKey            packed key of the true goal (or -1/undefined)
 * @property {number[]}                      gateKeys           packed keys of gates
 * @property {Set<number>}                   blockSet
 * @property {Set<number>}                   gooseSet
 * @property {Set<number>}                   falseGoalKeys
 * @property {Map<number, PortalExit>}       portalMap          entry key → exit
 * @property {PortalVisual[]}                portalVisuals
 * @property {Map<number, *>}                filterMap
 * @property {Map<number, *>}                flippingFilterMap
 * @property {number[]}                      mustPassKeys
 * @property {number[]}                      mustCrossKeys
 * @property {number}                        reqLen
 * @property {number}                        reqInt
 * @property {number[][]} [hints]
 */

export {};
