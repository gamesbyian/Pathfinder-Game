import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadProbeCorpora } from './probe-corpus-loader.mjs';

const dir = await mkdtemp(path.join(os.tmpdir(), 'probe-corpora-'));
try {
    await writeFile(path.join(dir, 'a.json'), JSON.stringify([{ id: 'A' }, { id: 'B' }]));
    await writeFile(path.join(dir, 'b.json'), JSON.stringify({ levels: [{ id: 'C' }] }));
    const loaded = loadProbeCorpora(dir, [['a.json', 'hints-a'], ['b.json', 'hints-b']]);
    assert.deepEqual([...loaded.levelById.keys()], ['A', 'B', 'C']);
    assert.equal(loaded.hintsDirById.get('C'), 'hints-b');

    await writeFile(path.join(dir, 'collision.json'), JSON.stringify([{ id: 'B' }]));
    assert.throws(
        () => loadProbeCorpora(dir, [['a.json', 'hints-a'], ['collision.json', 'hints-collision']]),
        /Duplicate level id B.*a\.json.*collision\.json/,
    );
} finally {
    await rm(dir, { recursive: true, force: true });
}
