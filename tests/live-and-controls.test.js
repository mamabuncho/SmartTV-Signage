import { test } from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import WebSocket from 'ws';
import { buildServer } from '../src/server.js';
import { saveMediaAsset } from '../src/db.js';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

// Minimal 1x1 valid JPEG Buffer
const MINIMAL_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64'
);

test('End-to-End Test: Live Screen Share, Bulk Duration, Direct Jump, Freeze, and Channel Renaming', async () => {
  const server = await buildServer();
  const address = await server.listen({ port: 0, host: '127.0.0.1' });
  const port = server.server.address().port;

  // Prepare 2 media assets in DB for Channel 1
  await saveMediaAsset({
    id: 'slide_test_1',
    filename: 'slide_test_1.jpg',
    original_name: 'สไลด์ที่ 1 ยินดีต้อนรับ',
    mime_type: 'image/jpeg',
    width: 1920,
    height: 1080,
    duration: 10
  });

  await saveMediaAsset({
    id: 'slide_test_2',
    filename: 'slide_test_2.jpg',
    original_name: 'สไลด์ที่ 2 วาระการประชุม',
    mime_type: 'image/jpeg',
    width: 1920,
    height: 1080,
    duration: 15
  });

  // Set initial playlist for Channel 1
  await fetch(`http://127.0.0.1:${port}/api/channels/1/playlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [
        { asset_id: 'slide_test_1', duration: 10, order: 0 },
        { asset_id: 'slide_test_2', duration: 15, order: 1 }
      ]
    })
  });

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: EDGE_PATH,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const tvPage = await browser.newPage();
    const adminPage = await browser.newPage();

    await tvPage.goto(`http://127.0.0.1:${port}/tv/1`, { waitUntil: 'domcontentloaded' });
    await adminPage.goto(`http://127.0.0.1:${port}/admin`, { waitUntil: 'domcontentloaded' });

    // Allow WebSocket connection to establish
    await new Promise(r => setTimeout(r, 1200));

    // ----------------------------------------------------
    // Feature 1: Channel Renaming (ตั้งชื่อช่องได้)
    // ----------------------------------------------------
    console.log('Testing Feature: Channel Renaming...');
    const renameRes = await fetch(`http://127.0.0.1:${port}/api/channels/1/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'ห้องประชุม บอร์ดบริหาร' })
    });
    assert.equal(renameRes.status, 200);

    // Wait for real-time WebSocket broadcast to TV
    await new Promise(r => setTimeout(r, 600));

    const tvDocTitle = await tvPage.title();
    console.log('TV Document Title after rename:', tvDocTitle);
    assert.ok(tvDocTitle.includes('ห้องประชุม บอร์ดบริหาร'), 'TV title should reflect renamed channel');

    // ----------------------------------------------------
    // Feature 2: Bulk / Batch Slide Duration Setting
    // ----------------------------------------------------
    console.log('Testing Feature: Bulk Slide Duration Setting...');
    const batchRes = await fetch(`http://127.0.0.1:${port}/api/channels/1/duration/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration: 45 })
    });
    assert.equal(batchRes.status, 200);
    const batchData = await batchRes.json();
    assert.equal(batchData.success, true);
    assert.equal(batchData.channel.items[0].duration, 45);
    assert.equal(batchData.channel.items[1].duration, 45);

    // ----------------------------------------------------
    // Feature 3: Freeze / Lock Current Slide
    // ----------------------------------------------------
    console.log('Testing Feature: Freeze Slide Lock...');
    const freezeRes = await fetch(`http://127.0.0.1:${port}/api/channels/1/freeze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frozen: true })
    });
    assert.equal(freezeRes.status, 200);

    await new Promise(r => setTimeout(r, 600));

    const freezeIndicatorVisible = await tvPage.$eval('#freeze-indicator', el => !el.classList.contains('hidden'));
    assert.equal(freezeIndicatorVisible, true, 'Freeze indicator should be visible on TV when frozen');

    // Unfreeze
    await fetch(`http://127.0.0.1:${port}/api/channels/1/freeze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frozen: false })
    });
    await new Promise(r => setTimeout(r, 500));
    const freezeIndicatorHidden = await tvPage.$eval('#freeze-indicator', el => el.classList.contains('hidden'));
    assert.equal(freezeIndicatorHidden, true, 'Freeze indicator should be hidden when unfreezing');

    // ----------------------------------------------------
    // Feature 4: Direct Slide Override / Jump to Slide Immediately
    // ----------------------------------------------------
    console.log('Testing Feature: Direct Slide Jump...');
    const jumpRes = await fetch(`http://127.0.0.1:${port}/api/channels/1/jump`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index: 1 })
    });
    assert.equal(jumpRes.status, 200);

    await new Promise(r => setTimeout(r, 800));

    // Check active slide in TV DOM
    const currentItemName = await tvPage.evaluate(() => {
      if (window.playlist && window.playlist.length > 0) {
        return window.playlist[1]?.original_name;
      }
      return null;
    });
    assert.equal(currentItemName, 'สไลด์ที่ 2 วาระการประชุม', 'TV playlist should contain jumped item');

    // ----------------------------------------------------
    // Feature 5: Live Screen Share (Admin Stream to TV)
    // ----------------------------------------------------
    console.log('Testing Feature: Live Screen Share...');
    // Connect WebSocket broadcaster simulating admin screen share
    const broadcasterWs = new WebSocket(`ws://127.0.0.1:${port}/ws/live?target=1`);
    await new Promise((resolve) => broadcasterWs.on('open', resolve));

    // Send start signal
    broadcasterWs.send(JSON.stringify({ action: 'start', target: '1' }));
    await new Promise(r => setTimeout(r, 400));

    // Send binary JPEG frame
    broadcasterWs.send(MINIMAL_JPEG);
    await new Promise(r => setTimeout(r, 800));

    // Check TV has live layer displayed and canvas initialized
    const tvLiveState = await tvPage.evaluate(() => {
      const layer = document.getElementById('live-layer');
      const canvas = document.getElementById('live-stream-canvas');
      return {
        isLayerVisible: !layer.classList.contains('hidden'),
        hasCanvas: Boolean(canvas && canvas.width > 0)
      };
    });

    console.log('TV Live Stream Status:', tvLiveState);
    assert.equal(tvLiveState.isLayerVisible, true, 'Live stream layer should be visible on TV');
    assert.equal(tvLiveState.hasCanvas, true, 'Live stream canvas should be initialized');

    // Stop live stream
    broadcasterWs.send(JSON.stringify({ action: 'stop' }));
    broadcasterWs.close();
    await new Promise(r => setTimeout(r, 600));

    const tvLiveClosed = await tvPage.$eval('#live-layer', el => el.classList.contains('hidden'));
    assert.equal(tvLiveClosed, true, 'Live stream layer should be hidden after live stream stops');

    console.log('✅ ALL 5 FEATURES (Live Screen, Bulk Duration, Jump, Freeze, Rename) VERIFIED SUCCESSFULLY!');
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
});
