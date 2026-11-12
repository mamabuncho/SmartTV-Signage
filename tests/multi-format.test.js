import { test } from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import fs from 'node:fs';
import * as XLSX from 'xlsx';
import { buildServer } from '../src/server.js';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEST_DIR = path.resolve('storage', 'tmp_e2e_files');

function ensureTestFiles() {
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }

  // 1. Excel File (.xlsx)
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['รหัสสินค้า', 'รายการ', 'หมวดหมู่', 'ราคา'],
    ['SKU-001', 'จอสมาร์ททีวี 55 นิ้ว', 'เครื่องใช้ไฟฟ้า', '14,900 บาท'],
    ['SKU-002', 'กล่องควบคุม LAN Signage', 'อุปกรณ์ไอที', '3,500 บาท'],
    ['SKU-003', 'สาย HDMI 2.1 4K 3m', 'อุปกรณ์เสริม', '450 บาท']
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'สินค้าขายดี');
  const xlsxPath = path.join(TEST_DIR, 'สินค้าขายดี.xlsx');
  XLSX.writeFile(wb, xlsxPath);

  // 2. Text Announcement (.txt)
  const txtPath = path.join(TEST_DIR, 'ประกาศด่วน.txt');
  fs.writeFileSync(txtPath, `แจ้งกำหนดการประชุมผู้บริหาร
วันศุกร์ที่ 20 พฤศจิกายน เวลา 13:30 น.
ณ ห้องประชุมใหญ่ชั้น 4
โปรดเตรียมเอกสารสรุปยอดขายประจำไตรมาส`, 'utf-8');

  // 3. GIF File (.gif)
  const gifPath = path.join(TEST_DIR, 'animation.gif');
  const gifBuffer = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  fs.writeFileSync(gifPath, gifBuffer);

  // 4. Minimal valid PDF document (.pdf)
  const pdfPath = path.join(TEST_DIR, 'company_memo.pdf');
  const pdfLines = [
    '%PDF-1.4',
    '1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj',
    '2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj',
    '3 0 obj <</Type /Page /Parent 2 0 R /Resources <</Font <</F1 4 0 R>>>> /MediaBox [0 0 612 792] /Contents 5 0 R>> endobj',
    '4 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj',
    '5 0 obj <</Length 44>> stream',
    'BT',
    '/F1 24 Tf',
    '100 700 Td',
    '(Smart TV Digital Signage) Tj',
    'ET',
    'endstream',
    'endobj',
    'xref',
    '0 6',
    '0000000000 65535 f ',
    '0000000009 00000 n ',
    '0000000056 00000 n ',
    '0000000111 00000 n ',
    '0000000222 00000 n ',
    '0000000299 00000 n ',
    'trailer <</Size 6 /Root 1 0 R>>',
    'startxref',
    '392',
    '%%EOF'
  ];
  fs.writeFileSync(pdfPath, pdfLines.join('\n'));

  return { xlsxPath, txtPath, gifPath, pdfPath };
}

test('Real User Browser Flow: Upload Excel, Text, PDF, and GIF to TV', async () => {
  const { xlsxPath, txtPath, gifPath, pdfPath } = ensureTestFiles();

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

    // 1. Open TV Channel 1 and Admin Dashboard
    // First clear Channel 1 playlist so we start fresh
    await fetch(`http://127.0.0.1:${port}/api/channels/1/playlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [] })
    });

    await tvPage.goto(`http://127.0.0.1:${port}/tv/1`, { waitUntil: 'domcontentloaded' });
    await adminPage.goto(`http://127.0.0.1:${port}/admin`, { waitUntil: 'domcontentloaded' });

    // Wait for WebSocket / SSE sync
    await new Promise(r => setTimeout(r, 1500));

    // Verify Admin sees TV 1 connected online
    const badgeText = await adminPage.$eval('#status-badge-1', el => el.textContent.trim());
    console.log('Admin badge for Channel 1:', badgeText);
    assert.ok(badgeText.includes('ทีวีเชื่อมต่ออยู่'), 'Channel 1 should be online');

    // 2. Upload Excel file to Channel 1
    console.log('Testing upload of Excel spreadsheet (.xlsx)...');
    const fileInput = await adminPage.$('#file-input-1');
    await fileInput.uploadFile(xlsxPath);

    // Wait 2.5s for server conversion to 1080p slide and WS broadcast
    await new Promise(r => setTimeout(r, 2500));

    // Verify TV player displays the Excel slide
    let tvState = await tvPage.evaluate(() => {
      const activeSlot = document.querySelector('.media-slot.active');
      const img = activeSlot ? activeSlot.querySelector('img.visible') : null;
      return {
        playlistLength: window.playlist ? window.playlist.length : 0,
        items: window.playlist ? window.playlist.map(i => i.original_name) : [],
        hasActiveImage: !!img,
        imgSrc: img ? img.src : ''
      };
    });
    console.log('TV state after Excel upload:', tvState);
    assert.equal(tvState.playlistLength, 1, 'TV playlist should have exactly 1 item');
    assert.ok(tvState.items[0].includes('สินค้าขายดี'), 'Slide title should match Excel sheet');
    assert.ok(tvState.hasActiveImage, 'TV must be showing the converted 1080p Excel slide');

    // 3. Upload Text Announcement (.txt) to Channel 1
    console.log('Testing upload of Text announcement (.txt)...');
    await fileInput.uploadFile(txtPath);
    await new Promise(r => setTimeout(r, 2500));

    tvState = await tvPage.evaluate(() => {
      return {
        playlistLength: window.playlist ? window.playlist.length : 0,
        items: window.playlist ? window.playlist.map(i => i.original_name) : []
      };
    });
    console.log('TV playlist items after Text upload:', tvState.items);
    assert.ok(tvState.playlistLength >= 2, 'TV playlist should now have at least 2 items');
    assert.ok(tvState.items.some(name => name.includes('ประชุม') || name.includes('ประกาศ')), 'Playlist should contain announcement slide');

    // 4. Upload Animated GIF (.gif) to Channel 1
    console.log('Testing upload of Animated GIF (.gif)...');
    await fileInput.uploadFile(gifPath);
    await new Promise(r => setTimeout(r, 2000));

    tvState = await tvPage.evaluate(() => {
      return {
        playlistLength: window.playlist ? window.playlist.length : 0,
        items: window.playlist ? window.playlist.map(i => i.original_name) : []
      };
    });
    console.log('TV playlist items after GIF upload:', tvState.items);
    assert.ok(tvState.items.some(name => name.includes('animation.gif')), 'Playlist should contain GIF item');

    // 5. Upload PDF Document (.pdf) to Channel 1 (Client-side PDF.js rendering in browser)
    console.log('Testing upload of PDF document (.pdf)...');
    await fileInput.uploadFile(pdfPath);
    await new Promise(r => setTimeout(r, 3000));

    tvState = await tvPage.evaluate(() => {
      return {
        playlistLength: window.playlist ? window.playlist.length : 0,
        items: window.playlist ? window.playlist.map(i => i.original_name) : []
      };
    });
    console.log('TV playlist items after PDF upload:', tvState.items);
    assert.ok(tvState.items.some(name => name.includes('company_memo')), 'Playlist should contain PDF slide');

    console.log('✅ ALL FORMATS (Excel, Text, GIF, PDF) VERIFIED SUCCESSFULLY IN REAL BROWSER!');
  } finally {
    if (browser) await browser.close();
    await server.close();

    // Clean up test directory
    try {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {}
  }
});
