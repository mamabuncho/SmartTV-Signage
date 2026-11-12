/**
 * Smart TV Multi-Channel LAN Digital Signage System
 * TV Player Display Engine (Optimized for 24/7 Stability & Hardware Canvas Rendering)
 * Supports: Real-Time LAN Sync, Live Canvas Double-Buffer, Freeze Lock, Multi-Language (TH/EN/JA)
 * Compatible with: Legacy Smart TVs (Samsung Tizen 2.3+, LG webOS 2.0+, Android TV, Safari, Chrome)
 * 
 * @author mamabuncho <mamabuncho@gmail.com>
 * @copyright 2026 mamabuncho. All rights reserved.
 */

var tvTranslations = {
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

// Robust Query Parameter Extractor (Compatible back to Chrome 30 / Tizen 2.3)
function getQueryParam(name) {
  if (typeof window === 'undefined' || !window.location) return null;
  if (typeof URLSearchParams !== 'undefined') {
    try {
      var sp = new URLSearchParams(window.location.search);
      var val = sp.get(name);
      if (val !== null) return val;
    } catch (e) {}
  }
  var regex = new RegExp('[?&]' + name + '=([^&#]*)', 'i');
  var match = regex.exec(window.location.search || '');
  return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : null;
}

function getTvLang() {
  var queryParam = getQueryParam('lang');
  if (queryParam && tvTranslations[queryParam]) return queryParam;
  try {
    var stored = localStorage.getItem('smarttv_lang');
    if (stored && tvTranslations[stored]) return stored;
  } catch (e) {}
  return 'th';
}

function tvT(key) {
  var lang = getTvLang();
  return (tvTranslations[lang] && tvTranslations[lang][key]) || tvTranslations.th[key] || '';
}

function getTargetChannelId() {
  var queryParam = getQueryParam('channel');
  if (queryParam && /^\d+$/.test(queryParam)) {
    return queryParam;
  }
  var match = (window.location.pathname || '').match(/\/tv\/(\d+)/);
  if (match) {
    return match[1];
  }
  return '1';
}

// Universal HTTP JSON Fetcher (Supports Fetch API and XMLHttpRequest Fallback)
function safeFetchJson(url, callback) {
  if (window.fetch) {
    window.fetch(url)
      .then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function(data) {
        callback(null, data);
      })
      .catch(function(err) {
        callback(err, null);
      });
  } else {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            var parsed = JSON.parse(xhr.responseText);
            callback(null, parsed);
          } catch (e) {
            callback(e, null);
          }
        } else {
          callback(new Error('HTTP ' + xhr.status), null);
        }
      }
    };
    xhr.send(null);
  }
}

var channelId = getTargetChannelId();
var STORAGE_KEY = 'signage_manifest_ch_' + channelId;
var SESSION_START_TIME = Date.now();
var MAX_SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24-hour maintenance soft reload

var playlist = [];
var currentIndex = -1;
var activeSlot = 'A'; // 'A' or 'B'
var timerId = null;
var eventSource = null;
var sseRetryDelay = 3000;
var isPlaying = false;
var pendingNewPlaylist = null;
var wakeLockSentinel = null;
var isFrozen = false;
var isLiveMode = false;
var currentChannelName = tvT('channelPrefix') + channelId;

// DOM Elements
var slotA = document.getElementById('slotA');
var slotB = document.getElementById('slotB');
var imgA = document.getElementById('imgA');
var imgB = document.getElementById('imgB');
var vidA = document.getElementById('vidA');
var vidB = document.getElementById('vidB');
var standbyScreen = document.getElementById('standby-screen');
var standbyTitle = document.getElementById('standby-title');
var standbyBadge = document.getElementById('standby-badge');
var fsBtn = document.getElementById('fs-btn');
var netWarning = document.getElementById('net-warning');
var antiSleepVideo = document.getElementById('anti-sleep-video');
var liveLayer = document.getElementById('live-layer');
var liveStreamCanvas = document.getElementById('live-stream-canvas');
var freezeIndicator = document.getElementById('freeze-indicator');

var liveCanvasCtx = null;
if (liveStreamCanvas) {
  try {
    liveCanvasCtx = liveStreamCanvas.getContext('2d', { alpha: false });
  } catch (e) {
    try {
      liveCanvasCtx = liveStreamCanvas.getContext('2d');
    } catch (e2) {}
  }
}

// Set asynchronous decoding on image elements if supported
if (imgA && 'decoding' in imgA) imgA.decoding = 'async';
if (imgB && 'decoding' in imgB) imgB.decoding = 'async';

function init() {
  updateChannelNameDisplay(currentChannelName);
  setupIdleCursor();

  // Apply localized labels
  var descEl = document.querySelector('.standby-desc');
  if (descEl) descEl.textContent = tvT('standbyDesc');
  var tipEl = document.querySelector('.standby-tip');
  if (tipEl) tipEl.innerHTML = tvT('standbyTip');
  if (fsBtn) fsBtn.textContent = tvT('fullscreen');
  if (freezeIndicator) freezeIndicator.textContent = tvT('freeze');
  var liveText = document.querySelector('.live-text');
  if (liveText) liveText.textContent = tvT('live');
  if (netWarning) netWarning.textContent = tvT('netWarning');

  if (fsBtn) {
    fsBtn.addEventListener('click', toggleFullscreen);
  }
  window.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'f' || e.keyCode === 13) {
      toggleFullscreen();
    }
  });

  var container = document.getElementById('player-container');
  if (container) {
    container.addEventListener('dblclick', toggleFullscreen);
  }

  // Load cached playlist from localStorage immediately for offline boot resilience
  try {
    var cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      var parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        playlist = parsed;
        window.playlist = parsed;
        hideStandbyScreen();
        playNextItem();
      }
    }
  } catch (e) {
    console.warn('Failed to parse cached playlist:', e);
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
    standbyTitle.textContent = '📺 ' + currentChannelName;
  }
  document.title = currentChannelName + ' - Smart TV Display';
}

function toggleFullscreen() {
  try {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      var el = document.documentElement;
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(function() {});
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(function() {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  } catch (e) {
    console.warn('Fullscreen request bypassed:', e);
  }
}

// Auto-hide cursor and fullscreen button when idle
var idleTimer = null;
function setupIdleCursor() {
  var resetIdle = function() {
    document.body.classList.remove('hide-cursor');
    if (fsBtn) fsBtn.classList.remove('idle-hide');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function() {
      document.body.classList.add('hide-cursor');
      if (fsBtn) fsBtn.classList.add('idle-hide');
    }, 3500);
  };

  window.addEventListener('mousemove', resetIdle, { passive: true });
  window.addEventListener('touchstart', resetIdle, { passive: true });
  resetIdle();
}

// Anti-Sleep Lock (Compatible with WakeLock API and canvas stream video fallback)
function initAntiSleep() {
  if ('wakeLock' in navigator && navigator.wakeLock && navigator.wakeLock.request) {
    try {
      navigator.wakeLock.request('screen').then(function(sentinel) {
        wakeLockSentinel = sentinel;
        sentinel.addEventListener('release', function() {
          wakeLockSentinel = null;
        });
      }).catch(function() {});
      return;
    } catch (e) {}
  }

  if (!wakeLockSentinel && antiSleepVideo) {
    try {
      if (!antiSleepVideo.srcObject) {
        var canvas = document.createElement('canvas');
        canvas.width = 4;
        canvas.height = 4;
        var ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, 4, 4);
        }

        if (canvas.captureStream) {
          antiSleepVideo.srcObject = canvas.captureStream(0.5);
        }
      }
      var playPromise = antiSleepVideo.play();
      if (playPromise && playPromise.catch) {
        playPromise.catch(function() {});
      }
    } catch (e) {
      console.warn('Anti-sleep fallback bypassed:', e);
    }
  }
}

document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible') {
    initAntiSleep();
  }
});

function fetchChannelData() {
  safeFetchJson('/api/channels/' + channelId, function(err, data) {
    if (err) {
      console.warn('Offline or server unreachable, relying on cached playlist:', err);
      return;
    }
    if (data) {
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
  });
}

function updatePlaylist(newItems) {
  if (!newItems || newItems.length === 0) {
    playlist = [];
    window.playlist = [];
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    clearTimeout(timerId);
    isPlaying = false;
    showStandbyScreen();
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
  } catch (e) {}
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
    var currentItem = playlist[currentIndex] || playlist[0];
    var duration = (currentItem && currentItem.duration) ? Number(currentItem.duration) : 10;
    var durationMs = Math.max(2, duration || 10) * 1000;
    timerId = setTimeout(playNextItem, durationMs);
  }
}

// Direct Slide Override / Jump Immediately
function jumpToItem(targetIndex) {
  var idx = parseInt(targetIndex, 10);
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
  if (vidA) { try { vidA.pause(); } catch (e) {} }
  if (vidB) { try { vidB.pause(); } catch (e) {} }
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

var isDecodingFrame = false;

function handleLiveFrame(data) {
  if (!isLiveMode) {
    showLiveStream();
  }
  if (!liveStreamCanvas || !liveCanvasCtx) return;

  var blob;
  try {
    blob = (data instanceof Blob) ? data : new Blob([data], { type: 'image/jpeg' });
  } catch (e) {
    return;
  }

  // Modern browser hardware GPU decode
  if (window.createImageBitmap) {
    if (isDecodingFrame) return;
    isDecodingFrame = true;
    window.createImageBitmap(blob).then(function(bitmap) {
      try {
        if (liveStreamCanvas.width !== bitmap.width || liveStreamCanvas.height !== bitmap.height) {
          liveStreamCanvas.width = bitmap.width;
          liveStreamCanvas.height = bitmap.height;
        }
        liveCanvasCtx.drawImage(bitmap, 0, 0);
        if (bitmap.close) bitmap.close();
      } catch (drawErr) {}
      isDecodingFrame = false;
    }).catch(function() {
      isDecodingFrame = false;
      renderFrameViaImg(blob);
    });
  } else {
    renderFrameViaImg(blob);
  }
}

function renderFrameViaImg(blob) {
  if (isDecodingFrame) return;
  isDecodingFrame = true;
  var urlCreator = window.URL || window.webkitURL;
  if (!urlCreator || !urlCreator.createObjectURL) {
    isDecodingFrame = false;
    return;
  }
  var url = urlCreator.createObjectURL(blob);
  var img = new Image();
  img.onload = function() {
    try {
      if (liveStreamCanvas.width !== img.naturalWidth || liveStreamCanvas.height !== img.naturalHeight) {
        liveStreamCanvas.width = img.naturalWidth;
        liveStreamCanvas.height = img.naturalHeight;
      }
      liveCanvasCtx.drawImage(img, 0, 0);
    } catch (e) {}
    try {
      urlCreator.revokeObjectURL(url);
    } catch (e) {}
    isDecodingFrame = false;
  };
  img.onerror = function() {
    try {
      urlCreator.revokeObjectURL(url);
    } catch (e) {}
    isDecodingFrame = false;
  };
  img.src = url;
}

// Playback Rotation Loop with Zero-Leak Lifecycle & 24h Maintenance Reload
function playNextItem(forcedIndex) {
  clearTimeout(timerId);

  // 24-Hour Maintenance Reload: resets browser heap cleanly between slides
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
    if (playlist.length === 1 && (!playlist[0].mime_type || !playlist[0].mime_type.startsWith('video/')) && currentIndex === 0) {
      var currentItem = playlist[0];
      var singleDuration = (currentItem && currentItem.duration) ? Number(currentItem.duration) : 10;
      var durationMs = Math.max(2, singleDuration || 10) * 1000;
      if (!isFrozen && !isLiveMode) {
        timerId = setTimeout(playNextItem, durationMs);
      }
      return;
    }
    currentIndex = (currentIndex + 1) % playlist.length;
  }

  var item = playlist[currentIndex];
  if (!item) return;

  var targetSlot = (activeSlot === 'A') ? 'B' : 'A';
  var targetSlotEl = (targetSlot === 'A') ? slotA : slotB;
  var oldSlotEl = (targetSlot === 'A') ? slotB : slotA;

  var targetImg = (targetSlot === 'A') ? imgA : imgB;
  var targetVid = (targetSlot === 'A') ? vidA : vidB;
  var oldVid = (targetSlot === 'A') ? vidB : vidA;
  var oldImg = (targetSlot === 'A') ? imgB : imgA;

  var isVideo = item.mime_type && item.mime_type.startsWith('video/');

  if (isVideo) {
    if (antiSleepVideo && !antiSleepVideo.paused) {
      try { antiSleepVideo.pause(); } catch (e) {}
    }

    targetImg.classList.remove('visible');
    targetVid.classList.add('visible');

    targetVid.src = item.url;
    targetVid.muted = true;
    targetVid.playsInline = true;

    targetVid.onended = function() {
      if (!isFrozen && !isLiveMode) {
        playNextItem();
      }
    };

    targetVid.onerror = function(e) {
      console.error('Video decode error, advancing:', e);
      if (!isFrozen && !isLiveMode) {
        timerId = setTimeout(playNextItem, 2000);
      }
    };

    var playProm = targetVid.play();
    if (playProm && playProm.then) {
      playProm.then(function() {
        performCrossFade(targetSlotEl, oldSlotEl, oldVid, oldImg);
        activeSlot = targetSlot;
      }).catch(function(err) {
        console.warn('Autoplay failed, falling back to timer:', err);
        performCrossFade(targetSlotEl, oldSlotEl, oldVid, oldImg);
        activeSlot = targetSlot;
        if (!isFrozen && !isLiveMode) {
          timerId = setTimeout(playNextItem, (item.duration || 10) * 1000);
        }
      });
    } else {
      performCrossFade(targetSlotEl, oldSlotEl, oldVid, oldImg);
      activeSlot = targetSlot;
    }
  } else {
    if (antiSleepVideo && antiSleepVideo.paused && !wakeLockSentinel) {
      try {
        var p = antiSleepVideo.play();
        if (p && p.catch) p.catch(function() {});
      } catch (e) {}
    }

    targetVid.classList.remove('visible');
    targetImg.classList.add('visible');

    var handled = false;
    var onImageLoaded = function() {
      if (handled) return;
      handled = true;
      targetImg.onload = null;
      targetImg.onerror = null;

      performCrossFade(targetSlotEl, oldSlotEl, oldVid, oldImg);
      activeSlot = targetSlot;

      if (!isFrozen && !isLiveMode) {
        var itemDuration = (item && item.duration) ? Number(item.duration) : 10;
        var durationMs = Math.max(2, itemDuration || 10) * 1000;
        timerId = setTimeout(playNextItem, durationMs);
      }
    };

    targetImg.onload = onImageLoaded;
    targetImg.onerror = function() {
      if (handled) return;
      handled = true;
      targetImg.onload = null;
      targetImg.onerror = null;
      console.error('Image load failed:', item.url);
      if (!isFrozen && !isLiveMode) {
        timerId = setTimeout(playNextItem, 2000);
      }
    };

    targetImg.src = item.url;

    if (targetImg.complete && targetImg.naturalWidth > 0) {
      onImageLoaded();
    }
  }
}

// Hardware-Accelerated CSS Cross-Fade Transition & Complete Surface Purge
function performCrossFade(targetSlotEl, oldSlotEl, oldVid, oldImg) {
  if (targetSlotEl) {
    targetSlotEl.classList.remove('inactive');
    targetSlotEl.classList.add('active');
  }

  if (oldSlotEl) {
    oldSlotEl.classList.remove('active');
    oldSlotEl.classList.add('inactive');
  }

  setTimeout(function() {
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
  if (standbyScreen) {
    standbyScreen.classList.remove('hidden');
  }
}

function hideStandbyScreen() {
  if (standbyScreen) {
    standbyScreen.classList.add('hidden');
  }
}

// Dual-Protocol Real-Time Sync (WebSocket primary, SSE fallback)
var realTimeConn = null;
var useWebSocket = true;

function initRealTimeSync() {
  if (useWebSocket && ('WebSocket' in window || 'MozWebSocket' in window)) {
    initWebSocket();
  } else {
    initSSE();
  }
}

function initWebSocket() {
  if (realTimeConn) {
    try { realTimeConn.close(); } catch (e) {}
    realTimeConn = null;
  }

  var protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  var wsUrl = protocol + '//' + window.location.host + '/ws/channels/' + channelId;

  try {
    var WSClass = window.WebSocket || window.MozWebSocket;
    var ws = new WSClass(wsUrl);
    ws.binaryType = 'arraybuffer';
    realTimeConn = ws;

    ws.onopen = function() {
      console.log('WebSocket connected for channel ' + channelId);
      sseRetryDelay = 3000;
      if (netWarning) netWarning.classList.add('hidden');
      if (standbyBadge) {
        standbyBadge.className = 'standby-badge connected';
        standbyBadge.textContent = tvT('connected');
      }
      if (window.__tvReport) {
        window.__tvReport('info', 'TV connected to channel ' + channelId + ' via WebSocket');
      }
    };

    ws.onmessage = function(event) {
      // Binary Frame = Live Screen Stream JPEG
      if (event.data instanceof ArrayBuffer || (window.Blob && event.data instanceof Blob)) {
        handleLiveFrame(event.data);
        return;
      }

      // JSON Control Messages
      try {
        var msg = JSON.parse(event.data);
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
          case 'force_reload':
            window.location.reload();
            break;
        }
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    ws.onerror = function() {
      if (ws.readyState !== 1) { // 1 = OPEN
        console.warn('WebSocket connection failed, falling back to SSE...');
        useWebSocket = false;
        try { ws.close(); } catch (e) {}
        realTimeConn = null;
        initSSE();
      }
    };

    ws.onclose = function(e) {
      if (!useWebSocket) return;
      console.warn('WebSocket closed, retrying in ' + (sseRetryDelay / 1000).toFixed(1) + 's...');
      if (netWarning) netWarning.classList.remove('hidden');
      if (standbyBadge) {
        standbyBadge.className = 'standby-badge offline';
        standbyBadge.textContent = tvT('offline');
      }
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
    try { realTimeConn.close(); } catch (e) {}
    realTimeConn = null;
  }

  if (typeof EventSource === 'undefined') {
    console.warn('EventSource is not supported on this TV. Using polling fallback.');
    startPollingFallback();
    return;
  }

  try {
    var es = new EventSource('/api/channels/' + channelId + '/events');
    realTimeConn = es;

    es.addEventListener('connected', function(e) {
      console.log('SSE connected for channel ' + channelId);
      sseRetryDelay = 3000;
      if (netWarning) netWarning.classList.add('hidden');
      if (standbyBadge) {
        standbyBadge.className = 'standby-badge connected';
        standbyBadge.textContent = tvT('connected');
      }
      if (window.__tvReport) {
        window.__tvReport('info', 'TV connected to channel ' + channelId + ' via SSE');
      }
      try {
        var data = JSON.parse(e.data);
        if (typeof data.frozen === 'boolean') setFrozen(data.frozen);
        if (data.is_live) showLiveStream();
      } catch (err) {}
    });

    es.addEventListener('playlist_update', function(e) {
      try {
        var data = JSON.parse(e.data);
        console.log('Received playlist_update via SSE:', data);
        updatePlaylist(data.items || []);
      } catch (err) {
        console.error('Error parsing SSE playlist_update:', err);
      }
    });

    es.addEventListener('jump_to_item', function(e) {
      try {
        var data = JSON.parse(e.data);
        if (typeof data.index === 'number') {
          jumpToItem(data.index);
        }
      } catch (err) {
        console.error('Error parsing SSE jump_to_item:', err);
      }
    });

    es.addEventListener('freeze_toggle', function(e) {
      try {
        var data = JSON.parse(e.data);
        if (typeof data.frozen === 'boolean') {
          setFrozen(data.frozen);
        }
      } catch (err) {
        console.error('Error parsing SSE freeze_toggle:', err);
      }
    });

    es.addEventListener('channel_renamed', function(e) {
      try {
        var data = JSON.parse(e.data);
        if (data.name) {
          updateChannelNameDisplay(data.name);
        }
      } catch (err) {
        console.error('Error parsing SSE channel_renamed:', err);
      }
    });

    es.addEventListener('live_start', function() {
      showLiveStream();
    });

    es.addEventListener('live_stop', function() {
      hideLiveStream();
    });

    es.addEventListener('force_reload', function() {
      window.location.reload();
    });

    es.onerror = function() {
      console.warn('SSE connection dropped, retrying in ' + (sseRetryDelay / 1000).toFixed(1) + 's...');
      if (netWarning) netWarning.classList.remove('hidden');
      if (standbyBadge) {
        standbyBadge.className = 'standby-badge offline';
        standbyBadge.textContent = tvT('offline');
      }
      try { es.close(); } catch (e) {}
      realTimeConn = null;

      setTimeout(initRealTimeSync, sseRetryDelay);
      sseRetryDelay = Math.min(30000, Math.floor(sseRetryDelay * 1.5 + Math.random() * 1000));
    };
  } catch (err) {
    console.error('SSE init error:', err);
    startPollingFallback();
  }
}

// Fallback polling for very old Smart TVs without WebSocket or EventSource
var pollingTimer = null;
function startPollingFallback() {
  if (pollingTimer) clearInterval(pollingTimer);
  console.log('Initiating HTTP polling fallback for legacy TV...');
  if (standbyBadge) {
    standbyBadge.className = 'standby-badge connected';
    standbyBadge.textContent = tvT('connected') + ' (Polling)';
  }
  pollingTimer = setInterval(function() {
    fetchChannelData();
  }, 5000);
}
