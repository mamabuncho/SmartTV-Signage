# Goldfish Review: Comprehension & Re-Implementation Report (Stage 6)

* **Target:** `docs/designs/multi_channel_digital_signage.md` (FeatureRange: Lines 1–202, DetailedRange: Lines 203–250)
* **Reviewer:** `egm-comprehension` (Comprehension Auditor)
* **Standard:** `resources/document_standards/re-implementation-standard.md`
* **Date:** 2026-11-11

---

## Prioritized Findings (Blockers -> Major -> Nits)

### 1. Insecure Context (HTTP) Renders Service Worker and WakeLock Inoperable - Severity: 🔴 Blocker
* **Reviewer Lens:** `egm-comprehension`
* **Affected Scope:** Goals G3 & G6 (lines 33–36); CUJ 1 & 2 (lines 55, 60–62); Architecture (lines 102–104, 141–145); Tasks 7 & 8 (lines 225–228)
* **Discrepancy Description**: The design relies on `navigator.serviceWorker` and `navigator.wakeLock` over a local network HTTP origin (`http://192.168.1.50:8080/tv/:id`). Modern Chromium security policies restrict both APIs strictly to Secure Contexts (`window.isSecureContext === true`). On remote LAN IPs, both APIs evaluate to `undefined` and registration throws a `SecurityError`.
* **Rationale & Recommendation**: Either: (1) Replace Service Worker with native browser HTTP disk caching (`Cache-Control: public, max-age=31536000, immutable`), persist playlist manifests in `localStorage`, and use a hidden 1x1 looping video as anti-sleep fallback; OR (2) Integrate local TLS/HTTPS termination (`mkcert`) and document Android TV CA trust setup.

### 2. Missing Video Metadata Tooling & Ingestion Contract - Severity: 🔴 Blocker
* **Reviewer Lens:** `egm-comprehension`
* **Affected Scope:** Section 2.A (lines 121–128); Section 2.B (line 133); API (line 153); Tasks 1 & 3 (lines 209, 213–214)
* **Discrepancy Description**: The document requires MP4 duration detection, dimension extraction, and thumbnail generation, but the only media library listed in `package.json` is `sharp`. `sharp` is an image-only library with zero support for MP4 video parsing or duration detection.
* **Rationale & Recommendation**: Add a video metadata parser dependency (`music-metadata`, `ffprobe`, or `fluent-ffmpeg`) to `package.json` and specify the video inspection contract in `src/media.js`.

### 3. Ghost Telemetry Contract for Live Channel Monitor - Severity: 🔴 Blocker
* **Reviewer Lens:** `egm-comprehension`
* **Affected Scope:** Section 2.B (line 134); Section 3 (lines 149–162); Tasks 5 & 6 (lines 217–222)
* **Discrepancy Description**: The Admin UI specifies displaying live TV heartbeats, playing indices, and cache statuses, but the system defines strictly unidirectional Host-to-TV SSE with zero client reporting endpoints or data contracts.
* **Rationale & Recommendation**: Either define an explicit client telemetry endpoint (`POST /api/channels/:id/heartbeat`) and player reporting timer, OR remove client playback telemetry from v1 and track connectivity strictly via server-side active SSE connection counts.

### 4. App Shell Caching Omitted from Service Worker - Severity: 🟡 Major
* **Reviewer Lens:** `egm-comprehension`
* **Affected Scope:** Goal G7 (line 37); CUJ 2 & 3 (lines 59–68); Section 2.C (lines 141–144); Task 8 (line 227)
* **Discrepancy Description**: The design specifies that `sw.js` only intercepts `/media/*`. If the TV reboots while the host PC is offline, Chrome cannot fetch `/tv/:id`, `style.css`, or `player.js`, displaying a browser error page instead of running offline.
* **Rationale & Recommendation**: Implement an App Shell caching strategy in `sw.js` (pre-caching HTML, CSS, and JS files) or utilize standard browser HTTP disk caching with `localStorage` for offline manifest hydration.

### 5. Undefined REST API & SSE Wire Contracts - Severity: 🟡 Major
* **Reviewer Lens:** `egm-comprehension`
* **Affected Scope:** Section 3: API & Event Specifications (lines 147–162)
* **Discrepancy Description**: All REST endpoints and SSE events lack concrete JSON request bodies, response payloads, or error schemas.
* **Rationale & Recommendation**: Provide complete JSON request/response schemas for all endpoints.

### 6. Contradictory Upload Terminology (Chunked vs Multipart Streaming) - Severity: 🟡 Major
* **Reviewer Lens:** `egm-comprehension`
* **Affected Scope:** Section 2.B (line 131) vs Section 3 (line 153) and Task 3 (line 213)
* **Discrepancy Description**: Mentions "chunked upload with instant progress bars" while configuring standard single-request `@fastify/multipart` streaming.
* **Rationale & Recommendation**: Clarify terminology to "single-request streaming multipart upload with XMLHttpRequest progress tracking".

### 7. Timestamp in Asset Filename Destroys Content Deduplication - Severity: 🟡 Major
* **Reviewer Lens:** `egm-comprehension`
* **Affected Scope:** Section 2.A (line 124); Section 2.C (line 142); Section 3 (line 154)
* **Discrepancy Description**: Naming files `[timestamp]_[sha256_short].[ext]` breaks content-addressable deduplication across channels and forces redundant downloads.
* **Rationale & Recommendation**: Use deterministic SHA-256 hash filenames (`<sha256_16char>.<ext>`) without timestamps.

### 8. Missing SQL DDL Schemas & Seeding Records - Severity: 🟡 Major
* **Reviewer Lens:** `egm-comprehension`
* **Affected Scope:** Section 2.A (lines 125–129); Task 2 (lines 211–212)
* **Discrepancy Description**: Relational tables are described only in bullet points without SQL column types, keys, foreign key cascade rules, or seed rows.
* **Rationale & Recommendation**: Include explicit SQL DDL schemas and channel seed records in the design document.

### 9. IPC Mechanism Between Player and Service Worker Undefined - Severity: 🟡 Major
* **Reviewer Lens:** `egm-comprehension`
* **Affected Scope:** Section 2.C (lines 141–144); Tasks 7 & 8 (lines 225–227)
* **Discrepancy Description**: The document states that `sw.js` reacts to SSE updates, but Service Workers cannot maintain long-lived `EventSource` connections. The `postMessage` IPC contract between `player.js` and `sw.js` is missing.
* **Rationale & Recommendation**: Explicitly define `postMessage` protocol or simplify by managing media downloads directly in `player.js`.

### 10. Harmonize Supported Image Formats - Severity: 🟢 Nit
* **Reviewer Lens:** `egm-comprehension`
* **Affected Scope:** Section 2 (lines 13, 31) vs (lines 42, 123)
* **Discrepancy Description**: Inconsistently references "JPEG" in some sections and "JPEG and PNG" in others.
* **Rationale & Recommendation**: Standardize on "JPEG and PNG image slides".

### 11. Open Questions Retained in Approved Document - Severity: 🟢 Nit
* **Reviewer Lens:** `egm-comprehension`
* **Affected Scope:** Status (line 4); Open Questions OQ1 & OQ2 (lines 47–51)
* **Discrepancy Description**: OQ1 (cache limit) and OQ2 (audio policy) remain open in a document marked "Approved".
* **Rationale & Recommendation**: Formally resolve OQ1 (2GB LRU cap) and OQ2 (default muted autoplay).

### 12. MediaCodec Teardown Sequence in Chromium - Severity: 🟢 Nit
* **Reviewer Lens:** `egm-comprehension`
* **Affected Scope:** Section 2.C (line 140)
* **Discrepancy Description**: `src = ""` does not reliably release video decoders in Chromium on Android TV.
* **Rationale & Recommendation**: Use `video.pause(); video.removeAttribute('src'); video.load();`.
