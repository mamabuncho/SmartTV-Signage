# Goldfish Review: Intermediate Zoom Out Report (Stage 8)

* **Target:** `docs/designs/multi_channel_digital_signage.md` (Full Document, Lines 1–250)
* **Reviewer:** `egm-zoom-out` (Skeptical Architect Auditor)
* **Standard:** `resources/document_standards/zoom-out-standard.md`
* **Date:** 2026-11-11

---

## Executive Architectural Assessment

Following the initial Zoom Out review, Comprehension audit, and Hostile Design critique, the design document has been re-evaluated from a high-altitude perspective.

All review lenses have independently converged on a unified root diagnosis: **the architecture attempts to use advanced Web PWA standards (Service Workers, CacheStorage, Web WakeLock API) that are structurally incompatible with plain HTTP local area networks without local HTTPS/TLS infrastructure**. 

Simultaneously, the document suffers from **scope mismatch**: it introduces heavy database and telemetry abstractions for a simple 6-screen LAN setup while omitting fundamental low-level specifications (testing harnesses, video metadata parsing, and API wire schemas).

---

## Prioritized Findings (Blockers -> Major -> Nits)

### 1. Insecure Context Architectural Mismatch - Severity: 🔴 Blocker
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 33, 36, 102–104, 141–145
* **Convergence Finding**: Chromium strictly disables `navigator.serviceWorker` and `navigator.wakeLock` on non-localhost HTTP origins.
* **Architectural Simplification**: Drop Service Worker and Web WakeLock entirely. Rely on:
  1. Standard browser HTTP disk cache (`Cache-Control: public, max-age=31536000, immutable`).
  2. `window.localStorage` for offline playlist manifest storage.
  3. A hidden 1x1 looping video element to suppress Android TV sleep/screensaver mode without Web WakeLock.

### 2. Native C++ Toolchain Friction (`better-sqlite3`) - Severity: 🟡 Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 80, 125–129, 210–212, 238
* **Convergence Finding**: Deploying `better-sqlite3` on Windows host PCs requires Visual C++ Build Tools and Python for native addon compilation. For storing exactly 6 channels and ~20–50 total assets, SQLite violates YAGNI.
* **Architectural Simplification**: Standardize on an atomic JSON flat-store (`storage/data.json`) utilizing standard Node.js `fs/promises` (`write to tmp -> rename`).

### 3. Telemetry Scope Contradiction - Severity: 🟡 Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 78, 120, 134, 150–162
* **Convergence Finding**: Component B describes real-time client playback index and cache progress tracking, but the protocol is strictly unidirectional SSE with zero upstream reporting endpoints.
* **Architectural Simplification**: Adhere to YAGNI and unidirectional simplicity. Remove per-screen playback position tracking from v1. Track TV online/offline state strictly via active SSE connection counts on the server.

### 4. Missing Video Ingestion Infrastructure - Severity: 🟡 Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 79, 121–128, 209, 214
* **Convergence Finding**: `sharp` handles images only; zero video duration detection or container validation exists in dependencies.
* **Architectural Simplification**: Add a lightweight video inspection utility (`music-metadata` or `get-video-duration`) to validate H.264 / AAC constraints and extract duration.

### 5. Omission of Verification Harness - Severity: 🟡 Major
* **Reviewer Lens:** `egm-zoom-out`
* **Affected Scope:** Lines 205–231, 232–250
* **Convergence Finding**: Zero automated tests or verification tasks are specified.
* **Architectural Simplification**: Add Task 10: "Test Suite & Verification Harness" with `node:test` and test files for API, media ingestion, and data persistence.
