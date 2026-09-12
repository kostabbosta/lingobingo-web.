import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function moduleURL(source) { return 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64'); }
const learning = await import(moduleURL(fs.readFileSync('lib/learning.ts','utf8')));

const originalFetch = globalThis.fetch;
function withFetch(stub, run) {
  globalThis.fetch = stub;
  return run().finally(() => { globalThis.fetch = originalFetch; });
}

test('every account request carries a deadline', async () => {
  let seen = null;
  await withFetch(async (_url, init) => { seen = init; return { ok: true, json: async () => ({ ok: true }) }; },
    () => learning.api());
  assert.ok(seen.signal, 'the request was sent without an abort signal and could hang forever');
  assert.equal(typeof learning.REQUEST_TIMEOUT, 'number');
  // Long enough to outlast a real sync — session check plus paged progress, each
  // upstream call budgeted 18s — but still bounded, so a dead request gives up.
  assert.ok(learning.REQUEST_TIMEOUT >= 40000 && learning.REQUEST_TIMEOUT <= 90000);
});

test('a stalled request is reported, never left pending', async () => {
  const timedOut = Object.assign(new Error('signal timed out'), { name: 'TimeoutError' });
  await withFetch(async () => { throw timedOut; }, async () => {
    await assert.rejects(learning.api(), e => {
      assert.match(e.message, /took too long/i);
      assert.doesNotMatch(e.message, /signal/i, 'the raw abort text reached the learner');
      return true;
    });
  });
});

test('a dropped connection reads as interrupted rather than timed out', async () => {
  await withFetch(async () => { throw new TypeError('Failed to fetch'); }, async () => {
    await assert.rejects(learning.api(), e => {
      assert.match(e.message, /interrupted/i);
      return true;
    });
  });
});

test('server errors still surface their own message', async () => {
  await withFetch(async () => ({ ok: false, status: 401, json: async () => ({ error: 'Sign in to continue.' }) }), async () => {
    await assert.rejects(learning.api(), e => {
      assert.equal(e.message, 'Sign in to continue.');
      assert.equal(e.status, 401);
      return true;
    });
  });
});
