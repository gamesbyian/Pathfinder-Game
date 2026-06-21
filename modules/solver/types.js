// @ts-check
// Solver-local JSDoc type contracts. No runtime exports — referenced via
// `import('./types.js').T` from `// @ts-check`'d solver modules. (plan §5 / ADR 0009.)

/**
 * The solver's mutable DFS/beam search state (see search-state.js `createState`). All masks are
 * 32-bit integers; all keys are packed. Typed arrays are indexed by packed key (KEY_SPACE) or by
 * objective index.
 * @typedef {Object} SolverSearchState
 * @property {number[]}     path           packed cell keys of the current path
 * @property {Uint16Array}  visited        visit count per cell (KEY_SPACE)
 * @property {Uint8Array}   edgeUsage      per-cell axis bits: 1=H used, 2=V used (KEY_SPACE)
 * @property {number}       ints           intersection count so far
 * @property {number}       mustMask       bit i set while must-pass[i] is unvisited
 * @property {number}       mustCrossMask  bit i set while must-cross[i] is unsatisfied
 * @property {Uint8Array}   crossCounts    crossing count per must-cross cell
 * @property {number}       mpVisitedMask  bit i set once must-pass[i] is visited
 * @property {number}       portalJumps    portal jumps so far (subtracted from counted length)
 * @property {number}       flipperUsedMask bit i set once flipper i has been used
 * @property {boolean}      lastWasPortalJump
 * @property {number}       surroundMask   bit i set while surround[i] has unvisited neighbors
 * @property {Uint8Array}   surroundNeighborRemainingMasks  per surround cell: 8-bit unvisited-neighbor mask
 * @property {number}       mustTurnMask   bit i set while must-turn[i] is unsatisfied
 * @property {number}       adjTurnMask    bit i set while adj-turn[i] is unsatisfied
 */

/** A surround/adj-turn neighbor entry. @typedef {{ i: number, bit: number }} SurroundNbr */
/** @typedef {{ i: number, dir: string }} AdjTurnNbr */
/** A forced portal-exit restriction (offline tooling only). @typedef {{ from: number, to: number }} ForcedPortalExit */

/**
 * Per-level precomputed solver data (see prep.js `prepLevel`). **Partial/growing** — only the
 * fields read by already-typed solver modules are listed. Typed arrays are indexed by packed key.
 * @typedef {Object} PrepLevel
 * @property {number}                       mustMaskForDFS
 * @property {number}                       initialMustCrossMask
 * @property {number}                       [initialSurroundMask]
 * @property {number}                       [initialMustTurnMask]
 * @property {number}                       [initialAdjTurnMask]
 * @property {boolean}                      hasLandmarkConstraints
 * @property {Set<number>}                  gateSet
 * @property {Map<number, number>}          mustPassIndex
 * @property {Map<number, number>}          mustCrossIndex
 * @property {Map<number, number>}          flipperIndexMap
 * @property {number[]}                     flipperInitAxes
 * @property {Map<number, Int32Array|number[]>} staticNeighbors  flat [nk, axis, …] pairs
 * @property {(Uint8Array|number[])}        [surroundInitNeighborMasks]
 * @property {Map<number, SurroundNbr[]>}   [surroundNeighborIndex]
 * @property {Map<number, number>}          [mustTurnCellIndex]
 * @property {string[]}                     [mustTurnDirs]
 * @property {Map<number, AdjTurnNbr[]>}    [adjTurnCellIndex]
 * @property {ForcedPortalExit|null}        [_forcedPortalExitKey]
 *
 * // Distance/lower-bound precomputation. The objective-indexed arrays below are ALWAYS set by
 * // prepLevel() (empty when the objective is absent), so they are non-optional:
 * @property {Uint16Array[]}                mpDistArrs             per must-pass cell: dist array
 * @property {Uint16Array[]}                mcDistArrs             per must-cross cell: dist array
 * @property {number[][]}                   mpPairDist             pairwise must-pass distances
 * @property {number[][]}                   mcPairDist             pairwise must-cross distances
 * @property {number[]}                     mustPassToGoalDist
 * @property {number[]}                     mustCrossToGoalDist
 * // Landmark-specific maps are present only on landmark levels (guarded at the call sites):
 * @property {{ h: Map<number, number>, v: Map<number, number> }[]} [mcApproachDistMaps]
 * @property {Map<number, number>[][]}      [surroundNeighborDistMaps]
 * @property {number[][]}                   [surroundNeighborKeys]
 * @property {number[][]}                   [surroundNeighborGoalDist]
 * @property {Map<number, number>[]}        [adjTurnDistMaps]
 * @property {number[]}                     [adjTurnGoalDist]
 */

/** Undo token returned by `applyMove` (landmark fields present only when hasLandmarkConstraints).
 * @typedef {Object} UndoToken
 * @property {number}  target
 * @property {number}  from
 * @property {number}  moveAxis
 * @property {number}  axisBit
 * @property {boolean} isPortalJump
 * @property {number}  prevVisited
 * @property {number}  prevEdgeFrom
 * @property {number}  prevEdgeTarget
 * @property {boolean} wasIntAdded
 * @property {number}  prevMustMask
 * @property {number}  prevMpVisitedMask
 * @property {number|undefined} mpIdx
 * @property {number}  prevMustCrossMask
 * @property {number|undefined} mcIdx
 * @property {number}  prevCrossCount
 * @property {number}  prevFlipperUsedMask
 * @property {boolean} prevLastWasPortalJump
 * @property {number}  [prevSurroundMask]
 * @property {{ i: number, prevMask: number }[]|null} [surroundNbrRestores]
 * @property {number}  [prevMustTurnMask]
 * @property {number}  [prevAdjTurnMask]
 */

export {};
