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
        'beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets',
        'dfs|score=perimeterSweep|bias=perimeterCW',
        'beam|score=perimeterSweep|bias=perimeterCW|width=2000|retention=plain',
    ]),
    pass3Configs: new Set([
        'beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets',
        'beam|score=objectiveFirst|bias=none|width=5000|retention=mechanic-buckets',
        'beam|score=objectiveFirst|bias=none|width=5000|retention=plain',
        'beam|score=perimeterSweep|bias=perimeterCW|width=2000|retention=plain',
    ]),
    conditionalPasses: [
        {
            passNumber: 4,
            capMs: 60000,
            configs: new Set([
                'repair|score=repair|guidance=standard',
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
                'repair|score=repair|guidance=standard',
            ]),
            when: {
                minReqInt: 9,
            },
        },
        {
            passNumber: 4,
            capMs: 10000,
            configs: new Set([
                'repair|score=repair|guidance=must-turn-biased',
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
