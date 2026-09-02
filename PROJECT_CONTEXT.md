# Faith Automation IT Inventory — PROJECT CONTEXT
> **READ THIS FILE FIRST** every time you open this project.
> It contains the full history of decisions, architecture, completed work, known gotchas, and what to do next.

---

## 0. Quick Reference

| Item | Value |
|---|---|
| **Project Name** | Faith Automation IT Asset & Inventory Management (ITAM) |
| **GitHub Repo** | https://github.com/Dracula1907/Laptop-and-PC-Tracking-System |
| **Author / GitHub** | Dracula1907 (`omkarsatpute1907@gmail.com`) |
| **Frontend URL** | http://localhost:3000 |
| **Backend URL** | http://localhost:5000 |
| **Database** | PostgreSQL (local, Windows) |
| **Admin Login** | username: `admin` / password: `admin123` |

---

## 1. Project Overview

A professional, full-stack **IT Asset & Inventory Management System** for Faith Automation.
Tracks the complete lifecycle of all company IT hardware: Laptops, Desktops, Tablets, Servers, Printers, Networking Equipment, Mobile Devices, and Accessories.

**Core capabilities as of last session:**
- Asset inventory with full hardware specifications
- Employee, Department/Area, and Location master data
- Asset assignment, transfer, return, and maintenance workflows
- Complete chain of custody / asset history
- Approval center with multi-stage workflow engine
- Warranty & contract lifecycle management
- Role-based access control (RBAC)
- Audit logs on all write operations
- Excel import/export (XLSX only — never CSV)
- Dashboard with real-time PostgreSQL telemetry

---

## 2. Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Language | TypeScript |
| Framework | Express.js |
| ORM | Prisma |
| Database | PostgreSQL (Windows, local) |
| Auth | JWT (jsonwebtoken) |
| Password | bcryptjs |
| Validation | Zod |
| Build | tsc (TypeScript compiler) |
| Dev Server | nodemon + ts-node |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 (Vite) |
| Language | TypeScript |
| Routing | React Router v6 |
| HTTP Client | Axios (via `api` util) |
| Styling | Vanilla CSS (custom design tokens) |
| Excel Export | xlsx (SheetJS) |
| Charts | recharts |
| Icons | lucide-react |
| Build | Vite 5 |

### Infrastructure
| Layer | Technology |
|---|---|
| DB Hosting | PostgreSQL (local Windows service) |
| Reverse Proxy | Nginx (nginx.conf present) |
| Process Manager | start.js / start.bat (monorepo launcher) |

---

## 3. Directory Structure

```
Laptop tracking system/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          ← Single source of truth for DB schema
│   │   ├── seed.ts                ← Seeds initial data (roles, admin user, sample assets)
│   │   └── migrations/            ← All deployed migrations (DO NOT delete)
│   ├── scratch/                   ← Automated verification test scripts (Node.js)
│   │   ├── test_step6_history.js
│   │   ├── test_step7_master_data.js
│   │   ├── test_step8_approvals.js
│   │   └── test_step9_warranties.js
│   └── src/
│       ├── controllers/           ← Express route handlers (one per module)
│       ├── services/              ← Business logic layer (one per module)
│       ├── routes/                ← Express routers (mounted in routes/index.ts)
│       ├── validators/
│       │   └── schemas.ts         ← All Zod validation schemas
│       ├── middleware/
│       │   └── auth.ts            ← JWT authenticateJWT, requirePermission, requireRoles
│       ├── utils/
│       │   └── jwt.ts             ← generateToken, verifyToken
│       └── types/
│           └── index.ts           ← UserPayload, AuthenticatedRequest, ApiResponse
├── frontend/
│   └── src/
│       ├── pages/                 ← One file per page/module
│       ├── layouts/
│       │   └── Sidebar.tsx        ← Navigation — add new pages here
│       ├── routes/
│       │   └── AppRoutes.tsx      ← React Router routes — add new pages here
│       ├── types/
│       │   └── index.ts           ← All TypeScript interfaces for API data
│       ├── utils/
│       │   ├── api.ts             ← Axios instance (baseURL: http://localhost:5000/api)
│       │   └── exporters.ts       ← All XLSX export functions
│       └── components/            ← Shared UI components (Button, Input, Select, Modal, etc.)
├── nginx/
│   └── nginx.conf
├── package.json                   ← Root monorepo launcher
├── start.js                       ← Starts DB + backend + frontend concurrently
├── start.bat                      ← Windows batch launcher
└── PROJECT_CONTEXT.md             ← THIS FILE
```

---

## 4. How to Start the Project

### Option A — One-command launcher
```powershell
node start.js
```

### Option B — Manual (three terminals)

**Terminal 1 — Database**
```powershell
cd backend
node scripts/start-db.js
```

**Terminal 2 — Backend**
```powershell
cd backend
npm run dev
```

**Terminal 3 — Frontend**
```powershell
cd frontend
npm run dev
```

### Verify running
- Frontend: http://localhost:3000
- Backend health: http://localhost:5000/api/health
- Login: admin / admin123

---

## 5. Database Management

### Run pending migrations (after pulling new schema changes)
```powershell
# STOP backend nodemon first — it locks the Prisma DLL on Windows
cd backend
npx prisma migrate deploy
npx prisma generate
```

### Re-seed the database
```powershell
cd backend
npx prisma db seed
```

### Prisma Studio (DB browser)
```powershell
cd backend
npx prisma studio
```

---

## 6. Completed Steps — Full History

### Step 1: Professional Asset Inventory Module ✅
- Full CRUD for IT assets
- Sequential asset codes (FAA-000001)
- Hardware specifications (CPU, RAM, Storage, Display, GPU, OS, etc.)
- Asset status lifecycle: AVAILABLE → ASSIGNED → UNDER_REPAIR → RETIRED → DISPOSED
- Multi-search, filter by type/status/department/location
- Excel import (template) and export (XLSX)
- Asset detail page with full hardware specs
- Prisma models: `Asset`, `AssetType`, `AssetStatus` (enum)

### Step 2: Professional Asset Assignment & Accountability Module ✅
- Assign assets to employees with full chain of custody
- Acknowledgement workflow (employee must confirm receipt)
- Assignment history per asset and per employee
- Prevents double-assignment of already-assigned assets
- Concurrency protection: validates asset state at submission time
- Sequential codes: ASN-000001
- Prisma models: `Assignment`, `AssetStatusHistory`

### Step 3: Professional Asset Transfers & Movement Module ✅
- Transfer assets between employees/departments/locations
- Approval-gated transfers (optional)
- Source validation: blocks transfer of assets in repair/pending transfer
- Sequential codes: TRF-000001
- Prisma model: `Transfer`

### Step 4: Professional Returns & Asset Recovery Module ✅
- Return assets from employees back to IT depot
- Condition assessment on return (EXCELLENT/GOOD/FAIR/DAMAGED/CRITICAL)
- Deduction notes and return reason tracking
- Sequential codes: RET-000001
- Prisma model: `Return`

### Step 5: Professional Maintenance & Service Management Module ✅
- Multi-stage maintenance lifecycle: OPEN → ASSIGNED → IN_PROGRESS → WAITING_PARTS → COMPLETED
- Technician assignment (internal employee or external vendor)
- Diagnostic findings, root cause analysis, recommended action
- Parts tracking with individual part cost breakdown
- SLA aging: `daysOpen`, `isOverdue`, `overdueDays`
- Warranty coverage flag + claim number on maintenance tickets
- Sequential codes: MNT-000001
- Prisma model: `MaintenanceRecord` (heavily extended)

### Step 6: Professional Asset History & Complete Chain of Custody ✅
- Complete immutable timeline for every asset
- Every state change logged: assignment, transfer, return, repair, warranty, status changes
- `AssetStatusHistory` model with `AssetAction` enum
- Chain of custody report exportable to Excel
- Asset history tab on Asset Detail page
- Timeline UI with actor, timestamp, remarks

### Step 7: Professional Employee, Department/Area & Location Management ✅
- Employee master data with full profile
- Sequential employee codes: EMP-000001
- Department/Area hierarchy with head-of-department
- Location management (building, floor, room)
- Employee detail page: profile, assets held, assignment history
- Department detail: employee list, asset count
- Excel import/export for all three entities
- Bulk status update (Activate / Deactivate)
- Prisma models: `Employee`, `Department`, `Location` (all extended)
- Migration: `20260903050000_upgrade_master_data_models`

### Step 8: Professional Approval Center & Workflow Management ✅
- `ApprovalRequest` model with multi-stage workflow
- `ApprovalPolicy` rules engine (auto-approve below cost threshold, escalation)
- Workflow: DRAFT → PENDING → APPROVED / REJECTED / CANCELLED
- Self-approval prevention (requestor cannot approve own request)
- Duplicate submission guard
- Priority: LOW / MEDIUM / HIGH / CRITICAL / URGENT
- Role-based authority: Manager approves standard, Admin approves escalated
- `ApprovalCenter.tsx` page with full request + policy management UI
- Migration: `20260903060000_create_approval_workflow_models`

### Step 9: Professional Warranty & Contract Management ✅
- `Warranty` model: one asset can have multiple historical warranty records
- Sequential codes: WRN-000001
- Dynamic coverage status derived from dates at runtime (never stale stored values):
  - ACTIVE (>30 days remaining)
  - EXPIRING_SOON (0–30 days remaining)
  - EXPIRED (past end date)
  - CANCELLED (soft-cancelled)
- SLA tier: URGENT (≤7d), HIGH_PRIORITY (≤30d), NOTICE (≤90d), ACTIVE (>90d)
- Controlled extension workflow: creates new linked record, preserves original
  - `isExtended: true` on original, `previousWarrantyId` on extension
- Non-destructive soft cancellation (linked claims preserved)
- `WarrantyClaim` model: lightweight claim registry
  - Sequential codes: CLM-000001
  - Cost split: `coveredAmount` vs `outOfPocketAmount`
  - Full lifecycle: SUBMITTED → UNDER_REVIEW → APPROVED → IN_SERVICE → RESOLVED
  - Auto-syncs to linked `MaintenanceRecord` when created
- Financial aggregation per warranty contract
- Date validation safeguards: endDate ≥ startDate, purchaseDate ≤ startDate
- `WarrantyManagement.tsx`: 5 telemetry cards, 4-tab switcher, 13-column table
- `AssetDetail.tsx`: Warranty banner + 3rd "Warranty & Service Contracts" tab
- Excel export: 17-col warranties + 19-col claims (XLSX only)
- Verified: **35/35 automated tests passed**
- Migration: `20260903070000_create_warranty_and_claim_models`

---

## 7. Current Prisma Schema — Key Models

| Model | Key Fields | Notes |
|---|---|---|
| `Asset` | assetCode, assetName, assetType, status, serialNumber, model, manufacturer, warrantyStart, warrantyEnd, department→, location→, currentHolder→ | Central entity |
| `Employee` | employeeCode, fullName, email, designation, department→, location→ | |
| `Department` | code, name, type (DEPARTMENT/AREA), headOf→ | |
| `Location` | code, name, building, floor, room | |
| `Assignment` | assignmentCode, asset→, assignedTo→, status, acknowledgedAt | |
| `Transfer` | transferCode, asset→, fromHolder→, toHolder→, status | |
| `Return` | returnCode, asset→, returnedBy→, conditionOnReturn | |
| `MaintenanceRecord` | maintenanceCode, asset→, maintenanceType, repairStatus, priority, warrantyId→, coveredAmount, outOfPocketAmount | |
| `AssetStatusHistory` | asset→, action (AssetAction enum), actor→, remarks | Immutable audit log |
| `AuditLog` | entityType, entityId, action, actor→, changes (JSON) | System-wide audit |
| `ApprovalRequest` | requestCode, requestType, requestorId→, status, priority | |
| `ApprovalPolicy` | name, requestType, requiresApproval, autoApproveBelow, escalateTo | |
| `Warranty` | warrantyCode, asset→, warrantyType, provider, startDate, endDate, isExtended, previousWarrantyId→ | Self-relation for extension lineage |
| `WarrantyClaim` | claimNumber, warranty→, asset→, status, coveredAmount, outOfPocketAmount, maintenanceId→ | |
| `User` | username, passwordHash, role→, employee→, isActive | |
| `Role` | code, name, permissions→ | |

---

## 8. Key Architectural Rules (NEVER BREAK THESE)

1. **No CSV exports** — always XLSX using SheetJS (`xlsx` package).
2. **No fake/demo data** in production code — all data from real PostgreSQL.
3. **No QR codes, no barcodes** — explicitly excluded from scope.
4. **Dynamic status derivation** — warranty status is calculated from dates at runtime, not stored.
5. **Soft deletes / non-destructive operations** — never hard delete warranty, approval, or audit records.
6. **Sequential codes** — all entities have human-readable sequential codes (XXX-000001 format).
7. **Concurrency protection** — assignments/transfers validate expected source state before committing.
8. **ASCII only in SQL** — PostgreSQL on Windows uses Windows-1252 encoding. Never use Unicode arrows (→), Rupee symbol (₹), or non-ASCII characters in SQL migrations or seed data. Use `->`, `INR`, `Rs.` instead.
9. **UserPayload uses `userId`** — JWT payload field is `userId`, NOT `id`. Always extract as `req.user?.userId || req.user?.id` in controllers.
10. **MaintenanceRecord technician** — string field is `technician`, relation is `technicianEmployee`. Never `include: { technician: true }` — use `include: { technicianEmployee: true }`.
11. **Prisma DLL lock on Windows** — stop `nodemon`/`ts-node` backend before running `prisma migrate` or `prisma generate`.
12. **AssetAction enum** — does not have `WARRANTY_CREATED` or `WARRANTY_EXTENDED`. Use `STATUS_CHANGED` with descriptive `remarks`.

---

## 9. API Route Map

| Module | Base Path |
|---|---|
| Auth | `/api/auth` |
| Assets | `/api/assets` |
| Assignments | `/api/assignments` |
| Transfers | `/api/transfers` |
| Returns | `/api/returns` |
| Maintenance | `/api/maintenance` |
| Asset History | `/api/history` |
| Employees | `/api/employees` |
| Departments | `/api/departments` |
| Locations | `/api/locations` |
| Approvals | `/api/approvals` |
| Warranties | `/api/warranties` |
| Audit Logs | `/api/audit` |
| Dashboard | `/api/dashboard` |

---

## 10. Sidebar Navigation Structure

```
ASSET MANAGEMENT
  ├── Dashboard          /
  ├── Asset Inventory    /assets

LIFECYCLE MANAGEMENT
  ├── Assignments        /assignments
  ├── Transfers          /transfers
  ├── Returns            /returns
  ├── Maintenance        /maintenance
  ├── Warranty & Contracts /warranties

GOVERNANCE
  ├── Approval Center    /approvals
  ├── Asset History      /history
  ├── Audit Logs         /audit

MASTER DATA
  ├── Employees          /employees
  ├── Departments        /departments
  └── Locations          /locations
```

---

## 11. Steps Remaining (Not Yet Implemented)

As of the last session, **Steps 1–9 are fully complete and verified**.

Steps that were discussed in the original project plan but have NOT yet been implemented:

- **Step 10**: Reports & Analytics (custom report builder, scheduled reports, BI-style charts)
- **Step 11**: Notifications & Alerts (email/in-app alerts for warranty expiry, overdue maintenance, approval pending)
- **Step 12**: User Management & Advanced RBAC (user profile management, fine-grained permissions UI)
- **Step 13**: Asset Procurement / Purchase Orders
- **Step 14**: Vendor / Service Provider Management
- **Step 15**: Mobile-responsive UI polish / PWA

> These are tentative — confirm with user before implementing any.

---

## 12. Last Session Summary (Step 9 — Sept 3, 2026)

- **Completed**: Step 9 Warranty & Contract Management
- **Bug fixed**: `Select` options `value` prop was `number` type → changed to `string` to resolve TS2322
- **Bug fixed**: Controllers used `req.user.id` → corrected to `req.user?.userId` (JWT payload key)
- **Tests**: 35/35 passed in `backend/scratch/test_step9_warranties.js`
- **Build**: Frontend 2,724 modules, 0 errors. Backend tsc 0 errors.
- **Pushed**: Commit `a1dfbba` → `origin/main`
- **Instruction from user**: "Don't update anymore until I say" — wait for explicit go-ahead before any code changes.

---

## 13. How to Use This File

When starting a new session on this project:
1. Read this file completely.
2. Check `backend/prisma/schema.prisma` for any schema changes since last session.
3. Run `git log --oneline -10` to see recent commits.
4. Start the servers (see Section 4).
5. Ask the user what they want to work on next.

---

*Last updated: 2026-09-03 | Session: Steps 7–9 complete, pushed to GitHub*
