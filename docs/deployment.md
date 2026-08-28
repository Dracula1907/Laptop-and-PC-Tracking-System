# Deployment & Operations Guide - ITAM System

## 1. Docker Compose Deployment Instructions

### Prerequisites
- Docker Engine 20.10+
- Docker Compose v2+

### Step 1: Environment Setup
Copy `.env.example` to `.env` and adjust passwords if required:
```bash
cp .env.example .env
```

### Step 2: Build & Launch Containers
Run Docker Compose in detached production mode:
```bash
docker-compose up -d --build
```

### Step 3: Run Database Migrations & Seed Data
Execute Prisma migrations and initialize seed accounts inside the backend container:
```bash
docker exec -it itam-backend npx prisma migrate deploy
docker exec -it itam-backend npx prisma db seed
```

### Step 4: Verify Deployment Health
Verify container status and API health:
```bash
docker-compose ps
curl http://localhost/api/health
```

---

## 2. PostgreSQL Backup & Restore Instructions

### Database Backup
To create a complete PostgreSQL database dump to host storage:
```bash
docker exec -t itam-postgres pg_dump -U itam_user -d itam_db > itam_backup_$(date +%Y%m%m_%H%M%S).sql
```

### Database Restore
To restore database from a saved SQL dump file:
1. Copy backup dump file into container or pipe directly:
```bash
cat itam_backup_20260826_140000.sql | docker exec -i itam-postgres psql -U itam_user -d itam_db
```
2. Restart backend container to re-establish connection pool:
```bash
docker-compose restart backend
```
3. Verify system health via `/api/health`.
