// Solver scoring profiles and structural templates, separate from search implementation.
import type { ScoringProfile, StructuralTemplate } from './types.js';

export const POLICY_PROFILES: Readonly<Record<string, ScoringProfile>> = Object.freeze({
    default:             Object.freeze({ goalAttractionWeight: 0.4,  objectiveAttractionWeight: 2.5,  finishCommitmentWeight: 0.6,  perimeterBiasWeight: 1,    mustPassUrgencyWeight: 1.25, mustCrossUrgencyWeight: 1,    intersectionSetupWeight: 1,    antiDitherWeight: 1,    revisitPenaltyWeight: 1    }),
    perimeterSweep:      Object.freeze({ goalAttractionWeight: 0.6,  objectiveAttractionWeight: 0.95, finishCommitmentWeight: 0.45, perimeterBiasWeight: 2.05, mustPassUrgencyWeight: 1.1,  mustCrossUrgencyWeight: 1.15, intersectionSetupWeight: 1.1,  antiDitherWeight: 0.55, revisitPenaltyWeight: 0.65 }),
    harvestThenFinish:   Object.freeze({ goalAttractionWeight: 0.82, objectiveAttractionWeight: 1.35, finishCommitmentWeight: 0.72, perimeterBiasWeight: 1.15, mustPassUrgencyWeight: 1.35, mustCrossUrgencyWeight: 1.4,  intersectionSetupWeight: 1.15, antiDitherWeight: 0.85, revisitPenaltyWeight: 0.85 }),
    portalFirstTransfer: Object.freeze({ goalAttractionWeight: 0.72, objectiveAttractionWeight: 1.2,  finishCommitmentWeight: 0.7,  perimeterBiasWeight: 0.85, mustPassUrgencyWeight: 1.25, mustCrossUrgencyWeight: 1.35, intersectionSetupWeight: 1.05, antiDitherWeight: 0.95, revisitPenaltyWeight: 0.8  }),
    objectiveFirst:      Object.freeze({ goalAttractionWeight: 0.7,  objectiveAttractionWeight: 1.65, finishCommitmentWeight: 0.65, perimeterBiasWeight: 1.1,  mustPassUrgencyWeight: 1.85, mustCrossUrgencyWeight: 1.8,  intersectionSetupWeight: 1.2,  antiDitherWeight: 1,    revisitPenaltyWeight: 0.9  }),
    finishFirst:         Object.freeze({ goalAttractionWeight: 1.45, objectiveAttractionWeight: 0.85, finishCommitmentWeight: 1.75, perimeterBiasWeight: 0.75, mustPassUrgencyWeight: 1.05, mustCrossUrgencyWeight: 1.05, intersectionSetupWeight: 0.8,  antiDitherWeight: 1.3,  revisitPenaltyWeight: 1.3  }),
    nearClosureRescue:   Object.freeze({ goalAttractionWeight: 1.55, objectiveAttractionWeight: 1.25, finishCommitmentWeight: 1.9,  perimeterBiasWeight: 0.8,  mustPassUrgencyWeight: 1.6,  mustCrossUrgencyWeight: 1.7,  intersectionSetupWeight: 1.2,  antiDitherWeight: 1.2,  revisitPenaltyWeight: 1.1  }),
    knotBuilder:         Object.freeze({ goalAttractionWeight: 0.8,  objectiveAttractionWeight: 1,    finishCommitmentWeight: 0.7,  perimeterBiasWeight: 1.1,  mustPassUrgencyWeight: 1.1,  mustCrossUrgencyWeight: 1.35, intersectionSetupWeight: 1.9,  antiDitherWeight: 0.9,  revisitPenaltyWeight: 0.8  }),
    portalCommitted:     Object.freeze({ goalAttractionWeight: 0.95, objectiveAttractionWeight: 1.2,  finishCommitmentWeight: 1,    perimeterBiasWeight: 0.9,  mustPassUrgencyWeight: 1.2,  mustCrossUrgencyWeight: 1.3,  intersectionSetupWeight: 1,    antiDitherWeight: 1.25, revisitPenaltyWeight: 1.1  }),
    mustCrossFirst:      Object.freeze({ goalAttractionWeight: 0.65, objectiveAttractionWeight: 1.5,  finishCommitmentWeight: 0.6,  perimeterBiasWeight: 1.1,  mustPassUrgencyWeight: 1.6,  mustCrossUrgencyWeight: 2.4,  intersectionSetupWeight: 1.1,  antiDitherWeight: 0.9,  revisitPenaltyWeight: 0.85 }),
    intersectionHarvest: Object.freeze({ goalAttractionWeight: 0.5,  objectiveAttractionWeight: 0.9,  finishCommitmentWeight: 0.45, perimeterBiasWeight: 1.15, mustPassUrgencyWeight: 0.45, mustCrossUrgencyWeight: 0.55, intersectionSetupWeight: 3.0,  antiDitherWeight: 0.65, revisitPenaltyWeight: 0.6  }),
    closureCommitment:   Object.freeze({ goalAttractionWeight: 1.5,  objectiveAttractionWeight: 1.3,  finishCommitmentWeight: 2.0,  perimeterBiasWeight: 0.8,  mustPassUrgencyWeight: 2.0,  mustCrossUrgencyWeight: 2.0,  intersectionSetupWeight: 0.8,  antiDitherWeight: 0.4,  revisitPenaltyWeight: 0.4  }),
    // Repair uses objectiveFirst-like weights but a distinct name for provenance. Must-turn distance
    // and exit-guidance scoring stay disabled because nonzero repair weights regress validated cases;
    // repair-specific guidance lives in repair-search.ts instead.
    repair:              Object.freeze({ goalAttractionWeight: 0.7,  objectiveAttractionWeight: 1.65, finishCommitmentWeight: 0.65, perimeterBiasWeight: 1.1,  mustPassUrgencyWeight: 1.85, mustCrossUrgencyWeight: 1.8,  intersectionSetupWeight: 1.2,  antiDitherWeight: 1,    revisitPenaltyWeight: 0.9, mustTurnUrgencyWeight: 0, mustTurnExitGuidanceWeight: 0 }),
});

export const PROFILE_ORDER = Object.freeze([
    'harvestThenFinish', 'objectiveFirst', 'knotBuilder', 'perimeterSweep',
    'mustCrossFirst', 'intersectionHarvest', 'finishFirst', 'nearClosureRescue',
    'portalFirstTransfer', 'portalCommitted', 'closureCommitment', 'default'
]);

export const TEMPLATES: Readonly<Record<string, StructuralTemplate>> = Object.freeze({
    perimeterCW:    Object.freeze({ id: 'perimeterCW',    perimeterDir: 'cw',  edgeDriftPenalty: 22, branchBiasBoost: 26, directionPenalty: 16 }),
    perimeterCCW:   Object.freeze({ id: 'perimeterCCW',   perimeterDir: 'ccw', edgeDriftPenalty: 22, branchBiasBoost: 26, directionPenalty: 16 }),
    cornerHarvest:  Object.freeze({ id: 'cornerHarvest',  prefersCorner: true, cornerMissPenalty: 14 }),
    sideCommitment: Object.freeze({ id: 'sideCommitment', prefersSide:   true, sideSwitchPenalty: 16 }),
    sideXLow:       Object.freeze({ id: 'sideXLow',  sideAxis: 'x', sideDir: -1, sideBiasBoost: 14, sideViolation: 10 }),
    sideXHigh:      Object.freeze({ id: 'sideXHigh', sideAxis: 'x', sideDir: +1, sideBiasBoost: 14, sideViolation: 10 }),
    sideYLow:       Object.freeze({ id: 'sideYLow',  sideAxis: 'y', sideDir: -1, sideBiasBoost: 14, sideViolation: 10 }),
    sideYHigh:      Object.freeze({ id: 'sideYHigh', sideAxis: 'y', sideDir: +1, sideBiasBoost: 14, sideViolation: 10 }),
});

export const TEMPLATE_CONFIG_KEYS: Readonly<Record<string, string>> = Object.freeze({
    cornerHarvest:  'TEMPLATE_CORNER_HARVEST',
    perimeterCW:    'TEMPLATE_PERIMETER_CW',
    perimeterCCW:   'TEMPLATE_PERIMETER_CCW',
    sideCommitment: 'TEMPLATE_SIDE_COMMITMENT',
    sideXLow:       'TEMPLATE_SIDE_X_LOW',
    sideXHigh:      'TEMPLATE_SIDE_X_HIGH',
    sideYLow:       'TEMPLATE_SIDE_Y_LOW',
    sideYHigh:      'TEMPLATE_SIDE_Y_HIGH',
});

export const ATTEMPT_CONFIGS = Object.freeze([
    Object.freeze({ profileName: 'perimeterSweep',    template: TEMPLATES.cornerHarvest    }),
    Object.freeze({ profileName: 'perimeterSweep',    template: TEMPLATES.perimeterCW      }),
    Object.freeze({ profileName: 'perimeterSweep',    template: TEMPLATES.perimeterCCW     }),
    Object.freeze({ profileName: 'perimeterSweep',    template: TEMPLATES.sideCommitment   }),
    ...PROFILE_ORDER.map(profileName => Object.freeze({ profileName, template: null })),
]);
