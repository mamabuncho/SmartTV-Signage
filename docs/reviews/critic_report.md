# Goldfish Review: Hostile Design Critic Report (Stage 7)

* **Target:** `docs/designs/multi_channel_digital_signage.md` (Lines 1–202)
* **Reviewer:** `egm-design` (Hostile Design Critic)
* **Standard:** `resources/document_standards/feature-spec-standard.md`
* **Date:** 2026-11-11

---

## Prioritized Findings (Blockers -> Major -> Nits)

### 1. Insecure Context (HTTP) Renders Service Worker and WakeLock Inoperable - Severity: 🔴 Blocker
* **Reviewer Lens:** `egm-design`
* **Affected Scope:** Lines 33, 36, 55, 60, 102–104, 141–145 (Goals G3, G6, G7; CUJs 1, 2)
* **Discrepancy Description**: The system runs over plain HTTP on LAN IPs (`http://192.168.1.50:8080/tv/:id`). Modern Chromium security policies strictly disable `navigator.wakeLock` and `navigator.serviceWorker` on insecure origins (`window.isSecureContext === false`). Calling them throws fatal runtime exceptions; edge caching and sleep prevention will not execute.
* **Rationale & Recommendation**: 
  * Either: (1) Replace Service Worker with native browser HTTP disk caching (`Cache-Control: public, max-age=31536000, immutable`), use `localStorage` for playlist manifests, and use a hidden 1x1 looping video to prevent TV screensavers without the Web WakeLock API; OR (2) Integrate local TLS termination (`mkcert`) and document TV client root CA installation.

### 2. Invalid Assumption Regarding Native Google Chrome on Android TV - Severity: 🔴 Blocker
* **Reviewer Lens:** `egm-design`
* **Affected Scope:** Lines 13, 27, 35 (Goal G5), 60 (CUJ 2), 99, 181 (Alternative 2)
* **Discrepancy Description**: Goal G5 claims zero-touch installation using "pre-installed Google Chrome". However, production Android TV / Google TV hardware does not ship with Google Chrome, nor is it available in the TV Google Play Store without sideloading.
* **Rationale & Recommendation**: Formally validate and document Play Store-approved Android TV browsers (such as *TV Bro*, *JioPages*, or *Puffin TV*), or clarify that initial browser sideloading / APK installation is required.

### 3. Concurrency Limit on Hardware Video Decoders on Budget TV SoCs - Severity: 🟡 Major
* **Reviewer Lens:** `egm-design`
* **Affected Scope:** Lines 34, 103, 138–141
* **Discrepancy Description**: Preloading a second 1080p MP4 in Slot B while Slot A is actively playing exceeds hardware decoder limits on budget TV chipsets (Amlogic, Realtek, MediaTek), causing `PIPELINE_ERROR_DECODE` or black frames. Moreover, clearing `video.src = ""` fails to immediately release Android `MediaCodec` handles.
* **Rationale & Recommendation**: For consecutive video playback, avoid concurrent decoders. Unload and pause the prior video before starting the next (`video.pause(); video.removeAttribute('src'); video.load()`).

### 4. Contradiction Between Live Channel Monitoring and Unidirectional SSE - Severity: 🟡 Major
* **Reviewer Lens:** `egm-design`
* **Affected Scope:** Lines 78, 120, 134, 150–162, 185–193
* **Discrepancy Description**: The admin dashboard specifies a live monitor showing per-TV current playing index and cache progress, but the protocol is strictly unidirectional SSE with zero upstream client telemetry endpoints.
* **Rationale & Recommendation**: Define an explicit telemetry beacon (`POST /api/channels/:id/heartbeat`) or remove client playback telemetry from v1, tracking online/offline status strictly via active SSE connection counts.

### 5. Thundering Herd Wi-Fi Saturation on Broadcast Manifest Updates - Severity: 🟡 Major
* **Reviewer Lens:** `egm-design`
* **Affected Scope:** Lines 22, 57–58, 94, 141–143
* **Discrepancy Description**: When an operator saves an updated playlist, all 4–6 TVs receive the SSE event simultaneously and immediately initiate concurrent downloads of 1080p video files, saturating local Wi-Fi airtime.
* **Rationale & Recommendation**: Introduce randomized download jitter (stagger prefetch by 0–30s across channels) or apply server-side bandwidth throttling per client.

### 6. Missing Video Codec Validation on Ingestion - Severity: 🟡 Major
* **Reviewer Lens:** `egm-design`
* **Affected Scope:** Lines 79, 121–124, 153
* **Discrepancy Description**: Static images are normalized via `sharp`, but MP4 video uploads have zero container or codec inspection. High-profile H.264, 4K, or non-AAC audio will fail silently on Smart TVs.
* **Rationale & Recommendation**: Integrate video inspection via `ffprobe` to enforce container: MP4, codec: H.264 Baseline/Main <= Level 4.2, resolution <= 1080p, audio: AAC.

### 7. Unauthenticated Local Control Plane - Severity: 🟡 Major
* **Reviewer Lens:** `egm-design`
* **Affected Scope:** Lines 45, 119, 150–156
* **Discrepancy Description**: Fastify bound to `0.0.0.0:8080` without any authentication allows any guest or device on the local network to overwrite playlists or upload arbitrary files.
* **Rationale & Recommendation**: Implement basic administrative password protection or bearer token validation for state-mutating endpoints (`/api/channels/:id/playlist`, `/api/media/upload`).

### 8. DOM Slot Naming Conflation & Missing Cross-Media State Logic - Severity: 🟢 Nit
* **Reviewer Lens:** `egm-design`
* **Affected Scope:** Lines 138–141
* **Discrepancy Description**: Conflates element IDs with generic slots and omits state transition handling when switching between image and video assets.
* **Rationale & Recommendation**: Formalize the state machine for cross-media transitions.

### 9. Missing Quantitative Engineering Success Metrics - Severity: 🟢 Nit
* **Reviewer Lens:** `egm-design`
* **Affected Scope:** Lines 29–38
* **Discrepancy Description**: Lacks defined MTBF, max tab memory thresholds (MB), and frame drop tolerance metrics.
* **Rationale & Recommendation**: Add explicit measurable targets (e.g., Tab Memory < 250MB over 24h, frame drop rate < 1%).
