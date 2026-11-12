/**
 * Smart TV Multi-Channel LAN Digital Signage System
 * Dual-Protocol Real-Time Sync Engine (WebSocket + SSE Fallback)
 * 
 * @author mamabuncho <mamabuncho@gmail.com>
 * @copyright 2026 mamabuncho. All rights reserved.
 * @license MIT
 */

import { WebSocketServer } from 'ws';

const channelWsClients = new Map(); // channelId -> Set of ws clients
const channelSseClients = new Map(); // channelId -> Set of reply objects
const channelFrozenState = new Map(); // channelId -> boolean
const channelLiveState = new Map(); // channelId -> boolean
let currentAdminLiveWs = null;

for (let i = 1; i <= 6; i++) {
  channelWsClients.set(i, new Set());
  channelSseClients.set(i, new Set());
  channelFrozenState.set(i, false);
  channelLiveState.set(i, false);
}

export function isChannelFrozen(channelId) {
  return Boolean(channelFrozenState.get(Number(channelId)));
}

export function setChannelFrozen(channelId, frozen) {
  channelFrozenState.set(Number(channelId), Boolean(frozen));
}

export function isChannelLive(channelId) {
  return Boolean(channelLiveState.get(Number(channelId)));
}

export function setChannelLive(channelId, isLive) {
  channelLiveState.set(Number(channelId), Boolean(isLive));
}

// 30-second keep-alive loop for SSE
const ssePingInterval = setInterval(() => {
  const pingMsg = `event: ping\ndata: ${Date.now()}\n\n`;
  for (const [, clients] of channelSseClients.entries()) {
    for (const reply of clients) {
      if (reply.raw.destroyed || !reply.raw.writable) {
        clients.delete(reply);
        continue;
      }
      try {
        reply.raw.write(pingMsg);
      } catch {
        clients.delete(reply);
      }
    }
  }
}, 30000);

if (ssePingInterval.unref) {
  ssePingInterval.unref();
}

// WebSocket Server Integration on Fastify's native http.Server
export function setupWebSocketServer(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
      
      // 1. TV Screen Channel WebSocket: /ws/channels/:id
      const chMatch = url.pathname.match(/^\/ws\/channels\/(\d+)$/);
      if (chMatch) {
        const chNum = Number(chMatch[1]);
        wss.handleUpgrade(request, socket, head, (ws) => {
          if (!channelWsClients.has(chNum)) {
            channelWsClients.set(chNum, new Set());
          }
          const clients = channelWsClients.get(chNum);
          clients.add(ws);

          // Send initial connection event with current channel state
          ws.send(JSON.stringify({
            event: 'connected',
            data: {
              channel_id: chNum,
              time: Date.now(),
              frozen: isChannelFrozen(chNum),
              is_live: isChannelLive(chNum)
            }
          }));

          // Listen for WebRTC signals from TV to relay back to Admin
          ws.on('message', (raw) => {
            try {
              const msg = JSON.parse(raw.toString('utf-8'));
              if (msg.event === 'webrtc_answer' || msg.event === 'webrtc_candidate') {
                if (currentAdminLiveWs && currentAdminLiveWs.readyState === currentAdminLiveWs.OPEN) {
                  currentAdminLiveWs.send(JSON.stringify({
                    event: msg.event,
                    channel_id: chNum,
                    data: msg.data
                  }));
                }
              }
            } catch {}
          });

          const cleanup = () => {
            clients.delete(ws);
          };

          ws.on('close', cleanup);
          ws.on('error', cleanup);
        });
        return;
      }

      // 2. Admin Live Screen Share Broadcaster WebSocket: /ws/live
      if (url.pathname === '/ws/live') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          currentAdminLiveWs = ws;
          let target = url.searchParams.get('target') || 'all'; // 'all' or '1'..'6'
          let isStreaming = false;

          const broadcastFrame = (binaryData) => {
            if (target === 'all') {
              for (const [chId, clients] of channelWsClients.entries()) {
                for (const clientWs of clients) {
                  if (clientWs.readyState === clientWs.OPEN && clientWs.bufferedAmount < 262144) {
                    try { clientWs.send(binaryData); } catch {}
                  }
                }
              }
            } else {
              const chNum = Number(target);
              const clients = channelWsClients.get(chNum);
              if (clients) {
                for (const clientWs of clients) {
                  if (clientWs.readyState === clientWs.OPEN && clientWs.bufferedAmount < 262144) {
                    try { clientWs.send(binaryData); } catch {}
                  }
                }
              }
            }
          };

          const startLive = (newTarget) => {
            if (newTarget) target = newTarget;
            isStreaming = true;
            if (target === 'all') {
              for (let i = 1; i <= 6; i++) {
                setChannelLive(i, true);
                broadcastLiveStart(i);
              }
            } else {
              const chNum = Number(target);
              setChannelLive(chNum, true);
              broadcastLiveStart(chNum);
            }
          };

          const stopLive = () => {
            if (currentAdminLiveWs === ws) {
              currentAdminLiveWs = null;
            }
            if (!isStreaming) return;
            isStreaming = false;
            if (target === 'all') {
              for (let i = 1; i <= 6; i++) {
                setChannelLive(i, false);
                broadcastLiveStop(i);
              }
            } else {
              const chNum = Number(target);
              setChannelLive(chNum, false);
              broadcastLiveStop(chNum);
            }
          };

          const forwardSignalToTv = (targetChannel, eventName, signalData) => {
            const forwardMsg = JSON.stringify({ event: eventName, data: signalData });
            if (targetChannel === 'all') {
              for (let i = 1; i <= 6; i++) {
                const clients = channelWsClients.get(i);
                if (clients) {
                  for (const c of clients) {
                    if (c.readyState === c.OPEN) {
                      try { c.send(forwardMsg); } catch {}
                    }
                  }
                }
              }
            } else {
              const chNum = Number(targetChannel);
              const clients = channelWsClients.get(chNum);
              if (clients) {
                for (const c of clients) {
                  if (c.readyState === c.OPEN) {
                    try { c.send(forwardMsg); } catch {}
                  }
                }
              }
            }
          };

          ws.on('message', (message, isBinary) => {
            if (isBinary) {
              if (!isStreaming) {
                startLive(target);
              }
              broadcastFrame(message);
            } else {
              try {
                const text = message.toString('utf-8');
                const data = JSON.parse(text);
                if (data.action === 'start') {
                  startLive(data.target || target);
                } else if (data.action === 'stop') {
                  stopLive();
                } else if (data.action === 'webrtc_offer' || data.action === 'webrtc_candidate') {
                  forwardSignalToTv(data.target || target, data.action, data.data);
                } else if (data.action === 'ping') {
                  ws.send(JSON.stringify({ event: 'pong', time: Date.now() }));
                }
              } catch (e) {
                console.warn('Live WS JSON parse error:', e);
              }
            }
          });

          ws.on('close', stopLive);
          ws.on('error', stopLive);

          ws.send(JSON.stringify({ event: 'ready', target }));
        });
        return;
      }

      // Neither channel nor live endpoint
      socket.destroy();
    } catch {
      socket.destroy();
    }
  });

  // Keep-alive ping loop for WebSocket clients
  const wsPingInterval = setInterval(() => {
    for (const clients of channelWsClients.values()) {
      for (const ws of clients) {
        if (ws.readyState === ws.OPEN) {
          try {
            ws.ping();
          } catch {
            clients.delete(ws);
          }
        }
      }
    }
  }, 30000);

  if (wsPingInterval.unref) {
    wsPingInterval.unref();
  }

  return wss;
}

// SSE Registration Endpoint Handler
export function registerClient(channelId, request, reply) {
  const chNum = Number(channelId);
  if (!channelSseClients.has(chNum)) {
    channelSseClients.set(chNum, new Set());
  }

  const clients = channelSseClients.get(chNum);
  clients.add(reply);

  // Set SSE HTTP headers with proxy-buffering disabled
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*'
  });

  if (typeof reply.raw.flushHeaders === 'function') {
    reply.raw.flushHeaders();
  }

  // Send initial connection event with channel state
  reply.raw.write(`event: connected\ndata: ${JSON.stringify({
    channel_id: chNum,
    time: Date.now(),
    frozen: isChannelFrozen(chNum),
    is_live: isChannelLive(chNum)
  })}\n\n`);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    clients.delete(reply);
    try {
      if (request?.raw) {
        request.raw.removeListener('close', cleanup);
        request.raw.removeListener('error', cleanup);
      }
      reply.raw.removeListener('close', cleanup);
      reply.raw.removeListener('error', cleanup);
    } catch {}
  };

  if (request?.raw) {
    request.raw.once('close', cleanup);
    request.raw.once('error', cleanup);
  }
  reply.raw.once('close', cleanup);
  reply.raw.once('error', cleanup);
}

// Generic broadcast function to BOTH WebSocket and SSE subscribers
export function broadcastEvent(channelId, event, data) {
  const chNum = Number(channelId);
  let sentCount = 0;

  // 1. Broadcast to WebSockets
  const wsClients = channelWsClients.get(chNum);
  if (wsClients && wsClients.size > 0) {
    const wsMsg = JSON.stringify({ event, data });
    for (const ws of wsClients) {
      if (ws.readyState === ws.OPEN) {
        try {
          ws.send(wsMsg);
          sentCount++;
        } catch {
          wsClients.delete(ws);
        }
      }
    }
  }

  // 2. Broadcast to SSE
  const sseClients = channelSseClients.get(chNum);
  if (sseClients && sseClients.size > 0) {
    const sseMsg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const reply of sseClients) {
      if (reply.raw.destroyed || !reply.raw.writable) {
        sseClients.delete(reply);
        continue;
      }
      try {
        reply.raw.write(sseMsg);
        sentCount++;
      } catch {
        sseClients.delete(reply);
      }
    }
  }

  return sentCount;
}

// Broadcast helpers
export function broadcastPlaylistUpdate(channelId, playlistData) {
  const chNum = Number(channelId);
  return broadcastEvent(chNum, 'playlist_update', {
    channel_id: chNum,
    version: Date.now(),
    items: playlistData.items || []
  });
}

export function broadcastChannelRenamed(channelId, name) {
  const chNum = Number(channelId);
  return broadcastEvent(chNum, 'channel_renamed', {
    channel_id: chNum,
    name
  });
}

export function broadcastJumpToItem(channelId, index, assetId) {
  const chNum = Number(channelId);
  return broadcastEvent(chNum, 'jump_to_item', {
    channel_id: chNum,
    index: Number(index),
    asset_id: assetId
  });
}

export function broadcastFreeze(channelId, frozen) {
  const chNum = Number(channelId);
  return broadcastEvent(chNum, 'freeze_toggle', {
    channel_id: chNum,
    frozen: Boolean(frozen)
  });
}

export function broadcastLiveStart(channelId) {
  const chNum = Number(channelId);
  return broadcastEvent(chNum, 'live_start', {
    channel_id: chNum,
    time: Date.now()
  });
}

export function broadcastLiveStop(channelId) {
  const chNum = Number(channelId);
  return broadcastEvent(chNum, 'live_stop', {
    channel_id: chNum,
    time: Date.now()
  });
}

export function getChannelClientCount(channelId) {
  const chNum = Number(channelId);
  const wsCount = channelWsClients.get(chNum)?.size || 0;
  const sseCount = channelSseClients.get(chNum)?.size || 0;
  return wsCount + sseCount;
}

export function getTotalClientCount() {
  let total = 0;
  for (const set of channelWsClients.values()) total += set.size;
  for (const set of channelSseClients.values()) total += set.size;
  return total;
}
