import assert from 'node:assert/strict';
import test from 'node:test';
import { POST } from '../src/app/api/analyze-food/route.ts';

test('public photo requests cannot spend provider credits, even with a configured key', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.CLAUDE_API_KEY;
  process.env.CLAUDE_API_KEY = 'synthetic-test-key';
  globalThis.fetch = () => { throw new Error('Provider calls must stay disabled'); };
  try {
    for (const body of ['{"image":"data:image/jpeg;base64,c3ludGhldGlj"}', '{invalid-json']) {
      const response = await POST(new Request('https://example.invalid/api/analyze-food', {
        method: 'POST', body, headers: { 'Content-Type': 'application/json' },
      }));
      assert.equal(response.status, 503);
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
      const payload = await response.json();
      assert.match(payload.error, /manual entry/);
      assert.ok(!JSON.stringify(payload).includes('synthetic-test-key'));
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.CLAUDE_API_KEY;
    else process.env.CLAUDE_API_KEY = originalKey;
  }
});
