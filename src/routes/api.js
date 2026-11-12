import { getChannels, getChannel, updateChannelPlaylist, updateChannelName, cleanupOrphanedMedia } from '../db.js';
import { processUploadedFile } from '../media.js';
import {
  registerClient,
  broadcastPlaylistUpdate,
  broadcastChannelRenamed,
  broadcastJumpToItem,
  broadcastFreeze,
  isChannelFrozen,
  setChannelFrozen,
  isChannelLive,
  getChannelClientCount,
  getTotalClientCount
} from '../sse.js';

export async function registerApiRoutes(fastify) {
  // System health & memory telemetry
  fastify.get('/api/system/health', async () => {
    const mem = process.memoryUsage();
    return {
      status: 'ok',
      uptime_seconds: Math.floor(process.uptime()),
      memory: {
        rss_mb: Number((mem.rss / 1024 / 1024).toFixed(1)),
        heap_used_mb: Number((mem.heapUsed / 1024 / 1024).toFixed(1)),
        heap_total_mb: Number((mem.heapTotal / 1024 / 1024).toFixed(1))
      },
      connected_screens: getTotalClientCount()
    };
  });

  // List all channels
  fastify.get('/api/channels', async () => {
    const channels = await getChannels();
    return channels.map(ch => ({
      ...ch,
      online: getChannelClientCount(ch.id) > 0,
      client_count: getChannelClientCount(ch.id),
      frozen: isChannelFrozen(ch.id),
      is_live: isChannelLive(ch.id)
    }));
  });

  // Get specific channel with items
  fastify.get('/api/channels/:id', async (request, reply) => {
    const { id } = request.params;
    const channel = await getChannel(id);
    if (!channel) {
      return reply.code(404).send({ error: `Channel ${id} not found` });
    }
    return {
      ...channel,
      online: getChannelClientCount(id) > 0,
      client_count: getChannelClientCount(id),
      frozen: isChannelFrozen(id),
      is_live: isChannelLive(id)
    };
  });

  // Rename a channel
  fastify.post('/api/channels/:id/rename', async (request, reply) => {
    const { id } = request.params;
    const body = request.body || {};
    const name = String(body.name || '').trim();
    if (!name) {
      return reply.code(400).send({ error: 'ชื่อช่องต้องไม่ว่างเปล่า' });
    }

    try {
      const updated = await updateChannelName(id, name);
      broadcastChannelRenamed(id, updated.name);
      return { success: true, channel: updated };
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // Batch update duration for all items in channel
  fastify.post('/api/channels/:id/duration/batch', async (request, reply) => {
    const { id } = request.params;
    const body = request.body || {};
    const duration = Math.max(1, parseFloat(body.duration) || 10);

    try {
      const channel = await getChannel(id);
      if (!channel) {
        return reply.code(404).send({ error: `Channel ${id} not found` });
      }

      const items = (channel.items || []).map(it => ({
        asset_id: it.asset_id,
        duration: duration
      }));

      const updated = await updateChannelPlaylist(id, items);
      broadcastPlaylistUpdate(id, updated);
      return {
        success: true,
        duration,
        updated_items: updated.items.length,
        channel: updated
      };
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // Jump to specific slide immediately
  fastify.post('/api/channels/:id/jump', async (request, reply) => {
    const { id } = request.params;
    const body = request.body || {};
    const index = parseInt(body.index, 10);
    if (isNaN(index) || index < 0) {
      return reply.code(400).send({ error: 'Index must be non-negative integer' });
    }

    try {
      const notified = broadcastJumpToItem(id, index, body.asset_id);
      return { success: true, channel_id: Number(id), index, notified_screens: notified };
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // Toggle freeze/lock state for channel
  fastify.post('/api/channels/:id/freeze', async (request, reply) => {
    const { id } = request.params;
    const body = request.body || {};
    const frozen = Boolean(body.frozen);

    try {
      setChannelFrozen(id, frozen);
      const notified = broadcastFreeze(id, frozen);
      return { success: true, channel_id: Number(id), frozen, notified_screens: notified };
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // Update channel playlist items
  fastify.post('/api/channels/:id/playlist', async (request, reply) => {
    const { id } = request.params;
    const body = request.body || {};
    const items = Array.isArray(body.items) ? body.items : [];

    try {
      const updatedChannel = await updateChannelPlaylist(id, items);
      // Clean up media files no longer referenced anywhere
      await cleanupOrphanedMedia();

      // Broadcast update to any connected TV screens
      const pushedCount = broadcastPlaylistUpdate(id, updatedChannel);

      return {
        success: true,
        channel: updatedChannel,
        notified_screens: pushedCount
      };
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // Upload media file (multipart)
  fastify.post('/api/media/upload', async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    try {
      const result = await processUploadedFile(data.file, data.filename, data.mimetype);
      const assets = Array.isArray(result) ? result : [result];
      const primary = assets[0];
      return reply.code(201).send({
        success: true,
        assets,
        asset_id: primary.id,
        filename: primary.filename,
        original_name: primary.original_name,
        url: `/media/${primary.filename}`,
        mime_type: primary.mime_type,
        byte_size: primary.byte_size,
        width: primary.width,
        height: primary.height,
        duration: primary.duration
      });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // SSE stream endpoint for TV screens
  fastify.get('/api/channels/:id/events', (request, reply) => {
    const { id } = request.params;
    reply.hijack();
    registerClient(id, request, reply);
  });

  // Telemetry and diagnostic logs from TV screens
  fastify.post('/api/tv-log', async (request, reply) => {
    const body = request.body || {};
    const ip = request.ip;
    const ua = body.ua || request.headers['user-agent'] || 'unknown';
    const screen = body.screen || 'unknown';
    const level = body.level || 'info';
    const message = body.message || body.error || '';
    console.log(`[TV-TELEMETRY] [${level.toUpperCase()}] IP: ${ip} | Res: ${screen} | Msg: ${message} | UA: ${ua}`);
    return { received: true };
  });
}
