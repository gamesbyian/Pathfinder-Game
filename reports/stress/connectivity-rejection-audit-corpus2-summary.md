# Connectivity rejection audit (Stage A)

Population: 80 levels from `data/stress/stress-levels-random.json` (pos:1-80), work budget 500,000, time budget 30000ms.

Total rejections observed: 67179.

## Subtype prevalence

- goal: 49528 (73.7%)
- must-pass: 12562 (18.7%)
- must-cross: 5081 (7.6%)
- volume: 8 (0%)

## Exact-state recurrence

22577/67179 records (33.61%) share an exact-state fingerprint with at least one other record. 50891 distinct fingerprints.

## Coarse-context recurrence

3084 distinct coarse (subtype, objective, pending-mask, reserved-wall) keys. 1723 (55.9%) recur across more than one exact state; 321 (10.4%) recur across more than one level.

## Work-point distribution by subtype

- goal: min=81, p50=243685, p90=461936, max=539607
- must-pass: min=129, p50=225971, p90=399686, max=526875
- must-cross: min=415, p50=262415, p90=454254, max=509334
- volume: min=21306, p50=363465, p90=380971, max=380971
