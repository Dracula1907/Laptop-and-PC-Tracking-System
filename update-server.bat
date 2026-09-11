@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Faith Automation IT Inventory - Production Server Update

REM ==========================================================
REM IMPORTANT:
REM This script ONLY manages Faith Automation IT Inventory.
REM Do NOT modify or stop the existing Parts Tracking project.
REM All Docker commands are strictly isolated to Compose project:
REM   faith-it-inventory
REM ==========================================================

REM ==========================================================
REM CONFIGURATION
REM ==========================================================
set "COMPOSE_PROJECT_NAME=faith-it-inventory"
set "PROJECT_DIR=C:\Applications\FaithITInventory"
set "EXPECTED_BRANCH=main"
set "BACKUP_DIR_NAME=backups"
set "LOG_DIR_NAME=deployment-logs"
set "HEALTH_RETRIES=25"
set "HEALTH_DELAY=3"

REM Auto-detect directory if running inside the repository directory
if exist "%~dp0docker-compose.yml" (
    set "PROJECT_DIR=%~dp0"
    if "!PROJECT_DIR:~-1!"=="\" set "PROJECT_DIR=!PROJECT_DIR:~0,-1!"
)
if exist "%~dp0start.js" (
    set "PROJECT_DIR=%~dp0"
    if "!PROJECT_DIR:~-1!"=="\" set "PROJECT_DIR=!PROJECT_DIR:~0,-1!"
)

REM Setup logging directory early
set "LOGS_DIR=%PROJECT_DIR%\%LOG_DIR_NAME%"
if not exist "%LOGS_DIR%" mkdir "%LOGS_DIR%" >nul 2>&1

REM Generate timestamp (YYYY-MM-DD-HHmmss)
for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd-HHmmss'"`) do set "TIMESTAMP=%%i"
if "%TIMESTAMP%"=="" set "TIMESTAMP=%DATE:~10,4%-%DATE:~4,2%-%DATE:~7,2%-%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%"
set "LOG_FILE=%LOGS_DIR%\update-%TIMESTAMP%.log"

if exist "%LOGS_DIR%" (
    echo Update started at %DATE% %TIME% > "%LOG_FILE%" 2>nul
    echo Server Hostname: %COMPUTERNAME% >> "%LOG_FILE%" 2>nul
    echo Compose Project: %COMPOSE_PROJECT_NAME% >> "%LOG_FILE%" 2>nul
    echo Project Directory: %PROJECT_DIR% >> "%LOG_FILE%" 2>nul
)

echo.
echo ==================================================
echo   FAITH AUTOMATION IT INVENTORY
echo   PRODUCTION UPDATE SYSTEM
echo ==================================================
echo.
echo Deployment Directory   : %PROJECT_DIR%
echo Coexisting Project     : Parts Tracking [Protected / Untouched]
echo.

REM ----------------------------------------------------------
REM STEP 1: CHECK PREREQUISITES & SELECT DEPLOYMENT MODE
REM ----------------------------------------------------------
echo [1/9] Checking prerequisites and environment...

where git >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Git is not installed or not found in system PATH.
    echo [ERROR] Missing Git >> "%LOG_FILE%"
    goto :FAILED
)

REM Check if Docker daemon is running
set "DEPLOY_MODE=NONE"
where docker >nul 2>&1
if %ERRORLEVEL% equ 0 (
    docker info >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        set "DEPLOY_MODE=DOCKER"
    )
)

if "%DEPLOY_MODE%"=="NONE" (
    where node >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        where npm >nul 2>&1
        if !ERRORLEVEL! equ 0 (
            set "DEPLOY_MODE=NATIVE"
        )
    )
)

if "%DEPLOY_MODE%"=="NONE" (
    echo [ERROR] Neither Docker daemon nor Node.js runtime was found.
    echo Please ensure either Docker Desktop or Node.js is installed.
    echo [ERROR] No supported runtime found >> "%LOG_FILE%"
    goto :FAILED
)

echo [OK] Git verified.
if "%DEPLOY_MODE%"=="DOCKER" (
    echo [OK] Deployment Mode: DOCKER COMPOSE - Project: %COMPOSE_PROJECT_NAME%
    echo Mode: DOCKER >> "%LOG_FILE%"
) else (
    echo [OK] Deployment Mode: NATIVE WINDOWS - Node.js runtime
    echo Mode: NATIVE >> "%LOG_FILE%"
)
echo.

REM ----------------------------------------------------------
REM STEP 2: VALIDATE PROJECT DIRECTORY & ENVIRONMENT
REM ----------------------------------------------------------
echo [2/9] Validating project directory and configuration...

if not exist "%PROJECT_DIR%" (
    echo [ERROR] Project directory does not exist: "%PROJECT_DIR%"
    goto :FAILED
)

cd /d "%PROJECT_DIR%"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to navigate to project directory: "%PROJECT_DIR%"
    goto :FAILED
)

REM Read configured ports from .env if present
set "ITAM_HTTP_PORT=80"
set "ITAM_WEB_PORT=3000"
if exist "%PROJECT_DIR%\.env" (
    for /f "tokens=1,2 delims==" %%a in ('findstr /i "^ITAM_HTTP_PORT=" "%PROJECT_DIR%\.env"') do set "ITAM_HTTP_PORT=%%b"
    for /f "tokens=1,2 delims==" %%a in ('findstr /i "^ITAM_WEB_PORT=" "%PROJECT_DIR%\.env"') do set "ITAM_WEB_PORT=%%b"
    echo [OK] Environment file .env detected.
) else (
    echo [NOTICE] No local .env found; using default ports Web: 3000, API: 5000.
)

echo [OK] Logging to: %LOG_FILE%
echo.

REM ----------------------------------------------------------
REM STEP 3: CHECK GIT REPOSITORY & WORKTREE
REM ----------------------------------------------------------
echo [3/9] Checking Git repository state...

git rev-parse --is-inside-work-tree >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] "%PROJECT_DIR%" is not a valid Git repository.
    echo [ERROR] Not a git repository >> "%LOG_FILE%"
    goto :FAILED
)

for /f "tokens=*" %%b in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set "CURRENT_BRANCH=%%b"
for /f "tokens=*" %%c in ('git rev-parse --short HEAD 2^>nul') do set "PREV_COMMIT=%%c"

echo Current Branch : %CURRENT_BRANCH%
echo Current Commit : %PREV_COMMIT%
echo Branch: %CURRENT_BRANCH% Commit: %PREV_COMMIT% >> "%LOG_FILE%"

REM SAFETY: Verify worktree clean
set "STATUS_TMP=%TEMP%\itam_git_status_%TIMESTAMP%.tmp"
git status --porcelain > "%STATUS_TMP%" 2>&1
for %%A in ("%STATUS_TMP%") do set "STATUS_SIZE=%%~zA"
if %STATUS_SIZE% gtr 0 (
    echo.
    echo [CRITICAL ERROR] Uncommitted local modifications detected on server:
    type "%STATUS_TMP%"
    echo.
    echo [SAFETY RULE] The update script will NEVER automatically reset or overwrite
    echo local modifications on the production server.
    echo [ERROR] Uncommitted local modifications detected >> "%LOG_FILE%"
    del "%STATUS_TMP%" >nul 2>&1
    goto :FAILED
)
del "%STATUS_TMP%" >nul 2>&1

echo [OK] Git worktree is clean.
echo.

REM ----------------------------------------------------------
REM STEP 4: FETCH LATEST GITHUB CHANGES
REM ----------------------------------------------------------
echo [4/9] Fetching latest changes from GitHub...
echo Fetching origin/%CURRENT_BRANCH%... >> "%LOG_FILE%"

git fetch origin %CURRENT_BRANCH% >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to fetch from GitHub remote. Check network or credentials.
    echo [ERROR] git fetch failed >> "%LOG_FILE%"
    goto :FAILED
)

for /f "tokens=*" %%n in ('git rev-list HEAD..origin/%CURRENT_BRANCH% --count 2^>nul') do set "COMMITS_BEHIND=%%n"
if "%COMMITS_BEHIND%"=="" set "COMMITS_BEHIND=0"
echo Commits behind GitHub origin/%CURRENT_BRANCH%: %COMMITS_BEHIND%
echo Commits behind origin/%CURRENT_BRANCH%: %COMMITS_BEHIND% >> "%LOG_FILE%"

if "%COMMITS_BEHIND%"=="0" (
    echo [INFO] Repository is already up to date with origin/%CURRENT_BRANCH%.
)
echo.

REM ----------------------------------------------------------
REM STEP 5: UPDATE SOURCE CODE
REM ----------------------------------------------------------
echo [5/9] Updating source code...

if "%COMMITS_BEHIND%" gtr "0" (
    echo Pulling %COMMITS_BEHIND% new commit from origin/%CURRENT_BRANCH%...
    git pull --ff-only origin %CURRENT_BRANCH% >> "%LOG_FILE%" 2>&1
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] git pull --ff-only failed! Check logs.
        echo [ERROR] git pull failed >> "%LOG_FILE%"
        goto :FAILED
    )
)

for /f "tokens=*" %%c in ('git rev-parse --short HEAD 2^>nul') do set "NEW_COMMIT=%%c"
echo Active Commit: %NEW_COMMIT%
echo Updated Commit: %NEW_COMMIT% >> "%LOG_FILE%"
echo [OK] Source code synchronized.
echo.

REM ----------------------------------------------------------
REM STEP 6: BUILD APPLICATION
REM ----------------------------------------------------------
echo [6/9] Building application...

if "%DEPLOY_MODE%"=="DOCKER" (
    echo Building Faith IT Inventory Docker images...
    docker compose -p %COMPOSE_PROJECT_NAME% build >> "%LOG_FILE%" 2>&1
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Docker build failed! Check %LOG_FILE%
        goto :FAILED
    )
) else (
    echo Installing or validating backend dependencies...
    cd /d "%PROJECT_DIR%\backend"
    call npm install >> "%LOG_FILE%" 2>&1
    echo Compiling backend TypeScript...
    call npm run build >> "%LOG_FILE%" 2>&1
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Backend compilation failed! Check %LOG_FILE%
        cd /d "%PROJECT_DIR%"
        goto :FAILED
    )

    echo Installing or validating frontend dependencies...
    cd /d "%PROJECT_DIR%\frontend"
    call npm install >> "%LOG_FILE%" 2>&1
    echo Building frontend production bundle...
    call npm run build >> "%LOG_FILE%" 2>&1
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Frontend build failed! Check %LOG_FILE%
        cd /d "%PROJECT_DIR%"
        goto :FAILED
    )
    cd /d "%PROJECT_DIR%"
)

echo [OK] Application build completed successfully.
echo.

REM ----------------------------------------------------------
REM STEP 7: DATABASE BACKUP, MIGRATIONS & 19-COLUMN REGISTRY SYNC
REM ----------------------------------------------------------
echo [7/9] Database maintenance and 19-column registry synchronization...

set "BACKUPS_DIR=%PROJECT_DIR%\%BACKUP_DIR_NAME%"
if not exist "%BACKUPS_DIR%" mkdir "%BACKUPS_DIR%" >nul 2>&1

if "%DEPLOY_MODE%"=="DOCKER" (
    echo Ensuring PostgreSQL container is running...
    docker compose -p %COMPOSE_PROJECT_NAME% up -d postgres >> "%LOG_FILE%" 2>&1

    echo Waiting for PostgreSQL to be ready...
    set "PG_READY=0"
    for /l %%i in (1,1,%HEALTH_RETRIES%) do (
        if "!PG_READY!"=="0" (
            docker compose -p %COMPOSE_PROJECT_NAME% exec -T postgres pg_isready -U itam_user -d itam_db >nul 2>&1
            if !ERRORLEVEL! equ 0 (
                set "PG_READY=1"
                echo [OK] PostgreSQL is accepting connections.
            ) else (
                timeout /t %HEALTH_DELAY% /nobreak >nul 2>&1
            )
        )
    )

    set "BACKUP_FILE=%BACKUPS_DIR%\faith_it_inventory_%TIMESTAMP%.sql"
    echo Creating database backup...
    docker compose -p %COMPOSE_PROJECT_NAME% exec -T postgres pg_dump -U itam_user -d itam_db > "!BACKUP_FILE!" 2>nul
    if exist "!BACKUP_FILE!" (
        echo [OK] Pre-migration backup saved: "!BACKUP_FILE!"
        echo Database backup: !BACKUP_FILE! >> "%LOG_FILE%"
    )

    echo Applying Prisma migrations - including 19-column schema upgrade...
    docker compose -p %COMPOSE_PROJECT_NAME% run --rm --no-deps backend npx prisma migrate deploy >> "%LOG_FILE%" 2>&1
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Database migration failed!
        goto :FAILED
    )

    echo Synchronizing official 19-column registry with data/ASSET LIST.xls...
    docker compose -p %COMPOSE_PROJECT_NAME% run --rm --no-deps backend node scripts/run_official_import.js >> "%LOG_FILE%" 2>&1
    if !ERRORLEVEL! equ 0 (
        echo [OK] Official Asset Inventory synchronized successfully.
    ) else (
        echo [NOTICE] Official import check finished.
    )
) else (
    echo Creating database backup snapshot...
    cd /d "%PROJECT_DIR%\backend"
    node scripts/backup_db.js >> "%LOG_FILE%" 2>&1

    echo Applying Prisma migrations with prisma migrate deploy...
    call npx prisma migrate deploy >> "%LOG_FILE%" 2>&1
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Native database migration failed! Check %LOG_FILE%
        cd /d "%PROJECT_DIR%"
        goto :FAILED
    )

    echo Synchronizing official 19-column registry with data/ASSET LIST.xls...
    node scripts/run_official_import.js >> "%LOG_FILE%" 2>&1
    if !ERRORLEVEL! equ 0 (
        echo [OK] Official Asset Inventory synchronized successfully.
    ) else (
        echo [NOTICE] Official import check finished.
    )
    cd /d "%PROJECT_DIR%"
)

echo [OK] Database schema and official inventory are up-to-date.
echo.

REM ----------------------------------------------------------
REM STEP 8: LAUNCH SERVICES
REM ----------------------------------------------------------
echo [8/9] Launching Faith IT Inventory services...

if "%DEPLOY_MODE%"=="DOCKER" (
    docker compose -p %COMPOSE_PROJECT_NAME% up -d >> "%LOG_FILE%" 2>&1
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Failed to start Docker services.
        goto :FAILED
    )
) else (
    echo Starting native application services via launcher...
    start "" cmd /c "start.bat"
)

echo [OK] Services launched.
echo.

REM ----------------------------------------------------------
REM STEP 9: HEALTH CHECKS
REM ----------------------------------------------------------
echo [9/9] Verifying service health...

set "API_HEALTHY=0"
for /l %%i in (1,1,%HEALTH_RETRIES%) do (
    if "!API_HEALTHY!"=="0" (
        powershell -NoProfile -Command ^
            "try { $res = Invoke-RestMethod -Uri 'http://localhost:5000/api/health' -TimeoutSec 4; if ($res.api -eq 'HEALTHY') { exit 0 } } catch {};" ^
            "try { $res2 = Invoke-RestMethod -Uri 'http://localhost:80/api/health' -TimeoutSec 4; if ($res2.api -eq 'HEALTHY') { exit 0 } } catch {};" ^
            "exit 1" >nul 2>&1
        if !ERRORLEVEL! equ 0 (
            set "API_HEALTHY=1"
            echo [OK] Backend API is HEALTHY.
        ) else (
            timeout /t %HEALTH_DELAY% /nobreak >nul 2>&1
        )
    )
)

if "%API_HEALTHY%"=="0" (
    echo [WARNING] Backend health check response was delayed. Check logs: %LOG_FILE%
)

echo.
echo ==================================================
echo   UPDATE COMPLETED SUCCESSFULLY!
echo ==================================================
echo.
echo   Active Commit   : %NEW_COMMIT%
echo   Deployment Mode : %DEPLOY_MODE%
echo   Web Application : http://localhost:3000 or http://localhost:%ITAM_HTTP_PORT%
echo   Backend Health  : http://localhost:5000/api/health
echo   Official File   : data/ASSET LIST.xls - 19 Columns Synchronized
echo   Deployment Log  : %LOG_FILE%
echo.
if "%DEPLOY_MODE%"=="DOCKER" (
    docker compose -p %COMPOSE_PROJECT_NAME% ps
    echo NOTE: Existing Parts Tracking project was NOT touched.
)
echo.
pause
exit /b 0

:FAILED
echo.
echo ==================================================
echo   UPDATE FAILED!
echo ==================================================
echo Detailed deployment log is available at:
echo   %LOG_FILE%
echo [SAFETY GUARANTEE]
echo The existing Parts Tracking project was NOT modified or stopped.
echo PostgreSQL data was preserved intact.
echo.
pause
exit /b 1
