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

## 🐳 Running with Docker (Recommended)

### 1. Launch Containers
```bash
docker-compose up -d --build
```

### 2. Run Database Migrations & Seed Data
```bash
docker exec -it itam-backend npx prisma migrate deploy
docker exec -it itam-backend npx prisma db seed
```

### 3. Access Application
- **Web Interface**: `http://localhost:3000` or `http://localhost`
- **Backend API**: `http://localhost:5000/api`
- **Health Check**: `http://localhost:5000/api/health`

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
