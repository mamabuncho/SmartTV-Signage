# Goldfish Review: Implementation Readiness Report (Stage 9)

* **Target:** `docs/designs/multi_channel_digital_signage.md` (Lines 203–250)
* **Reviewer:** `egm-implementation-readiness` (Pragmatic Tech Lead Auditor)
* **Standard:** `resources/document_standards/implementation-readiness-standard.md`
* **Date:** 2026-11-11

---

## Prioritized Findings (Blockers -> Major -> Nits)

### 1. Zero Testing & Verification Specifications - Severity: 🔴 Blocker
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** Lines 205–231 (Tasks 1–9) and Lines 232–250 (File Manifest)
* **Discrepancy Description**: The implementation plan contains no testing tasks, test file entries in the manifest, or verification criteria. There is no testing framework declared in `package.json`, no test directory, and no defined validation steps for SQLite schemas, image normalization, SSE channel multiplexing, or TV player offline cache resilience.
* **Rationale & Recommendation**: 
  * Add Task 10: "Test Suite & Verification Harness".
  * Add test runner (`vitest` or `node:test`) to `package.json`.
  * Add test files to File Manifest (`tests/db.test.js`, `tests/media.test.js`, `tests/api.test.js`, `tests/player.test.js`).

### 2. Missing Concrete SQL DDL Schemas & Seeding Definitions - Severity: 🔴 Blocker
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** Lines 210–212 (Task 2) & Line 238 (`src/db.js`)
* **Discrepancy Description**: Column data types, primary key conventions (UUID vs autoincrement vs content hash), foreign key cascade behaviors, and seed row values are omitted, forcing the implementer to make ad-hoc structural decisions.
* **Rationale & Recommendation**: Provide exact SQL DDL in the specification for `src/db.js` (or schema definitions for JSON flat-store), including explicit table columns, indexes, and default channel seeding rows.

### 3. Undefined REST API & SSE Wire Contracts - Severity: 🔴 Blocker
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** Lines 215–219 (Tasks 4 & 5) and Lines 240–241 (`src/sse.js`, `src/routes/api.js`)
* **Discrepancy Description**: Endpoints are listed without concrete request payloads, response bodies, or status codes. Unclear whether SSE `playlist_update` carries the full serialized manifest or an invalidation trigger.
* **Rationale & Recommendation**: Define concrete JSON request/response contracts for all REST endpoints in Task 5 and specify the exact SSE payload schema in Task 4.

### 4. Service Worker Scope & Header Path Conflict - Severity: 🟡 Major
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** Lines 226–227 (Task 8) & Line 248 (`public/tv/sw.js`)
* **Discrepancy Description**: A Service Worker hosted at `/tv/sw.js` has a default maximum scope of `/tv/` and cannot intercept top-level requests to `/media/*` unless the server sets `Service-Worker-Allowed: /` and the registration specifies `{ scope: '/' }`.
* **Rationale & Recommendation**: Either relocate the Service Worker to the root public folder `public/sw.js` (scope `/`), or explicitly require the Fastify server to serve `/tv/sw.js` with `Service-Worker-Allowed: /` header.

### 5. Windows Native Addon Build Prerequisites - Severity: 🟡 Major
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** Lines 207–209 (Task 1) & Line 236 (`package.json`)
* **Discrepancy Description**: Both `better-sqlite3` and `sharp` are native C++ addons requiring matching prebuilt binaries or `node-gyp` with Visual C++ build tools on Windows.
* **Rationale & Recommendation**: Pin supported Node.js version in `package.json` (`"engines": { "node": ">=20.0.0 <23.0.0" }`), verify prebuild availability, or eliminate `better-sqlite3` in favor of an atomic JSON store.

### 6. Storage Path Resolution & Missing .gitignore - Severity: 🟡 Major
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** Line 214 (Task 3), Lines 232–250 (File Manifest)
* **Discrepancy Description**: `/storage/media/` resolves to `C:\storage\media\` on Windows rather than project-relative storage. Furthermore, `.gitignore` is missing from the file manifest.
* **Rationale & Recommendation**: Use `path.resolve(process.cwd(), 'storage/media')`, add directory initialization in `src/server.js`, and add `.gitignore` to the manifest.

### 7. Missing Service Worker Cache Eviction Logic - Severity: 🟡 Major
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** Lines 226–227 (Task 8) & Line 248 (`public/tv/sw.js`)
* **Discrepancy Description**: No cache eviction lifecycle is defined when playlists change, leading to orphaned video files accumulating in TV flash storage until quota is exhausted.
* **Rationale & Recommendation**: Specify in Task 8 that on every `playlist_update`, obsolete cached URLs are diffed and purged via `caches.delete()`.

### 8. Brittle Windows IP Discovery in start.bat - Severity: 🟢 Nit
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** Line 229 (Task 9) & Line 249 (`scripts/start.bat`)
* **Discrepancy Description**: Parsing `ipconfig` output in batch script is brittle across localized Windows languages and multi-adapter setups.
* **Rationale & Recommendation**: Delegate LAN IP detection and console logging to Node.js in `src/server.js` using `os.networkInterfaces()`.

### 9. Concurrent Video Decoder Saturation on Budget Smart TVs - Severity: 🟢 Nit
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** Lines 223–225 (Task 7) & Lines 245–247 (`public/tv/player.js`)
* **Discrepancy Description**: Cheap TV SoCs frequently fail when two hardware video decoders run concurrently during opacity transitions.
* **Rationale & Recommendation**: When transitioning between consecutive video items, pause and unload the previous video's source immediately rather than overlapping playback.
