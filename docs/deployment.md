# Deployment & Operations Guide - ITAM System

## 1. Production Server Architecture & Isolation

The company production server hosts multiple independent systems, including **Parts Tracking**.
To prevent cross-project interference, **Faith Automation IT Asset & Inventory Management (ITAM)** is strictly isolated:

| Item | Isolated Configuration |
|---|---|
| **Compose Project Name** | `faith-it-inventory` |
| **Docker Network** | `faith-it-inventory_network` (bridge) |
| **PostgreSQL Volume** | `faith-it-inventory_postgres_data` (persistent local) |
| **PostgreSQL Host Exposure** | None (Internal only, port 5432 not mapped to host) |
| **Production Directory** | `C:\Applications\FaithITInventory` |
| **Web Server Ports** | `${ITAM_HTTP_PORT:-80}` and `${ITAM_WEB_PORT:-3000}` (configurable in `.env`) |

> [!CAUTION]
> **Host Safety Rules**:
> - Never execute `docker system prune`, `docker volume prune`, or `docker network prune` on the host.
> - Never use un-scoped `docker compose down`.
> - Always scope commands using `-p faith-it-inventory`.

---

## 2. One-Command Production Server Updates

### Workflow: GitHub → Server
Updates are managed with `update-server.bat`:
```bat
update-server.bat
```

### Automated Stages:
1. **[1/9] Prerequisites Check**: Validates Git, Docker CLI, Docker Compose v2, and Docker daemon connectivity.
2. **[2/9] Directory & Environment**: Enters `C:\Applications\FaithITInventory`, validates `docker-compose.yml`, and verifies server-local `.env` secrets (`JWT_SECRET`, `POSTGRES_PASSWORD`, etc.).
3. **[3/9] Clean Tree Protection**: Aborts if uncommitted changes are detected in the production worktree. Server modifications are never wiped out.
4. **[4/9] GitHub Fetch**: Queries `origin/main` and detects whether new approved commits exist.
5. **[5/9] Fast-Forward Pull**: Pulls approved code with `git pull --ff-only` and logs changed files.
6. **[6/9] Container Rebuild**: Executes `docker compose -p faith-it-inventory build`.
7. **[7/9] Database Safety & Migration**:
   - Ensures `itam-postgres` is up and accepting connections (`pg_isready`).
   - Automatically generates timestamped backup in `backups/faith_it_inventory_YYYYMMDD_HHMMSS.sql`.
   - Runs `prisma migrate deploy` (production-safe, never resets).
8. **[8/9] Service Start**: Starts/recreates services via `docker compose -p faith-it-inventory up -d`.
9. **[9/9] Health Checks**: Validates container state, polls `/api/health` for `{ "api": "HEALTHY", "database": "HEALTHY" }`, verifies web response, and logs results.

Logs are saved to `deployment-logs/update-YYYY-MM-DD-HHMMSS.log`.

---

## 3. Database Backup & Restore

### Automated Backups
Automated dumps are created before every migration into:
`C:\Applications\FaithITInventory\backups\faith_it_inventory_YYYYMMDD_HHMMSS.sql`

### Manual Backup
```bash
docker exec -t itam-postgres pg_dump -U itam_user -d itam_db > backups/manual_backup.sql
```

### Manual Restore
To restore database from a saved SQL dump file:
1. Stream backup into the container:
```bash
cat backups/faith_it_inventory_YYYYMMDD_HHMMSS.sql | docker exec -i itam-postgres psql -U itam_user -d itam_db
```
2. Restart backend container to refresh connection pool:
```bash
docker compose -p faith-it-inventory restart backend
```
3. Verify system health:
```bash
curl http://localhost/api/health
```

---

## 4. Mobile Client Deployment

The mobile application is a React Native / Expo client (not a Docker service):
```bat
update-mobile.bat
```
- **Option 1**: Start Expo dev server (for testing on Expo Go).
- **Option 2**: Generate terminal and PNG QR code for Expo Go.
- **Option 3**: Build standalone Android APK via EAS Cloud (`eas build --platform android --profile preview-apk`).
- **Option 4**: Build standalone Android APK locally (`expo run:android`).
- **Distribution**: Distribute the resulting APK file to employee and security guard devices.

