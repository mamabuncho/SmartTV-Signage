/**
 * Smart TV Multi-Channel LAN Digital Signage System
 * Multi-Format Media Processing & 1080p Normalization Pipeline
 * 
 * @author mamabuncho <mamabuncho@gmail.com>
 * @copyright 2026 mamabuncho. All rights reserved.
 * @license MIT
 */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import * as musicMetadata from 'music-metadata';
import * as XLSX from 'xlsx';
import * as pdfjs from 'pdfjs-dist';
import puppeteer from 'puppeteer-core';
import { MEDIA_DIR, saveMediaAsset } from './db.js';

// Restrict Sharp libvips memory cache and thread pool for low-RAM footprint
sharp.cache(false);
sharp.concurrency(1);

function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncateText(text, maxLen) {
  const str = String(text || '').trim();
  if (str.length <= maxLen) return str;
  return str.slice(0, Math.max(1, maxLen - 2)) + '...';
}

function getBrowserExecutablePath() {
  const candidates = [
    process.env.EDGE_PATH,
    process.env.CHROME_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Users\\User\\AppData\\Local\\Microsoft\\Edge\\Application\\msedge.exe'
  ].filter(Boolean);

  for (const p of candidates) {
    if (fsSync.existsSync(p)) return p;
  }
  return null;
}

function formatCellValue(val) {
  if (val === null || val === undefined || val === '') return '';
  if (typeof val === 'number') {
    if (!Number.isInteger(val)) {
      return String(Number(val.toFixed(2)));
    }
    return String(val);
  }
  const str = String(val).trim();
  if (/^-?\d+\.\d{5,}$/.test(str)) {
    const num = parseFloat(str);
    if (!isNaN(num)) return String(Number(num.toFixed(2)));
  }
  return str;
}

function isHeaderCell(val) {
  const str = String(val || '').trim();
  return (str.startsWith('[') && str.endsWith(']')) ||
         str.startsWith('Area & Page') ||
         str.startsWith('Sub Total') ||
         str.startsWith('Total Hrs') ||
         str.startsWith('Deadline Definition');
}

/**
 * Builds an HTML table with Excel-like cell merging for empty adjacent cells.
 */
function buildExcelHtmlTable(rawRows) {
  if (!rawRows || rawRows.length === 0) return '<p class="empty-sheet">ไม่มีข้อมูลในแผ่นงานนี้</p>';

  let maxCol = 0;
  rawRows.forEach(row => {
    if (!row) return;
    for (let c = row.length - 1; c >= 0; c--) {
      if (row[c] !== null && row[c] !== undefined && String(row[c]).trim() !== '') {
        if (c + 1 > maxCol) maxCol = c + 1;
        break;
      }
    }
  });

  const rows = rawRows.map(r => {
    const row = [];
    for (let i = 0; i < maxCol; i++) {
      row.push(r && r[i] !== undefined ? r[i] : '');
    }
    return row;
  });

  let html = '<table class="excel-grid">\n';

  for (let rIdx = 0; rIdx < rows.length; rIdx++) {
    const row = rows[rIdx];
    const isRowEmpty = row.every(c => c === '' || c === null || c === undefined);
    if (isRowEmpty) {
      html += '  <tr class="row-spacer"><td colspan="' + maxCol + '">&nbsp;</td></tr>\n';
      continue;
    }

    html += '  <tr>\n';
    let cIdx = 0;
    while (cIdx < maxCol) {
      const val = row[cIdx];
      const formatted = formatCellValue(val);

      if (formatted === '') {
        html += '    <td class="cell-empty"></td>\n';
        cIdx++;
        continue;
      }

      let colspan = 1;
      while (cIdx + colspan < maxCol && (row[cIdx + colspan] === '' || row[cIdx + colspan] === null || row[cIdx + colspan] === undefined)) {
        colspan++;
      }

      let effectiveColspan = colspan;
      if (formatted.length < 15 && !isHeaderCell(formatted) && colspan > 2) {
        effectiveColspan = 1;
      }

      const isHeader = isHeaderCell(formatted);
      const isNumber = !isNaN(Number(formatted)) && formatted !== '';
      const cellClass = isHeader ? 'cell-section-header' : (isNumber ? 'cell-number' : 'cell-text');
      const colspanAttr = effectiveColspan > 1 ? ` colspan="${effectiveColspan}"` : '';

      html += `    <td class="${cellClass}"${colspanAttr}>${escapeXml(formatted)}</td>\n`;
      cIdx += effectiveColspan;
    }
    html += '  </tr>\n';
  }

  html += '</table>\n';
  return html;
}

/**
 * Renders an Excel workbook buffer (.xlsx, .xls, .csv) into an array of 1080p JPEG slide Buffers.
 * Preserves the exact multi-table layout, section headers, numbers, and aligns cleanly for TV viewing.
 */
export async function renderExcelToSlides(buffer, originalFilename) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetNames = wb.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('Spreadsheet has no readable sheets');
  }

  const baseTitle = path.basename(originalFilename, path.extname(originalFilename));
  const browserPath = getBrowserExecutablePath();
  const slides = [];

  // If a browser engine is found, use headless Chromium for pixel-perfect Excel rendering
  if (browserPath) {
    let browser;
    try {
      browser = await puppeteer.launch({
        executablePath: browserPath,
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

      for (const sheetName of sheetNames) {
        const ws = wb.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (!rawRows || rawRows.length === 0) continue;

        let startIdx = 0;
        while (startIdx < rawRows.length && (!rawRows[startIdx] || rawRows[startIdx].every(c => !c))) {
          startIdx++;
        }
        const cleanRows = rawRows.slice(startIdx);
        if (cleanRows.length === 0) continue;

        const rowsPerSlide = 22;
        const totalPages = Math.max(1, Math.ceil(cleanRows.length / rowsPerSlide));

        for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
          const sliceRows = cleanRows.slice(pageIdx * rowsPerSlide, (pageIdx + 1) * rowsPerSlide);
          const tableHtml = buildExcelHtmlTable(sliceRows);
          const pageNum = pageIdx + 1;
          const pageTitle = totalPages > 1
            ? `${baseTitle} (${sheetName}) - หน้า ${pageNum}/${totalPages}`
            : `${baseTitle} (${sheetName})`;

          const fullHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body {
                width: 1920px;
                height: 1080px;
                background: #0b1120;
                color: #e2e8f0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Sarabun', 'Kanit', Roboto, Helvetica, Arial, sans-serif;
                padding: 30px 44px;
                display: flex;
                flex-direction: column;
                overflow: hidden;
              }
              .excel-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: linear-gradient(90deg, #1e293b 0%, #0f172a 100%);
                border: 1px solid #334155;
                border-left: 6px solid #10b981;
                border-radius: 10px;
                padding: 12px 24px;
                margin-bottom: 18px;
                flex-shrink: 0;
              }
              .excel-title-group {
                display: flex;
                align-items: center;
                gap: 14px;
              }
              .excel-icon {
                font-size: 26px;
              }
              .excel-title {
                font-size: 24px;
                font-weight: 700;
                color: #f8fafc;
                letter-spacing: -0.3px;
              }
              .excel-sheet-name {
                font-size: 18px;
                color: #94a3b8;
                font-weight: 400;
              }
              .excel-page-badge {
                background: #10b981;
                color: #ffffff;
                font-size: 15px;
                font-weight: 700;
                padding: 6px 16px;
                border-radius: 9999px;
              }
              .excel-canvas {
                flex: 1;
                background: #131d31;
                border: 1px solid #334155;
                border-radius: 12px;
                padding: 16px 22px;
                overflow: hidden;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                display: flex;
                flex-direction: column;
              }
              table.excel-grid {
                width: 100%;
                border-collapse: collapse;
                table-layout: auto;
                font-size: 15.5px;
                line-height: 1.35;
              }
              tr {
                height: 34px;
              }
              tr.row-spacer {
                height: 14px;
              }
              tr.row-spacer td {
                border: none;
              }
              td {
                border: 1px solid rgba(71, 85, 105, 0.4);
                padding: 4px 10px;
                vertical-align: middle;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              td.cell-empty {
                border: 1px solid rgba(71, 85, 105, 0.15);
                background: transparent;
              }
              td.cell-text {
                color: #f1f5f9;
                font-weight: 400;
              }
              td.cell-number {
                color: #38bdf8;
                font-weight: 600;
                text-align: right;
                font-variant-numeric: tabular-nums;
              }
              td.cell-section-header {
                background: #1e3a5f;
                color: #38bdf8;
                font-weight: 700;
                font-size: 16px;
                border: 1px solid #0284c7;
                border-radius: 4px;
                padding: 6px 12px;
              }
              tr:nth-child(even):not(.row-spacer) td:not(.cell-section-header):not(.cell-empty) {
                background: rgba(255, 255, 255, 0.025);
              }
              .excel-footer {
                margin-top: 12px;
                display: flex;
                justify-content: space-between;
                font-size: 13px;
                color: #64748b;
                padding: 0 6px;
                flex-shrink: 0;
              }
            </style>
          </head>
          <body>
            <div class="excel-header">
              <div class="excel-title-group">
                <span class="excel-icon">📗</span>
                <span class="excel-title">${escapeXml(baseTitle)}</span>
                <span class="excel-sheet-name">(${escapeXml(sheetName)})</span>
              </div>
              <div class="excel-page-badge">หน้า ${pageNum} จาก ${totalPages}</div>
            </div>
            <div class="excel-canvas">
              ${tableHtml}
            </div>
            <div class="excel-footer">
              <span>Smart TV Multi-Channel Signage • โหมดแสดงผลสเปรดชีต Excel อัตโนมัติ</span>
              <span>แสดงข้อมูลแถวที่ ${pageIdx * rowsPerSlide + 1} - ${Math.min((pageIdx + 1) * rowsPerSlide, cleanRows.length)} จากทั้งหมด ${cleanRows.length} แถว</span>
            </div>
          </body>
          </html>
          `;

          await page.setContent(fullHtml, { waitUntil: 'domcontentloaded' });
          const jpegBuffer = await page.screenshot({ type: 'jpeg', quality: 92 });
          slides.push({
            buffer: jpegBuffer,
            original_name: pageTitle,
            duration: 12.0
          });
        }
      }

      await browser.close();
      if (slides.length > 0) return slides;
    } catch (err) {
      console.warn('Headless browser Excel render error, falling back to SVG renderer:', err.message);
      if (browser) await browser.close().catch(() => {});
    }
  }

  // Fallback: Pure Sharp SVG Renderer if browser executable is unavailable
  for (const sheetName of sheetNames) {
    const ws = wb.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (!rawRows || rawRows.length === 0) continue;

    const headers = (rawRows[0] || []).map(h => String(h || '').trim());
    const dataRows = rawRows.slice(1).filter(r => r && r.length > 0 && r.some(c => c !== null && c !== undefined && c !== ''));

    const colCount = Math.max(1, headers.length);
    const colWidth = Math.floor((1920 - 160) / colCount);
    const maxCharsPerCol = Math.max(8, Math.floor(colWidth / 14));

    const rowsPerPage = 12;
    const totalPages = Math.max(1, Math.ceil(dataRows.length / rowsPerPage));

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      const pageRows = dataRows.slice(pageIdx * rowsPerPage, (pageIdx + 1) * rowsPerPage);
      const pageNum = pageIdx + 1;
      const pageTitle = totalPages > 1
        ? `${baseTitle} (${sheetName}) - หน้า ${pageNum}/${totalPages}`
        : `${baseTitle} (${sheetName})`;

      let headerCellsSvg = '';
      headers.forEach((h, i) => {
        const x = 80 + i * colWidth;
        const cellText = truncateText(h, maxCharsPerCol);
        headerCellsSvg += `
          <rect x="${x}" y="165" width="${colWidth - 8}" height="60" fill="#2563eb" rx="8"/>
          <text x="${x + 16}" y="204" font-family="'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="bold" fill="#ffffff">${escapeXml(cellText)}</text>
        `;
      });

      let rowCellsSvg = '';
      pageRows.forEach((row, rIdx) => {
        const y = 240 + rIdx * 62;
        const bg = rIdx % 2 === 0 ? '#1e293b' : '#0f172a';
        rowCellsSvg += `<rect x="80" y="${y}" width="${1920 - 160}" height="56" fill="${bg}" rx="8"/>`;
        headers.forEach((_, cIdx) => {
          const cellVal = row[cIdx] !== undefined ? String(row[cIdx]) : '';
          const cellText = truncateText(cellVal, maxCharsPerCol);
          const x = 80 + cIdx * colWidth;
          rowCellsSvg += `
            <text x="${x + 16}" y="${y + 36}" font-family="'Segoe UI', Roboto, sans-serif" font-size="20" fill="#e2e8f0">${escapeXml(cellText)}</text>
          `;
        });
      });

      const svg = `
      <svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0f172a"/>
            <stop offset="100%" stop-color="#020617"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)"/>
        <rect x="80" y="50" width="${1920 - 160}" height="90" fill="#1e293b" rx="12" stroke="#334155" stroke-width="2"/>
        <text x="120" y="108" font-family="'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="bold" fill="#f8fafc">📊 ${escapeXml(pageTitle)}</text>
        ${headerCellsSvg}
        ${rowCellsSvg}
        <text x="80" y="1030" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" fill="#64748b">Digital Signage Display &#8226; ${escapeXml(sheetName)} (${pageNum}/${totalPages})</text>
      </svg>
      `;

      const jpegBuffer = await sharp(Buffer.from(svg)).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
      slides.push({
        buffer: jpegBuffer,
        original_name: pageTitle,
        duration: 12.0
      });
    }
  }

  if (slides.length === 0) {
    throw new Error('Spreadsheet contained no readable data');
  }

  return slides;
}

/**
 * Renders plain text / markdown announcements into 1080p JPEG slide Buffers.
 */
export async function renderTextToSlides(textString, originalFilename) {
  const lines = textString.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const baseTitle = lines[0] || path.basename(originalFilename, path.extname(originalFilename));
  const bodyLines = lines.slice(1);

  const linesPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(bodyLines.length / linesPerPage));
  const slides = [];

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const pageBody = bodyLines.slice(pageIdx * linesPerPage, (pageIdx + 1) * linesPerPage);
    const pageNum = pageIdx + 1;
    const pageTitle = totalPages > 1 ? `${baseTitle} (หน้า ${pageNum}/${totalPages})` : baseTitle;

    let bodySvg = '';
    if (pageBody.length === 0) {
      bodySvg = `<text x="140" y="360" font-family="'Segoe UI', Roboto, sans-serif" font-size="30" fill="#cbd5e1">${escapeXml(baseTitle)}</text>`;
    } else {
      pageBody.forEach((line, idx) => {
        const y = 340 + idx * 56;
        bodySvg += `
          <circle cx="140" cy="${y - 8}" r="6" fill="#3b82f6"/>
          <text x="170" y="${y}" font-family="'Segoe UI', Roboto, sans-serif" font-size="28" fill="#e2e8f0">${escapeXml(line)}</text>
        `;
      });
    }

    const svg = `
    <svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#020617"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>

      <!-- Card Container -->
      <rect x="80" y="80" width="${1920 - 160}" height="${1080 - 160}" fill="#1e293b" rx="20" stroke="#3b82f6" stroke-width="3"/>

      <!-- Announcement Badge -->
      <rect x="130" y="130" width="220" height="46" fill="#2563eb" rx="23"/>
      <text x="160" y="162" font-family="'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="bold" fill="#ffffff">📢 ประกาศสำคัญ</text>

      <!-- Title Header -->
      <text x="130" y="240" font-family="'Segoe UI', Roboto, sans-serif" font-size="40" font-weight="bold" fill="#f8fafc">${escapeXml(pageTitle)}</text>
      <line x1="130" y1="270" x2="${1920 - 130}" y2="270" stroke="#334155" stroke-width="2"/>

      <!-- Content Items -->
      ${bodySvg}

      <!-- Footer -->
      <text x="130" y="940" font-family="'Segoe UI', Roboto, sans-serif" font-size="20" fill="#94a3b8">Smart TV Signage Announcement Board &#8226; อัปเดตข้อมูลอัตโนมัติ</text>
    </svg>
    `;

    const jpegBuffer = await sharp(Buffer.from(svg)).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    slides.push({
      buffer: jpegBuffer,
      original_name: pageTitle,
      duration: 10.0
    });
  }

  return slides;
}

/**
 * Server-side fallback for PDF documents: extracts text from pages and renders document slides.
 */
export async function renderPdfToSlides(buffer, originalFilename) {
  const baseTitle = path.basename(originalFilename, path.extname(originalFilename));
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  if (numPages === 0) {
    throw new Error('PDF document has no pages');
  }

  const slides = [];
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    const pageTitle = `${baseTitle} (หน้า ${pageNum}/${numPages})`;

    const rendered = await renderTextToSlides(
      pageText.trim() ? `${pageTitle}\n${pageText}` : pageTitle,
      originalFilename
    );
    slides.push(...rendered);
  }

  return slides;
}

export async function processUploadedFile(fileStream, filename, mimeType) {
  const ext = path.extname(filename).toLowerCase();

  // 1. Video files (Streamed directly to disk)
  if (mimeType === 'video/mp4' || ext === '.mp4') {
    const tempFilename = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mp4`;
    const tempPath = path.resolve(MEDIA_DIR, tempFilename);
    const hash = crypto.createHash('sha256');
    const writeStream = fsSync.createWriteStream(tempPath);

    let byteSize = 0;
    for await (const chunk of fileStream) {
      hash.update(chunk);
      writeStream.write(chunk);
      byteSize += chunk.length;
    }
    await new Promise((resolve, reject) => {
      writeStream.end(err => (err ? reject(err) : resolve()));
    });

    const hash16 = hash.digest('hex').slice(0, 16);
    const finalFilename = `${hash16}.mp4`;
    const targetPath = path.resolve(MEDIA_DIR, finalFilename);

    if (fsSync.existsSync(targetPath)) {
      await fs.unlink(tempPath).catch(() => {});
    } else {
      await fs.rename(tempPath, targetPath);
    }

    let duration = 15.0;
    try {
      const meta = await musicMetadata.parseFile(targetPath);
      if (meta.format && meta.format.duration) {
        duration = Number(meta.format.duration.toFixed(1));
      }
    } catch (err) {
      console.warn('Failed to parse video metadata with music-metadata, using default 15s:', err.message);
    }

    const asset = {
      id: hash16,
      filename: finalFilename,
      original_name: filename,
      mime_type: 'video/mp4',
      byte_size: byteSize,
      width: 1920,
      height: 1080,
      duration
    };

    await saveMediaAsset(asset);
    return asset;
  }

  // Buffer other files
  const chunks = [];
  for await (const chunk of fileStream) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  // 2. Spreadsheet files (.xlsx, .xls, .csv)
  const isExcel = ext === '.xlsx' || ext === '.xls' || ext === '.csv' ||
    mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv';

  if (isExcel) {
    const slides = await renderExcelToSlides(buffer, filename);
    const savedAssets = [];

    for (const slide of slides) {
      const hash16 = crypto.createHash('sha256').update(slide.buffer).digest('hex').slice(0, 16);
      const slideFilename = `${hash16}.jpg`;
      const targetPath = path.resolve(MEDIA_DIR, slideFilename);

      if (!fsSync.existsSync(targetPath)) {
        await fs.writeFile(targetPath, slide.buffer);
      }

      const asset = {
        id: hash16,
        filename: slideFilename,
        original_name: slide.original_name,
        mime_type: 'image/jpeg',
        byte_size: slide.buffer.length,
        width: 1920,
        height: 1080,
        duration: slide.duration || 12.0
      };

      await saveMediaAsset(asset);
      savedAssets.push(asset);
    }

    return savedAssets;
  }

  // 3. Text / Markdown announcement files (.txt, .md, .log)
  const isText = ext === '.txt' || ext === '.md' || ext === '.log' || ext === '.text' || mimeType.startsWith('text/plain');
  if (isText) {
    const textContent = buffer.toString('utf-8');
    const slides = await renderTextToSlides(textContent, filename);
    const savedAssets = [];

    for (const slide of slides) {
      const hash16 = crypto.createHash('sha256').update(slide.buffer).digest('hex').slice(0, 16);
      const slideFilename = `${hash16}.jpg`;
      const targetPath = path.resolve(MEDIA_DIR, slideFilename);

      if (!fsSync.existsSync(targetPath)) {
        await fs.writeFile(targetPath, slide.buffer);
      }

      const asset = {
        id: hash16,
        filename: slideFilename,
        original_name: slide.original_name,
        mime_type: 'image/jpeg',
        byte_size: slide.buffer.length,
        width: 1920,
        height: 1080,
        duration: slide.duration || 10.0
      };

      await saveMediaAsset(asset);
      savedAssets.push(asset);
    }

    return savedAssets;
  }

  // 4. PDF Documents (Server-side text fallback if uploaded directly to API)
  if (ext === '.pdf' || mimeType === 'application/pdf') {
    const slides = await renderPdfToSlides(buffer, filename);
    const savedAssets = [];

    for (const slide of slides) {
      const hash16 = crypto.createHash('sha256').update(slide.buffer).digest('hex').slice(0, 16);
      const slideFilename = `${hash16}.jpg`;
      const targetPath = path.resolve(MEDIA_DIR, slideFilename);

      if (!fsSync.existsSync(targetPath)) {
        await fs.writeFile(targetPath, slide.buffer);
      }

      const asset = {
        id: hash16,
        filename: slideFilename,
        original_name: slide.original_name,
        mime_type: 'image/jpeg',
        byte_size: slide.buffer.length,
        width: 1920,
        height: 1080,
        duration: slide.duration || 10.0
      };

      await saveMediaAsset(asset);
      savedAssets.push(asset);
    }

    return savedAssets;
  }

  // 5. Animated GIF files (Preserve animation frames natively for TV playback)
  if (ext === '.gif' || mimeType === 'image/gif') {
    const hash16 = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
    const finalFilename = `${hash16}.gif`;
    const targetPath = path.resolve(MEDIA_DIR, finalFilename);

    if (!fsSync.existsSync(targetPath)) {
      await fs.writeFile(targetPath, buffer);
    }

    let width = 1920;
    let height = 1080;
    try {
      const meta = await sharp(buffer).metadata();
      width = meta.width || 1920;
      height = meta.height || 1080;
    } catch {}

    const asset = {
      id: hash16,
      filename: finalFilename,
      original_name: filename,
      mime_type: 'image/gif',
      byte_size: buffer.length,
      width,
      height,
      duration: 10.0
    };

    await saveMediaAsset(asset);
    return asset;
  }

  // 6. Standard Image files (.jpg, .jpeg, .png, .webp, .svg, .bmp, .tiff)
  const isImage = ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp' ||
    ext === '.svg' || ext === '.bmp' || ext === '.tif' || ext === '.tiff' || mimeType.startsWith('image/');

  if (isImage) {
    const hash16 = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
    let processedBuffer;
    let finalExt = '.jpg';
    let finalMime = 'image/jpeg';

    const imgPipeline = sharp(buffer)
      .rotate()
      .resize({
        width: 1920,
        height: 1080,
        fit: 'inside',
        withoutEnlargement: true
      });

    if (ext === '.png' || mimeType === 'image/png') {
      processedBuffer = await imgPipeline.png({ quality: 85, compressionLevel: 8 }).toBuffer();
      finalExt = '.png';
      finalMime = 'image/png';
    } else {
      processedBuffer = await imgPipeline.jpeg({ quality: 85, mozjpeg: true, progressive: true }).toBuffer();
      finalExt = '.jpg';
      finalMime = 'image/jpeg';
    }

    const metadata = await sharp(processedBuffer).metadata();
    const finalFilename = `${hash16}${finalExt}`;
    const targetPath = path.resolve(MEDIA_DIR, finalFilename);

    if (!fsSync.existsSync(targetPath)) {
      await fs.writeFile(targetPath, processedBuffer);
    }

    const asset = {
      id: hash16,
      filename: finalFilename,
      original_name: filename,
      mime_type: finalMime,
      byte_size: processedBuffer.length,
      width: metadata.width || 1920,
      height: metadata.height || 1080,
      duration: 10.0
    };

    await saveMediaAsset(asset);
    return asset;
  }

  throw new Error(`Unsupported media format: ${ext || mimeType}. Supported: JPEG, PNG, WebP, GIF, SVG, TIFF, BMP, MP4, PDF, Excel (.xlsx/.xls/.csv), and Text (.txt).`);
}
