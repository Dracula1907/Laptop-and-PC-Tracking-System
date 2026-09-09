@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Faith Automation IT Inventory - Mobile Application Build ^& Distribution Helper

REM ==========================================================
REM Faith Automation IT Inventory Mobile Build Helper
REM ARCHITECTURE NOTE:
REM The mobile application is an Expo / React Native CLIENT.
REM It is NOT a Docker container.
REM
REM WORKFLOW:
REM   GitHub -> Mobile Build -> Standalone APK -> APK Distribution
REM ==========================================================

set "MOBILE_DIR=%~dp0mobile"
set "APK_DIR=%~dp0faith-automation-apk"

echo.
echo ==================================================
echo   FAITH AUTOMATION IT INVENTORY
echo   MOBILE APPLICATION (CLIENT) BUILD HELPER
echo ==================================================
echo.
echo NOTE: Mobile is a CLIENT application and does NOT run inside Docker.
echo It connects to the Faith IT Inventory Backend server via API.
echo.

REM Verify Node.js and npm
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not found in system PATH.
    pause
    exit /b 1
)

where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm is not installed or not found in system PATH.
    pause
    exit /b 1
)

REM Display detected mobile project folders
echo Detected mobile directories:
if exist "%MOBILE_DIR%" echo   [OK] Expo App Directory: %MOBILE_DIR%
if exist "%APK_DIR%" echo   [OK] Standalone APK Directory: %APK_DIR%
echo.

:MENU
echo --------------------------------------------------
echo Select a Mobile Operation:
echo --------------------------------------------------
echo   1. Start Expo Mobile Development Server (Expo Go)
echo   2. Generate Expo Go QR Code for Mobile Devices
echo   3. Build Standalone Android APK via EAS Cloud
echo   4. Run Local Android Build (Requires Android SDK)
echo   5. Check Mobile API Endpoint Configuration (.env)
echo   6. Exit
echo --------------------------------------------------
choice /c 123456 /n /m "Enter choice (1-6): "
set "CHOICE_CODE=%ERRORLEVEL%"

if "%CHOICE_CODE%"=="1" goto :START_DEV
if "%CHOICE_CODE%"=="2" goto :GEN_QR
if "%CHOICE_CODE%"=="3" goto :BUILD_EAS
if "%CHOICE_CODE%"=="4" goto :BUILD_LOCAL
if "%CHOICE_CODE%"=="5" goto :CHECK_CONFIG
if "%CHOICE_CODE%"=="6" goto :EXIT
goto :MENU

:START_DEV
echo.
echo Starting Expo mobile server...
cd /d "%MOBILE_DIR%"
npm start
goto :MENU

:GEN_QR
echo.
echo Generating Expo Go QR code...
cd /d "%MOBILE_DIR%"
node scripts/generate-expo-qr.js
echo.
pause
goto :MENU

:BUILD_EAS
echo.
echo Checking EAS CLI...
where eas >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [NOTICE] eas-cli not found globally. Using npx eas-cli...
    set "EAS_CMD=npx eas-cli"
) else (
    set "EAS_CMD=eas"
)

if exist "%APK_DIR%" (
    cd /d "%APK_DIR%"
) else (
    cd /d "%MOBILE_DIR%"
)

echo.
echo Running: %EAS_CMD% build --platform android --profile preview-apk
echo (Note: You must be logged into Expo with `npx eas login`)
%EAS_CMD% build --platform android --profile preview-apk
echo.
echo Once the build finishes on Expo servers, download the .apk file
echo and distribute it to employee/guard Android devices.
pause
goto :MENU

:BUILD_LOCAL
echo.
echo Checking Android SDK environment...
if "%ANDROID_HOME%"=="" (
    echo [WARNING] ANDROID_HOME environment variable is not set.
    echo Local APK builds require Android Studio and the Android SDK to be installed.
)
if exist "%APK_DIR%" (
    cd /d "%APK_DIR%"
) else (
    cd /d "%MOBILE_DIR%"
)
echo Running npx expo run:android...
npx expo run:android
pause
goto :MENU

:CHECK_CONFIG
echo.
echo --------------------------------------------------
echo Mobile API URL Configuration:
echo --------------------------------------------------
if exist "%MOBILE_DIR%\.env" (
    echo [mobile/.env]:
    type "%MOBILE_DIR%\.env"
) else (
    echo [mobile/.env] not found. Defaulting to client.ts configuration.
)
echo.
if exist "%APK_DIR%\.env" (
    echo [faith-automation-apk/.env]:
    type "%APK_DIR%\.env"
)
echo.
echo To change the backend API server endpoint for mobile devices,
echo update EXPO_PUBLIC_API_URL in the .env file above before building.
echo Example for LAN Wi-Fi: EXPO_PUBLIC_API_URL=http://192.168.100.88:5000/api
echo Example for Tunnel:    EXPO_PUBLIC_API_URL=https://your-public-tunnel.lhr.life/api
echo.
pause
goto :MENU

:EXIT
echo Exiting mobile helper.
exit /b 0
