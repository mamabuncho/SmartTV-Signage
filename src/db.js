/**
 * Smart TV Multi-Channel LAN Digital Signage System
 * Persistent JSON Database & Manifest Storage Engine
 * 
 * @author mamabuncho <mamabuncho@gmail.com>
 * @copyright 2026 mamabuncho. All rights reserved.
 * @license MIT
 */

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

const STORAGE_DIR = path.resolve(process.cwd(), 'storage');
const MEDIA_DIR = path.resolve(STORAGE_DIR, 'media');
const DATA_FILE = path.resolve(STORAGE_DIR, 'data.json');

const DEFAULT_DATA = {
  channels: [
    { id: 1, name: 'Channel 1 (Room 1)', resolution: '1920x1080' },
    { id: 2, name: 'Channel 2 (Room 2)', resolution: '1920x1080' },
    { id: 3, name: 'Channel 3 (Room 3)', resolution: '1920x1080' },
    { id: 4, name: 'Channel 4 (Room 4)', resolution: '1920x1080' },
    { id: 5, name: 'Channel 5 (Room 5)', resolution: '1920x1080' },
    { id: 6, name: 'Channel 6 (Room 6)', resolution: '1920x1080' }
  ],
  media_assets: {},
  playlists: {
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: []
  }
};

let memoryCache = null;

export async function initDb() {
  if (!fsSync.existsSync(STORAGE_DIR)) {
    fsSync.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  if (!fsSync.existsSync(MEDIA_DIR)) {
    fsSync.mkdirSync(MEDIA_DIR, { recursive: true });
  }

  if (!fsSync.existsSync(DATA_FILE)) {
    await saveDb(DEFAULT_DATA);
    memoryCache = JSON.parse(JSON.stringify(DEFAULT_DATA));
  } else {
    try {
      const raw = await fs.readFile(DATA_FILE, 'utf-8');
      memoryCache = JSON.parse(raw);
    } catch {
      memoryCache = JSON.parse(JSON.stringify(DEFAULT_DATA));
      await saveDb(memoryCache);
    }
  }
  return memoryCache;
}

export async function getDb() {
  if (!memoryCache) {
    await initDb();
  }
  return memoryCache;
}

export async function saveDb(data) {
  memoryCache = data;
  const tmpFile = `${DATA_FILE}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  await fs.writeFile(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
  await fs.rename(tmpFile, DATA_FILE);
}

export async function getChannels() {
  const db = await getDb();
  return db.channels.map(ch => {
    const playlist = db.playlists[ch.id] || [];
    const totalDuration = playlist.reduce((acc, item) => acc + (Number(item.duration) || 10), 0);
    return {
      ...ch,
      item_count: playlist.length,
      total_duration: Number(totalDuration.toFixed(1))
    };
  });
}

export async function getChannel(channelId) {
  const db = await getDb();
  const idNum = Number(channelId);
  const ch = db.channels.find(c => c.id === idNum);
  if (!ch) return null;

  const rawItems = db.playlists[idNum] || [];
  const items = rawItems.map((item, idx) => {
    const asset = db.media_assets[item.asset_id] || {
      filename: 'unknown',
      original_name: 'Missing Asset',
      mime_type: 'image/jpeg'
    };
    return {
      id: `item_${idx + 1}`,
      asset_id: item.asset_id,
      url: `/media/${asset.filename}`,
      original_name: asset.original_name,
      mime_type: asset.mime_type,
      width: asset.width || 1920,
      height: asset.height || 1080,
      duration: Number(item.duration) || 10,
      order: idx
    };
  });

  return {
    ...ch,
    items
  };
}

export async function updateChannelName(channelId, name) {
  const db = await getDb();
  const idNum = Number(channelId);
  const ch = db.channels.find(c => c.id === idNum);
  if (!ch) {
    throw new Error(`Channel ${channelId} not found`);
  }
  ch.name = (name || '').trim() || `Channel ${idNum}`;
  await saveDb(db);
  return ch;
}

export async function updateChannelPlaylist(channelId, items) {
  const db = await getDb();
  const idNum = Number(channelId);
  if (!db.channels.some(c => c.id === idNum)) {
    throw new Error(`Channel ${channelId} not found`);
  }

  // Validate items
  const cleanItems = items.map((it, idx) => ({
    asset_id: String(it.asset_id),
    duration: Math.max(1, Number(it.duration) || 10),
    order: idx
  }));

  db.playlists[idNum] = cleanItems;
  await saveDb(db);
  return getChannel(idNum);
}

export async function saveMediaAsset(asset) {
  const db = await getDb();
  db.media_assets[asset.id] = {
    id: asset.id,
    filename: asset.filename,
    original_name: asset.original_name,
    mime_type: asset.mime_type,
    byte_size: asset.byte_size,
    width: asset.width,
    height: asset.height,
    duration: asset.duration,
    created_at: asset.created_at || new Date().toISOString()
  };
  await saveDb(db);
  return db.media_assets[asset.id];
}

export async function cleanupOrphanedMedia() {
  const db = await getDb();
  const referencedAssetIds = new Set();
  for (const list of Object.values(db.playlists)) {
    for (const it of list) {
      referencedAssetIds.add(it.asset_id);
    }
  }

  // Find unused asset IDs
  const allAssetIds = Object.keys(db.media_assets);
  for (const assetId of allAssetIds) {
    if (!referencedAssetIds.has(assetId)) {
      const asset = db.media_assets[assetId];
      if (asset && asset.filename) {
        const filePath = path.resolve(MEDIA_DIR, asset.filename);
        try {
          if (fsSync.existsSync(filePath)) {
            await fs.unlink(filePath);
          }
        } catch (e) {
          console.error(`Failed to delete orphaned file ${filePath}:`, e);
        }
      }
      delete db.media_assets[assetId];
    }
  }
  await saveDb(db);
}

export { STORAGE_DIR, MEDIA_DIR, DATA_FILE };
