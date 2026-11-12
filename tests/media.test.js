import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Readable } from 'node:stream';
import sharp from 'sharp';
import * as XLSX from 'xlsx';
import { processUploadedFile } from '../src/media.js';

test('processUploadedFile normalizes oversized image to 1080p bounding box', async () => {
  const rawImage = await sharp({
    create: {
      width: 2400,
      height: 1600,
      channels: 3,
      background: { r: 50, g: 100, b: 200 }
    }
  }).jpeg().toBuffer();

  const stream = Readable.from([rawImage]);
  const asset = await processUploadedFile(stream, 'large_promo.jpg', 'image/jpeg');

  assert.ok(asset.id, 'Asset ID should exist');
  assert.equal(asset.mime_type, 'image/jpeg');
  assert.ok(asset.width <= 1920, `Width ${asset.width} should be <= 1920`);
  assert.ok(asset.height <= 1080, `Height ${asset.height} should be <= 1080`);
  assert.equal(asset.filename, `${asset.id}.jpg`);
});

test('processUploadedFile converts Excel spreadsheets into paginated 1080p slides', async () => {
  // Build a test workbook with 30 rows (should paginate into 2 slides of 22 rows per slide)
  const wb = XLSX.utils.book_new();
  const rows = [['รหัส', 'ชื่อรายการ', 'จำนวน', 'สถานะ']];
  for (let i = 1; i <= 30; i++) {
    rows.push([`ITEM-${i}`, `สินค้า ${i}`, `${i * 10}`, 'พร้อมส่ง']);
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'คลังสินค้า');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const stream = Readable.from([buffer]);
  const assets = await processUploadedFile(stream, 'สต็อกสินค้า.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

  assert.ok(Array.isArray(assets), 'Multi-row Excel should return array of slide assets');
  assert.equal(assets.length, 2, '30 rows should paginate into 2 slides (22 per page)');
  assert.ok(assets[0].original_name.includes('หน้า 1/2'));
  assert.ok(assets[1].original_name.includes('หน้า 2/2'));
  assert.equal(assets[0].width, 1920);
  assert.equal(assets[0].height, 1080);
});

test('processUploadedFile converts Text announcement into 1080p slide', async () => {
  const text = `ประกาศแจ้งปิดปรับปรุงระบบชั่วคราว
ขอแจ้งให้ทุกฝ่ายทราบว่าจะมีการซ่อมบำรุงเครือข่าย
ในวันเสาร์ที่ 15 พฤศจิกายน เวลา 22:00 - 02:00 น.
โปรดบันทึกงานของท่านก่อนช่วงเวลาดังกล่าว`;

  const stream = Readable.from([Buffer.from(text, 'utf-8')]);
  const assets = await processUploadedFile(stream, 'ประกาศไอที.txt', 'text/plain');

  assert.ok(Array.isArray(assets));
  assert.equal(assets.length, 1);
  assert.equal(assets[0].width, 1920);
  assert.equal(assets[0].height, 1080);
  assert.equal(assets[0].mime_type, 'image/jpeg');
});

test('processUploadedFile preserves animated GIF format', async () => {
  // 1x1 transparent GIF buffer
  const gifBuffer = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  const stream = Readable.from([gifBuffer]);
  const asset = await processUploadedFile(stream, 'animation.gif', 'image/gif');

  assert.equal(asset.mime_type, 'image/gif');
  assert.ok(asset.filename.endsWith('.gif'));
});

test('processUploadedFile converts real-world complex project schedule CSV into faithful slides', async () => {
  const csvBuffer = fs.readFileSync('tests/fixtures/user_sample.csv');
  const stream = Readable.from([csvBuffer]);
  const assets = await processUploadedFile(stream, 'user_schedule.csv', 'text/csv');

  assert.ok(Array.isArray(assets));
  assert.ok(assets.length >= 5, 'Complex schedule should generate multiple paginated slides');
  assert.equal(assets[0].width, 1920);
  assert.equal(assets[0].height, 1080);
  assert.ok(assets[0].original_name.includes('หน้า 1/'));
});

test('processUploadedFile rejects unsupported file types', async () => {
  const stream = Readable.from([Buffer.from('binary-exe-header')]);
  await assert.rejects(
    async () => {
      await processUploadedFile(stream, 'danger.exe', 'application/x-msdownload');
    },
    /Unsupported media format/
  );
});
