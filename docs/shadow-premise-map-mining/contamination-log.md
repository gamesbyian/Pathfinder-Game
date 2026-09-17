# Blind shadow mining — contamination log

## C001 — frozen hardening file exposed predeclared lens names

During research-object inspection, `docs/solver-premise-map-hardening.md` and `docs/solver-premise-map-hardening-overlay.json` were read at the frozen repository boundary.

Those frozen map-support files contain a predeclared list of mining lenses. This exposure occurred before this investigation's independent interrogation method had been frozen.

No later branch, PR, report, mining output, synthesis, reconciliation, queue change, or post-snapshot research conclusion was inspected. The dedicated preregistration file was not opened.

### Consequence

This is a genuine method-independence contamination risk even though the material belongs to the frozen object. The investigator cannot credibly claim never to have seen the names of those predeclared lenses.

Mitigation:

- do not use the listed lens set as the interrogation plan;
- do not open the dedicated preregistration or any result produced from it;
- derive the shadow method from direct properties of the raw proposition and relation substrate;
- explicitly identify any shadow method component that resembles an exposed lens;
- preserve this event through closeout rather than retroactively redefining it away.

The final closeout must distinguish **post-snapshot comparison contamination** (currently none) from **frozen-input methodology exposure** (this event).
