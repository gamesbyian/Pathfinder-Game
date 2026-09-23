# Hint evidence consolidation — Phase 8 codec baseline table-setting — 001

> **Status:** active
> **Last evidence:** 2026-09-23 — Pre-v4 baseline benchmark implementation and focused guard landed on the consolidation descendant branch.
> **Decision:** Freeze a reproducible current-codec measurement vocabulary before designing schema v4; do not infer or choose a v4 encoding from this benchmark.
> **Remaining gate:** Run the full-corpus benchmark on a repo-capable checkout after Phase-7 enrichment settles, then compare candidate v4 codecs against the same semantic/size/decode dimensions.

## Purpose

Reduce Phase-8 setup work without violating the dependency ordering that keeps physical v4 design after
semantic enrichment.

Added `scripts/hint-codec-baseline-benchmark.mjs`.

The benchmark scans the three canonical Hint stores and records, per corpus and in aggregate:

- artifact count;
- semantic Hint count;
- provenance-event count;
- raw source bytes;
- raw gzip bytes;
- canonical decoded semantic bytes;
- path-only bytes;
- path-only gzip bytes;
- file-size distribution;
- observed decode time.

Every input is decoded through the shared v1-v3 canonical decoder before semantic/path projections are
measured.

This deliberately does **not**:

- introduce a v4 codec;
- choose sparse/interned representation;
- rewrite any canonical Hint file;
- claim timing measurements are machine-independent;
- collapse reviewability/diff quality into byte size.

The benchmark's equality boundary is the ordered decoded semantic `Hint[]`. Future v4 candidates should
be measured against this same boundary after authoritative historical enrichment is complete.

A focused node test verifies counts, byte accounting and the expected reduction of a provenance-bearing
fixture when projected to path-only delivery. It is included in `test:node`.
