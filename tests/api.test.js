import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../src/server.js';

test('REST API Endpoints Integration', async () => {
  const app = await buildServer();

  // Test GET /api/channels
  const chRes = await app.inject({
    method: 'GET',
    url: '/api/channels'
  });
  assert.equal(chRes.statusCode, 200);
  const channels = JSON.parse(chRes.body);
  assert.equal(channels.length, 6);

  // Test GET /api/channels/1
  const ch1Res = await app.inject({
    method: 'GET',
    url: '/api/channels/1'
  });
  assert.equal(ch1Res.statusCode, 200);
  const ch1 = JSON.parse(ch1Res.body);
  assert.equal(ch1.id, 1);
  assert.ok(Array.isArray(ch1.items));
  assert.equal(typeof ch1.frozen, 'boolean');
  assert.equal(typeof ch1.is_live, 'boolean');

  // Test Channel Renaming: POST /api/channels/1/rename
  const renameRes = await app.inject({
    method: 'POST',
    url: '/api/channels/1/rename',
    payload: { name: 'ห้องประชุมผู้บริหาร A' }
  });
  assert.equal(renameRes.statusCode, 200);
  const renameData = JSON.parse(renameRes.body);
  assert.equal(renameData.success, true);
  assert.equal(renameData.channel.name, 'ห้องประชุมผู้บริหาร A');

  // Test POST /api/channels/1/playlist
  const postRes = await app.inject({
    method: 'POST',
    url: '/api/channels/1/playlist',
    payload: {
      items: [
        { asset_id: 'sample_asset_1', duration: 10, order: 0 },
        { asset_id: 'sample_asset_2', duration: 12, order: 1 }
      ]
    }
  });
  assert.equal(postRes.statusCode, 200);
  const updateResult = JSON.parse(postRes.body);
  assert.equal(updateResult.success, true);
  assert.equal(updateResult.channel.items.length, 2);

  // Test Batch Duration Setting: POST /api/channels/1/duration/batch
  const batchRes = await app.inject({
    method: 'POST',
    url: '/api/channels/1/duration/batch',
    payload: { duration: 25 }
  });
  assert.equal(batchRes.statusCode, 200);
  const batchData = JSON.parse(batchRes.body);
  assert.equal(batchData.success, true);
  assert.equal(batchData.duration, 25);
  assert.equal(batchData.channel.items[0].duration, 25);
  assert.equal(batchData.channel.items[1].duration, 25);

  // Test Jump to Slide: POST /api/channels/1/jump
  const jumpRes = await app.inject({
    method: 'POST',
    url: '/api/channels/1/jump',
    payload: { index: 1 }
  });
  assert.equal(jumpRes.statusCode, 200);
  const jumpData = JSON.parse(jumpRes.body);
  assert.equal(jumpData.success, true);
  assert.equal(jumpData.index, 1);

  // Test Freeze Slide: POST /api/channels/1/freeze
  const freezeRes = await app.inject({
    method: 'POST',
    url: '/api/channels/1/freeze',
    payload: { frozen: true }
  });
  assert.equal(freezeRes.statusCode, 200);
  const freezeData = JSON.parse(freezeRes.body);
  assert.equal(freezeData.success, true);
  assert.equal(freezeData.frozen, true);

  // Unfreeze: POST /api/channels/1/freeze
  const unfreezeRes = await app.inject({
    method: 'POST',
    url: '/api/channels/1/freeze',
    payload: { frozen: false }
  });
  assert.equal(unfreezeRes.statusCode, 200);
  assert.equal(JSON.parse(unfreezeRes.body).frozen, false);

  // Test Static Page Routes
  const adminPage = await app.inject({ method: 'GET', url: '/admin' });
  assert.equal(adminPage.statusCode, 200);
  assert.ok(adminPage.body.includes('Smart TV Multi-Channel Signage'));

  const tvPage = await app.inject({ method: 'GET', url: '/tv/1' });
  assert.equal(tvPage.statusCode, 200);
  assert.ok(tvPage.body.includes('Smart TV Display'));
  assert.ok(tvPage.body.includes('live-layer'));
  assert.ok(tvPage.body.includes('freeze-indicator'));

  await app.close();
});
