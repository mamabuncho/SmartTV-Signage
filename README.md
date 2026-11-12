# Smart TV Multi-Channel LAN Digital Signage System v1.2

[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](https://github.com/mamabuncho/SmartTV-Signage)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg)](https://nodejs.org/)
[![UI](https://img.shields.io/badge/UI-Modern%20Clean%20Light-blue.svg)](https://github.com/mamabuncho/SmartTV-Signage)
[![Languages](https://img.shields.io/badge/languages-TH%20|%20EN%20|%20JA-orange.svg)](https://github.com/mamabuncho/SmartTV-Signage)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Author](https://img.shields.io/badge/author-mamabuncho-cyan.svg)](https://github.com/mamabuncho)

ระบบควบคุมภาพ วิดีโอ สไลด์ และถ่ายทอดสดหน้าจอคอมพิวเตอร์ออกทาง Smart TV สูงสุด 6 ช่องสัญญาณแบบอิสระ ควบคุมผ่านเว็บเบราว์เซอร์จากคอมพิวเตอร์เครื่องเดียวในวงเครือข่ายภายใน (LAN / Wi-Fi) โดยไม่ต้องต่ออินเทอร์เน็ตภายนอก

---

### 🌐 Language Navigation / เลือกลำดับภาษา / 言語切り替え
* 🇹🇭 [คู่มือการใช้งานภาษาไทย](#-คู่มือการใช้งานภาษาไทย)
* 🇺🇸 [English User Guide](#-english-user-guide)
* 🇯🇵 [日本語ユーザーガイド](#-日本語ユーザーガイド)

---

## 🇹🇭 คู่มือการใช้งานภาษาไทย

### 1. จุดเด่นและคุณสมบัติหลัก
1. **รองรับไฟล์หลากหลายฟอร์แมต (Multi-Format Drag & Drop):**
   * **รูปภาพทุกฟอร์แมต:** JPG, PNG, WebP, SVG, BMP (ปรับสัดส่วนพอดี 1080p Full HD อัตโนมัติ)
   * **ภาพเคลื่อนไหว (GIF):** เล่นภาพเคลื่อนไหววนลูปอย่างราบรื่น
   * **วิดีโอ (MP4):** เล่นวิดีโอ Full HD ความยาวตามไฟล์จริงแบบไร้สะดุด
   * **เอกสาร PDF:** แยกหน้าเอกสาร PDF แต่ละหน้าออกมาเป็นสไลด์ 1080p คุณภาพสูงให้อัตโนมัติ
   * **สเปรดชีต Excel / CSV (.xlsx, .csv):** แปลงตารางข้อมูลเป็นสไลด์ Full HD Dark Theme คมชัด ตัวหนังสือขนาดใหญ่สบายตา พร้อมระบบแบ่งหน้าอัตโนมัติหากมีข้อมูลหลายแถว
   * **ข้อความประกาศ (.txt):** แปลงข้อความสั้นหรือประกาศบริษัทเป็นป้ายดิจิทัลขนาดใหญ่ทันที
2. **🔴 ถ่ายทอดสดหน้าจอคอมพิวเตอร์ (Live Screen Share):**
   * แชร์หน้าจอคอมพิวเตอร์ หรือหน้าต่างโปรแกรม (เช่น Excel, PowerPoint, Web Browser) ไปยังจอทีวีแบบ Real-Time ด้วยความละเอียด Full HD 1080p
   * ระบบ Hardware Canvas Double-Buffering แก้ปัญหาจอกระพริบ 100% และระบบ Network Backpressure รักษาความหน่วงต่ำ (<50ms)
3. **⏱️ ตั้งเวลาเท่ากันทุกไฟล์ในคลิกเดียว (Bulk Duration):**
   * ใส่ตัวเลขเวลาครั้งเดียวแล้วกด "ปรับทุกไฟล์" มีผลกับทุกไฟล์ในช่องทันที
4. **▶ บังคับแสดงภาพทันที (Direct Jump):**
   * แอดมินสามารถคลิกสั่งให้ทีวีเปลี่ยนไปแสดงสไลด์ที่ต้องการได้ทันทีโดยไม่ต้องรอให้ถึงรอบเปลี่ยนภาพ
5. **❄️ ล็อคภาพค้างไว้ (Freeze Lock):**
   * ปุ่มหยุดการเปลี่ยนภาพค้างไว้สำหรับประชุมหรือนำเสนอเนื้อหาสำคัญ
6. **✏️ ตั้งชื่อช่องสัญญาณได้อิสระ (Channel Renaming):**
   * เปลี่ยนชื่อช่องได้ตามใจชอบ เช่น "ห้องประชุม A", "หน้าเคาน์เตอร์", "ฝ่ายผลิต"
7. **🎨 ดีไซน์ทันสมัย สบายตา เป็นมิตรต่อผู้ใช้งาน (Modern Clean Light UI):**
   * หน้าจอแอดมินธีมสว่าง (Light Theme) สไตล์โมเดิร์น สบายตา จัดวางอย่างเป็นระเบียบ พร้อมแถบสลับช่องแบบ Segmented Control, หน้าต่าง Modal ควบคุมการถ่ายทอดสด, แจ้งเตือนสถานะแบบเรียลไทม์ และรองรับ 3 ภาษา (ไทย, อังกฤษ, ญี่ปุ่น)
8. **ไม่ต้องติดตั้งโปรแกรมบนทีวี:**
   * เปิดผ่านเบราว์เซอร์ของ Smart TV ได้โดยตรง ไม่ต้อง Root หรือลงไฟล์ APK เพิ่มเติม

---

### 2. วิธีเริ่มใช้งาน (ระดับโปรดักชั่น)

#### สำหรับผู้ใช้งานทั่วไป (ไม่ต้องติดตั้ง Node.js หรือโปรแกรมเสริม):
ดับเบิ้ลคลิกที่ไฟล์:
```
SmartTV-Signage.exe
```
* โปรแกรมจะเริ่มทำงานในพื้นหลังอย่างเงียบๆ โดยไม่มีหน้าต่างดำ CMD กวนใจ
* เบราว์เซอร์จะเปิดหน้า **แอดมินควบคุม (Admin Dashboard)** ให้โดยอัตโนมัติ
* ที่มุมขวาล่างของหน้าจอ (ข้างนาฬิกา Windows) จะมีไอคอน Smart TV สีฟ้า:
  * ดับเบิ้ลคลิกไอคอนเพื่อเปิดหน้าแอดมิน
  * คลิกขวาเพื่อคัดลอกลิงก์, สั่งให้โปรแกรมเปิดตัวเองอัตโนมัติทุกครั้งที่เปิดคอมพิวเตอร์ (Auto-Start), หรือสั่งปิดโปรแกรม (Exit)

#### ลิงก์สำหรับการใช้งานในวง LAN:
* **หน้าแอดมินสำหรับควบคุม:**
  `http://<IP-คอมพิวเตอร์>:8080/admin` (หรือ `http://localhost:8080/admin`)
* **หน้าจอสำหรับเปิดบน Smart TV แต่ละเครื่อง:**
  * ทีวีช่องที่ 1: `http://<IP-คอมพิวเตอร์>:8080/tv/1`
  * ทีวีช่องที่ 2: `http://<IP-คอมพิวเตอร์>:8080/tv/2`
  * ทีวีช่องที่ 3: `http://<IP-คอมพิวเตอร์>:8080/tv/3`
  * ทีวีช่องที่ 4: `http://<IP-คอมพิวเตอร์>:8080/tv/4`
  * ทีวีช่องที่ 5: `http://<IP-คอมพิวเตอร์>:8080/tv/5`
  * ทีวีช่องที่ 6: `http://<IP-คอมพิวเตอร์>:8080/tv/6`

---

## 🇺🇸 English User Guide

### 1. Overview & Key Capabilities
Smart TV Multi-Channel LAN Digital Signage is a lightweight, zero-dependency digital signage and real-time screen broadcasting system designed to control up to 6 Smart TV displays independently from a single computer across a local network (LAN / Wi-Fi).

1. **Multi-Format Ingestion (Drag & Drop):**
   * **Images:** JPG, PNG, WebP, SVG, BMP (auto-fitted to 1080p Full HD bounding box).
   * **Animated GIFs:** Smooth continuous looping on TV displays.
   * **MP4 Videos:** High-bitrate playback matching natural video durations.
   * **PDF Documents:** Automated extraction of each PDF page into crisp 1080p slides.
   * **Excel / CSV Spreadsheets (.xlsx, .csv):** Converts tabular data into high-contrast 1080p dark-theme slides with automatic pagination for large tables.
   * **Text Announcements (.txt):** Instant generation of digital announcement banners.
2. **🔴 Live Screen Sharing:**
   * Stream entire desktops, PowerPoint slides, Excel sheets, or browser windows in real-time to TVs over LAN at 1080p 20 FPS.
   * Zero-flicker hardware canvas double-buffering and intelligent network backpressure keep latency under 50ms.
3. **⏱️ Bulk Slide Duration:**
   * Set uniform playback durations across all items in a channel with a single click.
4. **▶ Direct Slide Override (Instant Jump):**
   * Administrators can command TVs to jump to any slide instantly without waiting for playback timers.
5. **❄️ Slide Freeze Lock:**
   * Lock the currently active slide on screen during presentations or meetings.
6. **✏️ Channel Renaming:**
   * Customize names for each display (e.g., "Boardroom A", "Reception", "Factory Floor").
7. **🎨 macOS Sonoma / Sequoia Fluid Interface:**
   * Elegant translucent glassmorphism aesthetic, segmented channel switches, dynamic island status bar, and built-in 3-language switcher (Thai, English, Japanese).

---

### 2. Getting Started

#### Standalone Deployment (No Installation Required):
Double-click:
```
SmartTV-Signage.exe
```
* Runs silently in the background with zero CMD black windows.
* Automatically opens your default browser to `http://localhost:8080/admin`.
* A Smart TV icon appears in the Windows System Tray (beside the clock):
  * Double-click to open the dashboard.
  * Right-click to copy TV links, toggle Windows Auto-Start, or Exit.

#### LAN URLs for Smart TVs:
* **Admin Dashboard:** `http://<Computer-IP>:8080/admin`
* **Smart TV Displays:**
  * Channel 1: `http://<Computer-IP>:8080/tv/1`
  * Channel 2: `http://<Computer-IP>:8080/tv/2`
  * Channel 3: `http://<Computer-IP>:8080/tv/3`
  * Channel 4: `http://<Computer-IP>:8080/tv/4`
  * Channel 5: `http://<Computer-IP>:8080/tv/5`
  * Channel 6: `http://<Computer-IP>:8080/tv/6`

---

## 🇯🇵 日本語ユーザーガイド

### 1. システム概要と特徴
Smart TV マルチチャンネルLANデジタルサイネージは、同一ローカルネットワーク（LAN / Wi-Fi）内にある最大6台のスマートTVへ、PC1台から画像、動画、PDF、Excel表、画面ライブ配信を独立制御できるキオスク対応サイネージシステムです。外部インターネットへの接続は不要です。

1. **多彩なファイル形式に対応（ドラッグ＆ドロップ）:**
   * **静止画:** JPG, PNG, WebP, SVG, BMP（1080p フルHD自動最適化）
   * **アニメーションGIF:** カクつきのないスムーズなループ再生
   * **動画（MP4）:** フルHD動画の実時間再生
   * **PDF文書:** 各ページを高精細1080pスライド画像へ自動分割変換
   * **Excel / CSV表計算（.xlsx, .csv）:** 視認性に優れたダークテーマの1080pスライドへ自動変換（行数が多い場合は自動改ページ）
   * **テキスト告知文（.txt）:** 社内告知や重要連絡を大型デジタルボード化
2. **🔴 画面ライブ配信 (Live Screen Share):**
   * PCの画面全体やExcel/PowerPointアプリをリアルタイムでテレビへLAN配信（1080p 20 FPS）
   * ハードウェアCanvasダブルバッファリングにより画面のチラつき（フリッカー）を完全に解消し、遅延50ms以下を実現
3. **⏱️ 一括表示時間設定 (Bulk Duration):**
   * 数値を一度入力して「全適用」を押すだけで、チャンネル内の全スライド時間を一括設定
4. **▶ 即時スライド切り替え (Direct Jump):**
   * タイマーを待たずに管理者が指定したスライドへテレビ表示を即座に切り替え
5. **❄️ 画面固定 (Freeze Lock):**
   * 会議や説明会中に特定のスライドを表示したまま静止固定
6. **✏️ チャンネル名カスタマイズ (Rename):**
   * 「大会議室」「受付ロビー」「製造ライン」など用途に合わせて自由に変更可能
7. **🎨 macOS Sonoma / Sequoia スタイルUI:**
   * すりガラス（Glassmorphism）を採用した美しいデザイン、セグメント切り替え、Dynamic Island型配信バー、日本語・英語・タイ語の3言語リアルタイム切り替え対応

---

### 2. 起動と操作手順

#### スタンドアロン実行（追加インストール不要）:
以下の実行ファイルをダブルクリックします：
```
SmartTV-Signage.exe
```
* 黒いコマンドプロンプト画面を表示せず、バックグラウンドで静かに起動します。
* 既定のブラウザで管理画面（`http://localhost:8080/admin`）が自動で開きます。
* 画面右下（タスクバー時計横）にSmart TVトレイアイコンが表示されます：
  * ダブルクリック：管理画面を開く
  * 右クリック：TV接続用URLのコピー、PC起動時の自動実行（Auto-Start）の切り替え、終了（Exit）

#### LAN接続用URL:
* **管理者コントロール画面:** `http://<PCのIPアドレス>:8080/admin`
* **スマートTV表示用画面:**
  * チャンネル1: `http://<PCのIPアドレス>:8080/tv/1`
  * チャンネル2: `http://<PCのIPアドレス>:8080/tv/2`
  * チャンネル3: `http://<PCのIPアドレス>:8080/tv/3`
  * チャンネル4: `http://<PCのIPアドレス>:8080/tv/4`
  * チャンネル5: `http://<PCのIPアドレス>:8080/tv/5`
  * チャンネル6: `http://<PCのIPアドレス>:8080/tv/6`

---

## 🛠️ Project Structure / โครงสร้างโปรเจกต์
```
.
├── src/
│   ├── server.js              # Fastify HTTP & WebSocket core server
│   ├── db.js                  # Persistent JSON storage engine
│   ├── media.js               # Multi-format media processing (Sharp, PDF, Excel)
│   ├── sse.js                 # Dual-protocol real-time sync engine
│   └── routes/
│       └── api.js             # REST API routes
├── public/
│   ├── admin/                 # macOS Fluid Admin Dashboard
│   │   ├── index.html         # Dashboard template with 3-language support
│   │   ├── style.css          # macOS Sonoma glassmorphism stylesheet
│   │   ├── admin.js           # Real-time controller & drag-drop logic
│   │   └── i18n.js            # Translation dictionary (TH, EN, JA)
│   └── tv/                    # Smart TV Player
│       ├── index.html         # Dual-buffer TV player template
│       ├── style.css          # Apple TV display stylesheet
│       └── player.js          # Hardware canvas & kiosk engine
├── scripts/
│   ├── SmartTV-Signage.cs     # Windows native background tray launcher (C#)
│   ├── build-icon.js          # Automated icon generator
│   └── package.js             # Distribution packager with embedded Node.js
└── tests/                     # Automated end-to-end test suite (15 tests)
```

---

## 👤 Author & Ownership / ลิขสิทธิ์และความเป็นเจ้าของ

* **Author & Developer:** mamabuncho
* **Email:** [mamabuncho@gmail.com](mailto:mamabuncho@gmail.com)
* **GitHub:** [https://github.com/mamabuncho/SmartTV-Signage](https://github.com/mamabuncho/SmartTV-Signage)
* **Copyright:** © 2026 mamabuncho. All rights reserved.
* **License:** [MIT License](LICENSE)
