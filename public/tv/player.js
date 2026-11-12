/**
 * Smart TV Multi-Channel LAN Digital Signage System
 * TV Player Display Engine (Optimized for 24/7 Stability & Hardware Canvas Rendering)
 * Supports: Real-Time LAN Sync, Live Canvas Double-Buffer, Freeze Lock, Multi-Language (TH/EN/JA)
 * 
 * @author mamabuncho <mamabuncho@gmail.com>
 * @copyright 2026 mamabuncho. All rights reserved.
 */

const tvTranslations = {
  th: {
    channelPrefix: 'Smart TV ช่อง ',
    connected: '● เชื่อมต่อเซิร์ฟเวอร์แล้ว (ออนไลน์)',
    offline: '○ หลุดการเชื่อมต่อ (กำลังลองใหม่)',
    standbyDesc: 'พร้อมรับภาพหรือวิดีโอจากหน้าแอดมิน',
    standbyTip: '💡 เพิ่มรูปภาพหรือสไลด์ที่หน้าควบคุมคอมพิวเตอร์ แล้วกด <b>"บันทึกและส่งเข้าทีวี"</b>',
    fullscreen: '⛶ เต็มจอ',
    exitFullscreen: '⛶ ออกจากเต็มจอ',
    live: '🔴 ถ่ายทอดสดหน้าจอคอมพิวเตอร์',
    freeze: '❄️ ล็อคภาพนิ่ง (Freeze)',
    netWarning: '⚠️ หลุดการเชื่อมต่อกับเซิร์ฟเวอร์ กำลังเชื่อมต่อใหม่...'
  },
  en: {
    channelPrefix: 'Smart TV Channel ',
    connected: '● Server Connected (Online)',
    offline: '○ Disconnected (Reconnecting...)',
    standbyDesc: 'Ready to receive media and slides from admin dashboard',
    standbyTip: '💡 Add images or slides in the admin dashboard and click <b>"Save & Push to TV"</b>',
    fullscreen: '⛶ Fullscreen',
    exitFullscreen: '⛶ Exit Fullscreen',
    live: '🔴 Live Screen Broadcast',
    freeze: '❄️ Screen Frozen (Freeze)',
    netWarning: '⚠️ Disconnected from server. Reconnecting...'
  },
  ja: {
    channelPrefix: 'スマートTV チャンネル ',
    connected: '● サーバー接続済み (オンライン)',
    offline: '○ 切断されました (再接続中...)',
    standbyDesc: '管理者画面からのスライドや画像配信を受信待機中',
    standbyTip: '💡 管理画面で画像やスライドを追加し、<b>「保存してTVへ反映」</b>を押してください',
    fullscreen: '⛶ 全画面',
    exitFullscreen: '⛶ 全画面解除',
    live: '🔴 画面ライブ配信中',
    freeze: '❄️ 画面固定中 (Freeze)',
    netWarning: '⚠️ サーバーとの接続が切断されました。再接続しています...'
  }
};

function getTvLang() {
  const queryParam = new URLSearchParams(window.location.search).get('lang');
  if (queryParam && tvTranslations[queryParam]) return queryParam;
  try {
    const stored = localStorage.getItem('smarttv_lang');
    if (stored && tvTranslations[stored]) return stored;
  } catch {}
  return 'th';
}

function tvT(key) {
  const lang = getTvLang();
  return (tvTranslations[lang] && tvTranslations[lang][key]) || tvTranslations.th[key] || '';
}

function getTargetChannelId() {
  const queryParam = new URLSearchParams(window.location.search).get('channel');
  if (queryParam && /^\d+$/.test(queryParam)) {
    return queryParam;
  }
  const match = window.location.pathname.match(/\/tv\/(\d+)/);
  if (match) {
    return match[1];
  }
  return '1';
}

const channelId = getTargetChannelId();
const STORAGE_KEY = `signage_manifest_ch_${channelId}`;
const SESSION_START_TIME = Date.now();
const MAX_SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24-hour maintenance soft reload

let playlist = [];
let currentIndex = -1;
let activeSlot = 'A'; // 'A' or 'B'
let timerId = null;
let eventSource = null;
let sseRetryDelay = 3000;
let isPlaying = false;
let pendingNewPlaylist = null;
let wakeLockSentinel = null;
let isFrozen = false;
let isLiveMode = false;
let currentChannelName = `${tvT('channelPrefix')}${channelId}`;

// DOM Elements
const slotA = document.getElementById('slotA');
const slotB = document.getElementById('slotB');
const imgA = document.getElementById('imgA');
const imgB = document.getElementById('imgB');
const vidA = document.getElementById('vidA');
const vidB = document.getElementById('vidB');
const standbyScreen = document.getElementById('standby-screen');
const standbyTitle = document.getElementById('standby-title');
const standbyBadge = document.getElementById('standby-badge');
const fsBtn = document.getElementById('fs-btn');
const netWarning = document.getElementById('net-warning');
const antiSleepVideo = document.getElementById('anti-sleep-video');
const liveLayer = document.getElementById('live-layer');
const liveStreamCanvas = document.getElementById('live-stream-canvas');
const freezeIndicator = document.getElementById('freeze-indicator');
let liveCanvasCtx = null;
if (liveStreamCanvas) {
  liveCanvasCtx = liveStreamCanvas.getContext('2d', { alpha: false, desynchronized: true });
}

// Set asynchronous decoding on image elements for butter-smooth rendering
if (imgA) imgA.decoding = 'async';
if (imgB) imgB.decoding = 'async';

function init() {
  updateChannelNameDisplay(currentChannelName);
  setupIdleCursor();

  // Apply localized labels
  const descEl = document.querySelector('.standby-desc');
  if (descEl) descEl.textContent = tvT('standbyDesc');
  const tipEl = document.querySelector('.standby-tip');
  if (tipEl) tipEl.innerHTML = tvT('standbyTip');
  if (fsBtn) fsBtn.textContent = tvT('fullscreen');
  if (freezeIndicator) freezeIndicator.textContent = tvT('freeze');
  const liveText = document.querySelector('.live-text');
  if (liveText) liveText.textContent = tvT('live');
  if (netWarning) netWarning.textContent = tvT('netWarning');

  fsBtn.addEventListener('click', toggleFullscreen);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'f' || e.keyCode === 13) {
      toggleFullscreen();
    }
  });

  document.getElementById('player-container').addEventListener('dblclick', toggleFullscreen);

  // Load cached playlist from localStorage immediately for offline boot resilience
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        playlist = parsed;
        window.playlist = parsed;
        hideStandbyScreen();
        playNextItem();
      }
    } catch (e) {
      console.warn('Failed to parse cached playlist:', e);
    }
  }

  if (playlist.length === 0) {
    showStandbyScreen();
  }

  fetchChannelData();
  initRealTimeSync();
  initAntiSleep();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function updateChannelNameDisplay(name) {
  if (name) {
    currentChannelName = name;
  }
  if (standbyTitle) {
    standbyTitle.textContent = `📺 ${currentChannelName}`;
  }
  document.title = `${currentChannelName} - Smart TV Display`;
}

function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  } catch (e) {
    console.warn('Fullscreen request bypassed:', e);
  }
}

// Auto-hide cursor and fullscreen button when idle
let idleTimer = null;
function setupIdleCursor() {
  const resetIdle = () => {
    document.body.classList.remove('hide-cursor');
    fsBtn.classList.remove('idle-hide');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      document.body.classList.add('hide-cursor');
      fsBtn.classList.add('idle-hide');
    }, 3500);
  };

  window.addEventListener('mousemove', resetIdle, { passive: true });
  window.addEventListener('touchstart', resetIdle, { passive: true });
  resetIdle();
}

// Anti-Sleep Lock (Low-CPU & Releases Decoder Channels)
async function initAntiSleep() {
  if ('wakeLock' in navigator && navigator.wakeLock.request) {
    try {
      wakeLockSentinel = await navigator.wakeLock.request('screen');
      wakeLockSentinel.addEventListener('release', () => {
        wakeLockSentinel = null;
      });
      return;
    } catch {}
  }

  if (!wakeLockSentinel && antiSleepVideo) {
    try {
      if (!antiSleepVideo.srcObject) {
        const canvas = document.createElement('canvas');
        canvas.width = 4;
        canvas.height = 4;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 4, 4);

        if (canvas.captureStream) {
          antiSleepVideo.srcObject = canvas.captureStream(0.5);
        }
      }
      antiSleepVideo.play().catch(() => {});
    } catch (e) {
      console.warn('Anti-sleep fallback bypassed:', e);
    }
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    initAntiSleep();
  }
});

async function fetchChannelData() {
  try {
    const res = await fetch(`/api/channels/${channelId}`);
    if (res.ok) {
      const data = await res.json();
      if (data.name) {
        updateChannelNameDisplay(data.name);
      }
      if (typeof data.frozen === 'boolean') {
        setFrozen(data.frozen);
      }
      if (data.is_live) {
        showLiveStream();
      }
      updatePlaylist(data.items || []);
    }
  } catch (err) {
    console.warn('Offline or server unreachable, relying on cached playlist:', err);
  }
}

function updatePlaylist(newItems) {
  if (!newItems || newItems.length === 0) {
    playlist = [];
    window.playlist = [];
    localStorage.removeItem(STORAGE_KEY);
    clearTimeout(timerId);
    isPlaying = false;
    showStandbyScreen();
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
  window.playlist = newItems;
  playlist = newItems;
  pendingNewPlaylist = null;
  currentIndex = -1;
  isPlaying = true;
  hideStandbyScreen();
  if (!isLiveMode) {
    playNextItem();
  }
}

// Freeze / Lock Slide Control
function setFrozen(frozen) {
  isFrozen = Boolean(frozen);
  if (freezeIndicator) {
    if (isFrozen) {
      freezeIndicator.classList.remove('hidden');
    } else {
      freezeIndicator.classList.add('hidden');
    }
  }

  clearTimeout(timerId);
  if (!isFrozen && !isLiveMode && playlist.length > 0) {
    const currentItem = playlist[currentIndex] || playlist[0];
    const durationMs = Math.max(2, (Number(currentItem?.duration) || 10)) * 1000;
    timerId = setTimeout(playNextItem, durationMs);
  }
}

// Direct Slide Override / Jump Immediately
function jumpToItem(targetIndex) {
  const idx = parseInt(targetIndex, 10);
  if (isNaN(idx) || idx < 0 || idx >= playlist.length) {
    return;
  }
  clearTimeout(timerId);
  playNextItem(idx);
}

// Live Screen Share Controls (Flicker-Free Hardware Canvas Double-Buffer)
function showLiveStream() {
  isLiveMode = true;
  clearTimeout(timerId);
  if (liveLayer) {
    liveLayer.classList.remove('hidden');
  }
  // Pause any playing video in slots to save GPU
  if (vidA) { try { vidA.pause(); } catch {} }
  if (vidB) { try { vidB.pause(); } catch {} }
}

function hideLiveStream() {
  isLiveMode = false;
  if (liveLayer) {
    liveLayer.classList.add('hidden');
  }
  if (!isFrozen && playlist.length > 0) {
    playNextItem();
  }
}

let isDecodingFrame = false;

function handleLiveFrame(arrayBuffer) {
  if (!isLiveMode) {
    showLiveStream();
  }
  if (!liveStreamCanvas || !liveCanvasCtx) return;

  const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });

  // Use createImageBitmap for background-thread GPU decoding with ZERO paint flicker
  if (window.createImageBitmap) {
    if (isDecodingFrame) return; // Drop frame if previous is still blitting to prevent backlog
    isDecodingFrame = true;
    createImageBitmap(blob).then((bitmap) => {
      if (liveStreamCanvas.width !== bitmap.width || liveStreamCanvas.height !== bitmap.height) {
        liveStreamCanvas.width = bitmap.width;
        liveStreamCanvas.height = bitmap.height;
      }
      liveCanvasCtx.drawImage(bitmap, 0, 0);
      bitmap.close();
      isDecodingFrame = false;
    }).catch(() => {
      isDecodingFrame = false;
    });
  } else {
    // Universal Fallback: pre-decode image completely before painting onto canvas
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      if (liveStreamCanvas.width !== img.naturalWidth || liveStreamCanvas.height !== img.naturalHeight) {
        liveStreamCanvas.width = img.naturalWidth;
        liveStreamCanvas.height = img.naturalHeight;
      }
      liveCanvasCtx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }
}

// Playback Rotation Loop with Zero-Leak Lifecycle & 24h Maintenance Reload
function playNextItem(forcedIndex = null) {
  clearTimeout(timerId);

  // 24-Hour Maintenance Reload: resets browser V8 heap cleanly between slides
  if (Date.now() - SESSION_START_TIME > MAX_SESSION_DURATION_MS) {
    console.log('24h session maintenance: performing soft reload to purge browser heap...');
    window.location.reload();
    return;
  }

  if (pendingNewPlaylist) {
    playlist = pendingNewPlaylist;
    pendingNewPlaylist = null;
    currentIndex = -1;
  }

  if (playlist.length === 0) {
    isPlaying = false;
    showStandbyScreen();
    return;
  }

  hideStandbyScreen();
  isPlaying = true;

  if (typeof forcedIndex === 'number' && forcedIndex >= 0 && forcedIndex < playlist.length) {
    currentIndex = forcedIndex;
  } else {
    // Single static image optimization
    if (playlist.length === 1 && !playlist[0].mime_type?.startsWith('video/') && currentIndex === 0) {
      const currentItem = playlist[0];
      const durationMs = Math.max(2, (Number(currentItem.duration) || 10)) * 1000;
      if (!isFrozen && !isLiveMode) {
        timerId = setTimeout(playNextItem, durationMs);
      }
      return;
    }
    currentIndex = (currentIndex + 1) % playlist.length;
  }

  const currentItem = playlist[currentIndex];

  const targetSlot = (activeSlot === 'A') ? 'B' : 'A';
  const targetSlotEl = (targetSlot === 'A') ? slotA : slotB;
  const oldSlotEl = (targetSlot === 'A') ? slotB : slotA;

  const targetImg = (targetSlot === 'A') ? imgA : imgB;
  const targetVid = (targetSlot === 'A') ? vidA : vidB;
  const oldVid = (targetSlot === 'A') ? vidB : vidA;
  const oldImg = (targetSlot === 'A') ? imgB : imgA;

  const isVideo = currentItem.mime_type && currentItem.mime_type.startsWith('video/');

  if (isVideo) {
    if (antiSleepVideo && !antiSleepVideo.paused) {
      try { antiSleepVideo.pause(); } catch {}
    }

    targetImg.classList.remove('visible');
    targetVid.classList.add('visible');

    targetVid.src = currentItem.url;
    targetVid.muted = true;
    targetVid.playsInline = true;

    targetVid.onended = () => {
      if (!isFrozen && !isLiveMode) {
        playNextItem();
      }
    };

    targetVid.onerror = (e) => {
      console.error('Video decode error, advancing:', e);
      if (!isFrozen && !isLiveMode) {
        timerId = setTimeout(playNextItem, 2000);
      }
    };

    targetVid.play().then(() => {
      performCrossFade(targetSlotEl, oldSlotEl, oldVid, oldImg);
      activeSlot = targetSlot;
    }).catch(err => {
      console.warn('Autoplay failed, falling back to timer:', err);
      performCrossFade(targetSlotEl, oldSlotEl, oldVid, oldImg);
      activeSlot = targetSlot;
      if (!isFrozen && !isLiveMode) {
        timerId = setTimeout(playNextItem, (currentItem.duration || 10) * 1000);
      }
    });
  } else {
    if (antiSleepVideo && antiSleepVideo.paused && !wakeLockSentinel) {
      antiSleepVideo.play().catch(() => {});
    }

    targetVid.classList.remove('visible');
    targetImg.classList.add('visible');

    let handled = false;
    const onImageLoaded = () => {
      if (handled) return;
      handled = true;
      targetImg.onload = null;
      targetImg.onerror = null;

      performCrossFade(targetSlotEl, oldSlotEl, oldVid, oldImg);
      activeSlot = targetSlot;

      if (!isFrozen && !isLiveMode) {
        const durationMs = Math.max(2, (Number(currentItem.duration) || 10)) * 1000;
        timerId = setTimeout(playNextItem, durationMs);
      }
    };

    targetImg.onload = onImageLoaded;
    targetImg.onerror = () => {
      if (handled) return;
      handled = true;
      targetImg.onload = null;
      targetImg.onerror = null;
      console.error('Image load failed:', currentItem.url);
      if (!isFrozen && !isLiveMode) {
        timerId = setTimeout(playNextItem, 2000);
      }
    };

    targetImg.src = currentItem.url;

    if (targetImg.complete && targetImg.naturalWidth > 0) {
      onImageLoaded();
    }
  }
}

// Hardware-Accelerated CSS Cross-Fade Transition & Complete Surface Purge
function performCrossFade(targetSlotEl, oldSlotEl, oldVid, oldImg) {
  targetSlotEl.classList.remove('inactive');
  targetSlotEl.classList.add('active');

  oldSlotEl.classList.remove('active');
  oldSlotEl.classList.add('inactive');

  setTimeout(() => {
    try {
      if (oldVid) {
        oldVid.pause();
        oldVid.removeAttribute('src');
        oldVid.load();
      }
      if (oldImg && playlist.length > 1) {
        oldImg.removeAttribute('src');
      }
    } catch (e) {
      console.warn('Decoder/Surface cleanup error:', e);
    }
  }, 480);
}

function showStandbyScreen() {
  standbyScreen.classList.remove('hidden');
}

function hideStandbyScreen() {
  standbyScreen.classList.add('hidden');
}

// Dual-Protocol Real-Time Sync (WebSocket primary, SSE fallback)
let realTimeConn = null;
let useWebSocket = true;

function initRealTimeSync() {
  if (useWebSocket && 'WebSocket' in window) {
    initWebSocket();
  } else {
    initSSE();
  }
}

function initWebSocket() {
  if (realTimeConn) {
    try { realTimeConn.close(); } catch {}
    realTimeConn = null;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/channels/${channelId}`;

  try {
    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';
    realTimeConn = ws;

    ws.onopen = () => {
      console.log(`WebSocket connected for channel ${channelId}`);
      sseRetryDelay = 3000;
      netWarning.classList.add('hidden');
      standbyBadge.className = 'standby-badge connected';
      standbyBadge.textContent = tvT('connected');
    };

    ws.onmessage = (event) => {
      // Binary Frame = Live Screen Stream JPEG
      if (event.data instanceof ArrayBuffer) {
        handleLiveFrame(event.data);
        return;
      }

      // JSON Control Messages
      try {
        const msg = JSON.parse(event.data);
        switch (msg.event) {
          case 'connected':
            if (msg.data) {
              if (typeof msg.data.frozen === 'boolean') setFrozen(msg.data.frozen);
              if (msg.data.is_live) showLiveStream();
            }
            break;
          case 'playlist_update':
            if (msg.data) {
              console.log('Received playlist_update via WS:', msg.data);
              updatePlaylist(msg.data.items || []);
            }
            break;
          case 'jump_to_item':
            if (msg.data && typeof msg.data.index === 'number') {
              console.log('Admin forced jump to slide index:', msg.data.index);
              jumpToItem(msg.data.index);
            }
            break;
          case 'freeze_toggle':
            if (msg.data && typeof msg.data.frozen === 'boolean') {
              console.log('Admin toggle freeze:', msg.data.frozen);
              setFrozen(msg.data.frozen);
            }
            break;
          case 'channel_renamed':
            if (msg.data && msg.data.name) {
              console.log('Channel renamed to:', msg.data.name);
              updateChannelNameDisplay(msg.data.name);
            }
            break;
          case 'live_start':
            console.log('Live screen stream started');
            showLiveStream();
            break;
          case 'live_stop':
            console.log('Live screen stream stopped');
            hideLiveStream();
            break;
          case 'webrtc_offer':
            if (msg.data && msg.data.sdp) {
              console.log('Received WebRTC offer, negotiating high-fps stream...');
              handleWebRtcOffer(msg.data.sdp);
            }
            break;
          case 'webrtc_candidate':
            if (msg.data) {
              handleWebRtcCandidate(msg.data);
            }
            break;
          case 'force_reload':
            window.location.reload();
            break;
        }
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    ws.onerror = () => {
      if (ws.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket connection failed, falling back to SSE...');
        useWebSocket = false;
        try { ws.close(); } catch {}
        realTimeConn = null;
        initSSE();
      }
    };

    ws.onclose = (e) => {
      if (!useWebSocket) return;
      console.warn(`WebSocket closed (${e.code}), retrying in ${(sseRetryDelay / 1000).toFixed(1)}s...`);
      netWarning.classList.remove('hidden');
      standbyBadge.className = 'standby-badge offline';
      standbyBadge.textContent = tvT('offline');
      realTimeConn = null;

      setTimeout(initRealTimeSync, sseRetryDelay);
      sseRetryDelay = Math.min(30000, Math.floor(sseRetryDelay * 1.5 + Math.random() * 1000));
    };
  } catch (err) {
    console.warn('WebSocket init error, falling back to SSE:', err);
    useWebSocket = false;
    initSSE();
  }
}

function initSSE() {
  if (realTimeConn) {
    try { realTimeConn.close(); } catch {}
    realTimeConn = null;
  }

  try {
    const es = new EventSource(`/api/channels/${channelId}/events`);
    realTimeConn = es;

    es.addEventListener('connected', (e) => {
      console.log(`SSE connected for channel ${channelId}`);
      sseRetryDelay = 3000;
      netWarning.classList.add('hidden');
      standbyBadge.className = 'standby-badge connected';
      standbyBadge.textContent = tvT('connected');
      try {
        const data = JSON.parse(e.data);
        if (typeof data.frozen === 'boolean') setFrozen(data.frozen);
        if (data.is_live) showLiveStream();
      } catch {}
    });

    es.addEventListener('playlist_update', (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log('Received playlist_update via SSE:', data);
        updatePlaylist(data.items || []);
      } catch (err) {
        console.error('Error parsing SSE playlist_update:', err);
      }
    });

    es.addEventListener('jump_to_item', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (typeof data.index === 'number') {
          jumpToItem(data.index);
        }
      } catch (err) {
        console.error('Error parsing SSE jump_to_item:', err);
      }
    });

    es.addEventListener('freeze_toggle', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (typeof data.frozen === 'boolean') {
          setFrozen(data.frozen);
        }
      } catch (err) {
        console.error('Error parsing SSE freeze_toggle:', err);
      }
    });

    es.addEventListener('channel_renamed', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.name) {
          updateChannelNameDisplay(data.name);
        }
      } catch (err) {
        console.error('Error parsing SSE channel_renamed:', err);
      }
    });

    es.addEventListener('live_start', () => {
      showLiveStream();
    });

    es.addEventListener('live_stop', () => {
      hideLiveStream();
    });

    es.addEventListener('force_reload', () => {
      window.location.reload();
    });

    es.onerror = () => {
      console.warn(`SSE connection dropped, retrying in ${(sseRetryDelay / 1000).toFixed(1)}s...`);
      netWarning.classList.remove('hidden');
      standbyBadge.className = 'standby-badge offline';
      standbyBadge.textContent = tvT('offline');
      try { es.close(); } catch {}
      realTimeConn = null;

      setTimeout(initRealTimeSync, sseRetryDelay);
      sseRetryDelay = Math.min(30000, Math.floor(sseRetryDelay * 1.5 + Math.random() * 1000));
    };
  } catch (err) {
    console.error('SSE init error:', err);
  }
}
