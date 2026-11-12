import { test } from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { buildServer } from '../src/server.js';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

test('Concurrent 6 Channels + Admin Dual-Protocol Sync', async () => {
  const server = await buildServer();
  const address = await server.listen({ port: 0, host: '127.0.0.1' });
  const port = server.server.address().port;

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const adminPage = await browser.newPage();
  await adminPage.goto(`http://127.0.0.1:${port}/admin`, { waitUntil: 'domcontentloaded' });

  const tvPages = [];
  for (let ch = 1; ch <= 6; ch++) {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}/tv/${ch}`, { waitUntil: 'domcontentloaded' });
    tvPages.push(page);
  }

  await adminPage.bringToFront();
  await new Promise(r => setTimeout(r, 2000));

  for (let ch = 1; ch <= 6; ch++) {
    const badgeText = await adminPage.$eval(`#status-badge-${ch}`, el => el.textContent.trim());
    assert.ok(badgeText.includes('ทีวีเชื่อมต่ออยู่'), `Channel ${ch} must be online, got: "${badgeText}"`);
  }

  const healthRes = await fetch(`http://127.0.0.1:${port}/api/system/health`);
  const health = await healthRes.json();
  assert.equal(health.connected_screens, 6);
  assert.ok(health.memory.heap_used_mb < 100);

  await browser.close();
  await server.close();
});
