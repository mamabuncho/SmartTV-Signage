import { test } from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import fs from 'node:fs';
import { buildServer } from '../src/server.js';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

test('Browser End-to-End Optimization & Memory Telemetry', async () => {
  const server = await buildServer();
  const address = await server.listen({ port: 0, host: '127.0.0.1' });
  const port = server.server.address().port;

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: EDGE_PATH,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const tvPage = await browser.newPage();
    const adminPage = await browser.newPage();

    // Clear Channel 1 playlist initially for a pristine test baseline
    await fetch(`http://127.0.0.1:${port}/api/channels/1/playlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [] })
    });

    // Load TV channel 1
    await tvPage.goto(`http://127.0.0.1:${port}/tv/1`, { waitUntil: 'domcontentloaded' });
    // Load Admin dashboard
    await adminPage.goto(`http://127.0.0.1:${port}/admin`, { waitUntil: 'domcontentloaded' });

    // Wait for initial connection
    await new Promise(r => setTimeout(r, 1500));

    // 1. Verify live server memory displayed in Admin header
    const headerText = await adminPage.$eval('#server-status', el => el.textContent.trim());
    console.log('Live Header Status:', headerText);
    assert.ok(headerText.includes('เซิร์ฟเวอร์ทำงานปกติ'));
    assert.ok(headerText.includes('RAM:'));

    // 2. Upload a real test image to Channel 1
    const mediaFiles = fs.readdirSync(path.resolve('storage', 'media'));
    const testJpg = mediaFiles.find(f => f.endsWith('.jpg') || f.endsWith('.png'));
    if (testJpg) {
      const filePath = path.resolve('storage', 'media', testJpg);
      const fileInput = await adminPage.$('#file-input-1');
      await fileInput.uploadFile(filePath);
      await new Promise(r => setTimeout(r, 2000));

      // Check TV player has picked up the valid image
      const tvStatus = await tvPage.evaluate(() => {
        return {
          playlistCount: window.playlist ? window.playlist.length : 0,
          activeSlot: document.querySelector('.media-slot.active')?.id,
          hasVisibleImage: !!document.querySelector('.media-slot.active img.visible')
        };
      });
      console.log('TV Player State after upload:', tvStatus);
      assert.ok(tvStatus.playlistCount > 0);
      assert.equal(tvStatus.hasVisibleImage, true);
    }

    // 3. Test System Health Endpoint Telemetry
    const healthRes = await fetch(`http://127.0.0.1:${port}/api/system/health`);
    const health = await healthRes.json();
    console.log('System Health Telemetry:', health);
    assert.equal(health.status, 'ok');
    assert.ok(health.memory.heap_used_mb < 120, 'Heap memory must remain under 120MB');
    assert.equal(health.connected_screens, 1);
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
});
