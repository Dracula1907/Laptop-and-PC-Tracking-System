# Laptop & IT Asset Tracking Management System (ITAM)

A complete, production-ready, full-stack enterprise **Laptop & IT Asset Tracking Management System (ITAM)** built for **Faith Automation & Engineering**.

Built with **React 18 + Vite + TypeScript + Tailwind CSS** on frontend, **Node.js + Express + TypeScript + Prisma ORM** on backend, **PostgreSQL** database, and **Docker + Nginx** architecture.

> **Software Cost Target**: Exactly **₹0**. Built entirely with free, open-source technologies without paid SaaS dependencies or third-party paid APIs.

---

## 🚀 Key Features
- **Asset Identity & Specifications**: Track laptops, desktops, monitors, keyboards, headsets, chargers, adapters, and custom hardware specs. Auto-generated asset codes (`AST-000001`).
- **Status Transition Engine**: Strict state engine enforcing allowed transitions (`AVAILABLE` ➔ `ASSIGNED` ➔ `IN_USE` / `RETURNED` ➔ `UNDER_REPAIR` / `RETIRED` / `SCRAPPED`). Terminal states prohibit invalid assignments.
- **Workflow Management**: Transactional asset assignments, transfers, returns (with physical inspection & accessory tracking), and maintenance tickets with spare parts log.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions across `ADMIN`, `MANAGER`, `IT`, and `USER` roles.
- **Real-Time PostgreSQL Telemetry & Dashboards**: Live metrics, Recharts distribution charts, active warranty expiry warnings, overdue return tracking, and real-time activity feeds.
- **QR Code Tagging System**: Instant SVG/PNG QR generation and print layout for hardware labelling (`AST-000001`).
- **Enterprise Reports & Exports**: Generate custom inventory, assigned, available, maintenance, transfer, and warranty reports with one-click **CSV**, **Excel (.xlsx)**, and **PDF** downloads.
- **Security Audit Logs**: Immutable audit log system capturing user action, entity payload, timestamp, and IP address.

---

## 🛠️ Technology Stack
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Recharts, QRCode.react, jsPDF, XLSX.
- **Backend API**: Node.js, Express.js, TypeScript, Zod, JWT Authentication, bcryptjs.
- **Database**: PostgreSQL 15, Prisma ORM.
- **Infrastructure**: Docker, Docker Compose, Nginx Reverse Proxy.

---

## 📦 Project Architecture
```
laptop-itam-system/
├── backend/            # Express TypeScript API + Prisma ORM
│   ├── prisma/         # Prisma Schema & Seed Script
│   └── src/            # Controllers, Services, Middleware, Routes
├── frontend/           # React + Vite + TypeScript Single Page App
│   └── src/            # Components, Pages, Layouts, Contexts, Services
├── nginx/              # Nginx Reverse Proxy Configuration
├── docs/               # Architecture, Database, API, Security, Workflows Docs
├── docker-compose.yml  # Multi-container Production Orchestration
├── .env.example        # Environment Variable Blueprint
└── README.md           # Documentation
```

---

## 🔑 Development Test Credentials
Passwords are stored as bcrypt hashes in PostgreSQL database.

| Role | Username | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin` | `admin123` | Full Administrative & System Access |
| **MANAGER** | `manager` | `manager123` | Department Assets, Approvals, Reports |
| **IT STAFF** | `it` | `it123` | Asset CRUD, Specifications, QR, Repairs |
| **USER** | `user` | `user123` | Self-Service Portal & Repair Filing |

*IMPORTANT: Change these passwords before deploying to production.*

---

---

## 🚀 Production Server Deployment & One-Command Updates

### Architecture & Isolation Guarantee
The production server hosts multiple independent systems, including **Parts Tracking**.
**Faith Automation IT Inventory** is strictly isolated:
- **Docker Compose Project Name**: `faith-it-inventory`
- **Isolated Network**: `faith-it-inventory_network`
- **Isolated Volume**: `faith-it-inventory_postgres_data`
- **Internal Database**: PostgreSQL is **not** exposed to the host port 5432, preventing conflicts with other databases.
- **Port Flexibility**: Web port (`ITAM_HTTP_PORT=80`) and alternative port (`ITAM_WEB_PORT=3000`) are fully customizable in `.env`.

> **CRITICAL RULE**: Under NO circumstances does the update system affect, restart, or prune containers, networks, or volumes belonging to Parts Tracking.

---

### Standard Workflow

#### 1. On Development PC
1. Make and verify changes locally.
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "feat/fix: description of update"
   git push origin main
   ```

#### 2. On Company Production Server
Run the one-command updater:
```bat
update-server.bat
```

The script automatically executes 9 safe stages:
1. **[1/9] Prerequisites**: Validates Git, Docker, Docker Compose, and Docker daemon.
2. **[2/9] Directory & Environment**: Verifies `C:\Applications\FaithITInventory` and ensures production secrets in `.env` are preserved.
3. **[3/9] Clean Tree Protection**: Aborts immediately if uncommitted local server modifications exist (never overwrites local server changes).
4. **[4/9] GitHub Fetch**: Checks remote `origin/main` for approved updates.
5. **[5/9] Fast-Forward Pull**: Pulls approved code with `--ff-only` and logs changed files.
6. **[6/9] Container Rebuild**: Rebuilds only `faith-it-inventory` images.
7. **[7/9] Database Safety & Migration**:
   - Ensures `itam-postgres` is running and healthy.
   - Creates automated timestamped backup in `backups/faith_it_inventory_YYYYMMDD_HHMMSS.sql`.
   - Runs `prisma migrate deploy` (never resets or seeds destructive data).
8. **[8/9] Service Start**: Starts/recreates only `faith-it-inventory` services in detached mode.
9. **[9/9] Health Checks**: Validates container status, queries `/api/health` (database + API), checks web response, and outputs comprehensive SUCCESS/FAILURE summary.

Audit logs are stored in `deployment-logs/update-YYYY-MM-DD-HHMMSS.log`.

---

## 📱 Mobile Application (Client) Updates

The mobile application is a React Native / Expo **client** and does NOT run in Docker:
- **Expo Dev / Expo Go**: Run `update-mobile.bat` and select Option 1 or 2.
- **Standalone Android APK**: Run `update-mobile.bat` and select Option 3 (EAS Build) or 4 (Local Build).
- **Distribute**: Send the generated `.apk` to employee and security guard Android devices.

---

## 🐳 Manual Docker Management (Isolated Scope)

Always use the project flag `-p faith-it-inventory`:
```bash
# Start all services
docker compose -p faith-it-inventory up -d

# Check status
docker compose -p faith-it-inventory ps

# View backend logs
docker compose -p faith-it-inventory logs -f backend

# Stop only IT Inventory services (Never touches Parts Tracking)
docker compose -p faith-it-inventory down
```

---

## 💻 Local Development Setup (Without Docker)

### Prerequisites
- Node.js v18+ & npm v9+
- PostgreSQL server running locally on port 5432

### 1. Backend Setup
```bash
cd backend
npm install
cp ../.env.example .env
# Ensure DATABASE_URL in .env points to your local PostgreSQL instance
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 💾 Database Backup & Restore

### Backup Database
```bash
docker exec -t itam-postgres pg_dump -U itam_user -d itam_db > itam_backup.sql
```

### Restore Database
```bash
cat itam_backup.sql | docker exec -i itam-postgres psql -U itam_user -d itam_db
docker-compose restart backend
```

---

## 📜 Documentation Index
- [System Architecture](docs/architecture.md)
- [Database Schema](docs/database.md)
- [API Documentation](docs/api.md)
- [Deployment & Ops](docs/deployment.md)
- [Security Model](docs/security.md)
- [Business Workflows](docs/workflows.md)
