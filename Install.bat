@echo off
setlocal

:: ============================================================================
:: Script untuk mengunduh dan menginstal Node.js versi LTS
:: ============================================================================

title Node.js LTS Installer

:: Tentukan versi Node.js LTS yang akan diinstal.
:: Anda bisa mengubah ini ke versi LTS terbaru dari situs https://nodejs.org/
set NODE_VERSION=20.12.2
set INSTALLER_NAME=node-v%NODE_VERSION%-x64.msi
set DOWNLOAD_URL=https://nodejs.org/dist/v%NODE_VERSION%/%INSTALLER_NAME%

echo.
echo =================================
echo  Installer Node.js LTS Otomatis 
echo =================================
echo.
echo Versi yang akan diinstal: %NODE_VERSION%
echo.

:: Cek apakah Node.js sudah terinstal
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo Node.js sudah terdeteksi.
    node -v
    echo.
    set /p "choice=Apakah Anda ingin menginstal ulang? (y/n): "
    if /i not "%choice%"=="y" (
        echo Instalasi dibatalkan.
        goto :end
    )
    echo.
)


:: Mengunduh installer Node.js menggunakan PowerShell
echo Mengunduh %INSTALLER_NAME%...
powershell -Command "Invoke-WebRequest -Uri %DOWNLOAD_URL% -OutFile .\%INSTALLER_NAME%"

:: Cek apakah unduhan berhasil
if not exist "%INSTALLER_NAME%" (
    echo.
    echo Gagal mengunduh file installer.
    echo Pastikan koneksi internet Anda stabil atau URL unduhan benar.
    goto :end
)

echo Unduhan selesai.
echo.

echo Menginstal Node.js...
msiexec /i "%INSTALLER_NAME%" /norestart

echo Instalasi selesai.
echo.

:: Menghapus file installer yang sudah tidak diperlukan
echo Membersihkan file installer...
del "%INSTALLER_NAME%"
echo Pembersihan selesai.
echo.

echo =========================================================
echo Instalasi Node.js LTS Berhasil!
echo =========================================================
echo.
echo Mohon buka Command Prompt atau PowerShell baru untuk menggunakan node dan npm.
echo.
echo Verifikasi versi:
:: Menambahkan path sementara agar bisa langsung cek versi
set "PATH=%ProgramFiles%\nodejs;%PATH%"
node -v
npm -v
echo.


:end
echo Tekan tombol apa saja untuk keluar...
pause > nul
endlocal
