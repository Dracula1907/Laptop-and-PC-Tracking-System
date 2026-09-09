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
set "HEALTH_RETRIES=20"
set "HEALTH_DELAY=3"

REM Auto-detect directory if running inside the repository directory
if exist "%~dp0docker-compose.yml" (
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
echo Target Compose Project : %COMPOSE_PROJECT_NAME%
echo Deployment Directory   : %PROJECT_DIR%
echo Coexisting Project     : Parts Tracking (Protected / Untouched)
echo.

REM ----------------------------------------------------------
REM STEP 1: CHECK PREREQUISITES
REM ----------------------------------------------------------
echo [1/9] Checking prerequisites...

where git >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Git is not installed or not found in system PATH.
    goto :FAILED
)

where docker >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker CLI is not installed or not found in system PATH.
    goto :FAILED
)

docker compose version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker Compose v2 is not installed or not available.
    goto :FAILED
)

docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker daemon is not running or not reachable.
    echo Please start Docker Desktop or the Docker Engine service before running this update.
    goto :FAILED
)

echo [OK] Prerequisites verified (Git, Docker, Docker Compose, Docker Daemon).
echo.

REM ----------------------------------------------------------
REM STEP 2: VALIDATE PROJECT DIRECTORY & ENVIRONMENT
REM ----------------------------------------------------------
echo [2/9] Validating project directory and environment...

if not exist "%PROJECT_DIR%" (
    echo [ERROR] Project directory does not exist:
    echo   "%PROJECT_DIR%"
    echo Please verify the deployment path or configure PROJECT_DIR at the top of this script.
    goto :FAILED
)

cd /d "%PROJECT_DIR%"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to navigate to project directory: "%PROJECT_DIR%"
    goto :FAILED
)

if not exist "%PROJECT_DIR%\docker-compose.yml" (
    echo [ERROR] docker-compose.yml not found in "%PROJECT_DIR%".
    goto :FAILED
)

REM Validate environment file exists
if not exist "%PROJECT_DIR%\.env" (
    echo [ERROR] Production environment file (.env) was not found in:
    echo   "%PROJECT_DIR%"
    echo Production secrets must NOT be committed to Git.
    echo Please copy .env.example to .env and configure your production secrets.
    if exist "%LOGS_DIR%" echo [ERROR] Missing .env file >> "%LOG_FILE%" 2>nul
    goto :FAILED
)

REM Validate critical environment variables in .env
findstr /i /r "^JWT_SECRET=" "%PROJECT_DIR%\.env" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] JWT_SECRET is missing from "%PROJECT_DIR%\.env".
    echo [ERROR] Missing JWT_SECRET >> "%LOG_FILE%"
    goto :FAILED
)

findstr /i /r "^POSTGRES_PASSWORD=" "%PROJECT_DIR%\.env" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] POSTGRES_PASSWORD is missing from "%PROJECT_DIR%\.env".
    echo [ERROR] Missing POSTGRES_PASSWORD >> "%LOG_FILE%"
    goto :FAILED
)

REM Read configured ports from .env (if set)
set "ITAM_HTTP_PORT=80"
set "ITAM_WEB_PORT=3000"
for /f "tokens=1,2 delims==" %%a in ('findstr /i "^ITAM_HTTP_PORT=" "%PROJECT_DIR%\.env"') do set "ITAM_HTTP_PORT=%%b"
for /f "tokens=1,2 delims==" %%a in ('findstr /i "^ITAM_WEB_PORT=" "%PROJECT_DIR%\.env"') do set "ITAM_WEB_PORT=%%b"

echo [OK] Project directory validated.
echo [OK] Production .env file validated (Secrets preserved).
echo [OK] Logging to: %LOG_FILE%
echo.

REM ----------------------------------------------------------
REM STEP 3: CHECK GIT REPOSITORY & UNCOMMITTED CHANGES
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
echo Branch: %CURRENT_BRANCH% (Commit: %PREV_COMMIT%) >> "%LOG_FILE%"

REM SAFETY RULE: Detect uncommitted changes. NEVER discard production server changes.
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
    echo Please review, commit, or stash these changes manually before updating.
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
echo [4/9] Fetching latest approved changes from GitHub...
echo Fetching origin/%CURRENT_BRANCH%... >> "%LOG_FILE%"

git fetch origin %CURRENT_BRANCH% >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to fetch from GitHub remote. Check network / git credentials.
    echo [ERROR] git fetch failed >> "%LOG_FILE%"
    goto :FAILED
)

for /f "tokens=*" %%n in ('git rev-list HEAD..origin/%CURRENT_BRANCH% --count 2^>nul') do set "COMMITS_BEHIND=%%n"

if "%COMMITS_BEHIND%"=="" set "COMMITS_BEHIND=0"
echo Commits behind GitHub origin/%CURRENT_BRANCH%: %COMMITS_BEHIND%
echo Commits behind origin/%CURRENT_BRANCH%: %COMMITS_BEHIND% >> "%LOG_FILE%"

if "%COMMITS_BEHIND%"=="0" (
    echo [INFO] Repository is already up to date with origin/%CURRENT_BRANCH%.
    echo Proceeding with service verification and container refresh...
)
echo.

REM ----------------------------------------------------------
REM STEP 5: UPDATE SOURCE CODE
REM ----------------------------------------------------------
echo [5/9] Updating source code...

if "%COMMITS_BEHIND%" gtr "0" (
    echo Pulling %COMMITS_BEHIND% new commit(s) from origin/%CURRENT_BRANCH%...
    git pull --ff-only origin %CURRENT_BRANCH% >> "%LOG_FILE%" 2>&1
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] git pull --ff-only failed!
        echo Possible merge conflict or diverged history.
        echo [ERROR] git pull failed >> "%LOG_FILE%"
        goto :FAILED
    )
)

for /f "tokens=*" %%c in ('git rev-parse --short HEAD 2^>nul') do set "NEW_COMMIT=%%c"
echo Previous Commit : %PREV_COMMIT%
echo New Commit      : %NEW_COMMIT%
echo Updated Commit: %NEW_COMMIT% >> "%LOG_FILE%"

if not "%PREV_COMMIT%"=="%NEW_COMMIT%" (
    echo.
    echo Summary of changed files:
    git diff --stat %PREV_COMMIT% %NEW_COMMIT%
    git diff --stat %PREV_COMMIT% %NEW_COMMIT% >> "%LOG_FILE%" 2>&1
)
echo [OK] Source code synchronized successfully.
echo.

REM ----------------------------------------------------------
REM STEP 6: BUILD FAITH IT INVENTORY CONTAINERS
REM ----------------------------------------------------------
echo [6/9] Building Faith IT Inventory Docker images...
echo Target Project: %COMPOSE_PROJECT_NAME% (Strictly isolated from Parts Tracking)
echo Building images for project %COMPOSE_PROJECT_NAME%... >> "%LOG_FILE%"

docker compose -p %COMPOSE_PROJECT_NAME% build >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker build failed for %COMPOSE_PROJECT_NAME%!
    echo Previous deployment left intact. See log file for details:
    echo   %LOG_FILE%
    echo [ERROR] docker compose build failed >> "%LOG_FILE%"
    goto :FAILED
)

echo [OK] Docker images built successfully.
echo.

REM ----------------------------------------------------------
REM STEP 7: ENSURE DATABASE & APPLY MIGRATIONS
REM ----------------------------------------------------------
echo [7/9] Ensuring database is online and applying migrations...

REM 7a. Ensure PostgreSQL service is started
echo Starting PostgreSQL container (%COMPOSE_PROJECT_NAME%_postgres)...
docker compose -p %COMPOSE_PROJECT_NAME% up -d postgres >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to start postgres container for %COMPOSE_PROJECT_NAME%.
    goto :FAILED
)

REM 7b. Wait for PostgreSQL to be ready
echo Waiting for PostgreSQL database to be healthy...
set "PG_READY=0"
for /l %%i in (1,1,%HEALTH_RETRIES%) do (
    if "!PG_READY!"=="0" (
        docker compose -p %COMPOSE_PROJECT_NAME% exec -T postgres pg_isready -U itam_user -d itam_db >nul 2>&1
        if !ERRORLEVEL! equ 0 (
            set "PG_READY=1"
            echo [OK] PostgreSQL is healthy and accepting connections.
        ) else (
            timeout /t %HEALTH_DELAY% /nobreak >nul 2>&1
        )
    )
)

if "%PG_READY%"=="0" (
    echo [ERROR] PostgreSQL failed to become ready within the timeout period.
    echo [ERROR] PostgreSQL health check timed out >> "%LOG_FILE%"
    goto :FAILED
)

REM 7c. Automated Pre-Migration Database Backup
set "BACKUPS_DIR=%PROJECT_DIR%\%BACKUP_DIR_NAME%"
if not exist "%BACKUPS_DIR%" mkdir "%BACKUPS_DIR%" >nul 2>&1
set "BACKUP_FILE=%BACKUPS_DIR%\faith_it_inventory_%TIMESTAMP%.sql"

echo Creating pre-migration database backup...
docker compose -p %COMPOSE_PROJECT_NAME% exec -T postgres pg_dump -U itam_user -d itam_db > "%BACKUP_FILE%" 2>nul
if %ERRORLEVEL% equ 0 (
    for %%F in ("%BACKUP_FILE%") do set "BACKUP_SIZE=%%~zF"
    if !BACKUP_SIZE! gtr 0 (
        echo [OK] Pre-migration backup saved: "%BACKUP_FILE%" (!BACKUP_SIZE! bytes)
        echo Database backup: %BACKUP_FILE% (!BACKUP_SIZE! bytes) >> "%LOG_FILE%"
    ) else (
        echo [NOTICE] Empty database or new deployment. Backup skipped.
        del "%BACKUP_FILE%" >nul 2>&1
    )
) else (
    echo [NOTICE] First-time deployment or new database. Proceeding...
    del "%BACKUP_FILE%" >nul 2>&1
)

REM 7d. Run Prisma Production Migrations
echo Applying Prisma production migrations (prisma migrate deploy)...
echo Running prisma migrate deploy... >> "%LOG_FILE%"

docker compose -p %COMPOSE_PROJECT_NAME% run --rm --no-deps backend npx prisma migrate deploy >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Database migration failed!
    echo Deployment halted to protect data integrity.
    echo Check logs for details: %LOG_FILE%
    echo [ERROR] prisma migrate deploy failed >> "%LOG_FILE%"
    goto :FAILED
)

echo [OK] Database migrations verified and up-to-date.
echo.

REM ----------------------------------------------------------
REM STEP 8: START / RESTART SERVICES
REM ----------------------------------------------------------
echo [8/9] Starting Faith IT Inventory services...
echo Starting all services for project %COMPOSE_PROJECT_NAME%... >> "%LOG_FILE%"

docker compose -p %COMPOSE_PROJECT_NAME% up -d >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to start services for %COMPOSE_PROJECT_NAME%.
    echo [ERROR] docker compose up -d failed >> "%LOG_FILE%"
    goto :FAILED
)

echo [OK] Services launched in detached mode.
echo.

REM ----------------------------------------------------------
REM STEP 9: COMPREHENSIVE HEALTH CHECKS
REM ----------------------------------------------------------
echo [9/9] Running health checks...
echo Starting health verification... >> "%LOG_FILE%"

REM Wait 5 seconds for processes to bind
timeout /t 5 /nobreak >nul 2>&1

REM 9a. Verify container states
echo Verifying container statuses...
docker compose -p %COMPOSE_PROJECT_NAME% ps >> "%LOG_FILE%" 2>&1

REM 9b. Verify Backend Health Endpoint (/api/health)
echo Checking Backend API health (http://localhost:5000/api/health or via Nginx)...
set "API_HEALTHY=0"

for /l %%i in (1,1,%HEALTH_RETRIES%) do (
    if "!API_HEALTHY!"=="0" (
        powershell -NoProfile -Command ^
            "$p = $env:ITAM_HTTP_PORT; if (-not $p) { $p = '80' };" ^
            "try {" ^
            "  $res = Invoke-RestMethod -Uri ('http://localhost:' + $p + '/api/health') -TimeoutSec 4;" ^
            "  if ($res.api -eq 'HEALTHY' -and $res.database -eq 'HEALTHY') { exit 0 }" ^
            "} catch {};" ^
            "try {" ^
            "  $res2 = Invoke-RestMethod -Uri 'http://localhost:5000/api/health' -TimeoutSec 4;" ^
            "  if ($res2.api -eq 'HEALTHY' -and $res2.database -eq 'HEALTHY') { exit 0 }" ^
            "} catch {};" ^
            "exit 1" >nul 2>&1
        if !ERRORLEVEL! equ 0 (
            set "API_HEALTHY=1"
            echo [OK] Backend API is HEALTHY (API: OK, Database: OK).
            echo Backend API health check: PASSED >> "%LOG_FILE%"
        ) else (
            timeout /t %HEALTH_DELAY% /nobreak >nul 2>&1
        )
    )
)

if "%API_HEALTHY%"=="0" (
    echo [ERROR] Backend health check failed after %HEALTH_RETRIES% retries.
    echo Showing recent backend logs:
    docker compose -p %COMPOSE_PROJECT_NAME% logs --tail=40 backend
    docker compose -p %COMPOSE_PROJECT_NAME% logs --tail=40 backend >> "%LOG_FILE%" 2>&1
    goto :FAILED
)

REM 9c. Verify Nginx Web App Port
echo Checking Web UI HTTP response (port %ITAM_HTTP_PORT%)...
set "WEB_HEALTHY=0"

powershell -NoProfile -Command ^
    "$p = $env:ITAM_HTTP_PORT; if (-not $p) { $p = '80' };" ^
    "try {" ^
    "  $status = (Invoke-WebRequest -Uri ('http://localhost:' + $p) -UseBasicParsing -TimeoutSec 5).StatusCode;" ^
    "  if ($status -eq 200) { exit 0 } else { exit 1 }" ^
    "} catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set "WEB_HEALTHY=1"
    echo [OK] Web UI is responding with HTTP 200 on port %ITAM_HTTP_PORT%.
    echo Web UI health check: PASSED >> "%LOG_FILE%"
) else (
    echo [WARNING] Port %ITAM_HTTP_PORT% did not return HTTP 200 directly. Checking alternative port %ITAM_WEB_PORT%...
    powershell -NoProfile -Command ^
        "$p2 = $env:ITAM_WEB_PORT; if (-not $p2) { $p2 = '3000' };" ^
        "try {" ^
        "  $status2 = (Invoke-WebRequest -Uri ('http://localhost:' + $p2) -UseBasicParsing -TimeoutSec 5).StatusCode;" ^
        "  if ($status2 -eq 200) { exit 0 } else { exit 1 }" ^
        "} catch { exit 1 }" >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        set "WEB_HEALTHY=1"
        echo [OK] Web UI is responding with HTTP 200 on port %ITAM_WEB_PORT%.
        echo Web UI health check on port %ITAM_WEB_PORT%: PASSED >> "%LOG_FILE%"
    ) else (
        echo [ERROR] Web UI is not responding on port %ITAM_HTTP_PORT% or %ITAM_WEB_PORT%.
        docker compose -p %COMPOSE_PROJECT_NAME% logs --tail=30 nginx
        docker compose -p %COMPOSE_PROJECT_NAME% logs --tail=30 nginx >> "%LOG_FILE%" 2>&1
        goto :FAILED
    )
)

echo.
echo ==================================================
echo   UPDATE COMPLETED SUCCESSFULLY!
echo ==================================================
echo.
echo   Compose Project : %COMPOSE_PROJECT_NAME%
echo   Git Branch      : %CURRENT_BRANCH%
echo   Previous Commit : %PREV_COMMIT%
echo   Active Commit   : %NEW_COMMIT%
echo   Web Application : http://localhost:%ITAM_HTTP_PORT%
echo   Secondary Port  : http://localhost:%ITAM_WEB_PORT%
echo   Backend Health  : http://localhost:%ITAM_HTTP_PORT%/api/health
if exist "%BACKUP_FILE%" echo   Database Backup : %BACKUP_FILE%
echo   Deployment Log  : %LOG_FILE%
echo.
echo ==================================================
echo   ACTIVE CONTAINERS FOR %COMPOSE_PROJECT_NAME%:
echo ==================================================
docker compose -p %COMPOSE_PROJECT_NAME% ps
echo.
echo NOTE: Existing Parts Tracking project was NOT touched.
echo Update finished successfully at %DATE% %TIME% >> "%LOG_FILE%"
pause
exit /b 0

REM ----------------------------------------------------------
REM FAILURE HANDLER
REM ----------------------------------------------------------
:FAILED
echo.
echo ==================================================
echo   UPDATE FAILED!
echo ==================================================
echo.
echo The update did not complete successfully.
echo Any working deployment was left untouched where possible.
if exist "%LOG_FILE%" echo Detailed deployment log is available at:
if exist "%LOG_FILE%" echo   %LOG_FILE%
echo.
echo [SAFETY GUARANTEE]
echo The existing Parts Tracking project was NOT modified or stopped.
echo PostgreSQL volumes and server-local .env were NOT deleted.
echo.
if defined LOG_FILE if exist "%LOGS_DIR%" echo Update FAILED at %DATE% %TIME% >> "%LOG_FILE%" 2>nul
pause
exit /b 1
