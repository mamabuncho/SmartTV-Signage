import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT_DIR = process.cwd();
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');
const TARGET_DIR = path.resolve(DIST_DIR, 'SmartTV-Signage');

console.log('=== Packaging Smart TV Signage for Distribution ===');

// 1. Clean previous dist
if (fs.existsSync(DIST_DIR)) {
  console.log('1. Cleaning existing dist directory...');
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TARGET_DIR, { recursive: true });

// Helper to copy directory recursively
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 2. Copy application files
console.log('2. Copying application core files...');
fs.copyFileSync(path.resolve(ROOT_DIR, 'SmartTV-Signage.exe'), path.join(TARGET_DIR, 'SmartTV-Signage.exe'));
fs.copyFileSync(path.resolve(ROOT_DIR, 'app.ico'), path.join(TARGET_DIR, 'app.ico'));
fs.copyFileSync(path.resolve(ROOT_DIR, 'package.json'), path.join(TARGET_DIR, 'package.json'));
fs.copyFileSync(path.resolve(ROOT_DIR, 'stop.bat'), path.join(TARGET_DIR, 'stop.bat'));

console.log('3. Copying src and public folders...');
copyDirSync(path.resolve(ROOT_DIR, 'src'), path.join(TARGET_DIR, 'src'));
copyDirSync(path.resolve(ROOT_DIR, 'public'), path.join(TARGET_DIR, 'public'));

console.log('4. Copying node_modules runtime dependencies...');
copyDirSync(path.resolve(ROOT_DIR, 'node_modules'), path.join(TARGET_DIR, 'node_modules'));

// 5. Initialize clean storage directory
console.log('5. Preparing clean storage structure...');
const targetStorage = path.join(TARGET_DIR, 'storage');
fs.mkdirSync(path.join(targetStorage, 'media'), { recursive: true });

// Copy current data.json or initialize clean 6 channels
const initialDb = {
  channels: [
    { id: 1, name: "Channel 1 (Room 1)", resolution: "1920x1080" },
    { id: 2, name: "Channel 2 (Room 2)", resolution: "1920x1080" },
    { id: 3, name: "Channel 3 (Room 3)", resolution: "1920x1080" },
    { id: 4, name: "Channel 4 (Room 4)", resolution: "1920x1080" },
    { id: 5, name: "Channel 5 (Room 5)", resolution: "1920x1080" },
    { id: 6, name: "Channel 6 (Room 6)", resolution: "1920x1080" }
  ],
  media_assets: {},
  playlists: { "1": [], "2": [], "3": [], "4": [], "5": [], "6": [] }
};
fs.writeFileSync(path.join(targetStorage, 'data.json'), JSON.stringify(initialDb, null, 2));

// 6. Copy portable node.exe into bin/ folder so recipient doesn't need to install Node.js!
try {
  const nodeExePath = execSync('where node', { encoding: 'utf-8' }).split('\r\n')[0].trim();
  if (fs.existsSync(nodeExePath)) {
    console.log(`6. Embedding portable Node.js runtime from ${nodeExePath}...`);
    const binDir = path.join(TARGET_DIR, 'bin');
    fs.mkdirSync(binDir, { recursive: true });
    fs.copyFileSync(nodeExePath, path.join(binDir, 'node.exe'));
    console.log('   Portable Node.js embedded successfully! (No installation required on client PC)');
  }
} catch (e) {
  console.warn('   Could not auto-embed node.exe, recipient will need Node.js installed:', e.message);
}

// 7. Write Quick Start Readme for the recipient (3 Languages: TH, EN, JA)
const readmeContent = `===============================================================
       Smart TV Multi-Channel LAN Digital Signage System v1.2
       Author & Developer: mamabuncho <mamabuncho@gmail.com>
       GitHub: https://github.com/mamabuncho/SmartTV-Signage
       Copyright (c) 2026 mamabuncho. All rights reserved.
===============================================================

---------------------------------------------------------------
🇹🇭 [ภาษาไทย] คู่มือการใช้งานระบบ
---------------------------------------------------------------
ยินดีต้อนรับสู่ระบบควบคุมภาพและสไลด์ออกจอ Smart TV 6 ช่อง ผ่านระบบแลน
รองรับไฟล์: ภาพ (JPG, PNG, GIF, WebP), วิดีโอ MP4, เอกสาร PDF,
สเปรดชีต Excel (.xlsx, .csv), และข้อความประกาศ (.txt)

ฟังก์ชันเด่นในเวอร์ชัน 1.2:
1. 🔴 Live Screen Share: ถ่ายทอดสดหน้าจอคอม/โปรแกรม Excel/PowerPoint ไปยังทีวีแบบ Real-Time
2. ⏱️ ตั้งเวลาเท่ากันทุกไฟล์ (Bulk Duration): ใส่ตัวเลขครั้งเดียวมีผลทุกไฟล์ในช่อง
3. ▶ แสดงทันที (Direct Jump): แอดมินคลิกสั่งให้ทีวีเปลี่ยนไปแสดงสไลด์ที่ต้องการได้ทันที
4. ❄️ ล็อคภาพ (Freeze): ปุ่มหยุดการเปลี่ยนภาพค้างไว้สำหรับประชุม/พรีเซนต์
5. ✏️ เปลี่ยนชื่อช่อง (Rename Channel): ตั้งชื่อช่องได้ตามใจชอบ เช่น "ห้องประชุม A", "หน้าเคาน์เตอร์"
6. 🌐 สลับ 3 ภาษา: มีปุ่มเปลี่ยนภาษา ไทย / อังกฤษ / ญี่ปุ่น บนหน้าแอดมิน

วิธีใช้งาน (ง่ายมาก ไม่ต้องติดตั้งโปรแกรมใดๆ):
1. ดับเบิ้ลคลิกที่ไฟล์:
   SmartTV-Signage.exe
2. ระบบจะเริ่มทำงานในพื้นหลัง และเปิดหน้าเว็บแอดมินให้โดยอัตโนมัติ
   - หน้าควบคุมแอดมิน: http://localhost:8080/admin
3. นำ URL ประจำช่องไปเปิดบนเบราว์เซอร์ของ Smart TV แต่ละเครื่อง (ในวง Wi-Fi เดียวกัน):
   - ทีวีเครื่องที่ 1: http://<IP-คอมพิวเตอร์>:8080/tv/1
   - ทีวีเครื่องที่ 2: http://<IP-คอมพิวเตอร์>:8080/tv/2
   - ทีวีเครื่องที่ 3: http://<IP-คอมพิวเตอร์>:8080/tv/3
   - ทีวีเครื่องที่ 4: http://<IP-คอมพิวเตอร์>:8080/tv/4
   - ทีวีเครื่องที่ 5: http://<IP-คอมพิวเตอร์>:8080/tv/5
   - ทีวีเครื่องที่ 6: http://<IP-คอมพิวเตอร์>:8080/tv/6
4. การควบคุมและปิดโปรแกรม:
   - ที่มุมขวาล่างของหน้าจอ (ข้างนาฬิกา Windows) จะมีไอคอน Smart TV สีฟ้า
   - ดับเบิ้ลคลิกไอคอนเพื่อเปิดหน้าแอดมิน หรือคลิกขวาเพื่อคัดลอกลิงก์ / ปิดโปรแกรม

---------------------------------------------------------------
🇺🇸 [English] User & Quick Start Guide
---------------------------------------------------------------
Welcome to Smart TV Multi-Channel LAN Digital Signage System v1.2.
Control up to 6 Smart TV displays independently from one computer over local Wi-Fi/LAN.

Key Features:
1. 🔴 Live Screen Share: Broadcast desktop/PowerPoint/Excel to TVs in real-time (1080p 20 FPS).
2. ⏱️ Bulk Duration: Set equal display time for all slides with 1 click.
3. ▶ Direct Jump: Force any TV to display the selected slide immediately.
4. ❄️ Freeze Lock: Pause slideshow on a specific slide during meetings.
5. ✏️ Channel Rename: Personalize channel names (e.g., "Boardroom", "Reception").
6. 🌐 Multi-Language: 3-language switch (Thai, English, Japanese).

How to Use:
1. Double-click "SmartTV-Signage.exe".
2. Admin dashboard will open automatically at: http://localhost:8080/admin
3. On Smart TVs (connected to the same Wi-Fi/LAN), open the TV browser to:
   - TV 1: http://<Computer-IP>:8080/tv/1
   - TV 2: http://<Computer-IP>:8080/tv/2
   - TV 3: http://<Computer-IP>:8080/tv/3
   - TV 4: http://<Computer-IP>:8080/tv/4
   - TV 5: http://<Computer-IP>:8080/tv/5
   - TV 6: http://<Computer-IP>:8080/tv/6
4. Tray Icon (bottom-right near clock):
   - Double-click to open admin dashboard.
   - Right-click to copy links, toggle Auto-Start, or Exit.

---------------------------------------------------------------
🇯🇵 [日本語] ユーザー操作マニュアル
---------------------------------------------------------------
Smart TV マルチチャンネルLANデジタルサイネージ v1.2へようこそ。
同一LAN/Wi-Fi内のスマートTV最大6台をPC1台から独立配信・管理できます。

主な機能:
1. 🔴 画面ライブ配信: PC画面やExcel/PowerPointをリアルタイム配信 (1080p 20 FPS)
2. ⏱️ 一括時間設定: 全スライドの表示秒数をワンクリックで一括変更
3. ▶ 即時表示 (Jump): 指定スライドをテレビへ今すぐ強制表示
4. ❄️ 画面固定 (Freeze): 会議中にスライドの切り替えを一時停止・固定
5. ✏️ チャンネル名変更: 「会議室A」「受付ロビー」など自由に命名可能
6. 🌐 3言語対応: タイ語・英語・日本語の即時切り替え対応

操作手順:
1. 「SmartTV-Signage.exe」をダブルクリックして起動します。
2. 自動的にブラウザで管理者画面が開きます: http://localhost:8080/admin
3. 同一Wi-Fi/LANに接続された各スマートTVのブラウザでURLを開きます:
   - TV 1: http://<PCのIPアドレス>:8080/tv/1
   - TV 2: http://<PCのIPアドレス>:8080/tv/2
   - TV 3: http://<PCのIPアドレス>:8080/tv/3
   - TV 4: http://<PCのIPアドレス>:8080/tv/4
   - TV 5: http://<PCのIPアドレス>:8080/tv/5
   - TV 6: http://<PCのIPアドレス>:8080/tv/6
4. タスクトレイアイコン（画面右下の時計横）:
   - ダブルクリック: 管理画面を開く
   - 右クリック: URLコピー、PC起動時の自動実行、終了
===============================================================
`;
fs.writeFileSync(path.join(TARGET_DIR, 'วิธีใช้งาน.txt'), readmeContent, 'utf-8');
fs.writeFileSync(path.join(TARGET_DIR, 'USER_GUIDE.txt'), readmeContent, 'utf-8');

// 8. Auto-create distribution ZIP file
try {
  console.log('8. Compressing to dist/SmartTV-Signage-v1.2.zip...');
  const zipPath = path.resolve(DIST_DIR, 'SmartTV-Signage-v1.2.zip');
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${TARGET_DIR}\\*' -DestinationPath '${zipPath}' -Force"`, { stdio: 'inherit' });
  console.log('   ZIP archive created successfully at:', zipPath);
} catch (e) {
  console.warn('   Could not auto-zip:', e.message);
}

console.log('\n=== Package created successfully at: dist/SmartTV-Signage ===');
console.log('You can now compress the "dist/SmartTV-Signage" folder to .zip and send it to anyone!');
