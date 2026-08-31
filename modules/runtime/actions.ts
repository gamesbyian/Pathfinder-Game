// Gameplay event discriminators emitted by the pure runtime step computation and consumed by
// engine adapters. Input/navigation requests use direct engine/controller/state-action ports;
// there is deliberately no gameplay command bus or universal reducer (ADR 0006).

export const GameEventType = Object.freeze({
    WIN:                'WIN',
    LOGIC_STATE_CHANGE: 'LOGIC_STATE_CHANGE',
});

export type GameEventTypeValue = (typeof GameEventType)[keyof typeof GameEventType];
