@echo off
chcp 65001 >nul
title Stop Smart TV LAN Signage Server

echo ===============================================================
echo     กำลังหยุดการทำงานของเซิร์ฟเวอร์ Digital Signage...
echo ===============================================================
echo.

set FOUND=0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080 ^| findstr LISTENING') do (
    echo [INFO] กำลังปิดเซิร์ฟเวอร์บน Port 8080 (PID %%a)...
    taskkill /F /PID %%a >nul 2>&1
    set FOUND=1
)

if %FOUND% equ 1 (
    echo [SUCCESS] ปิดเซิร์ฟเวอร์เรียบร้อยแล้ว
) else (
    echo [INFO] ไม่พบเซิร์ฟเวอร์ทำงานอยู่บนพอร์ต 8080
)

echo.
pause
