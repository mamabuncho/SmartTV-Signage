# Consolidated EGM Review Report

* **Target Document:** [multi_channel_digital_signage.md](file:///d:/AI/Web_Browser_on_Smart%20TV/docs/designs/multi_channel_digital_signage.md)
* **Status:** Actionable Findings Compiled (Uninterrupted Full Flow)
* **Date:** 2026-11-11
* **Review Stages Executed:**
  * Stage 5: Initial Zoom Out Review ([zoom_out_report.md](file:///d:/AI/Web_Browser_on_Smart%20TV/zoom_out_report.md))
  * Stage 6: Comprehension Test ([comprehension_report.md](file:///d:/AI/Web_Browser_on_Smart%20TV/comprehension_report.md))
  * Stage 7: Hostile Design Critique ([critic_report.md](file:///d:/AI/Web_Browser_on_Smart%20TV/critic_report.md))
  * Stage 8: Intermediate Zoom Out ([intermediate_zoom_out_report.md](file:///d:/AI/Web_Browser_on_Smart%20TV/intermediate_zoom_out_report.md))
  * Stage 9: Implementation Readiness ([implementation_readiness_report.md](file:///d:/AI/Web_Browser_on_Smart%20TV/implementation_readiness_report.md))

---

## Executive Summary

The proposed digital signage architecture has been evaluated across all five standard review rubrics. All review personas (`egm-zoom-out`, `egm-comprehension`, `egm-design`, `egm-implementation-readiness`) independently reached **100% consensus** on the root flaw of the current design:

> **The architecture attempts to use modern W3C Progressive Web App standards (`navigator.serviceWorker`, `CacheStorage`, `navigator.wakeLock`) that Chromium strictly blocks on unencrypted LAN HTTP (`isSecureContext === false`).**

Furthermore, the design introduces unnecessary setup complexity on Windows host machines (native C++ SQLite compilation) while omitting critical real-world implementation details (video duration parsing, wire schemas, and automated test harnesses).

Below is the consolidated, deduplicated action plan required to bring this design to true production readiness.

---

## Prioritized Action Items

### 🔴 Blockers (Must Fix Before Implementation)

#### ACTION-1: Resolve Insecure Context (HTTP) Barrier for Caching and Anti-Sleep
* **Finding Sources:** Stage 5 (#1), Stage 6 (#1), Stage 7 (#1), Stage 8 (#1)
* **Root Problem:** Accessing the server via local IP over HTTP (`http://192.168.1.50:8080`) causes `navigator.serviceWorker` and `navigator.wakeLock` to evaluate to `undefined` in modern Chromium. Calling them throws fatal runtime exceptions.
* **Remediation Plan:**
  1. **Drop Service Worker entirely**: Rely on native browser HTTP disk caching via immutable headers (`Cache-Control: public, max-age=31536000, immutable`). The browser handles byte-range requests and local caching without JavaScript interception.
  2. **Persist manifests in `localStorage`**: Store the active JSON playlist manifest in `window.localStorage` for instant offline boot.
  3. **Anti-Sleep Fallback**: Replace the Web WakeLock API with an invisible, silent 1x1 looping `<video>` element on the page, which keeps Android TV screens awake without requiring a Secure Context.

#### ACTION-2: Reconcile Browser Availability on Android TV
* **Finding Sources:** Stage 7 (#2)
* **Root Problem:** Production Android TV devices do not ship with Google Chrome, nor is Google Chrome available in the Android TV Google Play Store without manual APK sideloading.
* **Remediation Plan:**
  * Formally validate and document Play Store-approved Android TV browsers (such as *TV Bro*, *JioPages*, or *Open TV Browser*), OR clearly state in prerequisites that initial Chrome browser sideloading is required.

#### ACTION-3: Add Video Parsing & Inspection Tooling
* **Finding Sources:** Stage 6 (#2), Stage 7 (#6), Stage 8 (#4)
* **Root Problem:** `sharp` is an image-only library. The project has zero dependencies or mechanisms for extracting MP4 duration, verifying H.264/AAC compatibility, or generating video thumbnails.
* **Remediation Plan:**
  * Add a lightweight video metadata library (`music-metadata` or `get-video-duration`) to `package.json` to extract duration, dimensions, and codec info during file upload in `src/media.js`.

#### ACTION-4: Eliminate Telemetry Contradiction in Live Channel Monitor
* **Finding Sources:** Stage 5 (#3), Stage 6 (#3), Stage 7 (#4), Stage 8 (#3)
* **Root Problem:** The Admin Dashboard specifies displaying per-screen current playing asset indices and cache progress, but the protocol is strictly unidirectional SSE with zero upstream reporting endpoints.
* **Remediation Plan:**
  * Adhere to YAGNI and unidirectional simplicity: remove per-screen asset index telemetry from v1. Track TV online/offline state strictly via active SSE connection counts held by the server's SSE hub.

#### ACTION-5: Add Test Suite & Verification Harness
* **Finding Sources:** Stage 9 (#1), Stage 8 (#5)
* **Root Problem:** The implementation plan contains zero automated tests, verification tasks, or test files in the manifest.
* **Remediation Plan:**
  * Add Task 10: "Test Suite & Verification Harness" using Node's built-in test runner (`node:test`).
  * Add test files to manifest: `tests/data.test.js`, `tests/media.test.js`, and `tests/api.test.js`.

---

### 🟡 Major Findings (Architectural Hygiene & Stability)

#### ACTION-6: Replace Native C++ SQLite with Atomic JSON Flat-Store
* **Finding Sources:** Stage 5 (#2), Stage 8 (#2), Stage 9 (#5)
* **Root Problem:** `better-sqlite3` requires Python and Visual C++ Build Tools on Windows. For exactly 6 channels and ~30 media assets managed by a single user, an ACID relational database violates YAGNI.
* **Remediation Plan:**
  * Replace `better-sqlite3` with an atomic JSON flat-file datastore (`storage/data.json`) utilizing standard Node.js `fs/promises` (`write to tmp -> rename`). This eliminates native compile toolchains entirely.

#### ACTION-7: Specify Concrete REST API & SSE Wire Contracts
* **Finding Sources:** Stage 6 (#5), Stage 9 (#2, #3)
* **Root Problem:** REST endpoints and SSE events lack JSON schemas, status codes, and payload definitions.
* **Remediation Plan:**
  * Include exact JSON request/response schemas for `/api/channels`, `/api/channels/:id/playlist`, `/api/media/upload`, and `event: playlist_update`.

#### ACTION-8: Content-Addressed Naming & Orphaned Media Garbage Collection
* **Finding Sources:** Stage 5 (#5), Stage 6 (#7)
* **Root Problem:** Prepending timestamps (`[timestamp]_[hash]`) breaks deduplication. Also, unreferenced media files accumulate on disk indefinitely.
* **Remediation Plan:**
  * Name assets strictly by SHA-256 hash (`[sha256_16char].[ext]`).
  * Run a cleanup sweep on playlist save that unlinks unreferenced media files in `storage/media/`.

#### ACTION-9: Mitigate Thundering Herd Wi-Fi Saturation
* **Finding Sources:** Stage 7 (#5)
* **Root Problem:** Broadcasting playlist updates to all 6 TVs simultaneously triggers concurrent downloads of 1080p videos over Wi-Fi.
* **Remediation Plan:**
  * Introduce 0–20s randomized prefetch jitter across client channels to stagger media downloads.

#### ACTION-10: Add Basic LAN Control Plane Authentication
* **Finding Sources:** Stage 7 (#7)
* **Root Problem:** Fastify bound to `0.0.0.0:8080` without authentication allows any device on the LAN to overwrite playlists or upload files.
* **Remediation Plan:**
  * Implement basic administrative PIN/password validation for state-modifying endpoints (`/api/channels/:id/playlist`, `/api/media/upload`, and `/admin`).

---

### 🟢 Nits & Codebase Details

#### ACTION-11: Standardize TV Manifest State on LocalStorage
* **Finding Sources:** Stage 5 (#7), Stage 6 (#4)
* **Remediation:** Remove IndexedDB from diagrams; use synchronous `window.localStorage`.

#### ACTION-12: Chromium MediaCodec Teardown Protocol
* **Finding Sources:** Stage 6 (#12), Stage 7 (#3), Stage 9 (#9)
* **Remediation:** Avoid concurrent hardware decoders on consecutive videos. Teardown via:
  `video.pause(); video.removeAttribute('src'); video.load();`.

#### ACTION-13: Standardize Asset Terminology & Resolve Open Questions
* **Finding Sources:** Stage 6 (#10, #11)
* **Remediation:** Harmonize references to "JPEG and PNG", resolve OQ1 (2GB LRU limit) and OQ2 (muted autoplay default), and update document status.

---

## Traceability Matrix

| Raw Finding | Stage & Lens | Severity | Consolidated Action |
| :--- | :--- | :--- | :--- |
| Insecure Context (HTTP) blocks Service Worker & WakeLock | Stage 5 (Zoom Out), Stage 6 (Comprehension), Stage 7 (Critic), Stage 8 (Intermediate) | 🔴 Blocker | **ACTION-1** |
| Android TV lacks native Chrome browser out of the box | Stage 7 (Critic) | 🔴 Blocker | **ACTION-2** |
| Missing video metadata parsing and inspection tooling | Stage 6 (Comprehension), Stage 7 (Critic), Stage 8 (Intermediate) | 🔴 Blocker | **ACTION-3** |
| Live Channel Monitor telemetry missing from SSE spec | Stage 5 (Zoom Out), Stage 6 (Comprehension), Stage 7 (Critic), Stage 8 (Intermediate) | 🔴 Blocker | **ACTION-4** |
| Zero automated test tasks or test files in manifest | Stage 9 (Readiness), Stage 8 (Intermediate) | 🔴 Blocker | **ACTION-5** |
| Native C++ SQLite (`better-sqlite3`) Windows build overhead | Stage 5 (Zoom Out), Stage 8 (Intermediate), Stage 9 (Readiness) | 🟡 Major | **ACTION-6** |
| Missing REST API & SSE wire schemas | Stage 6 (Comprehension), Stage 9 (Readiness) | 🟡 Major | **ACTION-7** |
| Timestamp in filename breaks deduplication; no disk GC | Stage 5 (Zoom Out), Stage 6 (Comprehension) | 🟡 Major | **ACTION-8** |
| Thundering herd Wi-Fi saturation on SSE broadcast | Stage 7 (Critic) | 🟡 Major | **ACTION-9** |
| Unauthenticated control plane on 0.0.0.0 | Stage 7 (Critic) | 🟡 Major | **ACTION-10** |
| Redundant IndexedDB abstraction for lightweight manifests | Stage 5 (Zoom Out), Stage 6 (Comprehension) | 🟢 Nit | **ACTION-11** |
| MediaCodec buffer leakage on Android TV Chromium | Stage 6 (Comprehension), Stage 7 (Critic), Stage 9 (Readiness) | 🟢 Nit | **ACTION-12** |
| Inconsistent image formats & open questions in approved doc | Stage 6 (Comprehension) | 🟢 Nit | **ACTION-13** |
