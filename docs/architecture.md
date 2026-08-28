# System Architecture - Laptop & IT Asset Tracking Management System (ITAM)

## 1. High-Level Overview
The Faith Automation Laptop & IT Asset Tracking Management System (ITAM) is an enterprise-grade full-stack web application designed for complete lifecycle management of corporate IT hardware.

```
USER BROWSER
    │
    ▼
NGINX Reverse Proxy (Port 80 / 3000)
    ├── / ───────► React SPA (Vite Static Build)
    └── /api/ ───► Node.js / Express REST API (TypeScript)
                       │
                       ▼
                   Prisma ORM (Transactions & Query Builder)
                       │
                       ▼
                   PostgreSQL Database (Isolated Docker Container)
```

## 2. Multi-Tier Layering
1. **Frontend**: Built with React 18, Vite, TypeScript, Tailwind CSS, Lucide React, and Recharts. Implements client-side routing, debounced search, responsive data tables, QR code generation, and export capabilities.
2. **Reverse Proxy (Nginx)**: Handles TLS termination, SPA fallback routing, API reverse proxying, security header injection, and gzip compression.
3. **Backend API**: Node.js & Express API structured using modern layered design (Routes -> Controllers -> Services -> Repositories -> Prisma Client).
4. **Database Layer**: PostgreSQL 15 running inside Docker network with volume persistence (`postgres_data`). No public exposure.

## 3. Technology Stack & Zero Cost Target (₹0)
- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Lucide React, Recharts, QRCode.react, jsPDF, XLSX.
- **Backend**: Node.js, Express, TypeScript, Zod, JWT, bcryptjs, Prisma ORM.
- **Database**: PostgreSQL.
- **DevOps**: Docker, Docker Compose, Nginx.
- **Software Cost**: ₹0 (100% Free & Open Source).
