/**
 * Smart TV Multi-Channel LAN Digital Signage System
 * Core Fastify HTTP & WebSocket Real-Time Server
 * 
 * @author mamabuncho <mamabuncho@gmail.com>
 * @copyright 2026 mamabuncho. All rights reserved.
 * @license MIT
 */

import path from 'node:path';
import os from 'node:os';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import fastifyCors from '@fastify/cors';

import { initDb, MEDIA_DIR } from './db.js';
import { registerApiRoutes } from './routes/api.js';
import { setupWebSocketServer } from './sse.js';

export async function buildServer() {
  const fastify = Fastify({
    logger: false,
    disableRequestLogging: true,
    ignoreTrailingSlash: true
  });

  // Enable CORS for local network flexibility
  await fastify.register(fastifyCors, {
    origin: true
  });

  // Enable multipart upload with 500MB maximum file size limit
  await fastify.register(fastifyMultipart, {
    limits: {
      fileSize: 500 * 1024 * 1024 // 500MB
    }
  });

  // Initialize JSON Database
  await initDb();

  // Register REST & SSE API routes
  await registerApiRoutes(fastify);

  // Setup WebSocket Real-Time Sync on underlying HTTP server
  setupWebSocketServer(fastify.server);

  // Serve uploaded media files with immutable caching headers and byte-range support
  await fastify.register(fastifyStatic, {
    root: MEDIA_DIR,
    prefix: '/media/',
    decorateReply: false,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Accept-Ranges', 'bytes');
    }
  });

  // Serve static public assets (Admin Dashboard and TV Player)
  const publicDir = path.resolve(process.cwd(), 'public');
  await fastify.register(fastifyStatic, {
    root: publicDir,
    prefix: '/',
    decorateReply: true
  });

  // Friendly Route Aliases
  fastify.get('/admin', async (req, reply) => {
    return reply.sendFile('admin/index.html');
  });

  fastify.get('/tv/:id', async (req, reply) => {
    const { id } = req.params;
    console.log(`[HTTP TV-ACCESS] IP: ${req.ip} -> /tv/${id} | User-Agent: ${req.headers['user-agent'] || 'unknown'}`);
    if (id.includes('.')) {
      return reply.sendFile(`tv/${id}`);
    }
    return reply.sendFile('tv/index.html');
  });

  fastify.get('/favicon.ico', async (req, reply) => {
    return reply.code(204).send();
  });

  fastify.get('/', async (req, reply) => {
    return reply.redirect('/admin');
  });

  return fastify;
}

export function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254.')) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  const server = await buildServer();
  try {
    await server.listen({ port: PORT, host: HOST });
    const localIps = getLocalIpAddresses();

    console.log('===============================================================');
    console.log('   LAN Digital Signage Server is Running!                      ');
    console.log('===============================================================');
    console.log(` * Local Host Access: http://localhost:${PORT}/admin`);
    if (localIps.length > 0) {
      console.log('\n * TV & LAN Control URLs:');
      for (const ip of localIps) {
        console.log(`   - Admin Dashboard: http://${ip}:${PORT}/admin`);
        console.log(`   - Smart TV Channel 1: http://${ip}:${PORT}/tv/1`);
        console.log(`   - Smart TV Channel 2: http://${ip}:${PORT}/tv/2`);
        console.log(`   - Smart TV Channel 3: http://${ip}:${PORT}/tv/3`);
        console.log(`   - Smart TV Channel 4: http://${ip}:${PORT}/tv/4`);
        console.log(`   - Smart TV Channel 5: http://${ip}:${PORT}/tv/5`);
        console.log(`   - Smart TV Channel 6: http://${ip}:${PORT}/tv/6`);
      }
    }
    console.log('===============================================================');
  } catch (err) {
    console.error('Server failed to start:', err);
    process.exit(1);
  }
}
