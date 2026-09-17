# Premise-map replication bootstrap

Date: 2026-09-17
Coordination branch: `chatgpt/premise-map-replication-plan-2026-09-17`
Coordination PR: #1854
Status: Stage 0 coordination complete; blind discovery tracks prepared but not executed by this contaminated session

## Verified live state at bootstrap

- `main` head: `1bf72d62a72a7909b27156e3235c054303423e3a`
- frozen v1 snapshot commit: `e9601ffb8fa304d5ea91d054a9de6cb1bf8ff28e`
- execution-plan PR #1849: open, head `0f04b1235d208a76377bfe86166723f52b9e9973`
- Phase-1 PR #1850: open, head `25e080981f306b7a07465871db7f5bac58e3cb58`
- Phase-2 PR #1851: open, head `3c9a0edb78bebe049c4c128b907a5456508a767c`
- Phase-3 PR #1852: open, head `a8a3cfd1097439013f881c27dd6b7b9c660520dc`
- downstream consumer-contract PR #1853: open; head observed during bootstrap `824c2ab563e0a1a1cc05e034200d1e275a6861c9`
- independent-reconstruction reconciliation PR #1834: merged

The replication program therefore treats #1850-#1853 as an open sealed comparison lineage rather than pretending it is merged main history.

## Contamination declaration

The coordination session has inspected:

- the canonical mining preregistration;
- the Phase-1 method/boundary, replication-index, and closeout reports;
- the Phase-2 execution-plan synthesis questions;
- the merged independent-reconstruction reconciliation;
- the #1853 closeout/result lineage.

It is therefore **not eligible** to perform either blind discovery task:

- independent peer-map construction;
- shadow mining of frozen v1.

Using this session to perform those tasks would invalidate the intended independence check.

The session remains eligible for:

- experiment design;
- input freezing;
- branch/bootstrap administration;
- quarantine documentation;
- the mining-method expressiveness audit;
- later reconciliation after blind closeout.

## Track A workspace

Branch:

`chatgpt/premise-map-independent-peer-map-2026-09-17`

Root:

the preserved `chatgpt/independent-premise-space-2026-09-17` lineage

Bootstrap commit:

`294f64672a116bb6009988084d27e8fd621c26bc`

Brief:

`docs/independent-peer-map-construction-brief.md`

The brief permits underlying repository archaeology and the existing independent investigation while forbidding recent canonical premise-map/mining material and reconciliation during construction.

## Track B workspace

Branch:

`chatgpt/premise-map-shadow-mining-v1-2026-09-17`

Root:

exact frozen snapshot commit `e9601ffb8fa304d5ea91d054a9de6cb1bf8ff28e`

Bootstrap commit:

`52eb43316e143ef4fdfa5cd9ae3486bac984b20b`

Brief:

`docs/shadow-premise-map-mining-brief.md`

The cleanest quarantine rule is temporal: the shadow miner may inspect the frozen repository state and its own later commits, but no repository/PR/report material created after the snapshot commit.

This avoids needing to tell the blind miner what later methods or conclusions exist.

## Coordination-side Track C

The allowed non-blind expressiveness audit has begun on the coordination branch:

`reports/2026-09-17-premise-map-mining-method-expressiveness-audit-001.md`

It characterizes what M1-M12 plus Phase 2 can and cannot express, but is forbidden input to Track B until shadow mining closes.

## Next execution gate

The next substantive work must be performed in fresh contexts:

1. **Track A fresh context**: read only its branch/brief and continue the independent reconstruction into a peer map.
2. **Track B fresh context**: read only its frozen-root branch/brief, invent/freeze a mining scheme, then execute it.

Neither blind track should inspect this coordination report, #1854, or the expressiveness audit before closeout.

After both close, the coordination lineage may begin separate map-vs-map and mining-vs-mining reconciliation.
