/**
 * Smart TV Multi-Channel LAN Digital Signage System
 * Internationalization (i18n) Module
 * Supported Languages: Thai (th), English (en), Japanese (ja)
 * 
 * @author mamabuncho <mamabuncho@gmail.com>
 * @copyright 2026 mamabuncho. All rights reserved.
 */

export const translations = {
  th: {
    appTitle: "Smart TV Multi-Channel Signage",
    appSubtitle: "ระบบควบคุมหน้าจอทีวี 6 ช่อง • ถ่ายทอดสด • ล็อคภาพ • ตั้งเวลา • รองรับทุกไฟล์",
    serverStatusOk: "● เซิร์ฟเวอร์ทำงานปกติ",
    liveBtn: "🔴 ถ่ายทอดสดหน้าจอคอม",
    refreshBtn: "🔄 รีเฟรชข้อมูล",
    aboutBtn: "ℹ️ ข้อมูลระบบ",
    liveActivePrefix: "กำลังถ่ายทอดสดหน้าจอคอมพิวเตอร์ไปยัง: ",
    liveBadge: "LIVE 1080p",
    stopLiveBtn: "⏹️ หยุดถ่ายทอดสด",
    tabAll: "🎛️ ทุกช่อง (ทั้งหมด)",
    tabChannelPrefix: "ช่อง ",
    tagline: "✨ macOS Fluid UI • Real-time LAN Sync",

    // Instructions
    instStep1: "<strong>ลากไฟล์ลงช่องได้ทันที:</strong> รองรับภาพ JPG/PNG/GIF, วิดีโอ MP4, เอกสาร PDF, Excel/CSV, และข้อความประกาศ TXT",
    instStep2: "<strong>ฟังก์ชันควบคุมสด:</strong> คลิก <strong>\"✏️ แก้ไขชื่อช่อง\"</strong>, ใส่เวลาช่องเดียวแล้วกด <strong>\"ปรับทุกไฟล์\"</strong>, กด <strong>\"▶ แสดงทันที\"</strong> เพื่อบังคับสไลด์, หรือกด <strong>\"❄️ ล็อคภาพ\"</strong>",
    instStep3: "<strong>🔴 ถ่ายทอดสดหน้าจอคอม:</strong> คลิกปุ่มสีแดงด้านบนเพื่อสตรีมหน้าจอคอมหรือหน้าต่างแอป (Excel, PowerPoint, Web) ไปยังทีวีแบบเรียลไทม์",

    // Channel Card
    channelLabel: "📺 ช่อง",
    renameHint: "คลิกเพื่อแก้ไขชื่อช่อง",
    renamePlaceholder: "ใส่ชื่อช่อง...",
    renameIconTitle: "แก้ไขชื่อช่อง",
    freezeBtn: "❄️ ล็อคภาพ",
    frozenBtn: "❄️ ล็อคอยู่ (ปลดล็อค)",
    streamLiveBtn: "🔴 สตรีมสด",
    streamLiveTitle: "สตรีมสดเฉพาะช่องนี้",
    openTvLink: "🔗 เปิดทีวี",
    openTvTitle: "เปิดหน้าจอทีวีในแท็บใหม่เพื่อทดสอบ",
    tvOnline: "● ทีวีเชื่อมต่ออยู่",
    screensUnit: "จอ",
    tvOffline: "○ รอทีวีเปิดหน้าเว็บ (Offline)",
    dropzoneText: "ลากไฟล์ลงที่นี่ (หรือคลิกเพื่อเลือกไฟล์)",
    dropzoneHint: "รองรับ JPG, PNG, GIF, WebP, MP4, PDF, Excel (.xlsx, .csv), และข้อความ (.txt)",
    batchDurationLabel: "⏱️ ตั้งเวลาเท่ากันทุกไฟล์:",
    batchDurationUnit: "วิ",
    batchDurationApply: "ปรับทุกไฟล์",
    jumpBtn: "▶ แสดงทันที",
    jumpTitle: "บังคับแสดงภาพนี้บนทีวีทันที",
    removeTitle: "ลบรายการนี้",
    durationTitle: "กำหนดเวลาแสดงผล (วินาที)",
    saveBtn: "💾 บันทึกและส่งเข้าทีวี",
    savingBtn: "⏳ กำลังส่ง...",
    emptyPlaylist: "ยังไม่มีไฟล์ในช่องนี้<br>ลากไฟล์รูปภาพ วิดีโอ PDF หรือ Excel มาวางเพื่อเริ่มแสดงผล",
    summaryItems: "รายการ",
    summaryTotal: "รวม",
    summarySeconds: "วินาที",

    // Media Types
    typeVideo: "🎬 วิดีโอ MP4",
    typeGif: "🎞️ ภาพ GIF",
    typeExcel: "📊 ตาราง Excel",
    typeText: "📢 ข้อความประกาศ",
    typePdf: "📄 สไลด์เอกสาร PDF",
    typeImage: "🖼️ รูปภาพ 1080p",

    // Live Modal
    modalTitle: "🔴 ถ่ายทอดสดหน้าจอคอมพิวเตอร์ (Live Screen Share)",
    modalInstruction: "เลือกหน้าจอ, หน้าต่างโปรแกรม (เช่น Excel, PowerPoint) หรือแท็บ เพื่อส่งภาพสดไปยังทีวีแบบเรียลไทม์ผ่าน LAN",
    modalTargetLabel: "ส่งสัญญาณภาพไปยัง:",
    modalTargetAll: "📺 ทุกช่องพร้อมกัน (ช่อง 1 - 6)",
    modalQualityLabel: "คุณภาพสัญญาณภาพ:",
    modalQuality1080: "🌟 1080p Full HD 20 FPS (คมชัดสูงสุด เหมาะสำหรับประชุม/ตัวหนังสือ Excel)",
    modalQuality720: "⚡ 720p HD 15 FPS (โหมดมาตรฐาน ประหยัดแบนด์วิดท์)",
    modalTip: "💡 <strong>คำแนะนำ:</strong> เมื่อกดเริ่ม เบราว์เซอร์จะให้เลือกหน้าจอที่ต้องการแชร์ สามารถคลิกเลือกทั้งหน้าจอ (Entire Screen) หรือเลือกเฉพาะหน้าต่างโปรแกรมได้ ภาพจะส่งเข้าทีวีทันทีโดยไม่ต้องลงโปรแกรมเพิ่ม",
    modalCancel: "ยกเลิก",
    modalStart: "🚀 เริ่มถ่ายทอดสด",

    // About Modal
    aboutTitle: "เกี่ยวกับ Smart TV Signage",
    aboutAppName: "Smart TV Multi-Channel Signage",
    aboutVersion: "เวอร์ชัน 1.2 (macOS Edition)",
    aboutDescription: "ระบบกระจายภาพ สไลด์ และถ่ายทอดสดหน้าจอคอมพิวเตอร์ไปยัง Smart TV 6 ช่อง ผ่านระบบเครือข่ายภายใน (LAN/Wi-Fi) โดยไม่ต้องใช้อินเทอร์เน็ตภายนอก",
    aboutAuthor: "ผู้พัฒนา & เจ้าของลิขสิทธิ์: mamabuncho",
    aboutContact: "ติดต่อ: mamabuncho@gmail.com",
    aboutCopyright: "ลิขสิทธิ์ © 2026 mamabuncho. สงวนลิขสิทธิ์ทุกประการ.",
    aboutClose: "ตกลง",

    // Footer & Notifications
    footerText: "Smart TV Multi-Channel LAN Digital Signage System • พัฒนาโดย mamabuncho • สงวนลิขสิทธิ์ © 2026",
    toastRefresh: "รีเฟรชข้อมูลเรียบร้อยแล้ว",
    toastNameEmpty: "ชื่อช่องต้องไม่ว่างเปล่า",
    toastNameSaved: "✅ เปลี่ยนชื่อช่อง {channel} เป็น \"{name}\" แล้ว",
    toastBatchEmpty: "ไม่มีไฟล์ในช่องนี้ ให้ลากไฟล์มาวางก่อนปรับเวลา",
    toastBatchSuccess: "✅ ปรับเวลาทุกไฟล์ในช่อง {channel} เป็น {val} วินาทีเรียบร้อยแล้ว",
    toastJumpSuccess: "📺 บังคับให้หน้าจอทีวีช่อง {channel} แสดงภาพลำดับที่ {idx} ทันที",
    toastFreezeOn: "❄️ ล็อคภาพหน้าจอช่อง {channel} นิ่งไว้แล้ว (ไม่เปลี่ยนภาพ)",
    toastFreezeOff: "▶️ ปลดล็อคภาพหน้าจอช่อง {channel} แล้ว (หมุนเวียนต่อตามปกติ)",
    toastLiveStart: "🔴 เริ่มถ่ายทอดสดหน้าจอคอมพิวเตอร์ ({quality}) ไปยัง {target}",
    toastLiveStop: "⏹️ หยุดการถ่ายทอดสดหน้าจอเรียบร้อยแล้ว",
    toastSavedScreens: "✅ ส่งเข้าทีวีช่อง {channel} เรียบร้อย ({count} จอกำลังแสดงผล)",
    toastSavedPending: "✅ บันทึกช่อง {channel} เรียบร้อย (ทีวีจะเริ่มเล่นทันทีเมื่อเปิดเข้าหน้าเว็บ)"
  },

  en: {
    appTitle: "Smart TV Multi-Channel Signage",
    appSubtitle: "6-Channel TV Control System • Live Screen Share • Freeze Lock • Slide Duration • Multi-Format",
    serverStatusOk: "● Server Healthy",
    liveBtn: "🔴 Live Screen Share",
    refreshBtn: "🔄 Refresh Data",
    aboutBtn: "ℹ️ About System",
    liveActivePrefix: "Live broadcasting screen to: ",
    liveBadge: "LIVE 1080p",
    stopLiveBtn: "⏹️ Stop Broadcast",
    tabAll: "🎛️ All Channels (6)",
    tabChannelPrefix: "Channel ",
    tagline: "✨ macOS Fluid UI • Real-time LAN Sync",

    // Instructions
    instStep1: "<strong>Instant Drag & Drop:</strong> Supports JPG/PNG/GIF images, MP4 videos, PDF documents, Excel/CSV spreadsheets, and TXT announcements.",
    instStep2: "<strong>Live Controls:</strong> Click <strong>\"✏️ Rename\"</strong>, enter seconds and click <strong>\"Apply to All\"</strong>, click <strong>\"▶ Show Now\"</strong> to override slide, or click <strong>\"❄️ Freeze\"</strong>.",
    instStep3: "<strong>🔴 Live Screen Share:</strong> Click the red button above to broadcast your computer screen or apps (PowerPoint, Excel, Browser) to TVs in real-time.",

    // Channel Card
    channelLabel: "📺 Channel",
    renameHint: "Click to rename channel",
    renamePlaceholder: "Enter channel name...",
    renameIconTitle: "Edit channel name",
    freezeBtn: "❄️ Freeze",
    frozenBtn: "❄️ Frozen (Unlock)",
    streamLiveBtn: "🔴 Go Live",
    streamLiveTitle: "Stream live to this channel",
    openTvLink: "🔗 Open TV",
    openTvTitle: "Open TV screen in new tab for testing",
    tvOnline: "● TV Connected",
    screensUnit: "screen(s)",
    tvOffline: "○ Waiting for TV Browser (Offline)",
    dropzoneText: "Drop files here (or click to browse)",
    dropzoneHint: "Supports JPG, PNG, GIF, WebP, MP4, PDF, Excel (.xlsx, .csv), and TXT text",
    batchDurationLabel: "⏱️ Equal Duration for All:",
    batchDurationUnit: "s",
    batchDurationApply: "Apply to All",
    jumpBtn: "▶ Show Now",
    jumpTitle: "Force TV to display this slide immediately",
    removeTitle: "Remove this item",
    durationTitle: "Set display duration (seconds)",
    saveBtn: "💾 Save & Push to TV",
    savingBtn: "⏳ Sending...",
    emptyPlaylist: "No files in this channel yet.<br>Drag and drop images, videos, PDFs, or Excel sheets here to begin.",
    summaryItems: "items",
    summaryTotal: "Total",
    summarySeconds: "seconds",

    // Media Types
    typeVideo: "🎬 MP4 Video",
    typeGif: "🎞️ GIF Animation",
    typeExcel: "📊 Excel Sheet",
    typeText: "📢 Announcement",
    typePdf: "📄 PDF Slide",
    typeImage: "🖼️ 1080p Image",

    // Live Modal
    modalTitle: "🔴 Live Screen Share to TV Displays",
    modalInstruction: "Select your entire screen, an application window (e.g. PowerPoint, Excel), or a browser tab to stream live across the LAN.",
    modalTargetLabel: "Broadcast Target:",
    modalTargetAll: "📺 All Channels Simultaneously (Ch 1 - 6)",
    modalQualityLabel: "Stream Quality:",
    modalQuality1080: "🌟 1080p Full HD 20 FPS (High clarity for text & spreadsheets)",
    modalQuality720: "⚡ 720p HD 15 FPS (Standard mode, bandwidth saving)",
    modalTip: "💡 <strong>Tip:</strong> Upon clicking Start, your browser will prompt you to select a screen or window. You can share your entire desktop or a single application window without installing extra software.",
    modalCancel: "Cancel",
    modalStart: "🚀 Start Broadcast",

    // About Modal
    aboutTitle: "About Smart TV Signage",
    aboutAppName: "Smart TV Multi-Channel Signage",
    aboutVersion: "Version 1.2 (macOS Edition)",
    aboutDescription: "A multi-channel digital signage and real-time screen broadcasting system for Smart TVs operating over local LAN/Wi-Fi without external internet dependencies.",
    aboutAuthor: "Developer & Owner: mamabuncho",
    aboutContact: "Contact: mamabuncho@gmail.com",
    aboutCopyright: "Copyright © 2026 mamabuncho. All rights reserved.",
    aboutClose: "Done",

    // Footer & Notifications
    footerText: "Smart TV Multi-Channel LAN Digital Signage System • Developed by mamabuncho • All rights reserved © 2026",
    toastRefresh: "Dashboard data refreshed successfully",
    toastNameEmpty: "Channel name cannot be empty",
    toastNameSaved: "✅ Renamed Channel {channel} to \"{name}\"",
    toastBatchEmpty: "No files in this channel. Drag and drop files first.",
    toastBatchSuccess: "✅ Set duration for all files in Channel {channel} to {val} seconds",
    toastJumpSuccess: "📺 Forced TV Channel {channel} to display slide #{idx} immediately",
    toastFreezeOn: "❄️ Slide locked on TV Channel {channel} (Freeze active)",
    toastFreezeOff: "▶️ Slide unlocked on TV Channel {channel} (Resumed normal loop)",
    toastLiveStart: "🔴 Started live screen share ({quality}) to {target}",
    toastLiveStop: "⏹️ Live screen broadcast stopped",
    toastSavedScreens: "✅ Saved & synced to Channel {channel} ({count} screen(s) active)",
    toastSavedPending: "✅ Saved Channel {channel} (TV will play once opened)"
  },

  ja: {
    appTitle: "Smart TV マルチチャンネルサイネージ",
    appSubtitle: "6画面TV制御システム • 画面ライブ配信 • 画面固定 • 表示時間一括設定 • 全形式対応",
    serverStatusOk: "● サーバー稼働中",
    liveBtn: "🔴 画面ライブ配信",
    refreshBtn: "🔄 データを更新",
    aboutBtn: "ℹ️ バージョン情報",
    liveActivePrefix: "画面ライブ配信中 送信先: ",
    liveBadge: "LIVE 1080p",
    stopLiveBtn: "⏹️ 配信停止",
    tabAll: "🎛️ 全チャンネル (6画面)",
    tabChannelPrefix: "チャンネル ",
    tagline: "✨ macOS Fluid UI • リアルタイムLAN同期",

    // Instructions
    instStep1: "<strong>ファイルをドラッグ＆ドロップ:</strong> JPG/PNG/GIF画像、MP4動画、PDF文書、Excel/CSVスプレッドシート、TXT告知文に対応。",
    instStep2: "<strong>ライブ制御機能:</strong> <strong>「✏️ チャンネル名変更」</strong>、時間を入力して<strong>「全適用」</strong>、<strong>「▶ 今すぐ表示」</strong>で即時切り替え、または<strong>「❄️ 画面固定」</strong>。",
    instStep3: "<strong>🔴 画面ライブ配信:</strong> 上部の赤ボタンをクリックして、PC画面やExcel/PowerPointアプリをリアルタイムでテレビに配信します。",

    // Channel Card
    channelLabel: "📺 チャンネル",
    renameHint: "クリックしてチャンネル名を変更",
    renamePlaceholder: "チャンネル名を入力...",
    renameIconTitle: "チャンネル名を編集",
    freezeBtn: "❄️ 画面固定",
    frozenBtn: "❄️ 固定中 (解除)",
    streamLiveBtn: "🔴 ライブ配信",
    streamLiveTitle: "このチャンネルにライブ配信",
    openTvLink: "🔗 TV画面を開く",
    openTvTitle: "新しいタブでテレビ画面を開いてテスト",
    tvOnline: "● TV接続中",
    screensUnit: "台",
    tvOffline: "○ TVブラウザ接続待機中 (オフライン)",
    dropzoneText: "ここにファイルをドロップ (またはクリックして選択)",
    dropzoneHint: "JPG, PNG, GIF, WebP, MP4, PDF, Excel (.xlsx, .csv), TXTテキストに対応",
    batchDurationLabel: "⏱️ 全ファイル一括時間設定:",
    batchDurationUnit: "秒",
    batchDurationApply: "全適用",
    jumpBtn: "▶ 今すぐ表示",
    jumpTitle: "このスライドをテレビに今すぐ強制表示",
    removeTitle: "この項目を削除",
    durationTitle: "表示時間を設定 (秒)",
    saveBtn: "💾 保存してTVへ反映",
    savingBtn: "⏳ 反映中...",
    emptyPlaylist: "このチャンネルにはまだファイルがありません。<br>画像、動画、PDF、Excelファイルをドロップして開始してください。",
    summaryItems: "件",
    summaryTotal: "合計",
    summarySeconds: "秒",

    // Media Types
    typeVideo: "🎬 MP4動画",
    typeGif: "🎞️ アニメGIF",
    typeExcel: "📊 Excel表",
    typeText: "📢 告知文",
    typePdf: "📄 PDFスライド",
    typeImage: "🖼️ 1080p画像",

    // Live Modal
    modalTitle: "🔴 画面ライブ配信 (Live Screen Share)",
    modalInstruction: "画面全体、アプリケーションウィンドウ（Excel、PowerPointなど）、またはブラウザタブを選択して、LAN経由でTVにリアルタイム配信します。",
    modalTargetLabel: "配信先画面:",
    modalTargetAll: "📺 全チャンネル同時配信 (1〜6ch)",
    modalQualityLabel: "配信画質:",
    modalQuality1080: "🌟 1080p フルHD 20 FPS (文字や表計算に最適な超高精細)",
    modalQuality720: "⚡ 720p HD 15 FPS (標準モード・帯域節約)",
    modalTip: "💡 <strong>ヒント:</strong> 開始をクリックすると、共有する画面またはウィンドウを選択するダイアログが表示されます。専用アプリの追加インストールは不要です。",
    modalCancel: "キャンセル",
    modalStart: "🚀 配信開始",

    // About Modal
    aboutTitle: "Smart TV Signage について",
    aboutAppName: "Smart TV Multi-Channel Signage",
    aboutVersion: "バージョン 1.2 (macOS Edition)",
    aboutDescription: "外部インターネットに接続することなく、ローカルLAN/Wi-Fi経由で最大6台のスマートTVへスライドや画面ライブ配信を行うデジタルサイネージシステムです。",
    aboutAuthor: "開発者 & 著作権所有者: mamabuncho",
    aboutContact: "連絡先: mamabuncho@gmail.com",
    aboutCopyright: "著作権 © 2026 mamabuncho. 無断転載を禁じます。",
    aboutClose: "閉じる",

    // Footer & Notifications
    footerText: "Smart TV マルチチャンネルLANデジタルサイネージシステム • 開発者: mamabuncho • 著作権 © 2026",
    toastRefresh: "データを更新しました",
    toastNameEmpty: "チャンネル名を入力してください",
    toastNameSaved: "✅ チャンネル {channel} の名前を「{name}」に変更しました",
    toastBatchEmpty: "ファイルがありません。先にファイルをドロップしてください。",
    toastBatchSuccess: "✅ チャンネル {channel} の全スライド表示時間を {val} 秒に設定しました",
    toastJumpSuccess: "📺 チャンネル {channel} のテレビにスライド #{idx} を今すぐ表示しました",
    toastFreezeOn: "❄️ チャンネル {channel} の画面を固定しました (切り替え停止)",
    toastFreezeOff: "▶️ チャンネル {channel} の画面固定を解除しました (通常ループ再開)",
    toastLiveStart: "🔴 画面ライブ配信 ({quality}) を {target} へ開始しました",
    toastLiveStop: "⏹️ 画面ライブ配信を停止しました",
    toastSavedScreens: "✅ チャンネル {channel} へ反映しました (現在 {count} 台のテレビで表示中)",
    toastSavedPending: "✅ チャンネル {channel} を保存しました (テレビで開くと再生が始まります)"
  }
};

let currentLang = 'th';

export function getLanguage() {
  return currentLang;
}

export function setLanguage(lang) {
  if (!translations[lang]) lang = 'th';
  currentLang = lang;
  try {
    localStorage.setItem('smarttv_lang', lang);
  } catch {}
  return currentLang;
}

export function initLanguage() {
  try {
    const saved = localStorage.getItem('smarttv_lang');
    if (saved && translations[saved]) {
      currentLang = saved;
    }
  } catch {}
  return currentLang;
}

export function t(key, params = {}) {
  const dict = translations[currentLang] || translations.th;
  let text = dict[key] || translations.th[key] || key;
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  }
  return text;
}
