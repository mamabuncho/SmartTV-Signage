# Multi-Channel LAN Digital Signage System

* **Author:** EGM Ideation Synthesizer
* **Date:** 2026-11-11

## Overview

A lightweight, centralized web service hosted on a single local PC that manages independent digital signage channels across 4–6 Android TVs over a local Wi-Fi network. Each TV displays its designated channel through its built-in Chrome browser, executing looping playlists of JPEG slides and 1080p MP4 videos. Content assignment, slide durations, and media updates are controlled via a streamlined in-browser administrative dashboard featuring direct drag-and-drop image ingestion and visual playlist ordering on the same LAN, with physical power and initial URL navigation operated manually by staff.

## Analysis

### 1. Contrarian & YAGNI Assessment
* **Custom Engine vs. Open-Source Signage**: Platforms like Anthias (formerly Screenly OSE), Xibo, and LibreSignage solve media scheduling natively. However, they typically expect dedicated hardware players (such as Raspberry Pis) or require multi-container Docker/database deployments. A bespoke, single-binary or single-process Node.js service is justified here only if it remains strictly minimal: static asset serving with HTTP range requests, Server-Sent Events (SSE) for channel signaling, and a vanilla JavaScript dual-buffer player.
* **Continuous Streaming vs. Edge Caching**: Streaming 4–6 concurrent 1080p MP4 loops continuously over shared consumer Wi-Fi consumes 40–90 Mbps of continuous airtime, creating a high risk of stutter and frame dropping. The TV web client must use the browser's Cache Storage API and a Service Worker to prefetch media files locally, using the Wi-Fi connection only for playlist updates and differential sync.

### 2. UI/UX Ergonomics & Ingestion Mechanics
* **Direct Drag-and-Drop Workflow**: The admin interface must support native HTML5 drag-and-drop directly onto channel playlist zones. Users can drop multiple JPEG/PNG image files simultaneously without navigating nested modal dialogs.
* **Visual Reordering & Inline Controls**: Dropped assets instantly render thumbnail cards that can be reordered via drag-and-drop. Each slide card includes an inline numerical duration selector (default: 10s) and a one-click delete trigger.
* **Asset Validation & Normalization**:
  * *Format & Orientation Restrictions*: Direct image ingestion must validate MIME types (JPEG, PNG). High-resolution photos from modern smartphones must be normalized for EXIF rotation and resized to standard 1080p resolution on the server to prevent massive uncompressed textures from crashing TV browser memory.
  * *Aspect Ratio Presentation*: The TV player must apply `object-fit: contain` with clean black letterboxing by default, avoiding distorted stretch artifacts across varied display aspect ratios.

### 3. Client Runtime & Android TV Constraints
* **Browser Memory Exhaustion**: Chrome on Android TV operates under strict heap limits (typically 256MB–512MB per web view). Continuously destroying and creating `<video>` DOM nodes causes GPU texture memory leaks, terminating the browser tab within 8–24 hours. The client engine must reuse exactly two static `<video>` elements and two `<img>` elements (double-buffering pattern) with opacity transitions.
* **Autoplay & Audio Permissions**: Chromium policies block unmuted video autoplay without prior user interaction. All videos must be served with `muted` and `playsinline` attributes. A clean, single-click splash screen ("Press OK to Start") on initial boot unlocks fullscreen and media permissions cleanly.
* **Screen WakeLock**: Static JPEG slides do not trigger Android TV media activity, causing the TV to trigger its Daydream screensaver or enter sleep mode after 10–15 minutes. The web client must acquire and maintain a `navigator.wakeLock` during active display.

### 4. Server Architecture & Operational Ergonomics
* **Signaling & State Synchronization**: Bi-directional WebSockets add unnecessary state complexity. Server-Sent Events (SSE) provides lightweight, unidirectional state pushing (host to TV) with native browser auto-reconnect capabilities.
* **Host PC Network Addressing**: Consumer routers frequently reassign IP addresses via DHCP upon reboot. If the host PC's IP changes, saved TV bookmarks break. The host machine requires a static local IP configuration or local mDNS hostname binding (e.g., `http://signage.local:8080`).

## Goals vs. Non-Goals

* **In-Scope Goals:**
  * Single-process local server (Node.js/Fastify) serving static assets and range requests (`Accept-Ranges: bytes`).
  * Web-based administrative dashboard featuring drag-and-drop image and video uploads directly into channel cards.
  * Drag-to-reorder playlist management with inline display timers for static slides.
  * Server-side image optimization (EXIF auto-orientation, standardizing large images to 1080p).
  * Browser-based TV player using a dual-buffer DOM pattern for seamless, black-screen-free transitions between images and 1080p MP4 videos.
  * Client-side media pre-caching via Service Worker / Cache Storage API to prevent continuous Wi-Fi bandwidth saturation.
  * Screen WakeLock integration to prevent Android TV screensaver activation.
  * Resilient offline looping on TV clients if the host PC reboots or Wi-Fi drops temporarily.

* **Out-of-Scope Non-Goals:**
  * Native Android APK development or TV OS rooting.
  * Hardware power automation (no Wake-on-LAN, IR blasters, or TV CEC control; power and initial launch remain manual).
  * Cloud connectivity, remote WAN access, or external SaaS dependencies (100% offline LAN operation).
  * Dynamic slide generation or native `.pptx` file rendering (presentations must be pre-exported as JPEGs).
  * Complex multi-user role-based access control (single-operator admin panel).
  * Synchronized video walls or multi-screen frame-locked playback across different rooms.

## Key Decisions & Staging for Next Steps

* **Decision 1 (Admin UI/UX)**: Implement direct HTML5 drag-and-drop file ingestion directly on channel playlist cards with client-side thumbnail rendering and drag-to-reorder support.
* **Decision 2 (Asset Pipeline)**: Integrate a server-side image normalization step (e.g., `sharp`) to fix EXIF orientation and clamp oversized images to 1080p before serving to low-memory TV clients.
* **Decision 3 (Client Architecture)**: Implement a vanilla HTML5/JS dual-buffer client with Service Worker caching rather than a full frontend framework, keeping memory overhead minimal.
* **Decision 4 (Host Service)**: Package the backend as a single-process Node.js/Fastify service with SQLite (`better-sqlite3`) for channel/playlist metadata storage.
* **Decision 5 (Signaling)**: Use Server-Sent Events (SSE) for channel updates, falling back to local cached playlists when disconnected.
* **Next Steps**: Hand off approved brief to `/egm-draft` to specify exact REST/SSE endpoints, database schemas, and client state machine diagrams.
