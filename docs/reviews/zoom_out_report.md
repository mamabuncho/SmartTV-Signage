# Goldfish Review: Initial Zoom Out Review (Stage 5)

* **Target:** `docs/designs/multi_channel_digital_signage.md` (Lines 1–250)
* **Reviewer:** `egm-zoom-out` (Skeptical Architect Auditor)
* **Standard:** `resources/document_standards/zoom-out-standard.md`
* **Date:** 2026-11-11

---

## Prioritized Findings (Blockers -> Major -> Nits)

### 1. Chrome Secure Context Roadblock for Service Workers and WakeLock on LAN HTTP - Severity: 🔴 Blocker
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 55, 60, 102, 104, 141–145, 226–227, 248 (Components A, C; Goals G3, G5, G6, G7; CUJs 1, 2)
* **Discrepancy Description**: The design relies on `navigator.serviceWorker` and `navigator.wakeLock` over a local network HTTP origin (`http://192.168.1.50:8080`). Modern Chromium engines strictly disable both APIs on non-localhost HTTP origins (`isSecureContext === false`). Both APIs will evaluate to `undefined` on Android TV Chrome, causing immediate runtime crashes.
* **Rationale & Recommendation**: 
  * Eliminate the Service Worker dependency. Use standard browser HTTP disk caching via immutable cache headers (`Cache-Control: public, max-age=31536000, immutable`), and store playlist manifests in `localStorage`.
  * For sleep prevention over plain HTTP, leverage a hidden looping 1x1 video track (which does not require a Secure Context) instead of the Web WakeLock API.

### 2. Native C++ Database Dependency (`better-sqlite3`) for 4–6 Channels - Severity: 🟡 Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 80, 125–129, 209–212, 238 (Component A; Implementation Task 2; File Manifest `src/db.js`)
* **Discrepancy Description**: SQLite via `better-sqlite3` introduces a native C++ compile dependency requiring `node-gyp`, Python, and Visual Studio build tools on Windows. For exactly 6 channels and ~20–50 total assets managed by a single operator without concurrent writes, an ACID relational database violates the YAGNI principle.
* **Rationale & Recommendation**: Replace `better-sqlite3` with an atomic JSON flat-file store (`storage/data.json`) utilizing standard Node.js `fs/promises` (`write to tmp -> rename`). This eliminates native build toolchains, simplifies backups, and guarantees pure JavaScript portability across Windows environments.

### 3. Unidirectional SSE Contradicted by Bidirectional Telemetry - Severity: 🟡 Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 120, 134–135, 149–162, 185–193 (Component B; Section 3 API Specs; Alternatives Considered)
* **Discrepancy Description**: The design justifies selecting SSE over WebSockets because communication is strictly unidirectional (host to TV). However, Component B specifies that the Admin Dashboard displays per-TV current playing asset indices and client cache progress without specifying any reverse telemetry endpoints.
* **Rationale & Recommendation**: Adhere strictly to the unidirectional premise: remove per-screen asset index and cache telemetry from the Admin Dashboard for v1. Track online/offline status solely via active SSE connection counts on the server.

### 4. Service Worker Video Range Requests (HTTP 206) Complexity - Severity: 🟡 Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 119, 141–144, 226–227, 248 (Component A, C; Implementation Tasks 5, 8)
* **Discrepancy Description**: Intercepting and synthesizing partial content (HTTP 206) byte-range requests inside a Service Worker CacheStorage engine is notoriously brittle in embedded TV Chromium runtimes and causes decoder stalls. Furthermore, no cache eviction lifecycle is defined when playlists change.
* **Rationale & Recommendation**: Rely on native browser HTTP caching for media files. Serving media with immutable headers (`Cache-Control: public, max-age=31536000, immutable`) delegates byte ranges and disk cache management directly to the browser engine without brittle Service Worker code.

### 5. Unbounded Server Disk Growth & Missing Media Lifecycle - Severity: 🟡 Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 81, 122–129, 214, 239 (Component A; Media Processing Pipeline)
* **Discrepancy Description**: Prepending timestamps to filenames (`[timestamp]_[sha256_short].[ext]`) defeats deduplication. Uploading identical assets creates multiple files on disk. Additionally, there is no garbage collection mechanism for orphaned media when slides are removed from playlists.
* **Rationale & Recommendation**: Name assets strictly by their SHA-256 hash (`[sha256].[ext]`). Add an automatic garbage-collection sweep or explicit delete endpoint to unlink unused media files from disk.

### 6. Implementation Weeds in Architecture Specification - Severity: 🟢 Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 137–140, 224, 245–247 (Component C; TV Player Engine)
* **Discrepancy Description**: Prescribes micro-level DOM IDs (`#imgA`, `#imgB`) and hardcoded CSS durations (`400ms`) while omitting higher-level resilience logic (such as handling single-item playlists or corrupt video file watchdog recovery).
* **Rationale & Recommendation**: Elevate the TV player section to focus on state transitions and watchdog recovery timers rather than hardcoded DOM IDs.

### 7. Redundant TV Client Storage Abstractions - Severity: 🟢 Nit
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 105, 110 (Architecture Diagram TV Client Runtime)
* **Discrepancy Description**: The diagram lists IndexedDB alongside LocalStorage for storing lightweight JSON playlist manifests.
* **Rationale & Recommendation**: Standardize TV playlist persistence strictly on synchronous `window.localStorage`.
