/**
 * Smart TV Multi-Channel LAN Digital Signage System
 * Admin Dashboard Controller (macOS Sonoma / Sequoia Fluid Edition)
 * Features: Live Screen Share, Bulk Duration, Direct Jump, Freeze Lock, Channel Renaming, 3-Language i18n
 * 
 * @author mamabuncho <mamabuncho@gmail.com>
 * @copyright 2026 mamabuncho. All rights reserved.
 */

import * as pdfjsLib from '/vendor/pdfjs/pdf.min.mjs';
import { initLanguage, setLanguage, getLanguage, t } from './i18n.js';
pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.mjs';

let channelsList = [];
const playlistsState = {}; // channelId -> Array of playlist item objects
let dragSourceIndex = null;
let dragSourceChannelId = null;
let pollIntervalTimer = null;
let currentChannelFilter = 'all';

// Live Screen Share States
let liveStream = null;
let liveWs = null;
let liveCanvas = null;
let liveVideo = null;
let liveIntervalId = null;
let currentLiveTarget = 'all';
let adminPeerConn = null;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', () => {
  // Prevent browser from navigating away if files dropped outside dropzone
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => e.preventDefault());

  initLanguage();
  initLanguageControls();
  initAboutModal();
  applyLanguageToPage();

  initDashboard();

  document.getElementById('refresh-all-btn').addEventListener('click', async () => {
    await loadChannels();
    showToast(t('toastRefresh'));
  });

  // Master Live Screen Share Buttons
  const masterLiveBtn = document.getElementById('master-live-btn');
  if (masterLiveBtn) {
    masterLiveBtn.addEventListener('click', () => openLiveModal('all'));
  }

  const stopLiveBtn = document.getElementById('stop-live-btn');
  if (stopLiveBtn) {
    stopLiveBtn.addEventListener('click', () => stopLiveScreenShare());
  }

  const liveModalClose = document.getElementById('live-modal-close');
  if (liveModalClose) {
    liveModalClose.addEventListener('click', () => closeLiveModal());
  }

  const modalTrafficClose = document.getElementById('modal-traffic-close');
  if (modalTrafficClose) {
    modalTrafficClose.addEventListener('click', () => closeLiveModal());
  }

  const cancelLiveModalBtn = document.getElementById('cancel-live-modal-btn');
  if (cancelLiveModalBtn) {
    cancelLiveModalBtn.addEventListener('click', () => closeLiveModal());
  }

  // Initialize macOS Channel Segmented Control
  initChannelSegmentControl();

  const startLiveConfirmBtn = document.getElementById('start-live-confirm-btn');
  if (startLiveConfirmBtn) {
    startLiveConfirmBtn.addEventListener('click', () => {
      const select = document.getElementById('live-target-select');
      const qualitySelect = document.getElementById('live-quality-select');
      const target = select ? select.value : 'all';
      const quality = qualitySelect ? qualitySelect.value : '1080p';
      startLiveScreenShare(target, quality);
    });
  }

  // Adaptive polling: 2s when active, 5s when backgrounded
  startAdaptivePolling();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      pollChannelStatus();
    }
    startAdaptivePolling();
  });
});

function startAdaptivePolling() {
  clearInterval(pollIntervalTimer);
  const intervalMs = document.hidden ? 5000 : 2000;
  pollIntervalTimer = setInterval(pollChannelStatus, intervalMs);
}

async function initDashboard() {
  await loadChannels();
}

async function loadChannels() {
  const container = document.getElementById('channels-container');
  try {
    const res = await fetch('/api/channels');
    channelsList = await res.json();

    // Fetch details and playlist items for each channel
    for (const ch of channelsList) {
      const detailRes = await fetch(`/api/channels/${ch.id}`);
      const details = await detailRes.json();
      playlistsState[ch.id] = details.items || [];
      ch.online = details.online;
      ch.client_count = details.client_count;
      ch.frozen = details.frozen;
      ch.is_live = details.is_live;
    }

    renderAllChannels();
    await pollChannelStatus();
  } catch (err) {
    container.innerHTML = `<div class="error-msg">เกิดข้อผิดพลาดในการโหลดข้อมูล: ${err.message}</div>`;
  }
}

async function pollChannelStatus() {
  try {
    const [chRes, healthRes] = await Promise.allSettled([
      fetch('/api/channels'),
      fetch('/api/system/health')
    ]);

    if (chRes.status === 'fulfilled' && chRes.value.ok) {
      const fresh = await chRes.value.json();
      fresh.forEach(freshCh => {
        const existing = channelsList.find(c => c.id === freshCh.id);
        if (existing) {
          existing.online = freshCh.online;
          existing.client_count = freshCh.client_count;
          existing.frozen = freshCh.frozen;
          existing.is_live = freshCh.is_live;
        }
        updateStatusBadge(freshCh.id, freshCh.online, freshCh.client_count);
      });
    }

    if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
      const health = await healthRes.value.json();
      const serverStatusEl = document.getElementById('server-status');
      if (serverStatusEl) {
        serverStatusEl.className = 'status-badge connected';
        serverStatusEl.textContent = `● เซิร์ฟเวอร์ทำงานปกติ (RAM: ${health.memory.rss_mb} MB)`;
      }
    }
  } catch (e) {
    console.warn('Status poll warning:', e);
  }
}

function updateStatusBadge(channelId, isOnline, clientCount = 0) {
  const badge = document.getElementById(`status-badge-${channelId}`);
  if (badge) {
    if (isOnline) {
      badge.className = 'status-badge connected';
      badge.textContent = `${t('tvOnline')} (${clientCount} ${t('screensUnit')})`;
    } else {
      badge.className = 'status-badge offline';
      badge.textContent = t('tvOffline');
    }
  }
}

function initLanguageControls() {
  const container = document.getElementById('lang-selector');
  if (!container) return;
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.lang-btn');
    if (!btn) return;
    const selected = btn.getAttribute('data-lang');
    if (selected) {
      setLanguage(selected);
      applyLanguageToPage();
      renderAllChannels();
      pollChannelStatus();
      showToast(t('toastRefresh'));
    }
  });
}

function initAboutModal() {
  const aboutBtn = document.getElementById('about-btn');
  const modal = document.getElementById('about-modal');
  const closeBtn = document.getElementById('about-modal-close');
  const trafficClose = document.getElementById('about-traffic-close');
  const doneBtn = document.getElementById('about-modal-done-btn');

  const openAbout = () => modal && modal.classList.remove('hidden');
  const closeAbout = () => modal && modal.classList.add('hidden');

  if (aboutBtn) aboutBtn.addEventListener('click', openAbout);
  if (closeBtn) closeBtn.addEventListener('click', closeAbout);
  if (trafficClose) trafficClose.addEventListener('click', closeAbout);
  if (doneBtn) doneBtn.addEventListener('click', closeAbout);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeAbout();
    });
  }
}

function applyLanguageToPage() {
  const lang = getLanguage();
  document.documentElement.lang = lang;

  // Header
  const h1 = document.querySelector('.logo-area h1');
  if (h1) h1.textContent = t('appTitle');
  const sub = document.querySelector('.logo-area .subtitle');
  if (sub) sub.textContent = t('appSubtitle');

  const masterLiveBtn = document.getElementById('master-live-btn');
  if (masterLiveBtn) masterLiveBtn.textContent = t('liveBtn');

  const refreshBtn = document.getElementById('refresh-all-btn');
  if (refreshBtn) refreshBtn.textContent = t('refreshBtn');

  const aboutBtn = document.getElementById('about-btn');
  if (aboutBtn) aboutBtn.textContent = t('aboutBtn');

  const stopLiveBtn = document.getElementById('stop-live-btn');
  if (stopLiveBtn) stopLiveBtn.textContent = t('stopLiveBtn');

  // Instructions
  const steps = document.querySelectorAll('.instruction-step div');
  if (steps.length >= 3) {
    steps[0].innerHTML = t('instStep1');
    steps[1].innerHTML = t('instStep2');
    steps[2].innerHTML = t('instStep3');
  }

  // Segmented channel tabs
  const tabAll = document.querySelector('.segment-btn[data-channel="all"]');
  if (tabAll) tabAll.textContent = t('tabAll');
  for (let i = 1; i <= 6; i++) {
    const tabCh = document.querySelector(`.segment-btn[data-channel="${i}"]`);
    if (tabCh) tabCh.textContent = `${t('tabChannelPrefix')}${i}`;
  }

  const hint = document.querySelector('.view-mode-hint span');
  if (hint) hint.textContent = t('tagline');

  // Live Modal
  const modalH3 = document.querySelector('#live-modal .modal-header h3');
  if (modalH3) modalH3.textContent = t('modalTitle');
  const modalInst = document.querySelector('#live-modal .modal-instruction');
  if (modalInst) modalInst.textContent = t('modalInstruction');
  const modalTargetLbl = document.querySelector('label[for="live-target-select"] strong');
  if (modalTargetLbl) modalTargetLbl.textContent = t('modalTargetLabel');
  const optAll = document.querySelector('#live-target-select option[value="all"]');
  if (optAll) optAll.textContent = t('modalTargetAll');
  for (let i = 1; i <= 6; i++) {
    const optCh = document.querySelector(`#live-target-select option[value="${i}"]`);
    if (optCh) optCh.textContent = `${t('tabChannelPrefix')}${i}`;
  }
  const modalQualLbl = document.querySelector('label[for="live-quality-select"] strong');
  if (modalQualLbl) modalQualLbl.textContent = t('modalQualityLabel');
  const opt1080 = document.querySelector('#live-quality-select option[value="1080p"]');
  if (opt1080) opt1080.textContent = t('modalQuality1080');
  const opt720 = document.querySelector('#live-quality-select option[value="720p"]');
  if (opt720) opt720.textContent = t('modalQuality720');
  const modalTip = document.querySelector('.live-modal-tip');
  if (modalTip) modalTip.innerHTML = t('modalTip');
  const cancelLiveBtn = document.getElementById('cancel-live-modal-btn');
  if (cancelLiveBtn) cancelLiveBtn.textContent = t('modalCancel');
  const startLiveBtn = document.getElementById('start-live-confirm-btn');
  if (startLiveBtn) startLiveBtn.textContent = t('modalStart');

  // About Modal
  const aboutTitle = document.getElementById('about-modal-title');
  if (aboutTitle) aboutTitle.textContent = t('aboutTitle');
  const aboutAppName = document.getElementById('about-app-name');
  if (aboutAppName) aboutAppName.textContent = t('aboutAppName');
  const aboutVersion = document.getElementById('about-version');
  if (aboutVersion) aboutVersion.textContent = t('aboutVersion');
  const aboutDesc = document.getElementById('about-desc');
  if (aboutDesc) aboutDesc.textContent = t('aboutDescription');
  const aboutLegal = document.getElementById('about-legal');
  if (aboutLegal) aboutLegal.textContent = t('aboutCopyright');
  const aboutDoneBtn = document.getElementById('about-modal-done-btn');
  if (aboutDoneBtn) aboutDoneBtn.textContent = t('aboutClose');

  // Footer
  const footerText = document.getElementById('app-footer-text');
  if (footerText) footerText.innerHTML = t('footerText');

  // Update active state in language selector
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-lang') === lang);
  });
}

function renderAllChannels() {
  const container = document.getElementById('channels-container');
  container.innerHTML = '';

  for (const ch of channelsList) {
    const card = document.createElement('div');
    card.className = 'channel-card';
    card.id = `channel-card-${ch.id}`;

    const isOnline = ch.online;
    const isFrozen = Boolean(ch.frozen);

    card.innerHTML = `
      <div class="channel-header">
        <div class="channel-header-row1">
          <div class="channel-title-row">
            <h2>${t('channelLabel')} ${ch.id}:</h2>
            <input type="text" id="channel-name-input-${ch.id}" class="channel-name-input"
              value="${escapeHtml(ch.name || `Channel ${ch.id}`)}"
              placeholder="${t('renamePlaceholder')}"
              title="${t('renameHint')}"
              onblur="saveChannelName(${ch.id})"
              onkeydown="if(event.key==='Enter') this.blur();">
            <button class="btn-rename-icon" onclick="document.getElementById('channel-name-input-${ch.id}').focus()" title="${t('renameIconTitle')}">✏️</button>
          </div>
          <div class="channel-links">
            <a href="/tv/${ch.id}" target="_blank" title="${t('openTvTitle')}">${t('openTvLink')}</a>
          </div>
        </div>
        <div class="channel-header-row2">
          <span id="status-badge-${ch.id}" class="status-badge ${isOnline ? 'connected' : 'offline'}">
            ${isOnline ? `${t('tvOnline')} (${ch.client_count || 1} ${t('screensUnit')})` : t('tvOffline')}
          </span>
          <div class="channel-header-controls">
            <button class="btn btn-xs ${isFrozen ? 'btn-frozen' : 'btn-freeze'}" id="freeze-btn-${ch.id}" onclick="toggleFreeze(${ch.id})">
              ${isFrozen ? t('frozenBtn') : t('freezeBtn')}
            </button>
            <button class="btn btn-xs btn-outline-live" onclick="openLiveModalForChannel(${ch.id})" title="${t('streamLiveTitle')}">
              ${t('streamLiveBtn')}
            </button>
          </div>
        </div>
      </div>

      <!-- Drag & Drop Zone -->
      <div class="dropzone" id="dropzone-${ch.id}">
        <div class="dropzone-icon">📥</div>
        <div class="dropzone-text">${t('dropzoneText')}</div>
        <div class="dropzone-hint">${t('dropzoneHint')}</div>
        <input type="file" id="file-input-${ch.id}" class="file-input" multiple accept="image/*,video/mp4,.pdf,.xlsx,.xls,.csv,.txt,.text,.md">
      </div>

      <!-- Batch Duration Setting -->
      <div class="batch-duration-bar">
        <span>${t('batchDurationLabel')}</span>
        <div class="batch-duration-controls">
          <input type="number" id="batch-duration-input-${ch.id}" class="batch-duration-input" value="10" min="1" max="999" step="1">
          <span style="font-size:0.75rem; color:var(--text-muted)">${t('batchDurationUnit')}</span>
          <button class="btn btn-batch" onclick="applyBatchDuration(${ch.id})">${t('batchDurationApply')}</button>
        </div>
      </div>

      <!-- Playlist Items Container -->
      <div class="playlist-container" id="playlist-${ch.id}">
        ${renderPlaylistHTML(ch.id)}
      </div>

      <!-- Card Action Buttons -->
      <div class="card-actions">
        <span class="channel-meta" id="channel-summary-${ch.id}">
          ${getChannelSummaryText(ch.id)}
        </span>
        <button class="btn btn-primary" id="save-btn-${ch.id}" onclick="savePlaylist(${ch.id})">
          ${t('saveBtn')}
        </button>
      </div>
    `;

    container.appendChild(card);
    setupCardDragAndDrop(ch.id);
    setupReorderListeners(ch.id);
  }

  // Restore active channel filter segment
  filterChannelsBySegment(currentChannelFilter);
}

function initChannelSegmentControl() {
  const segmentBar = document.getElementById('channel-segment-bar');
  if (!segmentBar) return;
  segmentBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.segment-btn');
    if (!btn) return;
    segmentBar.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentChannelFilter = btn.getAttribute('data-channel') || 'all';
    filterChannelsBySegment(currentChannelFilter);
  });
}

function filterChannelsBySegment(target) {
  const cards = document.querySelectorAll('.channel-card');
  cards.forEach(card => {
    if (target === 'all') {
      card.style.display = '';
      card.classList.remove('channel-card-focus');
    } else {
      if (card.id === `channel-card-${target}`) {
        card.style.display = '';
        card.classList.add('channel-card-focus');
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        card.style.display = 'none';
        card.classList.remove('channel-card-focus');
      }
    }
  });
}

function getItemTypeLabel(item) {
  const mime = item.mime_type || '';
  const name = (item.original_name || '').toLowerCase();
  if (mime.startsWith('video/')) return `<span class="type-badge type-badge-video">${t('typeVideo')}</span>`;
  if (mime === 'image/gif') return `<span class="type-badge type-badge-gif">${t('typeGif')}</span>`;
  if (name.includes('sheet') || name.includes('excel') || name.includes('ตาราง') || name.endsWith('.xlsx') || name.endsWith('.csv')) return `<span class="type-badge type-badge-excel">${t('typeExcel')}</span>`;
  if (name.includes('ประกาศ') || name.endsWith('.txt') || name.endsWith('.md')) return `<span class="type-badge type-badge-text">${t('typeText')}</span>`;
  if (name.includes('หน้า') && name.includes('/')) return `<span class="type-badge type-badge-pdf">${t('typePdf')}</span>`;
  return `<span class="type-badge type-badge-img">${t('typeImage')}</span>`;
}

function renderPlaylistHTML(channelId) {
  const items = playlistsState[channelId] || [];
  if (items.length === 0) {
    return `<div class="empty-playlist" id="empty-${channelId}">${t('emptyPlaylist')}</div>`;
  }

  return items.map((item, idx) => `
    <div class="playlist-item" draggable="true" data-index="${idx}">
      <span class="item-handle" title="Drag to reorder">⠿</span>
      ${item.mime_type && item.mime_type.startsWith('video/')
        ? `<video class="item-thumb" src="${item.url}#t=0.5" preload="none"></video>`
        : `<img class="item-thumb" src="${item.url}" alt="" loading="lazy">`
      }
      <div class="item-info">
        <div class="item-name" title="${escapeHtml(item.original_name)}">${escapeHtml(item.original_name)}</div>
        <div class="item-type">${getItemTypeLabel(item)}</div>
      </div>
      <button class="btn-jump" onclick="jumpToItem(${channelId}, ${idx})" title="${t('jumpTitle')}">${t('jumpBtn')}</button>
      <div class="item-duration-control">
        <input type="number" class="item-duration-input" value="${item.duration}" min="1" max="999" step="1"
          onchange="updateItemDuration(${channelId}, ${idx}, this.value)"
          title="${t('durationTitle')}">
        <span class="item-duration-unit">${t('batchDurationUnit')}</span>
      </div>
      <button class="btn-remove" onclick="removePlaylistItem(${channelId}, ${idx})" title="${t('removeTitle')}">✕</button>
    </div>
  `).join('');
}

function getChannelSummaryText(channelId) {
  const items = playlistsState[channelId] || [];
  const total = items.reduce((acc, it) => acc + (Number(it.duration) || 10), 0);
  return `${items.length} ${t('summaryItems')} • ${t('summaryTotal')} ${total.toFixed(0)} ${t('summarySeconds')}`;
}

function refreshChannelUI(channelId) {
  const playlistEl = document.getElementById(`playlist-${channelId}`);
  if (playlistEl) {
    playlistEl.innerHTML = renderPlaylistHTML(channelId);
    setupReorderListeners(channelId);
  }
  const summaryEl = document.getElementById(`channel-summary-${channelId}`);
  if (summaryEl) {
    summaryEl.textContent = getChannelSummaryText(channelId);
  }
}

// Drag & Drop File Ingestion (Applies to the entire Card & Dropzone)
function setupCardDragAndDrop(channelId) {
  const card = document.getElementById(`channel-card-${channelId}`);
  const dropzone = document.getElementById(`dropzone-${channelId}`);
  const fileInput = document.getElementById(`file-input-${channelId}`);

  dropzone.addEventListener('click', () => fileInput.click());

  const highlight = () => dropzone.classList.add('dragover');
  const unhighlight = () => dropzone.classList.remove('dragover');

  card.addEventListener('dragover', (e) => {
    e.preventDefault();
    highlight();
  });

  card.addEventListener('dragleave', (e) => {
    if (!card.contains(e.relatedTarget)) {
      unhighlight();
    }
  });

  card.addEventListener('drop', async (e) => {
    e.preventDefault();
    unhighlight();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFileUploads(channelId, e.dataTransfer.files);
    }
  });

  fileInput.addEventListener('change', async () => {
    if (fileInput.files && fileInput.files.length > 0) {
      await handleFileUploads(channelId, fileInput.files);
      fileInput.value = '';
    }
  });
}

/**
 * Converts each page of a dropped PDF into a crisp 1080p JPEG Blob File via PDF.js canvas.
 */
async function convertPdfPagesToImages(pdfFile) {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const pageFiles = [];

  const baseName = pdfFile.name.replace(/\.[^/.]+$/, '');

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const unscaledViewport = page.getViewport({ scale: 1 });

    const targetW = 1920;
    const targetH = 1080;
    const scale = Math.min(targetW / unscaledViewport.width, targetH / unscaledViewport.height);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');

    // Clean white background for document pages
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);

    // Center page on 1920x1080 slide
    const offsetX = (targetW - viewport.width) / 2;
    const offsetY = (targetH - viewport.height) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    await page.render({ canvasContext: ctx, viewport }).promise;
    ctx.restore();

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    const pageName = pdf.numPages > 1
      ? `${baseName} (หน้า ${pageNum}/${pdf.numPages}).jpg`
      : `${baseName}.jpg`;
    const imageFile = new File([blob], pageName, { type: 'image/jpeg' });
    pageFiles.push(imageFile);
  }

  return pageFiles;
}

// Upload Handler (Auto-saves & syncs to TV immediately)
async function handleFileUploads(channelId, files) {
  const dropzone = document.getElementById(`dropzone-${channelId}`);
  const originalText = dropzone.innerHTML;
  dropzone.innerHTML = `<div class="dropzone-text">⏳ กำลังประมวลผล ${files.length} ไฟล์...</div>`;

  let uploadedCount = 0;

  // Flatten files: split PDFs into individual page JPEG files
  const filesToUpload = [];
  for (const file of files) {
    if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
      try {
        dropzone.innerHTML = `<div class="dropzone-text">📄 กำลังแปลง PDF: ${file.name}...</div>`;
        const pages = await convertPdfPagesToImages(file);
        filesToUpload.push(...pages);
      } catch (err) {
        console.warn('Browser PDF conversion error, falling back to server-side parser:', err);
        filesToUpload.push(file);
      }
    } else {
      filesToUpload.push(file);
    }
  }

  dropzone.innerHTML = `<div class="dropzone-text">⏳ กำลังอัปโหลด ${filesToUpload.length} สไลด์...</div>`;

  for (const file of filesToUpload) {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        if (!playlistsState[channelId]) {
          playlistsState[channelId] = [];
        }

        const assetsToAdd = data.assets || [data];
        for (const asset of assetsToAdd) {
          playlistsState[channelId].push({
            id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            asset_id: asset.asset_id || asset.id,
            url: asset.url || `/media/${asset.filename}`,
            original_name: asset.original_name,
            mime_type: asset.mime_type,
            duration: asset.duration || 10,
            order: playlistsState[channelId].length
          });
          uploadedCount++;
        }
      } else {
        showToast(`อัปโหลดล้มเหลว: ${data.error}`, true);
      }
    } catch (err) {
      showToast(`เกิดข้อผิดพลาดในการอัปโหลด: ${err.message}`, true);
    }
  }

  dropzone.innerHTML = originalText;
  setupCardDragAndDrop(channelId);
  refreshChannelUI(channelId);

  if (uploadedCount > 0) {
    await savePlaylist(channelId);
  }
}

// Drag to Reorder
function setupReorderListeners(channelId) {
  const playlistEl = document.getElementById(`playlist-${channelId}`);
  if (!playlistEl) return;
  const items = playlistEl.querySelectorAll('.playlist-item');

  items.forEach(item => {
    item.addEventListener('dragstart', (e) => {
      dragSourceIndex = parseInt(item.getAttribute('data-index'), 10);
      dragSourceChannelId = channelId;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      dragSourceIndex = null;
      dragSourceChannelId = null;
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    item.addEventListener('drop', async (e) => {
      e.preventDefault();
      if (dragSourceIndex === null || dragSourceChannelId !== channelId) return;

      const targetIndex = parseInt(item.getAttribute('data-index'), 10);
      if (dragSourceIndex !== targetIndex) {
        const list = playlistsState[channelId];
        const [movedItem] = list.splice(dragSourceIndex, 1);
        list.splice(targetIndex, 0, movedItem);
        refreshChannelUI(channelId);
        await savePlaylist(channelId);
      }
    });
  });
}

// Rename Channel
export async function saveChannelName(channelId) {
  const input = document.getElementById(`channel-name-input-${channelId}`);
  if (!input) return;
  const newName = input.value.trim();
  if (!newName) {
    showToast(t('toastNameEmpty'), true);
    return;
  }

  try {
    const res = await fetch(`/api/channels/${channelId}/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName })
    });
    const result = await res.json();
    if (result.success) {
      const ch = channelsList.find(c => c.id === channelId);
      if (ch) ch.name = newName;
      showToast(t('toastNameSaved', { channel: channelId, name: newName }));
    } else {
      showToast(`เปลี่ยนชื่อไม่สำเร็จ: ${result.error}`, true);
    }
  } catch (err) {
    showToast(`เกิดข้อผิดพลาดในการเปลี่ยนชื่อ: ${err.message}`, true);
  }
}

// Bulk Duration Setting
export async function applyBatchDuration(channelId) {
  const input = document.getElementById(`batch-duration-input-${channelId}`);
  const val = Math.max(1, parseFloat(input?.value) || 10);
  const items = playlistsState[channelId];
  if (!items || items.length === 0) {
    showToast(t('toastBatchEmpty'), true);
    return;
  }

  items.forEach(it => {
    it.duration = val;
  });

  refreshChannelUI(channelId);
  await savePlaylist(channelId);
  showToast(t('toastBatchSuccess', { channel: channelId, val }));
}

// Direct Jump to Slide Immediately
export async function jumpToItem(channelId, index) {
  try {
    const res = await fetch(`/api/channels/${channelId}/jump`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index })
    });
    const result = await res.json();
    if (result.success) {
      showToast(t('toastJumpSuccess', { channel: channelId, idx: index + 1 }));
    } else {
      showToast(`ข้ามไปยังภาพไม่สำเร็จ: ${result.error}`, true);
    }
  } catch (err) {
    showToast(`เกิดข้อผิดพลาด: ${err.message}`, true);
  }
}

// Freeze / Lock Toggle
export async function toggleFreeze(channelId) {
  const ch = channelsList.find(c => c.id === channelId);
  const newFrozen = !(ch && ch.frozen);

  try {
    const res = await fetch(`/api/channels/${channelId}/freeze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frozen: newFrozen })
    });
    const result = await res.json();
    if (result.success) {
      if (ch) ch.frozen = newFrozen;
      const btn = document.getElementById(`freeze-btn-${channelId}`);
      if (btn) {
        btn.className = `btn btn-xs ${newFrozen ? 'btn-frozen' : 'btn-freeze'}`;
        btn.textContent = newFrozen ? t('frozenBtn') : t('freezeBtn');
      }
      showToast(newFrozen
        ? t('toastFreezeOn', { channel: channelId })
        : t('toastFreezeOff', { channel: channelId })
      );
    } else {
      showToast(`ล็อคภาพไม่สำเร็จ: ${result.error}`, true);
    }
  } catch (err) {
    showToast(`เกิดข้อผิดพลาด: ${err.message}`, true);
  }
}

// Live Screen Share
export function openLiveModal(target = 'all') {
  const select = document.getElementById('live-target-select');
  if (select) select.value = String(target);
  const modal = document.getElementById('live-modal');
  if (modal) modal.classList.remove('hidden');
}

export function closeLiveModal() {
  const modal = document.getElementById('live-modal');
  if (modal) modal.classList.add('hidden');
}

export async function startLiveScreenShare(target = 'all', quality = '1080p') {
  if (liveStream) {
    stopLiveScreenShare();
  }
  currentLiveTarget = target;

  const is1080p = quality !== '720p';
  const targetW = is1080p ? 1920 : 1280;
  const targetH = is1080p ? 1080 : 720;
  // 20 FPS provides butter-smooth cursor and slide transitions with minimal LAN jitter
  const targetFps = is1080p ? 20 : 15;
  // Quality 0.78 preserves razor-sharp text edges while keeping frame size under 60KB
  const jpegQuality = is1080p ? 0.78 : 0.70;

  try {
    liveStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: 'always',
        frameRate: { ideal: targetFps, max: 30 },
        width: { ideal: targetW },
        height: { ideal: targetH }
      },
      audio: false
    });
  } catch (err) {
    if (err.name !== 'NotAllowedError') {
      showToast(`ไม่สามารถเข้าถึงหน้าจอ: ${err.message}`, true);
    }
    return;
  }

  // When user stops sharing using browser's native floating bar
  const videoTrack = liveStream.getVideoTracks()[0];
  if (videoTrack) {
    videoTrack.onended = () => {
      stopLiveScreenShare();
    };
  }

  // Hidden offscreen video
  liveVideo = document.createElement('video');
  liveVideo.srcObject = liveStream;
  liveVideo.muted = true;
  liveVideo.playsInline = true;
  await liveVideo.play();

  // Hardware-accelerated offscreen canvas
  liveCanvas = document.createElement('canvas');
  liveCanvas.width = liveVideo.videoWidth || targetW;
  liveCanvas.height = liveVideo.videoHeight || targetH;
  const ctx = liveCanvas.getContext('2d', { alpha: false });

  // WebSocket Live Stream Broadcaster Connection
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/live?target=${encodeURIComponent(target)}`;
  liveWs = new WebSocket(wsUrl);
  liveWs.binaryType = 'arraybuffer';

  liveWs.onopen = () => {
    liveWs.send(JSON.stringify({ action: 'start', target }));

    let isEncoding = false;
    const pumpIntervalMs = Math.floor(1000 / targetFps);

    liveIntervalId = setInterval(() => {
      if (!liveStream || !liveVideo || isEncoding) return;
      if (!liveWs || liveWs.readyState !== WebSocket.OPEN) return;

      // Smart Network Backpressure: If previous frame is still buffering across Wi-Fi,
      // skip this tick to prevent packet pile-up and bufferbloat lag!
      if (liveWs.bufferedAmount > 65536) {
        return;
      }

      const curW = liveVideo.videoWidth || targetW;
      const curH = liveVideo.videoHeight || targetH;
      if (liveCanvas.width !== curW || liveCanvas.height !== curH) {
        liveCanvas.width = curW;
        liveCanvas.height = curH;
      }

      isEncoding = true;
      try {
        ctx.drawImage(liveVideo, 0, 0, curW, curH);
        liveCanvas.toBlob((blob) => {
          if (blob && liveWs && liveWs.readyState === WebSocket.OPEN) {
            try {
              // Direct binary Blob transmit: zero ArrayBuffer conversion latency!
              liveWs.send(blob);
            } catch {}
          }
          isEncoding = false;
        }, 'image/jpeg', jpegQuality);
      } catch {
        isEncoding = false;
      }
    }, pumpIntervalMs);
  };

  liveWs.onclose = () => {
    if (liveStream) {
      stopLiveScreenShare();
    }
  };

  // UI Bar Update
  const liveBar = document.getElementById('live-active-bar');
  const liveText = document.getElementById('live-active-text');
  if (liveBar) liveBar.classList.remove('hidden');
  if (liveText) {
    const targetText = target === 'all' ? 'ทุกช่องพร้อมกัน (ช่อง 1 - 6)' : `ช่อง ${target}`;
    liveText.textContent = `กำลังถ่ายทอดสดหน้าจอคอมพิวเตอร์ (${is1080p ? '1080p คมชัดสูง' : '720p'}) ไปยัง: ${targetText}`;
  }
  closeLiveModal();
  showToast(`🔴 เริ่มถ่ายทอดสดหน้าจอคอมพิวเตอร์ (${is1080p ? '1080p คมชัดสูง' : '720p'}) ไปยัง ${target === 'all' ? 'ทุกช่อง' : 'ช่อง ' + target}`);
}

export function stopLiveScreenShare() {
  clearInterval(liveIntervalId);
  liveIntervalId = null;

  if (liveWs) {
    try {
      if (liveWs.readyState === WebSocket.OPEN) {
        liveWs.send(JSON.stringify({ action: 'stop' }));
        liveWs.close();
      }
    } catch {}
    liveWs = null;
  }

  if (liveStream) {
    try {
      liveStream.getTracks().forEach(track => track.stop());
    } catch {}
    liveStream = null;
  }

  if (liveVideo) {
    try {
      liveVideo.pause();
      liveVideo.srcObject = null;
    } catch {}
    liveVideo = null;
  }

  liveCanvas = null;

  const liveBar = document.getElementById('live-active-bar');
  if (liveBar) liveBar.classList.add('hidden');
  showToast(t('toastLiveStop'));
}

export async function updateItemDuration(channelId, index, newDuration) {
  const val = parseFloat(newDuration);
  if (playlistsState[channelId] && playlistsState[channelId][index]) {
    playlistsState[channelId][index].duration = Math.max(1, val || 10);
    const summaryEl = document.getElementById(`channel-summary-${channelId}`);
    if (summaryEl) summaryEl.textContent = getChannelSummaryText(channelId);
    await savePlaylist(channelId);
  }
}

export async function removePlaylistItem(channelId, index) {
  if (playlistsState[channelId]) {
    playlistsState[channelId].splice(index, 1);
    refreshChannelUI(channelId);
    await savePlaylist(channelId);
  }
}

// Save Playlist & Push to TV
export async function savePlaylist(channelId) {
  const saveBtn = document.getElementById(`save-btn-${channelId}`);
  const originalBtnText = saveBtn ? saveBtn.innerHTML : t('saveBtn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = t('savingBtn');
  }

  const items = playlistsState[channelId] || [];
  const payload = {
    items: items.map((it, idx) => ({
      asset_id: it.asset_id,
      duration: it.duration,
      order: idx
    }))
  };

  try {
    const res = await fetch(`/api/channels/${channelId}/playlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      if (result.notified_screens > 0) {
        showToast(t('toastSavedScreens', { channel: channelId, count: result.notified_screens }));
      } else {
        showToast(t('toastSavedPending', { channel: channelId }));
      }
      pollChannelStatus();
    } else {
      showToast(`❌ บันทึกไม่สำเร็จ: ${result.error}`, true);
    }
  } catch (err) {
    showToast(`❌ เกิดข้อผิดพลาดในการบันทึก: ${err.message}`, true);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalBtnText;
    }
  }
}

export function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerHTML = `
    <span class="toast-mac-icon">${isError ? '⚠️' : '📺'}</span>
    <div class="toast-body">
      <span class="toast-app-name">Smart TV Signage</span>
      <span class="toast-text">${escapeHtml(message)}</span>
    </div>
  `;
  toast.className = `toast ${isError ? 'error' : ''}`;
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => {
    toast.className = 'toast hidden';
  }, 3800);
}

// Global functions accessible from HTML inline handlers
window.savePlaylist = savePlaylist;
window.removePlaylistItem = removePlaylistItem;
window.updateItemDuration = updateItemDuration;
window.showToast = showToast;
window.saveChannelName = saveChannelName;
window.applyBatchDuration = applyBatchDuration;
window.jumpToItem = jumpToItem;
window.toggleFreeze = toggleFreeze;
window.openLiveModalForChannel = (chId) => openLiveModal(chId);
window.openLiveModal = openLiveModal;
window.closeLiveModal = closeLiveModal;
window.startLiveScreenShare = startLiveScreenShare;
window.stopLiveScreenShare = stopLiveScreenShare;
