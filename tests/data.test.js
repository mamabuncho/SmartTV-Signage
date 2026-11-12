import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initDb, getChannels, getChannel, updateChannelPlaylist, saveMediaAsset } from '../src/db.js';

test('Database initialization and channel seeding', async () => {
  const db = await initDb();
  assert.ok(db, 'Database should initialize');
  assert.equal(db.channels.length, 6, 'Should pre-populate exactly 6 channels');
});

test('getChannels returns all 6 channels with metadata', async () => {
  const channels = await getChannels();
  assert.equal(channels.length, 6);
  assert.equal(channels[0].id, 1);
  assert.equal(typeof channels[0].item_count, 'number');
  assert.equal(typeof channels[0].total_duration, 'number');
});

test('saveMediaAsset and updateChannelPlaylist', async () => {
  const testAsset = {
    id: 'test_hash_1234',
    filename: 'test_hash_1234.jpg',
    original_name: 'test_slide.jpg',
    mime_type: 'image/jpeg',
    byte_size: 1024,
    width: 1920,
    height: 1080,
    duration: 8.0
  };

  await saveMediaAsset(testAsset);

  const playlistItems = [
    { asset_id: 'test_hash_1234', duration: 8.0, order: 0 }
  ];

  const updatedChannel = await updateChannelPlaylist(1, playlistItems);
  assert.equal(updatedChannel.id, 1);
  assert.equal(updatedChannel.items.length, 1);
  assert.equal(updatedChannel.items[0].asset_id, 'test_hash_1234');
  assert.equal(updatedChannel.items[0].duration, 8.0);
  assert.equal(updatedChannel.items[0].url, '/media/test_hash_1234.jpg');
});
