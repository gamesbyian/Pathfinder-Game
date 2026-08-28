// LEGACY WALL-CLOCK SCHEDULER EXPERIMENT.
// Shared fast-portfolio scheduler experiment definition. Runtime orchestration and offline
// replay/report tools consume the same tier thresholds and config sets from this module.
//
// Its pass caps are intentionally historical milliseconds. That makes this useful for latency/
// archaeology questions but NOT machine-independent equal-work scheduler evidence. New scheduler
// research should use canonical work; do not add another ms-shaped policy here.

/**
 * @typedef {Readonly<{
 *   pass1Ms: number,
 *   pass2Ms: number,
 *   pass3Ms: number,
 *   pass2Configs: ReadonlySet<string>,
 *   pass3Configs: ReadonlySet<string>,
 *   conditionalPasses?: ReadonlyArray<Readonly<{
 *     passNumber: number,
 *     capMs: number,
 *     configs: ReadonlySet<string>,
 *     when: Readonly<{
 *       minReqInt?: number,
 *       minMustPass?: number,
 *       minMustCross?: number,
 *       minMustTurn?: number,
 *       minPortals?: number,
 *       minFlippingFilters?: number,
 *     }>,
 *   }>>,
 * }>} PortfolioExperimentDefinition
 */

/** @type {PortfolioExperimentDefinition} */
export const PORTFOLIO_EXPERIMENT = Object.freeze({
    pass1Ms: 500,
    pass2Ms: 2000,
    pass3Ms: 5000,
    pass2Configs: new Set([
        'beam:intersectionHarvest@beam5000(diverse)',
        'dfs:perimeterSweep/perimeterCW',
        'beam:perimeterSweep/perimeterCW@beam2000',
    ]),
    pass3Configs: new Set([
        'beam:intersectionHarvest@beam5000(diverse)',
        'beam:objectiveFirst@beam5000(diverse)',
        'beam:objectiveFirst@beam5000',
        'beam:perimeterSweep/perimeterCW@beam2000',
    ]),
    conditionalPasses: [
        {
            passNumber: 4,
            capMs: 60000,
            configs: new Set([
                'dfs:repair:repair',
            ]),
            when: {
                minReqInt: 7,
                minMustPass: 4,
                minMustCross: 4,
                minFlippingFilters: 3,
            },
        },
        {
            passNumber: 4,
            capMs: 2000,
            configs: new Set([
                'dfs:repair:repair',
            ]),
            when: {
                minReqInt: 9,
            },
        },
        {
            passNumber: 4,
            capMs: 10000,
            configs: new Set([
                'dfs:repair:repair(mustTurnBiased)',
            ]),
            when: {
                minReqInt: 7,
                minMustPass: 3,
                minMustCross: 2,
                minMustTurn: 1,
            },
        },
    ],
});
