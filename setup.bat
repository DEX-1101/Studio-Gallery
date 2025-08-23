@echo off
title Checking and Installing Node.js
cls

:: Variabel untuk versi Node.js dan nama file
set NODE_VERSION=v22.18.0
set FILENAME=node-%NODE_VERSION%-x64.msi
set DOWNLOAD_URL=https://nodejs.org/dist/%NODE_VERSION%/%FILENAME%

echo Mengecek instalasi Node.js...
node -v >nul 2>nul
if %errorlevel% equ 0 (
    goto :node_installed
) else (
    goto :node_not_installed
)

:node_installed
cls
echo.
echo =======================================================
echo  Node.js sudah terinstal di sistem Anda.
echo =======================================================
echo.
goto :end

:node_not_installed
cls
echo.
echo =======================================================
echo  Node.js tidak ditemukan. Memulai proses instalasi...
echo =======================================================
echo.
echo [1/3] Mempersiapkan unduhan untuk:
echo       - Versi: %NODE_VERSION%
echo       - Arsitektur: 64-bit
timeout 2 >nul 2>nul
echo.
echo [2/3] Mengunduh Node.js...

powershell -NoProfile -ExecutionPolicy Bypass -Command "Import-Module BitsTransfer; Start-BitsTransfer -Source '%DOWNLOAD_URL%' -Destination '%cd%\%FILENAME%'"

if not exist "%FILENAME%" (
    echo.
    echo =======================================================
    echo  ERROR: Gagal mengunduh file instalasi.
    echo  Pastikan koneksi internet Anda stabil dan coba lagi.
    echo =======================================================
    echo.
    goto :fail
)

echo.
echo [3/3] Unduhan selesai. Memulai instalasi Node.js secara otomatis...
echo.
msiexec /i "%FILENAME%" /passive

echo Instalasi selesai. Menghapus file installer...
del "%FILENAME%"
echo.
echo Node.js BERHASIL DIINSTAL!
goto :end

:fail
echo Tekan tombol apa saja untuk keluar.
pause > nul
goto :eof

:end
echo Proses selesai. Tekan tombol apa saja untuk keluar.
pause > nul
:eof