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
 * @property {PortalVisual[]}                [portalVisuals]    present in the full engine level, omitted by the solver normalizer
 * @property {Map<number, *>}                filterMap
 * @property {Map<number, *>}                flippingFilterMap
 * @property {number[]}                      mustPassKeys
 * @property {number[]}                      mustCrossKeys
 * @property {number}                        reqLen
 * @property {number}                        reqInt
 * @property {number[]}                      [surroundKeys]
 * @property {Map<number, string>}           [mustPassTurnDirs]   must-turn cell → 'either'|'left'|'right'
 * @property {number[]}                      [adjacentTurnKeys]
 * @property {string[]}                      [adjacentTurnDirs]   parallel to adjacentTurnKeys
 * @property {Map<number, { objectType: string, role: string }>} [landmarkMeta]
 * @property {number}                        [id]
 * @property {number}                        [level]
 * @property {number[][]} [hints]
 */

/**
 * The subset of navigation state the win/metric rules read (a projection of the live nav slice,
 * or a reconstructed snapshot). All packed keys.
 * @typedef {Object} PathMetricsState
 * @property {number[]}              path
 * @property {Set<number>}           isPortalJump
 * @property {number}                intersections
 * @property {Map<number, number>}   visitedCounts
 * @property {Map<number, string>}   [turnsAtMap]   cell → 'left'|'right'|'both'
 */

/** Per-cell axis usage (which of the H/V edges through a cell are used). @typedef {{ h: boolean, v: boolean }} CellUsage */

/**
 * The flat, self-contained movement state used by the pure tap-route transition
 * (`cloneTapRouteState` and friends in runtime/path-state.js). A superset of the win/metric
 * projection — assignable to both {@link MoveState} and {@link PathMetricsState}.
 * @typedef {Object} TapRouteState
 * @property {number}                   mode
 * @property {number[]}                 path
 * @property {Set<number>}              isPortalJump
 * @property {Map<number, number>}      visitedCounts
 * @property {Map<number, CellUsage>}   cellUsage
 * @property {number}                   intersections
 * @property {number}                   flipCount
 * @property {Map<number, number>}      crossedFlippingFilters
 * @property {number}                   activeGateKey
 * @property {Map<number, string>}      turnsAtMap
 * @property {Set<number>}              armedFalseGoals
 * @property {Set<number>}              revealedGeese
 */

/** Nav fields shared by the nested (.nav) and flat forms of {@link MoveState}.
 * @typedef {Object} NavFields
 * @property {number[]}                 [path]
 * @property {Map<number, number>}      [visitedCounts]
 * @property {Map<number, CellUsage>}   [cellUsage]
 * @property {Set<number>}              [isPortalJump]
 * @property {number}                   [intersections]
 * @property {number}                   [flipCount]
 * @property {Map<number, number>}      [crossedFlippingFilters]
 * @property {Map<number, string>}      [turnsAtMap]
 */

/**
 * Flexible move-evaluation state accepted by `isValidMove`: either a nested engineState (with
 * `.nav`/`.hazards` sub-objects) or a flat snapshot. All fields optional — the function resolves
 * nested-or-flat via optional chaining + `??`.
 * @typedef {NavFields & {
 *   mode?: number,
 *   nav?: NavFields,
 *   hazards?: { armedFalseGoals?: Set<number> },
 *   counts?: Map<number, number>,
 *   usage?: Map<number, CellUsage>,
 *   jumpSet?: Set<number>,
 *   armedFalseGoals?: Set<number>,
 *   crossedSet?: Map<number, number>,
 * }} MoveState
 */

/**
 * Options for `isValidMove` (the static MoveContext flags plus state-derived overrides).
 * @typedef {Object} MoveOptions
 * @property {boolean}  [isStrict]
 * @property {boolean}  [allowJump]
 * @property {boolean}  [forbidPortals]
 * @property {number}   [mode]
 * @property {Set<number>} [armedFalseGoals]
 * @property {number}   [_flipCount]
 * @property {Map<number, number>} [crossedSet]
 * @property {boolean}  [checkHazards]
 * @property {boolean}  [checkFalseGoals]
 * @property {boolean}  [checkWinMetrics]
 * @property {string[]} [disabledPrunes]
 * @property {{ reasonCode?: string, reasonDetail?: * } | null} [diagnostics]
 */

export {};
