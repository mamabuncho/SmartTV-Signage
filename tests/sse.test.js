import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { buildServer } from '../src/server.js';

test('SSE Real-Time Sync & Online Detection Integration', async () => {
  const app = await buildServer();
  // Listen on an ephemeral port
  const address = await app.listen({ port: 0, host: '127.0.0.1' });
  const port = app.server.address().port;

  // 1. Initial status: Channel 1 has 0 clients and is offline
  const chRes1 = await fetch(`http://127.0.0.1:${port}/api/channels/1`);
  const ch1Initial = await chRes1.json();
  assert.equal(ch1Initial.online, false);
  assert.equal(ch1Initial.client_count, 0);

  // 2. Connect a simulated TV client to /api/channels/1/events
  const sseEvents = [];
  const sseReq = http.get(`http://127.0.0.1:${port}/api/channels/1/events`, (res) => {
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['content-type'], 'text/event-stream');

    res.on('data', (chunk) => {
      sseEvents.push(chunk.toString());
    });
  });

  // Wait 150ms for the connection to establish
  await new Promise((r) => setTimeout(r, 150));

  // 3. Verify Channel 1 is now ONLINE with 1 client
  const chRes2 = await fetch(`http://127.0.0.1:${port}/api/channels/1`);
  const ch1Connected = await chRes2.json();
  assert.equal(ch1Connected.online, true);
  assert.equal(ch1Connected.client_count, 1);

  // 4. Admin pushes playlist update to Channel 1
  const updateRes = await fetch(`http://127.0.0.1:${port}/api/channels/1/playlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ asset_id: 'sample_asset_1', duration: 15, order: 0 }]
    })
  });
  const updateData = await updateRes.json();
  assert.equal(updateData.success, true);
  assert.equal(updateData.notified_screens, 1);

  // Wait 100ms for SSE event transmission
  await new Promise((r) => setTimeout(r, 100));

  // Verify client received both 'connected' and 'playlist_update' events
  const allOutput = sseEvents.join('');
  assert.ok(allOutput.includes('event: connected'));
  assert.ok(allOutput.includes('event: playlist_update'));
  assert.ok(allOutput.includes('"duration":15'));

  // 5. TV client disconnects
  sseReq.destroy();
  await new Promise((r) => setTimeout(r, 150));

  // Verify Channel 1 transitions back to OFFLINE
  const chRes3 = await fetch(`http://127.0.0.1:${port}/api/channels/1`);
  const ch1Offline = await chRes3.json();
  assert.equal(ch1Offline.online, false);
  assert.equal(ch1Offline.client_count, 0);

  await app.close();
});
