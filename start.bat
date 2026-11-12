@echo off
chcp 65001 >nul
title Smart TV LAN Signage Server

:: ย้ายตำแหน่งการทำงานไปยังโฟลเดอร์ปัจจุบันของไฟล์นี้
cd /d "%~dp0"

echo ===============================================================
echo     Smart TV LAN Digital Signage System
echo ===============================================================
echo.

:: ตรวจสอบว่ามี Node.js อยู่ในระบบหรือไม่
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] ไม่พบ Node.js ในเครื่อง!
    echo กรุณาติดตั้ง Node.js จาก https://nodejs.org แล้วลองใหม่อีกครั้ง
    echo.
    pause
    exit /b 1
)

:: เคลียร์เซิร์ฟเวอร์เดิมที่อาจค้างอยู่บนพอร์ต 8080 อัตโนมัติ
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080 ^| findstr LISTENING') do (
    echo [INFO] ตรวจพบเซิร์ฟเวอร์เดิมกำลังทำงาน (PID %%a) กำลังปิดเพื่อรีสตาร์ท...
    taskkill /F /PID %%a >nul 2>&1
)

echo กำลังเริ่มทำงานเซิร์ฟเวอร์...
echo.

:: เปิดหน้าแอดมินในเบราว์เซอร์อัตโนมัติ (หน่วงเวลา 1.5 วินาทีเพื่อให้เซิร์ฟเวอร์พร้อมก่อน)
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8080/admin"

:: รันเซิร์ฟเวอร์ (จำกัด Heap RAM สูงสุด 256MB สำหรับการทำงานที่เบาและเสถียร 24 ชม.)
node --max-old-space-size=256 src/server.js

pause
